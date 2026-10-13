import asyncio
import io
import logging
import math
import wave
from typing import Any, Optional

import httpx
import numpy as np

from app.config.settings import settings
from app.speech.whisper_service import detect_text_language, is_whisper_hallucination

logger = logging.getLogger("ai_service.groq_stt")

GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
SAMPLE_RATE = 16000
MAX_PROMPT_CHARS = 600

# verbose_json reports the detected language as a full English name.
_LANGUAGE_NAME_TO_CODE: dict[str, str] = {
    "vietnamese": "vi",
    "english": "en",
    "japanese": "ja",
    "korean": "ko",
    "chinese": "zh",
    "mandarin": "zh",
    "cantonese": "zh",
    "french": "fr",
    "german": "de",
    "spanish": "es",
    "arabic": "ar",
    "thai": "th",
    "indonesian": "id",
    "tagalog": "tl",
}


class GroqSTTError(Exception):
    """Groq transcription failed; callers should fall back to the local model."""


def float32_to_wav_bytes(audio_data: np.ndarray, sample_rate: int = SAMPLE_RATE) -> bytes:
    """Encodes mono float32 PCM in [-1, 1] as an in-memory 16-bit WAV file."""
    pcm = np.clip(np.asarray(audio_data, dtype=np.float32), -1.0, 1.0)
    pcm_int16 = (pcm * 32767.0).astype("<i2")
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_int16.tobytes())
    return buffer.getvalue()


def _normalize_language(value: Optional[str]) -> Optional[str]:
    if not value or not isinstance(value, str):
        return None
    clean = value.strip().lower()
    if clean in _LANGUAGE_NAME_TO_CODE:
        return _LANGUAGE_NAME_TO_CODE[clean]
    base = clean.split("-", 1)[0]
    return base if len(base) == 2 else None


class GroqSpeechToTextService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        http_client: Optional[httpx.AsyncClient] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.GROQ_API_KEY
        self.model = model or settings.GROQ_STT_MODEL
        self.timeout_seconds = (
            timeout_seconds if timeout_seconds is not None else settings.GROQ_STT_TIMEOUT_SECONDS
        )
        self._http_client = http_client

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=httpx.Timeout(self.timeout_seconds))
        return self._http_client

    async def close(self) -> None:
        if self._http_client is not None and not self._http_client.is_closed:
            await self._http_client.aclose()

    async def transcribe_audio_chunk(
        self,
        audio_data: np.ndarray,
        source_lang: str | None = None,
        prompt: str | None = None,
    ) -> tuple[str, str, float]:
        """Returns (text, detected_language, confidence). Raises GroqSTTError on any failure."""
        if not self.is_configured:
            raise GroqSTTError("not_configured")

        requested_lang = None
        if source_lang and source_lang.strip().lower() not in ("auto", ""):
            requested_lang = source_lang.strip().lower().split("-", 1)[0]
        fallback_lang = requested_lang or settings.DEFAULT_SOURCE_LANGUAGE or "vi"

        if audio_data is None or len(audio_data) == 0:
            return "", fallback_lang, 0.0

        wav_bytes = float32_to_wav_bytes(audio_data)
        form: dict[str, str] = {
            "model": self.model,
            "response_format": "verbose_json",
            "temperature": "0.0",
        }
        if requested_lang:
            form["language"] = requested_lang
        if prompt and prompt.strip():
            form["prompt"] = prompt.strip()[:MAX_PROMPT_CHARS]

        try:
            response = await asyncio.wait_for(
                self._get_client().post(
                    GROQ_TRANSCRIPTIONS_URL,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    data=form,
                    files={"file": ("audio.wav", wav_bytes, "audio/wav")},
                ),
                timeout=self.timeout_seconds,
            )
        except (asyncio.TimeoutError, httpx.TimeoutException) as ex:
            logger.warning(
                "event=groq_stt_failed reason=timeout timeout_s=%.1f audio_s=%.2f",
                self.timeout_seconds,
                len(audio_data) / SAMPLE_RATE,
            )
            raise GroqSTTError("timeout") from ex
        except httpx.HTTPError as ex:
            logger.warning("event=groq_stt_failed reason=transport error=%s", type(ex).__name__)
            raise GroqSTTError("transport") from ex

        if response.status_code != 200:
            error_code = ""
            try:
                error_body = response.json().get("error", {})
                if isinstance(error_body, dict):
                    error_code = str(error_body.get("code") or error_body.get("type") or "")
            except Exception:
                pass
            logger.warning(
                "event=groq_stt_failed reason=http_status status=%d error_code=%s",
                response.status_code,
                error_code or "unknown",
            )
            raise GroqSTTError(f"http_{response.status_code}")

        try:
            payload = response.json()
        except ValueError as ex:
            logger.warning("event=groq_stt_failed reason=invalid_json")
            raise GroqSTTError("invalid_json") from ex

        return self._parse_response(payload, requested_lang, fallback_lang)

    def _parse_response(
        self,
        payload: dict[str, Any],
        requested_lang: Optional[str],
        fallback_lang: str,
    ) -> tuple[str, str, float]:
        no_speech_thresh = settings.WHISPER_NO_SPEECH_THRESHOLD
        compression_ratio_thresh = settings.WHISPER_COMPRESSION_RATIO_THRESHOLD

        segments = payload.get("segments")
        if isinstance(segments, list) and segments:
            # Mirror the local hallucination guard: drop silent or repetitive segments.
            kept_texts: list[str] = []
            probabilities: list[float] = []
            for segment in segments:
                if not isinstance(segment, dict):
                    continue
                no_speech = segment.get("no_speech_prob")
                if isinstance(no_speech, (int, float)) and no_speech > no_speech_thresh:
                    continue
                comp_ratio = segment.get("compression_ratio")
                if isinstance(comp_ratio, (int, float)) and comp_ratio > compression_ratio_thresh:
                    continue
                seg_text = str(segment.get("text") or "").strip()
                if seg_text:
                    kept_texts.append(seg_text)
                avg_logprob = segment.get("avg_logprob")
                if isinstance(avg_logprob, (int, float)):
                    probabilities.append(math.exp(min(0.0, float(avg_logprob))))
            text = " ".join(kept_texts).strip()
            confidence = sum(probabilities) / len(probabilities) if probabilities else 0.0
        else:
            text = str(payload.get("text") or "").strip()
            confidence = 0.0

        detected_lang = requested_lang or _normalize_language(payload.get("language")) or fallback_lang

        if text:
            if is_whisper_hallucination(text):
                text = ""
            else:
                text_lang, text_confidence = detect_text_language(text, detected_lang)
                if text_confidence >= 0.85:
                    detected_lang = text_lang
                    confidence = max(confidence, text_confidence)

        return text, detected_lang, max(0.0, min(1.0, confidence))
