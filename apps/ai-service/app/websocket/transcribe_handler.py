import asyncio
import hashlib
import io
import json
import logging
import time
from typing import Any
from uuid import uuid4
import numpy as np

from fastapi import WebSocket, WebSocketDisconnect

from app.audio.audio_processor import AudioProcessor
from app.audio.local_agreement import LocalAgreement
from app.audio.vad import VoiceActivityDetector
from app.config.settings import settings
from app.schemas.subtitle import (
    LayaMetadata,
    PipelinePhase,
    PipelineStatusBroadcastMessage,
    PipelineStatusData,
    SubtitleBroadcastMessage,
    SubtitleData,
)
from app.speech.groq_whisper_service import GroqSpeechToTextService
from app.speech.whisper_service import (
    OmniLanguageRouter,
    SpeechToTextService,
    TranscriptResult,
    detect_text_language,
    get_cultural_initial_prompt,
)
from app.services.laya_client import LayaDecisionClient
from app.translation.cache import TranslationCache
from app.translation.context_manager import ContextSegment, MeetingContextManager
from app.translation.contextual_provider import (
    ContextualTranslationProvider,
)
from app.translation.glossary import GlossaryManager, get_room_glossary
from app.translation.base import TranslationProvider
from app.translation.local_provider import LocalTranslationProvider
from app.translation import qa_evaluator
from app.websocket.meeting_connection_manager import (
    MeetingConnectionManager,
    ParticipantConnection,
)

from app.audio.quality_filter import SpeechQualityFilter
from app.audio.homophone_normalizer import homophone_normalizer
from app.security.moderation import ContentModerationFilter

logger = logging.getLogger("ai_service")

WEBM_EBML_HEADER = b"\x1a\x45\xdf\xa3"
WEBM_CLUSTER_HEADER = b"\x1f\x43\xb6\x75"


def _prepare_audio_frame(
    raw_bytes: bytes,
    webm_header_bytes: bytes | None,
) -> tuple[bytes | None, bytes | None, bool]:
    """Returns a decodable payload and never labels a bare WebM cluster as PCM."""
    if raw_bytes.startswith(WEBM_EBML_HEADER):
        cluster_index = raw_bytes.find(WEBM_CLUSTER_HEADER)
        header = raw_bytes[:cluster_index] if cluster_index > 0 else raw_bytes
        return raw_bytes, header, True

    if raw_bytes.startswith(WEBM_CLUSTER_HEADER):
        if not webm_header_bytes:
            return None, None, True
        return webm_header_bytes + raw_bytes, webm_header_bytes, True

    if raw_bytes.startswith((b"RIFF", b"OggS")):
        return raw_bytes, webm_header_bytes, True

    if webm_header_bytes:
        return webm_header_bytes + raw_bytes, webm_header_bytes, True

    return raw_bytes, webm_header_bytes, False


def _resolve_listener_target_language(
    listener: ParticipantConnection,
    listener_count: int,
    speaker_id: str,
    configured_source_language: str,
    spoken_language: str,
) -> str:
    configured_source = configured_source_language.lower().split("-", 1)[0]
    spoken = spoken_language.lower().split("-", 1)[0]
    preferred_target = listener.target_language.lower().split("-", 1)[0]
    is_speaker_or_solo = listener.participant_id == speaker_id or listener_count == 1

    if (
        is_speaker_or_solo
        and configured_source != "auto"
        and spoken == preferred_target
        and configured_source != preferred_target
    ):
        return configured_source_language
    return listener.target_language



class TranscribeWebSocketHandler:
    def __init__(
        self,
        connection_manager: MeetingConnectionManager | None = None,
        context_manager: MeetingContextManager | None = None,
        glossary_manager: GlossaryManager | None = None,
        cache: TranslationCache | None = None,
        translator: TranslationProvider | None = None,
        stt: SpeechToTextService | None = None,
        quality_filter: SpeechQualityFilter | None = None,
        moderation_filter: ContentModerationFilter | None = None,
        cloud_stt: GroqSpeechToTextService | None = None,
    ):
        self.stt = stt or SpeechToTextService()
        if cloud_stt is not None:
            self.cloud_stt = cloud_stt
        elif settings.STT_PROVIDER.strip().lower() == "groq" and settings.GROQ_API_KEY.strip():
            self.cloud_stt = GroqSpeechToTextService()
        else:
            if settings.STT_PROVIDER.strip().lower() == "groq":
                logger.warning("STT_PROVIDER=groq but GROQ_API_KEY is empty; using local faster-whisper")
            self.cloud_stt = None
        self.omni_router = OmniLanguageRouter(local_stt=self.stt, cloud_stt=self.cloud_stt)
        self.glossary_manager = glossary_manager or GlossaryManager()
        self.cache = cache or TranslationCache()
        self.context_manager = context_manager or MeetingContextManager()
        self.quality_filter = quality_filter or SpeechQualityFilter()
        self.moderation_filter = moderation_filter or ContentModerationFilter()
        if translator is not None:
            self.translator = translator
        elif settings.CONTEXTUAL_TRANSLATION_ENABLED:
            self.translator = ContextualTranslationProvider(
                fallback_provider=LocalTranslationProvider(),
                glossary_manager=self.glossary_manager,
            )
        else:
            self.translator = LocalTranslationProvider()
        self.laya = LayaDecisionClient()
        self.audio_processor = AudioProcessor()
        self.connection_manager = connection_manager or MeetingConnectionManager()


    async def handle(
        self,
        websocket: WebSocket,
        meeting_id: str,
        participant_id: str,
        participant_name: str,
        source_language: str,
        target_language: str,
        already_accepted: bool = False,
    ):
        if not already_accepted:
            await websocket.accept()
        logger.info("WebSocket connected meeting=%s", meeting_id)

        websocket_state = getattr(websocket, "state", None)
        signed_livekit_identity = getattr(websocket_state, "livekit_identity", None)
        livekit_identity = (
            signed_livekit_identity.strip()
            if isinstance(signed_livekit_identity, str) and signed_livekit_identity.strip()
            else participant_id
        )

        # Register participant connection in the meeting registry
        current_conn = await self.connection_manager.register(
            meeting_id=meeting_id,
            participant_id=participant_id,
            websocket=websocket,
            participant_name=participant_name,
            target_language=target_language,
            livekit_identity=livekit_identity,
        )

        current_utterance_id: str = str(uuid4())
        pipeline_sequence: int = 0
        pipeline_active = False
        pipeline_listeners: list[ParticipantConnection] = []
        finalization_t0: float | None = None
        input_kind = "unknown"
        in_flight_partial_task: asyncio.Task | None = None
        utterance_is_active = False

        async def _finish_overlap_tracking() -> None:
            nonlocal utterance_is_active
            if not utterance_is_active:
                return

            overlap_duration_ms = await self.connection_manager.end_utterance(
                meeting_id,
                participant_id,
            )
            utterance_is_active = False
            if overlap_duration_ms is not None:
                logger.info(
                    "event=overlap_completed meeting_id=%s duration_ms=%.1f",
                    meeting_id,
                    overlap_duration_ms,
                )

        try:
            # Initial connection acknowledgement
            initial_sub = SubtitleBroadcastMessage(
                data=SubtitleData(
                    meetingId=meeting_id,
                    participantId=participant_id,
                    participantName=participant_name,
                    sourceLanguage=source_language,
                    targetLanguage=target_language,
                    originalText="Xin chào, chúng ta bắt đầu cuộc họp nhé.",
                    translatedText=await self.translator.translate(
                        "Xin chào, chúng ta bắt đầu cuộc họp nhé.",
                        source_language,
                        target_language,
                    ),
                    isFinal=True,
                    tags=[],
                    confidence=0.0,
                )
            )
            async with current_conn.send_lock:
                await websocket.send_text(initial_sub.model_dump_json())

            # Isolated per-connection state for streaming audio chunk buffering & VAD
            try:
                vad = VoiceActivityDetector(
                    energy_threshold=getattr(settings, "VAD_ENERGY_THRESHOLD", 0.00015),
                    rms_threshold=getattr(settings, "VAD_RMS_THRESHOLD", 0.006),
                )
            except TypeError:
                vad = VoiceActivityDetector()
            audio_buffer: list[np.ndarray] = []
            pre_roll_buffer: list[np.ndarray] = []
            silence_chunks: int = 0
            dropped_chunks: int = 0
            utterance_t0: float | None = None
            last_interim_time: float = 0.0
            speaker_sequence: int = 0
            partial_seq: int = 0
            local_agreement = LocalAgreement(
                min_words=getattr(settings, "LOCAL_AGREEMENT_MIN_WORDS", 3),
                min_cjk_chars=getattr(settings, "LOCAL_AGREEMENT_MIN_CJK_CHARS", 6),
            )
            room_terms = get_room_glossary(meeting_id) if meeting_id else {}
            cultural_prompt = get_cultural_initial_prompt(source_language)
            base_prompt = cultural_prompt or getattr(settings, "WHISPER_INITIAL_PROMPT", None)
            if source_language.lower() == "auto":
                active_initial_prompt = None
            else:
                prompt_parts = []
                if base_prompt:
                    prompt_parts.append(base_prompt.strip().rstrip("."))
                if participant_name and participant_name not in ("Guest", "Participant", "User"):
                    prompt_parts.append(f"Người tham gia: {participant_name}")
                if room_terms:
                    prompt_parts.append("Thuật ngữ: " + ", ".join(list(room_terms.keys())[:15]))
                active_initial_prompt = (". ".join(prompt_parts) + ".") if prompt_parts else base_prompt
                if active_initial_prompt and len(active_initial_prompt) > 600:
                    truncated = active_initial_prompt[:600]
                    if "." in truncated:
                        active_initial_prompt = truncated.rsplit(".", 1)[0] + "."
                    else:
                        active_initial_prompt = truncated

            active_translation_tier = getattr(settings, "DEFAULT_TRANSLATION_TIER", "pro")
            active_byok_enabled = False
            active_byok_provider = "openai"
            active_byok_api_key = ""

            def _provider_version() -> str:
                base_version = getattr(self.translator, "model_version", "v1")
                meeting_scope = hashlib.sha256(meeting_id.encode("utf-8")).hexdigest()[:8]
                if active_byok_enabled and active_byok_api_key:
                    return f"{base_version}:byok:{active_byok_provider}:{meeting_scope}"
                if active_translation_tier == "pro":
                    return f"{base_version}:pro:{meeting_scope}"
                return f"{base_version}:standard"

            session_spoken_lang: str = (
                "vi" if source_language.lower() == "auto" else source_language
            )
            webm_header_bytes: bytes | None = None

            while True:

                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break

                raw_bytes = message.get("bytes")
                raw_text = message.get("text")

                if raw_bytes is not None and len(raw_bytes) > settings.WS_MAX_AUDIO_FRAME_BYTES:
                    logger.warning("WebSocket audio frame rejected meeting=%s reason=too_large", meeting_id)
                    await websocket.close(code=1009)
                    break
                if (
                    raw_text is not None
                    and len(raw_text.encode("utf-8")) > settings.WS_MAX_TEXT_FRAME_BYTES
                ):
                    logger.warning("WebSocket text frame rejected meeting=%s reason=too_large", meeting_id)
                    await websocket.close(code=1009)
                    break

                text = ""
                lang = source_language
                is_final = True
                segment_stt_confidence = 0.88
                t0_bench = time.perf_counter()

                # A. AUDIO CHUNK PROCESSING (Realtime Streaming with VAD)
                if raw_bytes:
                    input_kind = "audio"
                    # 1. Decode container frames safely, otherwise treat input as 16-bit PCM.
                    prepared_frame, webm_header_bytes, is_container = _prepare_audio_frame(
                        raw_bytes,
                        webm_header_bytes,
                    )
                    if prepared_frame is None:
                        logger.debug("Skipping WebM cluster received before its EBML header")
                        continue
                    if is_container:
                        try:
                            from faster_whisper.audio import decode_audio
                            chunk_pcm = decode_audio(io.BytesIO(prepared_frame), sampling_rate=16000)
                        except Exception as ex:
                            logger.warning("Skipping undecodable container audio frame: %s", ex)
                            continue
                    else:
                        try:
                            chunk_pcm = self.audio_processor.pcm_to_float32(prepared_frame)
                        except (TypeError, ValueError) as ex:
                            logger.warning("Skipping malformed PCM audio frame: %s", ex)
                            continue

                    # 2. Voice Activity Detection (VAD)
                    has_speech = vad.contains_speech(chunk_pcm)

                    if not has_speech:
                        if len(audio_buffer) == 0:
                            pre_roll_buffer.append(chunk_pcm)
                            if len(pre_roll_buffer) > 2:
                                pre_roll_buffer.pop(0)
                            dropped_chunks += 1
                            continue
                        else:
                            silence_chunks += 1
                            audio_buffer.append(chunk_pcm)
                            # Consecutive silence chunks (default 2 chunks = 700ms pause) marks natural sentence pause
                            if silence_chunks < getattr(settings, "VAD_SILENCE_CHUNKS_FINAL", 2):
                                continue
                            is_final = True
                    else:
                        silence_chunks = 0
                        if utterance_t0 is None:
                            utterance_t0 = time.perf_counter()
                            overlap_started = await self.connection_manager.begin_utterance(
                                meeting_id,
                                participant_id,
                            )
                            utterance_is_active = True
                            if overlap_started:
                                logger.info(
                                    "event=overlap_started meeting_id=%s",
                                    meeting_id,
                                )
                            logger.info(
                                "event=utterance_started meeting_id=%s utterance_id=%s input_kind=audio",
                                meeting_id,
                                current_utterance_id,
                            )
                        if len(audio_buffer) == 0 and pre_roll_buffer:
                            audio_buffer.extend(pre_roll_buffer)
                            pre_roll_buffer.clear()
                        audio_buffer.append(chunk_pcm)
                        curr_duration = sum(len(c) for c in audio_buffer) / 16000.0

                        # Cap maximum utterance buffer at configured duration (default 7.0s) for safety finalization
                        max_buffer_seconds = getattr(settings, "WHISPER_MAX_BUFFER_SECONDS", 7.0)
                        if curr_duration >= max_buffer_seconds:
                            full_pcm = np.concatenate(audio_buffer) if audio_buffer else chunk_pcm
                            buf_rms = float(np.sqrt(np.mean(full_pcm ** 2)))
                            buf_peak = float(np.max(np.abs(full_pcm)))
                            min_rms = getattr(settings, "WHISPER_MIN_SPEECH_RMS", 0.008)
                            min_peak = getattr(settings, "WHISPER_MIN_SPEECH_PEAK", 0.022)
                            if buf_rms < min_rms or buf_peak < min_peak:
                                logger.debug(
                                    "Dropped ambient noise buffer cap meeting=%s dur=%.1fs rms=%.4f peak=%.4f",
                                    meeting_id, curr_duration, buf_rms, buf_peak
                                )
                                audio_buffer.clear()
                                pre_roll_buffer.clear()
                                silence_chunks = 0
                                utterance_t0 = None
                                await _finish_overlap_tracking()
                                continue
                            is_final = True
                        else:
                            continue

                    if is_final:
                        finalization_t0 = time.perf_counter()
                        pipeline_active = True
                        pipeline_listeners = await self.connection_manager.get_listeners(meeting_id)
                        if not pipeline_listeners:
                            pipeline_listeners = [current_conn]
                        pipeline_sequence += 1
                        await self._broadcast_pipeline_status(
                            listeners=pipeline_listeners,
                            meeting_id=meeting_id,
                            utterance_id=current_utterance_id,
                            participant_id=participant_id,
                            livekit_identity=livekit_identity,
                            phase="transcribing",
                            sequence=pipeline_sequence,
                        )
                        logger.info(
                            "event=utterance_finalizing meeting_id=%s utterance_id=%s input_kind=audio",
                            meeting_id,
                            current_utterance_id,
                        )

                    # 3. Faster-Whisper Real-time Transcription with initial_prompt & dynamic LID
                    t_stt_start = time.perf_counter()
                    full_audio = np.concatenate(audio_buffer) if audio_buffer else chunk_pcm
                    effective_stt_lang = (
                        "auto" if source_language.lower() == "auto" else source_language
                    )
                    transcript = await self._transcribe_audio(
                        full_audio,
                        language=effective_stt_lang,
                        is_final=is_final,
                        initial_prompt=active_initial_prompt,
                        meeting_id=meeting_id,
                    )
                    t_stt_end = time.perf_counter()
                    last_interim_time = t_stt_end
                    stt_latency_ms = (t_stt_end - t_stt_start) * 1000

                    text = transcript.text.strip()
                    lang = transcript.language or session_spoken_lang
                    segment_stt_confidence = getattr(
                        transcript, "language_probability", 0.88
                    )

                    # Dynamic spoken language smoothing & speaker-anchored profile update
                    if source_language.lower() == "auto":
                        lang_prob = getattr(transcript, "language_probability", 0.0)
                        if is_final or lang_prob >= 0.45 or len(audio_buffer) >= 3:
                            session_spoken_lang = lang
                            await self.connection_manager.update_speaker_language(
                                meeting_id, participant_id, lang
                            )
                        else:
                            lang = session_spoken_lang
                    else:
                        lang = source_language
                        session_spoken_lang = source_language

                    if not text:
                        if is_final:
                            await _finish_overlap_tracking()
                            audio_buffer.clear()
                            pre_roll_buffer.clear()
                            silence_chunks = 0
                            utterance_t0 = None
                            local_agreement.reset()
                        continue

                # B. TEXT MESSAGE PROCESSING (Direct, client_transcript offload, or session config)
                elif raw_text:
                    input_kind = "text"
                    try:
                        parsed = json.loads(raw_text)
                        if isinstance(parsed, dict) and parsed.get("type") == "ping":
                            async with current_conn.send_lock:
                                await websocket.send_text(
                                    json.dumps({"type": "pong", "timestamp": time.time()})
                                )
                            continue
                        if isinstance(parsed, dict) and parsed.get("type") == "config":
                            if "domain" in parsed and isinstance(parsed["domain"], str):
                                new_domain = parsed["domain"].strip().lower()
                                await self.context_manager.set_domain(meeting_id, new_domain)
                            if "initialPrompt" in parsed and isinstance(parsed["initialPrompt"], str):
                                active_initial_prompt = parsed["initialPrompt"].strip()
                            requested_tier = parsed.get("translationTier")
                            if isinstance(requested_tier, str):
                                normalized_tier = requested_tier.strip().lower()
                                if normalized_tier in ("standard", "pro"):
                                    active_translation_tier = normalized_tier
                            if isinstance(parsed.get("byokEnabled"), bool):
                                active_byok_enabled = parsed["byokEnabled"]
                            requested_provider = parsed.get("byokProvider")
                            if isinstance(requested_provider, str):
                                normalized_provider = requested_provider.strip().lower()
                                if normalized_provider in (
                                    "openai", "gemini", "deepl", "groq", "deepseek", "qwen", "byteplus"
                                ):
                                    active_byok_provider = normalized_provider
                            requested_key = parsed.get("byokApiKey")
                            if isinstance(requested_key, str):
                                active_byok_api_key = requested_key.strip()
                            if not active_byok_enabled:
                                active_byok_api_key = ""
                            logger.info(
                                "Updated session config meeting=%s tier=%s byok_enabled=%s "
                                "byok_provider=%s initial_prompt_configured=%s",
                                meeting_id,
                                active_translation_tier,
                                active_byok_enabled,
                                active_byok_provider,
                                bool(active_initial_prompt),
                            )
                            continue

                        # Desktop / local-STT clients: skip server STT entirely (0% CPU).
                        is_client_transcript = (
                            isinstance(parsed, dict)
                            and parsed.get("type") == "client_transcript"
                        )
                        if is_client_transcript:
                            input_kind = "client_transcript"
                            text = str(parsed.get("text") or "")
                            lang = str(
                                parsed.get("sourceLanguage")
                                or parsed.get("language")
                                or source_language
                            )
                        else:
                            text = parsed.get("text", "") if isinstance(parsed, dict) else ""
                            lang = (
                                parsed.get("language", source_language)
                                if isinstance(parsed, dict)
                                else source_language
                            )

                        text_lang, text_confidence = detect_text_language(
                            text,
                            session_spoken_lang if str(lang).lower() == "auto" else str(lang),
                        )
                        # Desktop/local STT offload: trust explicit client sourceLanguage.
                        # Only run LID override when the client asked for auto detection.
                        client_lang_locked = (
                            is_client_transcript
                            and str(lang).strip().lower() not in ("", "auto")
                        )
                        if not client_lang_locked and (
                            str(lang).lower() == "auto" or text_confidence >= 0.85
                        ):
                            lang = text_lang
                        if client_lang_locked or text_confidence >= 0.45:
                            session_spoken_lang = lang
                            await self.connection_manager.update_speaker_language(
                                meeting_id, participant_id, lang
                            )
                        if (
                            isinstance(parsed, dict)
                            and "confidence" in parsed
                            and isinstance(parsed["confidence"], (int, float))
                        ):
                            segment_stt_confidence = max(0.0, min(1.0, float(parsed["confidence"])))
                        else:
                            segment_stt_confidence = text_confidence
                        is_final = (
                            parsed.get("isFinal", True)
                            if isinstance(parsed, dict)
                            else True
                        )
                        if isinstance(parsed, dict) and "_t0" in parsed:
                            t0_bench = float(parsed["_t0"])
                    except Exception:
                        text = raw_text

                    if not text.strip():
                        continue
                    stt_latency_ms = 0.0

                else:
                    continue

                # Acoustic & technical homophone normalization
                text = homophone_normalizer.normalize(text, language=lang)

                # Guardrail Layer: Speech Quality (Hallucination & Filler) & Content Moderation
                is_valid_speech, reject_reason = self.quality_filter.filter_speech(text, lang)
                if not is_valid_speech:
                    logger.info(
                        "Speech quality filter rejected utterance meeting=%s reason=%s text=%s",
                        meeting_id,
                        reject_reason,
                        text[:30],
                    )
                    if is_final:
                        await _finish_overlap_tracking()
                        audio_buffer.clear()
                        pre_roll_buffer.clear()
                        silence_chunks = 0
                        utterance_t0 = None
                        local_agreement.reset()
                    continue

                # Content Moderation & Policy Guard (Profanity, slurs, DLP/PII)
                is_violation, moderated_text, moderation_action = self.moderation_filter.moderate(
                    text, language=lang
                )
                if moderation_action == "dropped":
                    logger.warning("Content moderation dropped violating utterance meeting=%s", meeting_id)
                    if is_final:
                        await _finish_overlap_tracking()
                        audio_buffer.clear()
                        pre_roll_buffer.clear()
                        silence_chunks = 0
                        utterance_t0 = None
                        local_agreement.reset()
                    continue
                elif moderation_action == "masked":
                    text = moderated_text

                # C. TRANSLATION & SUBTITLE DISPATCH
                listeners = await self.connection_manager.get_listeners(meeting_id)
                if not listeners:
                    listeners = [current_conn]

                listener_targets = {
                    listener.participant_id: _resolve_listener_target_language(
                        listener=listener,
                        listener_count=len(listeners),
                        speaker_id=participant_id,
                        configured_source_language=source_language,
                        spoken_language=lang,
                    )
                    for listener in listeners
                }
                unique_targets = set(listener_targets.values())

                # Resolve meeting domain and context
                meeting_domain = await self.context_manager.get_domain(meeting_id)

                if is_final:
                    if finalization_t0 is None:
                        finalization_t0 = time.perf_counter()
                    pipeline_active = True
                    pipeline_listeners = listeners
                    pipeline_sequence += 1
                    await self._broadcast_pipeline_status(
                        listeners=pipeline_listeners,
                        meeting_id=meeting_id,
                        utterance_id=current_utterance_id,
                        participant_id=participant_id,
                        livekit_identity=livekit_identity,
                        phase="translating",
                        sequence=pipeline_sequence,
                    )

                    # Final transcript: cancel pending partial translations and process inline with priority
                    partial_seq += 1
                    if in_flight_partial_task and not in_flight_partial_task.done():
                        in_flight_partial_task.cancel()
                        in_flight_partial_task = None

                    # Fast Laya domain and terminology classification (short timeout)
                    detected_domain, sensitivity = self.laya.classify_domain_locally(
                        text, default_domain=meeting_domain
                    )
                    await self.context_manager.set_domain(meeting_id, detected_domain)
                    prompt_context = await self.context_manager.get_prompt_context(meeting_id, max_segments=5)
                    context_hash = await self.context_manager.get_context_hash(meeting_id, max_segments=5)

                    async def _translate_final_target(tl: str) -> tuple[str, str, str, bool]:
                        clean_tl = tl.lower().split("-", 1)[0]
                        clean_lang = lang.lower().split("-", 1)[0]
                        if clean_tl == clean_lang or not text.strip():
                            return tl, text, "offline_pattern", False

                        # Tier-1/Tier-2 General Cache Check (sub-0.1ms L1, sub-2ms L2 Redis)
                        gen_key = self.cache.build_general_key(
                            source_lang=lang,
                            target_lang=tl,
                            text=text,
                            provider_version=_provider_version(),
                        )
                        cached_gen = await self.cache.get(gen_key)
                        if cached_gen:
                            logger.debug("General cache hit for final translation (<0.1ms)")
                            return tl, cached_gen, "cache", True

                        ckey = self.cache.build_key(
                            meeting_id=meeting_id,
                            source_lang=lang,
                            target_lang=tl,
                            text=text,
                            context_hash=context_hash,
                            glossary_version=self.glossary_manager.get_version(),
                            provider_version=_provider_version(),
                        )
                        cached = await self.cache.get(ckey)
                        if cached:
                            logger.debug("Cache hit for final translation (<50ms)")
                            await self.cache.set(gen_key, cached)
                            return tl, cached, "cache", True

                        res = await self._dispatch_translate(
                            text=text,
                            source_lang=lang,
                            target_lang=tl,
                            meeting_id=meeting_id,
                            participant_id=participant_id,
                            participant_name=participant_name,
                            context=prompt_context,
                            domain=detected_domain,
                            terminology_sensitivity=sensitivity,
                            translation_tier=active_translation_tier,
                            byok_enabled=active_byok_enabled,
                            byok_provider=active_byok_provider,
                            byok_api_key=active_byok_api_key,
                        )
                        await self.cache.set(ckey, res)
                        await self.cache.set(gen_key, res)

                        provider_used = getattr(
                            self.translator, "last_provider_name", "offline_pattern"
                        )
                        return tl, res, provider_used, False

                    t_trans_start = time.perf_counter()
                    trans_entries = await asyncio.gather(
                        *[_translate_final_target(tl) for tl in unique_targets],
                        return_exceptions=False,
                    )
                    translations = {entry[0]: entry[1] for entry in trans_entries}
                    translation_meta = {
                        entry[0]: {"provider": entry[2], "cacheHit": entry[3]}
                        for entry in trans_entries
                    }
                    t_trans_end = time.perf_counter()
                    trans_latency_ms = (t_trans_end - t_trans_start) * 1000

                    # Dispatch final subtitle
                    sub_id = current_utterance_id
                    speaker_sequence += 1
                    final_latency_ms = stt_latency_ms + trans_latency_ms

                    async def _send_to_listener(listener: ParticipantConnection):
                        listener_target = listener_targets.get(
                            listener.participant_id,
                            listener.target_language,
                        )
                        listener_translated = translations.get(listener_target, text)
                        sub_msg = SubtitleBroadcastMessage(
                            data=SubtitleData(
                                id=sub_id,
                                meetingId=meeting_id,
                                participantId=participant_id,
                                participantName=participant_name,
                                sourceLanguage=lang,
                                targetLanguage=listener_target,
                                originalText=text,
                                translatedText=listener_translated,
                                isFinal=True,
                                tags=[],
                                confidence=segment_stt_confidence,
                                latencyMs=round(final_latency_ms, 1),
                            )
                        )
                        try:
                            async with listener.send_lock:
                                await listener.websocket.send_text(sub_msg.model_dump_json())
                        except Exception:
                            logger.warning("WebSocket listener send failed; unregistering connection")
                            await self.connection_manager.unregister(
                                meeting_id,
                                listener.participant_id,
                                listener,
                            )

                    t_send_start = time.perf_counter()
                    await asyncio.gather(
                        *[_send_to_listener(l) for l in listeners],
                        return_exceptions=True,
                    )
                    t_send_end = time.perf_counter()
                    render_ms = (t_send_end - t_send_start) * 1000
                    pipeline_sequence += 1
                    await self._broadcast_pipeline_status(
                        listeners=listeners,
                        meeting_id=meeting_id,
                        utterance_id=sub_id,
                        participant_id=participant_id,
                        livekit_identity=livekit_identity,
                        phase="ready",
                        sequence=pipeline_sequence,
                    )
                    ready_at = time.perf_counter()
                    pipeline_active = False
                    total_latency_ms = (ready_at - (utterance_t0 or t0_bench)) * 1000
                    finalization_to_ready_ms = (
                        (ready_at - finalization_t0) * 1000
                        if finalization_t0 is not None
                        else total_latency_ms
                    )

                    logger.info(
                        "event=pipeline_latency meeting_id=%s utterance_id=%s input_kind=%s "
                        "stt_ms=%.1f translation_ms=%.1f broadcast_ms=%.1f "
                        "finalization_to_ready_ms=%.1f total_ms=%.1f dropped_chunks=%d",
                        meeting_id,
                        sub_id,
                        input_kind,
                        stt_latency_ms,
                        trans_latency_ms,
                        render_ms,
                        finalization_to_ready_ms,
                        total_latency_ms,
                        dropped_chunks,
                    )
                    await _finish_overlap_tracking()

                    # Update rolling meeting context with final dialogue segment
                    context_target_language = listener_targets.get(
                        participant_id,
                        target_language,
                    )
                    await self.context_manager.add_segment(
                        meeting_id=meeting_id,
                        segment=ContextSegment(
                            source_text=text,
                            translated_text=translations.get(context_target_language, text),
                            source_language=lang,
                            target_language=context_target_language,
                            speaker_id=participant_id,
                            speaker_name=participant_name,
                            domain=detected_domain,
                            is_final=True,
                        ),
                    )

                    # QA telemetry runs outside the subtitle critical path. Raw text is
                    # retained only when the admin explicitly enables training mode.
                    for qa_target, qa_translation in translations.items():
                        if qa_target.lower() == lang.lower():
                            continue
                        qa_meta = translation_meta.get(qa_target, {})
                        asyncio.create_task(
                            qa_evaluator.qa_manager.record_segment(
                                meeting_code=meeting_id,
                                source_lang=lang,
                                target_lang=qa_target,
                                source_text=text,
                                translated_text=qa_translation,
                                stt_confidence=segment_stt_confidence,
                                provider=str(qa_meta.get("provider", "offline_pattern")),
                                latency_ms=trans_latency_ms,
                                cache_hit=bool(qa_meta.get("cacheHit", False)),
                                domain=detected_domain,
                            )
                        )

                    # Async Laya sidecar enrichment
                    saved_utterance_id = sub_id
                    current_utterance_id = str(uuid4())
                    pipeline_sequence = 0
                    finalization_t0 = None
                    input_kind = "unknown"
                    audio_buffer.clear()
                    pre_roll_buffer.clear()
                    silence_chunks = 0
                    utterance_t0 = None
                    local_agreement.reset()

                    asyncio.create_task(
                        self._enrich_laya_async(
                            meeting_id=meeting_id,
                            participant_id=participant_id,
                            participant_name=participant_name,
                            source_language=lang,
                            original_text=text,
                            translations=translations,
                            translation_targets=listener_targets,
                            utterance_id=saved_utterance_id,
                        )
                    )

                else:
                    # Partial / Interim transcript: do not prematurely split or commit fragments as isFinal=True.
                    # Full translation accuracy requires complete sentence context.
                    interim_text = text.strip()
                    if not interim_text:
                        continue

                    partial_seq += 1
                    this_seq = partial_seq

                    if in_flight_partial_task and not in_flight_partial_task.done():
                        in_flight_partial_task.cancel()

                    async def _process_partial_transcript(
                        seq_num: int,
                        utterance_id: str,
                        p_text: str,
                        p_lang: str,
                    ):
                        try:
                            # Fast Laya domain check (50ms max timeout)
                            detected_domain, sensitivity = self.laya.classify_domain_locally(
                                p_text, default_domain=meeting_domain
                            )
                            prompt_context = await self.context_manager.get_prompt_context(meeting_id, max_segments=5)
                            context_hash = await self.context_manager.get_context_hash(meeting_id, max_segments=5)

                            async def _translate_partial_target(tl: str) -> tuple[str, str]:
                                clean_tl = tl.lower().split("-", 1)[0]
                                clean_plang = p_lang.lower().split("-", 1)[0]
                                if clean_tl == clean_plang or not p_text.strip():
                                    return tl, p_text

                                gen_key = self.cache.build_general_key(
                                    source_lang=p_lang,
                                    target_lang=tl,
                                    text=p_text,
                                    provider_version=_provider_version(),
                                )
                                cached_gen = await self.cache.get(gen_key)
                                if cached_gen:
                                    return tl, cached_gen

                                ckey = self.cache.build_key(
                                    meeting_id=meeting_id,
                                    source_lang=p_lang,
                                    target_lang=tl,
                                    text=p_text,
                                    context_hash=context_hash,
                                    glossary_version=self.glossary_manager.get_version(),
                                    provider_version=_provider_version(),
                                )
                                cached = await self.cache.get(ckey)
                                if cached:
                                    return tl, cached

                                # Partial throttling for short incomplete phrases (< INTERIM_TRANSLATION_MIN_WORDS)
                                words = p_text.split()
                                min_words = getattr(settings, "INTERIM_TRANSLATION_MIN_WORDS", 3)
                                if len(words) < min_words:
                                    return tl, p_text

                                res = await self._dispatch_translate(
                                    text=p_text,
                                    source_lang=p_lang,
                                    target_lang=tl,
                                    meeting_id=meeting_id,
                                    participant_id=participant_id,
                                    participant_name=participant_name,
                                    context=prompt_context,
                                    domain=detected_domain,
                                    terminology_sensitivity=sensitivity,
                                    translation_tier=active_translation_tier,
                                    byok_enabled=active_byok_enabled,
                                    byok_provider=active_byok_provider,
                                    byok_api_key=active_byok_api_key,
                                )
                                await self.cache.set(ckey, res)
                                await self.cache.set(gen_key, res)

                                return tl, res

                            trans_entries = await asyncio.gather(
                                *[_translate_partial_target(tl) for tl in unique_targets],
                                return_exceptions=False,
                            )
                            p_translations = dict(trans_entries)

                            # If superseded by a newer partial transcript, skip broadcasting
                            if seq_num < partial_seq:
                                logger.debug(
                                    "Partial #%d superseded by #%d, skipping broadcast",
                                    seq_num,
                                    partial_seq,
                                )
                                return

                            # Broadcast partial to listeners
                            async def _send_partial(listener: ParticipantConnection):
                                listener_target = listener_targets.get(
                                    listener.participant_id,
                                    listener.target_language,
                                )
                                listener_translated = p_translations.get(listener_target, p_text)
                                sub_msg = SubtitleBroadcastMessage(
                                    data=SubtitleData(
                                        id=utterance_id,
                                        meetingId=meeting_id,
                                        participantId=participant_id,
                                        participantName=participant_name,
                                        sourceLanguage=p_lang,
                                        targetLanguage=listener_target,
                                        originalText=p_text,
                                        translatedText=listener_translated,
                                        isFinal=False,
                                        tags=[],
                                        confidence=0.0,
                                    )
                                )
                                try:
                                    async with listener.send_lock:
                                        await listener.websocket.send_text(sub_msg.model_dump_json())
                                except Exception:
                                    await self.connection_manager.unregister(
                                        meeting_id,
                                        listener.participant_id,
                                        listener,
                                    )

                            await asyncio.gather(*[_send_partial(l) for l in listeners], return_exceptions=True)
                        except asyncio.CancelledError:
                            logger.debug("Partial translation task #%d cancelled", seq_num)
                        except Exception as ex:
                            logger.debug("Partial translation error: %s", ex)

                    in_flight_partial_task = asyncio.create_task(
                        _process_partial_transcript(this_seq, current_utterance_id, interim_text, lang)
                    )

        except WebSocketDisconnect:
            logger.info("WebSocket disconnected meeting=%s", meeting_id)
        except Exception:
            if pipeline_active:
                failed_listeners = pipeline_listeners or await self.connection_manager.get_listeners(meeting_id)
                pipeline_sequence += 1
                await self._broadcast_pipeline_status(
                    listeners=failed_listeners,
                    meeting_id=meeting_id,
                    utterance_id=current_utterance_id,
                    participant_id=participant_id,
                    livekit_identity=livekit_identity,
                    phase="failed",
                    sequence=pipeline_sequence,
                    reason_code="pipeline_error",
                )
            logger.error(
                "event=pipeline_failed meeting_id=%s utterance_id=%s reason_code=pipeline_error",
                meeting_id,
                current_utterance_id,
            )
            raise
        finally:
            await _finish_overlap_tracking()
            if in_flight_partial_task and not in_flight_partial_task.done():
                in_flight_partial_task.cancel()
            await self.connection_manager.unregister(meeting_id, participant_id, current_conn)
            remaining_listeners = await self.connection_manager.get_listeners(meeting_id)
            if not remaining_listeners:
                await self.context_manager.clear_meeting(meeting_id)

    async def _transcribe_audio(
        self,
        audio: np.ndarray,
        *,
        language: str,
        is_final: bool,
        initial_prompt: str | None,
        meeting_id: str,
    ) -> TranscriptResult:
        """Omni-Language router: vi → PhoWhisper; others → Groq; with reciprocal fallbacks."""
        return await self.omni_router.transcribe(
            audio,
            language=language,
            is_final=is_final,
            initial_prompt=initial_prompt,
            meeting_id=meeting_id,
        )

    async def _broadcast_pipeline_status(
        self,
        *,
        listeners: list[ParticipantConnection],
        meeting_id: str,
        utterance_id: str,
        participant_id: str,
        livekit_identity: str,
        phase: PipelinePhase,
        sequence: int,
        reason_code: str | None = None,
    ) -> None:
        status = PipelineStatusBroadcastMessage(
            data=PipelineStatusData(
                meetingId=meeting_id,
                utteranceId=utterance_id,
                participantId=participant_id,
                liveKitIdentity=livekit_identity,
                phase=phase,
                sequence=sequence,
                reasonCode=reason_code,
            )
        )

        async def _send(listener: ParticipantConnection) -> None:
            try:
                async with listener.send_lock:
                    await listener.websocket.send_text(status.model_dump_json())
            except Exception:
                await self.connection_manager.unregister(
                    meeting_id,
                    listener.participant_id,
                    listener,
                )

        await asyncio.gather(*[_send(listener) for listener in listeners], return_exceptions=True)

    async def _broadcast_early_committed_prefix(
        self,
        meeting_id: str,
        participant_id: str,
        participant_name: str,
        source_lang: str,
        committed_text: str,
        utterance_id: str,
        listeners: list[ParticipantConnection],
        listener_targets: dict[str, str],
        unique_targets: set[str],
        meeting_domain: str,
        provider_version: str,
        active_translation_tier: str = "pro",
        active_byok_enabled: bool = False,
        active_byok_provider: str = "openai",
        active_byok_api_key: str = "",
    ):
        """Translates and broadcasts early committed prefix segment (Local Agreement) as isFinal=True."""
        try:
            prompt_context = await self.context_manager.get_prompt_context(meeting_id, max_segments=5)

            async def _translate_target(tl: str) -> tuple[str, str]:
                if tl.lower() == source_lang.lower():
                    return tl, committed_text

                gen_key = self.cache.build_general_key(
                    source_lang=source_lang,
                    target_lang=tl,
                    text=committed_text,
                    provider_version=provider_version,
                )
                cached = await self.cache.get(gen_key)
                if cached:
                    return tl, cached

                res = await self._dispatch_translate(
                    text=committed_text,
                    source_lang=source_lang,
                    target_lang=tl,
                    meeting_id=meeting_id,
                    participant_id=participant_id,
                    participant_name=participant_name,
                    context=prompt_context,
                    domain=meeting_domain,
                    terminology_sensitivity="low",
                    translation_tier=active_translation_tier,
                    byok_enabled=active_byok_enabled,
                    byok_provider=active_byok_provider,
                    byok_api_key=active_byok_api_key,
                )
                await self.cache.set(gen_key, res)
                return tl, res

            if unique_targets:
                trans_entries = await asyncio.gather(
                    *[_translate_target(tl) for tl in unique_targets],
                    return_exceptions=True,
                )
                translations = {
                    item[0]: item[1]
                    for item in trans_entries
                    if isinstance(item, tuple) and len(item) == 2
                }
            else:
                translations = {}

            for listener in listeners:
                target_lang = listener_targets.get(
                    listener.participant_id, listener.target_language
                )
                trans_text = translations.get(target_lang, committed_text)
                sub_msg = SubtitleBroadcastMessage(
                    data=SubtitleData(
                        id=utterance_id,
                        meetingId=meeting_id,
                        participantId=participant_id,
                        participantName=participant_name,
                        sourceLanguage=source_lang,
                        targetLanguage=target_lang,
                        originalText=committed_text,
                        translatedText=trans_text,
                        isFinal=True,
                        tags=[],
                        confidence=0.95,
                    )
                )
                try:
                    async with listener.send_lock:
                        await listener.websocket.send_text(sub_msg.model_dump_json())
                except Exception:
                    pass
        except Exception as ex:
            logger.debug("Failed to broadcast early committed prefix: %s", ex)

    async def _dispatch_translate(

        self,
        text: str,
        source_lang: str,
        target_lang: str,
        meeting_id: str,
        participant_id: str,
        participant_name: str,
        context: list[dict[str, Any]],
        domain: str,
        terminology_sensitivity: str,
        translation_tier: str = "standard",
        byok_enabled: bool = False,
        byok_provider: str = "openai",
        byok_api_key: str = "",
    ) -> str:
        tr = self.translator
        if isinstance(tr, ContextualTranslationProvider):
            return await tr.translate(
                text,
                source_lang,
                target_lang,
                meeting_id=meeting_id,
                speaker_id=participant_id,
                speaker_name=participant_name,
                context=context,
                domain=domain,
                terminology_sensitivity=terminology_sensitivity,
                translation_tier=translation_tier,
                byok_enabled=byok_enabled,
                byok_provider=byok_provider,
                byok_api_key=byok_api_key,
            )
        return await tr.translate(text, source_lang, target_lang)

    async def _enrich_laya_async(

        self,
        meeting_id: str,
        participant_id: str,
        participant_name: str,
        source_language: str,
        original_text: str,
        translations: dict[str, str],
        translation_targets: dict[str, str],
        utterance_id: str,
    ):
        """Asynchronously queries Laya for Action Items and Decisions and broadcasts to room."""
        try:
            tl_start = time.perf_counter()
            tags, confidence = await self.laya.classify_sentence(original_text)
            tl_end = time.perf_counter()
            laya_ms = (tl_end - tl_start) * 1000

            if tags:
                logger.info(
                    "Laya async enriched utterance=%s in %.1fms: tags=%s (conf=%.2f)",
                    utterance_id[:8],
                    laya_ms,
                    tags,
                    confidence,
                )
                listeners = await self.connection_manager.get_listeners(meeting_id)
                if not listeners:
                    return

                async def _send_enriched(listener: ParticipantConnection):
                    listener_target = translation_targets.get(
                        listener.participant_id,
                        listener.target_language,
                    )
                    listener_translated = translations.get(listener_target, original_text)
                    enriched_msg = SubtitleBroadcastMessage(
                        data=SubtitleData(
                            id=utterance_id,
                            meetingId=meeting_id,
                            participantId=participant_id,
                            participantName=participant_name,
                            sourceLanguage=source_language,
                            targetLanguage=listener_target,
                            originalText=original_text,
                            translatedText=listener_translated,
                            isFinal=True,
                            tags=tags,
                            confidence=confidence,
                            layaMetadata=LayaMetadata(
                                isActionItem="action_item" in tags,
                                isDecision="decision" in tags or "decision_made" in tags,
                            ),
                        )
                    )
                    try:
                        async with listener.send_lock:
                            await listener.websocket.send_text(enriched_msg.model_dump_json())
                    except Exception:
                        await self.connection_manager.unregister(
                            meeting_id,
                            listener.participant_id,
                            listener,
                        )

                await asyncio.gather(
                    *[_send_enriched(l) for l in listeners],
                    return_exceptions=True,
                )
        except Exception as ex:
            logger.debug("Laya async enrichment error: %s", ex)
