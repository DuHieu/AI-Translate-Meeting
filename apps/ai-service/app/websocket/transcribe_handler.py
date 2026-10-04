import asyncio
import io
import json
import logging
import time
from typing import Any
from uuid import uuid4
import numpy as np

from fastapi import WebSocket, WebSocketDisconnect

from app.audio.audio_processor import AudioProcessor
from app.audio.vad import VoiceActivityDetector
from app.config.settings import settings
from app.schemas.subtitle import (
    PipelinePhase,
    PipelineStatusBroadcastMessage,
    PipelineStatusData,
    SubtitleBroadcastMessage,
    SubtitleData,
)
from app.speech.whisper_service import SpeechToTextService
from app.services.laya_client import LayaDecisionClient
from app.translation.cache import TranslationCache
from app.translation.context_manager import ContextSegment, MeetingContextManager
from app.translation.contextual_provider import (
    ContextualTranslationProvider,
)
from app.translation.glossary import GlossaryManager
from app.translation.base import TranslationProvider
from app.translation.local_provider import LocalTranslationProvider
from app.websocket.meeting_connection_manager import (
    MeetingConnectionManager,
    ParticipantConnection,
)

from app.audio.quality_filter import SpeechQualityFilter
from app.security.moderation import ContentModerationFilter

logger = logging.getLogger("ai_service")



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
    ):
        self.stt = stt or SpeechToTextService()
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
            vad = VoiceActivityDetector()
            audio_buffer: list[np.ndarray] = []
            silence_chunks: int = 0
            dropped_chunks: int = 0
            utterance_t0: float | None = None
            last_interim_time: float = 0.0
            speaker_sequence: int = 0
            partial_seq: int = 0
            active_initial_prompt: str | None = getattr(settings, "WHISPER_INITIAL_PROMPT", None)
            session_spoken_lang: str = (
                "vi" if source_language.lower() == "auto" else source_language
            )

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
                t0_bench = time.perf_counter()

                # A. AUDIO CHUNK PROCESSING (Realtime Streaming with VAD)
                if raw_bytes:
                    input_kind = "audio"
                    # 1. Decode chunk to 16kHz float32
                    try:
                        if len(raw_bytes) >= 4 and raw_bytes[:4] in (b"RIFF", b"OggS", b"\x1a\x45\xdf\xa3"):
                            from faster_whisper.audio import decode_audio
                            chunk_pcm = decode_audio(io.BytesIO(raw_bytes), sampling_rate=16000)
                        else:
                            chunk_pcm = self.audio_processor.pcm_to_float32(raw_bytes)
                    except Exception as ex:
                        logger.warning("Audio decoding failed, fallback PCM: %s", ex)
                        chunk_pcm = self.audio_processor.pcm_to_float32(raw_bytes)

                    # 2. Voice Activity Detection (VAD)
                    has_speech = vad.contains_speech(chunk_pcm)

                    if not has_speech:
                        if len(audio_buffer) == 0:
                            dropped_chunks += 1
                            continue
                        else:
                            silence_chunks += 1
                            # 2 consecutive silence chunks (approx 500-700ms pause) marks end of sentence
                            if silence_chunks < 2:
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
                        audio_buffer.append(chunk_pcm)
                        curr_duration = sum(len(c) for c in audio_buffer) / 16000.0

                        # Cap maximum utterance buffer at 4.0s for finalization
                        if curr_duration >= 4.0:
                            is_final = True
                        # Throttle interim STT to every configured interval of accumulated speech
                        elif (
                            curr_duration >= getattr(settings, "STT_INTERIM_MIN_DURATION_SECONDS", 1.0)
                            and (time.perf_counter() - last_interim_time) >= getattr(settings, "STT_INTERIM_THROTTLE_SECONDS", 1.0)
                        ):
                            is_final = False
                            last_interim_time = time.perf_counter()
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
                    try:
                        transcript = await self.stt.transcribe(
                            full_audio,
                            language=effective_stt_lang,
                            is_final=is_final,
                            initial_prompt=active_initial_prompt,
                        )
                    except TypeError:
                        transcript = await self.stt.transcribe(
                            full_audio,
                            language=effective_stt_lang,
                            is_final=is_final,
                        )
                    t_stt_end = time.perf_counter()
                    stt_latency_ms = (t_stt_end - t_stt_start) * 1000

                    text = transcript.text.strip()
                    lang = transcript.language or session_spoken_lang

                    # Dynamic spoken language smoothing & session anchor update
                    if source_language.lower() == "auto":
                        lang_prob = getattr(transcript, "language_probability", 0.0)
                        if is_final or lang_prob >= 0.65 or len(audio_buffer) >= 3:
                            session_spoken_lang = lang
                        else:
                            lang = session_spoken_lang

                    if not text:
                        if is_final:
                            await _finish_overlap_tracking()
                            audio_buffer.clear()
                            silence_chunks = 0
                            utterance_t0 = None
                        continue

                # B. TEXT MESSAGE PROCESSING (Direct, benchmark text input, or session config)
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
                            logger.info(
                                "Updated session config meeting=%s initialPrompt=%s",
                                meeting_id,
                                active_initial_prompt,
                            )
                            continue
                        text = parsed.get("text", "")
                        lang = parsed.get("language", source_language)
                        if lang.lower() == "auto":
                            from app.speech.whisper_service import (
                                JAPANESE_KANA_REGEX,
                                VIETNAMESE_DIACRITICS_REGEX,
                            )
                            if JAPANESE_KANA_REGEX.search(text):
                                lang = "ja"
                            elif VIETNAMESE_DIACRITICS_REGEX.search(text):
                                lang = "vi"
                            else:
                                lang = session_spoken_lang
                        is_final = parsed.get("isFinal", True)
                        if "_t0" in parsed:
                            t0_bench = float(parsed["_t0"])
                    except Exception:
                        text = raw_text

                    if not text.strip():
                        continue
                    stt_latency_ms = 0.0

                else:
                    continue

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
                        silence_chunks = 0
                        utterance_t0 = None
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
                        silence_chunks = 0
                        utterance_t0 = None
                    continue
                elif moderation_action == "masked":
                    text = moderated_text

                # C. TRANSLATION & SUBTITLE DISPATCH
                listeners = await self.connection_manager.get_listeners(meeting_id)
                if not listeners:
                    listeners = [current_conn]

                unique_targets = {l.target_language for l in listeners}

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

                    async def _translate_final_target(tl: str) -> tuple[str, str]:
                        if tl.lower() == lang.lower():
                            return tl, text

                        # Tier-1/Tier-2 General Cache Check (sub-0.1ms L1, sub-2ms L2 Redis)
                        gen_key = self.cache.build_general_key(
                            source_lang=lang,
                            target_lang=tl,
                            text=text,
                            provider_version=getattr(self.translator, "model_version", "v1"),
                        )
                        cached_gen = await self.cache.get(gen_key)
                        if cached_gen:
                            logger.debug("General cache hit for final translation (<0.1ms)")
                            return tl, cached_gen

                        ckey = self.cache.build_key(
                            meeting_id=meeting_id,
                            source_lang=lang,
                            target_lang=tl,
                            text=text,
                            context_hash=context_hash,
                            glossary_version=self.glossary_manager.get_version(),
                            provider_version=getattr(self.translator, "model_version", "v1"),
                        )
                        cached = await self.cache.get(ckey)
                        if cached:
                            logger.debug("Cache hit for final translation (<50ms)")
                            await self.cache.set(gen_key, cached)
                            return tl, cached

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
                        )
                        await self.cache.set(ckey, res)
                        await self.cache.set(gen_key, res)

                        return tl, res

                    t_trans_start = time.perf_counter()
                    trans_entries = await asyncio.gather(
                        *[_translate_final_target(tl) for tl in unique_targets],
                        return_exceptions=False,
                    )
                    translations = dict(trans_entries)
                    t_trans_end = time.perf_counter()
                    trans_latency_ms = (t_trans_end - t_trans_start) * 1000

                    # Dispatch final subtitle
                    sub_id = current_utterance_id
                    speaker_sequence += 1

                    async def _send_to_listener(listener: ParticipantConnection):
                        listener_translated = translations.get(listener.target_language, text)
                        sub_msg = SubtitleBroadcastMessage(
                            data=SubtitleData(
                                id=sub_id,
                                meetingId=meeting_id,
                                participantId=participant_id,
                                participantName=participant_name,
                                sourceLanguage=lang,
                                targetLanguage=listener.target_language,
                                originalText=text,
                                translatedText=listener_translated,
                                isFinal=True,
                                tags=[],
                                confidence=0.0,
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
                    await self.context_manager.add_segment(
                        meeting_id=meeting_id,
                        segment=ContextSegment(
                            source_text=text,
                            translated_text=translations.get(target_language, text),
                            source_language=lang,
                            target_language=target_language,
                            speaker_id=participant_id,
                            speaker_name=participant_name,
                            domain=detected_domain,
                            is_final=True,
                        ),
                    )

                    # Async Laya sidecar enrichment
                    saved_utterance_id = sub_id
                    current_utterance_id = str(uuid4())
                    pipeline_sequence = 0
                    finalization_t0 = None
                    input_kind = "unknown"
                    audio_buffer.clear()
                    silence_chunks = 0
                    utterance_t0 = None

                    asyncio.create_task(
                        self._enrich_laya_async(
                            meeting_id=meeting_id,
                            participant_id=participant_id,
                            participant_name=participant_name,
                            source_language=lang,
                            original_text=text,
                            translations=translations,
                            utterance_id=saved_utterance_id,
                        )
                    )

                else:
                    # Partial / Interim transcript: debounce & cancel outdated partial work
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
                                if tl.lower() == p_lang.lower():
                                    return tl, p_text

                                gen_key = self.cache.build_general_key(
                                    source_lang=p_lang,
                                    target_lang=tl,
                                    text=p_text,
                                    provider_version=getattr(self.translator, "model_version", "v1"),
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
                                    provider_version=getattr(self.translator, "model_version", "v1"),
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
                                listener_translated = p_translations.get(listener.target_language, p_text)
                                sub_msg = SubtitleBroadcastMessage(
                                    data=SubtitleData(
                                        id=utterance_id,
                                        meetingId=meeting_id,
                                        participantId=participant_id,
                                        participantName=participant_name,
                                        sourceLanguage=p_lang,
                                        targetLanguage=listener.target_language,
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
                        _process_partial_transcript(this_seq, current_utterance_id, text, lang)
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
                    listener_translated = translations.get(listener.target_language, original_text)
                    enriched_msg = SubtitleBroadcastMessage(
                        data=SubtitleData(
                            id=utterance_id,
                            meetingId=meeting_id,
                            participantId=participant_id,
                            participantName=participant_name,
                            sourceLanguage=source_language,
                            targetLanguage=listener.target_language,
                            originalText=original_text,
                            translatedText=listener_translated,
                            isFinal=True,
                            tags=tags,
                            confidence=confidence,
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
