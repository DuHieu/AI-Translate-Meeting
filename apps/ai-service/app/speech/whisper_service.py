import asyncio
import io
import logging
import time
from dataclasses import dataclass
from typing import Optional, Union
import numpy as np

from app.config.settings import settings

import re

logger = logging.getLogger("ai_service.whisper")

VIETNAMESE_DIACRITICS_REGEX = re.compile(
    r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]",
    re.IGNORECASE,
)
JAPANESE_KANA_REGEX = re.compile(r"[\u3040-\u309F\u30A0-\u30FF]")


@dataclass
class TranscriptResult:
    text: str
    language: str
    is_final: bool
    language_probability: float = 0.0


@dataclass(frozen=True)
class WhisperReadiness:
    state: str
    load_duration_ms: float | None = None
    error_code: str | None = None


class SpeechToTextService:
    def __init__(
        self,
        model_size: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
    ):
        self.model_size = model_size or settings.WHISPER_MODEL
        self.device = device or settings.WHISPER_DEVICE
        self.compute_type = compute_type or settings.WHISPER_COMPUTE_TYPE
        self._model = None
        self._load_lock = asyncio.Lock()
        self._transcribe_semaphore = asyncio.Semaphore(
            getattr(settings, "WHISPER_MAX_CONCURRENT_TRANSCRIBES", 2)
        )
        self._readiness_state = "not_started"
        self._load_duration_ms: float | None = None
        self._load_error_code: str | None = None

    def get_readiness(self) -> WhisperReadiness:
        return WhisperReadiness(
            state=self._readiness_state,
            load_duration_ms=self._load_duration_ms,
            error_code=self._load_error_code,
        )

    def _load_model_sync(self):
        from faster_whisper import WhisperModel

        cpu_threads = getattr(settings, "WHISPER_CPU_THREADS", 2)
        return WhisperModel(
            self.model_size,
            device=self.device,
            compute_type=self.compute_type,
            cpu_threads=cpu_threads,
            num_workers=1,
        )

    async def _load_model_locked(self, retry_failed: bool) -> WhisperReadiness:
        if self._model is not None:
            self._readiness_state = "ready"
            self._load_error_code = None
            return self.get_readiness()

        if self._readiness_state == "failed" and not retry_failed:
            return self.get_readiness()

        self._readiness_state = "loading"
        self._load_error_code = None
        started_at = time.perf_counter()
        logger.info(
            "Loading faster-whisper model size=%s device=%s compute_type=%s",
            self.model_size,
            self.device,
            self.compute_type,
        )

        try:
            model = await asyncio.to_thread(self._load_model_sync)
        except Exception:
            self._load_duration_ms = (time.perf_counter() - started_at) * 1000
            self._readiness_state = "failed"
            self._load_error_code = "model_load_failed"
            logger.error(
                "faster-whisper model load failed model=%s device=%s",
                self.model_size,
                self.device,
            )
            return self.get_readiness()

        self._model = model
        self._load_duration_ms = (time.perf_counter() - started_at) * 1000
        self._readiness_state = "ready"
        logger.info(
            "faster-whisper model ready load_duration_ms=%.1f",
            self._load_duration_ms,
        )
        return self.get_readiness()

    async def preload(self, retry_failed: bool = False) -> WhisperReadiness:
        async with self._load_lock:
            return await self._load_model_locked(retry_failed=retry_failed)

    def _ensure_model_loaded(self):
        if self._model is None:
            self._model = self._load_model_sync()

    def detect_language_sync(
        self,
        audio_input: Union[bytes, np.ndarray],
        candidate_languages: Optional[list[str]] = None,
    ) -> tuple[str, float]:
        """Fast LID using Whisper's encoder Mel spectrogram without decoding full text."""
        self._ensure_model_loaded()

        audio_data: Union[np.ndarray, io.BytesIO]
        if isinstance(audio_input, np.ndarray):
            audio_data = audio_input
        elif isinstance(audio_input, (bytes, bytearray)):
            if len(audio_input) >= 4 and audio_input[:4] in (b"RIFF", b"OggS", b"\x1a\x45\xdf\xa3"):
                try:
                    from faster_whisper.audio import decode_audio
                    audio_data = decode_audio(io.BytesIO(audio_input), sampling_rate=16000)
                except Exception:
                    audio_data = np.frombuffer(audio_input, dtype=np.int16).astype(np.float32) / 32768.0
            else:
                audio_data = np.frombuffer(audio_input, dtype=np.int16).astype(np.float32) / 32768.0
        else:
            return "vi", 0.0

        if len(audio_data) == 0:
            return "vi", 0.0

        try:
            if hasattr(self._model, "detect_language"):
                lang, prob, all_probs = self._model.detect_language(audio_data)
                if candidate_languages and all_probs:
                    cand_set = set(candidate_languages)
                    filtered = [(l, p) for l, p in all_probs if l in cand_set]
                    if filtered:
                        best_lang, best_prob = max(filtered, key=lambda x: x[1])
                        return best_lang, best_prob
                return lang, prob
        except Exception as ex:
            logger.warning("Fast language detection failed: %s", ex)

        return "vi", 0.0

    async def detect_language(
        self,
        audio: Union[bytes, np.ndarray],
        candidate_languages: Optional[list[str]] = None,
    ) -> tuple[str, float]:
        """Asynchronously detects spoken language from audio chunk."""
        if audio is None or len(audio) == 0:
            return "vi", 0.0
        self._ensure_model_loaded()
        return await asyncio.to_thread(self.detect_language_sync, audio, candidate_languages)

    def _transcribe_sync(
        self,
        audio_input: Union[bytes, np.ndarray],
        language: Optional[str] = "vi",
        is_final: bool = True,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptResult:
        self._ensure_model_loaded()

        audio_data: Union[np.ndarray, io.BytesIO]
        if isinstance(audio_input, np.ndarray):
            audio_data = audio_input
        elif isinstance(audio_input, (bytes, bytearray)):
            # Check if raw 16-bit PCM bytes
            # If length is even and doesn't have container header, convert directly
            if len(audio_input) >= 4 and audio_input[:4] in (b"RIFF", b"OggS", b"\x1a\x45\xdf\xa3"):
                # Container format (WAV, Ogg, WebM) -> use faster_whisper decode_audio
                try:
                    from faster_whisper.audio import decode_audio
                    audio_data = decode_audio(io.BytesIO(audio_input), sampling_rate=16000)
                except Exception as ex:
                    logger.warning("Failed to decode container audio, fallback PCM: %s", ex)
                    audio_data = np.frombuffer(audio_input, dtype=np.int16).astype(np.float32) / 32768.0
            else:
                # Raw 16-bit PCM mono 16kHz
                audio_data = np.frombuffer(audio_input, dtype=np.int16).astype(np.float32) / 32768.0
        else:
            return TranscriptResult(text="", language=language or "vi", is_final=is_final, language_probability=0.0)

        if len(audio_data) == 0:
            return TranscriptResult(text="", language=language or "vi", is_final=is_final, language_probability=0.0)

        prompt = initial_prompt if initial_prompt is not None else getattr(settings, "WHISPER_INITIAL_PROMPT", None)

        is_auto = (language is None or language.strip().lower() in ("auto", ""))
        whisper_lang = None if is_auto else language.strip().lower()

        try:
            no_speech_thresh = getattr(settings, "WHISPER_NO_SPEECH_THRESHOLD", 0.6)
            compression_ratio_thresh = getattr(settings, "WHISPER_COMPRESSION_RATIO_THRESHOLD", 2.4)
            transcribe_kwargs = {
                "language": whisper_lang,
                "beam_size": 1,
                "temperature": 0.0,
                "vad_filter": False,  # Custom VAD handled at pipeline level
                "condition_on_previous_text": False,
                "initial_prompt": prompt if prompt else None,
                "without_timestamps": True,
                "no_speech_threshold": no_speech_thresh,
                "compression_ratio_threshold": compression_ratio_thresh,
            }
            try:
                segments, info = self._model.transcribe(audio_data, **transcribe_kwargs)
            except TypeError:
                safe_kwargs = {
                    "language": whisper_lang,
                    "beam_size": 1,
                    "temperature": 0.0,
                    "vad_filter": False,
                    "condition_on_previous_text": False,
                    "initial_prompt": prompt if prompt else None,
                }
                segments, info = self._model.transcribe(audio_data, **safe_kwargs)

            text_parts = [segment.text for segment in segments]
            full_text = " ".join(part.strip() for part in text_parts if part.strip()).strip()

            detected_lang = info.language if info and info.language else (language or "vi")
            lang_prob = getattr(info, "language_probability", 0.0) if info else 0.0

            # Text-level script heuristic verification for maximum accuracy
            if full_text:
                if JAPANESE_KANA_REGEX.search(full_text):
                    detected_lang = "ja"
                    lang_prob = max(lang_prob, 0.95)
                elif VIETNAMESE_DIACRITICS_REGEX.search(full_text):
                    detected_lang = "vi"
                    lang_prob = max(lang_prob, 0.95)

            return TranscriptResult(
                text=full_text,
                language=detected_lang,
                is_final=is_final,
                language_probability=lang_prob,
            )
        except Exception as ex:
            logger.error("Error during Whisper transcription: %s", ex)
            return TranscriptResult(text="", language=language or "vi", is_final=is_final, language_probability=0.0)

    async def transcribe(
        self,
        audio: Union[bytes, np.ndarray],
        language: Optional[str] = "vi",
        is_final: bool = True,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptResult:
        """Asynchronously transcribes audio chunk using faster-whisper without blocking event loop."""
        if audio is None or len(audio) == 0:
            return TranscriptResult(text="", language=language or "vi", is_final=is_final)

        if self._model is None:
            async with self._load_lock:
                readiness = await self._load_model_locked(retry_failed=True)
                if readiness.state != "ready":
                    return TranscriptResult(
                        text="",
                        language=language or "vi",
                        is_final=is_final,
                    )

        # Run inference in worker thread pool so uvicorn event loop is never blocked.
        # Concurrency semaphore limits simultaneous heavy Whisper CPU decoding to prevent CPU thrashing.
        async with self._transcribe_semaphore:
            return await asyncio.to_thread(
                self._transcribe_sync,
                audio,
                language,
                is_final,
                initial_prompt,
            )
