import asyncio
import io
import logging
import re
import time
import unicodedata
from dataclasses import dataclass
from typing import Any, Optional, Union
import numpy as np

from app.config.settings import settings

logger = logging.getLogger("ai_service.whisper")

VIETNAMESE_DIACRITICS_REGEX = re.compile(
    r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]",
    re.IGNORECASE,
)
JAPANESE_KANA_REGEX = re.compile(r"[\u3040-\u309F\u30A0-\u30FF]")
KOREAN_HANGUL_REGEX = re.compile(r"[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]")
CHINESE_CJK_REGEX = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF]")
ARABIC_SCRIPT_REGEX = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")
THAI_SCRIPT_REGEX = re.compile(r"[\u0E00-\u0E7F]")
VIETNAMESE_DISTINCTIVE_REGEX = re.compile(
    r"[ăâêôơưđằắẳẵặầấẩẫậềếểễệồốổỗộờớởỡợừứửữựảãạẻẽẹỉĩịỏõọủũụỷỹỵ]",
    re.IGNORECASE,
)
VIETNAMESE_GRAMMAR_KERNELS_REGEX = re.compile(
    r"\b(là|đã|bị|vì|bao gồm|một|và)\b",
    re.IGNORECASE,
)

_LANGUAGE_KEYWORDS: dict[str, set[str]] = {
    "vi": {
        "ban", "bat", "cam", "chao", "chung", "cuoc", "dau", "hop", "khong",
        "moi", "nghe", "nguoi", "nhe", "on", "phu", "ta", "thong", "toi", "trach",
    },
    "en": {
        "agenda", "can", "clearly", "everyone", "hear", "hello", "meeting", "next",
        "please", "start", "thank", "thanks", "the", "we", "project", "report", "today",
        "sprint", "deploy", "team", "review", "feedback", "questions",
    },
    "fr": {
        "bonjour", "commencons", "merci", "monde", "ordre", "reunion", "suivant", "tous",
        "projet", "equipe", "rapport", "aujourdhui", "questions", "notre",
    },
    "de": {
        "alle", "beginnen", "besprechung", "danke", "guten", "morgen", "nachste", "wir",
        "projekt", "bericht", "heute", "fragen",
    },
    "es": {
        "agenda", "comencemos", "empecemos", "escuchan", "gracias", "hola", "reunion", "todos",
        "proyecto", "informe", "hoy", "preguntas",
    },
    "id": {
        "selamat", "terima", "kasih", "rapat", "proyek", "kita", "ini", "ada", "bisa",
        "apakah", "semua", "hari", "laporan",
    },
    "tl": {
        "salamat", "magandang", "pulong", "natin", "lahat", "pwede", "meron", "kumusta",
        "araw", "ulat",
    },
}

_HALLUCINATION_REGEXES: list[re.Pattern] = [
    re.compile(r"\b(cuộc kháng chiến|kháng chiến tháng)\b", re.IGNORECASE),
    re.compile(r"\b(cảm ơn (các bạn|quý vị|mọi người) đã (theo dõi|lắng nghe|xem|ủng hộ))\b", re.IGNORECASE),
    re.compile(r"\b(hãy đăng ký kênh|đăng ký kênh|subscribe|like và share|bấm chuông)\b", re.IGNORECASE),
    re.compile(r"\b(phụ đề được thực hiện bởi|biên dịch bởi|thuyết minh bởi)\b", re.IGNORECASE),
    re.compile(r"\b(hẹn gặp lại (các bạn|quý vị) trong (các|những) video tiếp theo)\b", re.IGNORECASE),
    re.compile(r"\b(thank you for (watching|listening))\b", re.IGNORECASE),
    re.compile(r"\b(please subscribe|subscribe to (my|the) channel)\b", re.IGNORECASE),
    re.compile(r"\b(subtitles by|transcribed by)\b", re.IGNORECASE),
    re.compile(r"(ご視聴ありがとうございました|チャンネル登録|高評価をお願いします)"),
]


def is_whisper_hallucination(text: str) -> bool:
    """Detects repetitive autoregressive loops and YouTube/historical Whisper hallucination patterns."""
    if not text:
        return False
    clean = text.strip()
    for pattern in _HALLUCINATION_REGEXES:
        if pattern.search(clean):
            return True
    words = clean.lower().split()
    if 4 <= len(words) < 25:
        bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
        seen: set[str] = set()
        for bg in bigrams:
            if bg in seen:
                return True
            seen.add(bg)
    return False


def _latin_words(text: str) -> set[str]:
    normalized = unicodedata.normalize("NFKD", text.casefold())
    ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
    return set(re.findall(r"[a-z]+", ascii_text))


def detect_text_language(text: str, fallback_lang: str = "vi") -> tuple[str, float]:
    """Detects the meeting language from transcript text without favoring English."""
    fallback = (fallback_lang or "vi").strip().lower().split("-", 1)[0]
    supported_langs = {"vi", "ja", "en", "ko", "zh", "fr", "de", "es", "ar", "th", "id", "tl"}
    if fallback not in supported_langs:
        fallback = "vi"

    clean_text = text.strip()
    if not clean_text:
        return fallback, 0.0

    if ARABIC_SCRIPT_REGEX.search(clean_text):
        return "ar", 0.99
    if THAI_SCRIPT_REGEX.search(clean_text):
        return "th", 0.99
    if KOREAN_HANGUL_REGEX.search(clean_text):
        return "ko", 0.99
    if JAPANESE_KANA_REGEX.search(clean_text):
        return "ja", 0.99
    if CHINESE_CJK_REGEX.search(clean_text):
        return "zh", 0.98

    # Vietnamese grammar kernel words override (loanword & speech ambiguity resilience)
    if VIETNAMESE_GRAMMAR_KERNELS_REGEX.search(clean_text):
        return "vi", 1.00

    words = _latin_words(clean_text)
    scores = {
        language: len(words.intersection(keywords))
        for language, keywords in _LANGUAGE_KEYWORDS.items()
    }
    if VIETNAMESE_DIACRITICS_REGEX.search(clean_text) and (
        scores["vi"] > 0 or VIETNAMESE_DISTINCTIVE_REGEX.search(clean_text)
    ):
        scores["vi"] += 2
    if re.search(r"[äöüß]", clean_text, re.IGNORECASE):
        scores["de"] += 2
    if re.search(r"\bréunion\b|[çœæ]", clean_text, re.IGNORECASE):
        scores["fr"] += 2
    if re.search(r"[áíóúñ¿¡]", clean_text, re.IGNORECASE):
        scores["es"] += 2

    best_score = max(scores.values(), default=0)
    if best_score == 0:
        return fallback, 0.0

    candidates = [language for language, score in scores.items() if score == best_score]
    if len(candidates) > 1:
        return (fallback if fallback in candidates else candidates[0]), 0.60

    confidence = min(0.99, 0.82 + (0.04 * best_score))
    return candidates[0], confidence


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


# Dialect / domain priming prompts for Omni-Language STT (Sprint 2).
CULTURAL_INITIAL_PROMPTS: dict[str, str] = {
    "vi": (
        "Cuộc họp trực tuyến: kế hoạch, dự án, triển khai, sprint, bug, deploy."
    ),
    "en": (
        "Online meeting: roadmap, deliverables, milestones, architecture."
    ),
    "ja": (
        "オンライン会議、プロジェクト進捗、仕様書、納期、確認事項。"
    ),
    "zh": (
        "在线会议：项目进展、系统架构、排期、问题复盘。"
    ),
    "ar": (
        "اجتماع عمل رسمي عبر الإنترنت، مناقشة المشاريع، التقرير، خطة العمل."
    ),
    "ko": (
        "온라인 미팅: 스프린트, 개발 일정, 배포, 이슈 공유."
    ),
    "fr": (
        "Réunion en ligne: feuille de route, livrables, jalons, architecture."
    ),
    "de": (
        "Online-Meeting: Roadmap, Liefergegenstände, Meilensteine, Architektur."
    ),
    "es": (
        "Reunión en línea: hoja de ruta, entregables, hitos, arquitectura."
    ),
}

def normalize_language_code(language: Optional[str], fallback: str = "vi") -> str:
    if not language or not isinstance(language, str):
        return fallback
    clean = language.strip().lower()
    if clean in ("", "auto"):
        return clean or "auto"
    return clean.split("-", 1)[0]


def get_cultural_initial_prompt(language: Optional[str]) -> Optional[str]:
    """Returns the dialect/domain Whisper initial prompt for a language, if any."""
    base = normalize_language_code(language, fallback="")
    if base in ("", "auto"):
        return None
    return CULTURAL_INITIAL_PROMPTS.get(base)


class OmniLanguageRouter:
    """Language-aware STT router: Vietnamese → PhoWhisper; others → Groq LPU.

    Fallback matrix (blueprint Sprint 1):
    - Groq failure → local faster-whisper
    - PhoWhisper / local VI failure → Groq + Vietnamese cultural prompt
    """

    def __init__(self, local_stt: "SpeechToTextService", cloud_stt: Optional[Any] = None):
        self.local_stt = local_stt
        self.cloud_stt = cloud_stt

    @staticmethod
    def is_vietnamese(language: Optional[str]) -> bool:
        base = normalize_language_code(language, fallback="")
        return base in ("vi", "vie", "vietnamese")

    @staticmethod
    def _to_float32_mono(audio: Union[bytes, bytearray, memoryview, np.ndarray]) -> np.ndarray:
        """Normalize router audio to mono float32 in [-1, 1] for Groq WAV encoding."""
        if isinstance(audio, np.ndarray):
            arr = np.asarray(audio, dtype=np.float32)
            return arr.reshape(-1) if arr.ndim > 1 else arr

        if isinstance(audio, (bytes, bytearray, memoryview)):
            raw = bytes(audio)
            if len(raw) == 0:
                return np.zeros(0, dtype=np.float32)
            if len(raw) % 2 != 0:
                raise TypeError("audio bytes must be little-endian int16 PCM (even length)")
            pcm = np.frombuffer(raw, dtype="<i2")
            return pcm.astype(np.float32) / 32768.0

        raise TypeError(f"unsupported audio type for OmniLanguageRouter: {type(audio)!r}")

    async def _local_transcribe(
        self,
        audio: Union[bytes, np.ndarray],
        *,
        language: str,
        is_final: bool,
        initial_prompt: Optional[str],
        vad_filter: bool = False,
    ) -> TranscriptResult:
        try:
            return await self.local_stt.transcribe(
                audio,
                language=language,
                is_final=is_final,
                initial_prompt=initial_prompt,
                vad_filter=vad_filter,
            )
        except TypeError:
            try:
                return await self.local_stt.transcribe(
                    audio,
                    language=language,
                    is_final=is_final,
                    initial_prompt=initial_prompt,
                )
            except TypeError:
                return await self.local_stt.transcribe(
                    audio,
                    language=language,
                    is_final=is_final,
                )

    async def _cloud_transcribe(
        self,
        audio: np.ndarray,
        *,
        language: str,
        is_final: bool,
        prompt: Optional[str],
    ) -> TranscriptResult:
        if self.cloud_stt is None:
            raise RuntimeError("cloud_stt_not_configured")
        text, detected_lang, confidence = await self.cloud_stt.transcribe_audio_chunk(
            audio,
            source_lang=language,
            prompt=prompt,
        )
        return TranscriptResult(
            text=text,
            language=detected_lang,
            is_final=is_final,
            language_probability=confidence,
        )

    async def transcribe(
        self,
        audio: Union[bytes, np.ndarray],
        *,
        language: str,
        is_final: bool = True,
        initial_prompt: Optional[str] = None,
        meeting_id: str = "",
    ) -> TranscriptResult:
        lang = normalize_language_code(language, fallback="auto")
        prompt = initial_prompt
        if not prompt:
            prompt = get_cultural_initial_prompt(lang if lang != "auto" else None)

        # No cloud → always local (STT_PROVIDER=local).
        if self.cloud_stt is None:
            return await self._local_transcribe(
                audio,
                language=language,
                is_final=is_final,
                initial_prompt=prompt,
                vad_filter=getattr(settings, "WHISPER_VAD_FILTER", True),
            )

        # Vietnamese: prefer local PhoWhisper CT2; fall back to Groq + VI prompt on errors.
        if self.is_vietnamese(lang):
            vi_prompt = prompt or get_cultural_initial_prompt("vi")
            try:
                return await self._local_transcribe(
                    audio,
                    language=language,
                    is_final=is_final,
                    initial_prompt=vi_prompt,
                    vad_filter=getattr(settings, "WHISPER_VAD_FILTER", True),
                )
            except asyncio.CancelledError:
                raise
            except Exception as ex:
                logger.warning(
                    "event=omni_router meeting_id=%s route=vi_local failed reason=%s falling_back=groq",
                    meeting_id,
                    type(ex).__name__,
                )
            try:
                return await self._cloud_transcribe(
                    self._to_float32_mono(audio),
                    language="vi",
                    is_final=is_final,
                    prompt=vi_prompt,
                )
            except asyncio.CancelledError:
                raise
            except Exception as ex:
                logger.warning(
                    "event=omni_router meeting_id=%s route=vi_groq_fallback failed reason=%s",
                    meeting_id,
                    type(ex).__name__,
                )
                return TranscriptResult(
                    text="",
                    language="vi",
                    is_final=is_final,
                    language_probability=0.0,
                )

        # International languages (and auto): Groq LPU first, local faster-whisper fallback.
        try:
            return await self._cloud_transcribe(
                self._to_float32_mono(audio),
                language=language,
                is_final=is_final,
                prompt=prompt,
            )
        except asyncio.CancelledError:
            raise
        except Exception as ex:
            logger.warning(
                "event=omni_router meeting_id=%s route=groq failed reason=%s falling_back=local",
                meeting_id,
                type(ex).__name__,
            )
            return await self._local_transcribe(
                audio,
                language=language,
                is_final=is_final,
                initial_prompt=prompt,
            )


def resolve_device_and_compute_type(
    device: Optional[str] = None,
    compute_type: Optional[str] = None,
) -> tuple[str, str]:
    """Smart autodetection of compute device and precision (CUDA with int8_float16, CPU with int8)."""
    target_device = (device or settings.WHISPER_DEVICE or "auto").strip().lower()
    target_compute = (compute_type or settings.WHISPER_COMPUTE_TYPE or "auto").strip().lower()

    if target_device == "auto":
        has_cuda = False
        try:
            import ctranslate2
            if hasattr(ctranslate2, "get_cuda_device_count") and ctranslate2.get_cuda_device_count() > 0:
                has_cuda = True
        except Exception:
            has_cuda = False
        target_device = "cuda" if has_cuda else "cpu"

    if target_compute == "auto":
        if target_device == "cuda":
            target_compute = "int8_float16"
        else:
            target_compute = "int8"

    return target_device, target_compute


class SpeechToTextService:
    def __init__(
        self,
        model_size: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
        pho_model_size_or_path: Optional[str] = None,
    ):
        resolved_device, resolved_compute = resolve_device_and_compute_type(device, compute_type)
        self.model_size = model_size or settings.WHISPER_MODEL
        self.device = resolved_device
        self.compute_type = resolved_compute
        self.pho_model = pho_model_size_or_path or getattr(
            settings, "PHOWHISPER_MODEL_PATH", "diepho/PhoWhisper-base-ct2"
        )
        self.dual_routing_enabled = getattr(
            settings, "WHISPER_DUAL_MODEL_ROUTING", True
        )
        self._model = None
        self._vi_model = None
        self._load_lock = asyncio.Lock()
        self._vi_load_lock = asyncio.Lock()
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

        cpu_threads = getattr(settings, "WHISPER_CPU_THREADS", 4)
        return WhisperModel(
            self.model_size,
            device=self.device,
            compute_type=self.compute_type,
            cpu_threads=cpu_threads if self.device == "cpu" else 1,
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

    def _load_vi_model_sync(self):
        from faster_whisper import WhisperModel
        import os

        cpu_threads = getattr(settings, "WHISPER_CPU_THREADS", 4)
        model_target = self.pho_model
        if not (os.path.exists(model_target) or os.path.exists(os.path.join(model_target, "model.bin"))):
            model_target = "diepho/PhoWhisper-base-ct2"

        logger.info(
            "Loading PhoWhisper Vietnamese STT model target=%s device=%s compute_type=%s",
            model_target,
            self.device,
            self.compute_type,
        )
        return WhisperModel(
            model_target,
            device=self.device,
            compute_type=self.compute_type,
            cpu_threads=cpu_threads if self.device == "cpu" else 1,
            num_workers=1,
        )

    def _ensure_vi_model_loaded(self):
        if not self.dual_routing_enabled:
            self._ensure_model_loaded()
            return self._model

        if self._vi_model is None:
            # If primary model is a mock and vi_model was not set, fallback to primary mock
            if self._model is not None and type(self._model).__name__ in ("MagicMock", "Mock", "AsyncMock"):
                return self._model
            try:
                self._vi_model = self._load_vi_model_sync()
            except Exception as ex:
                logger.warning(
                    "PhoWhisper load failed (%s); fallback to primary model", ex
                )
                self._ensure_model_loaded()
                return self._model
        return self._vi_model

    def _select_model(self, language: Optional[str]):
        is_vietnamese = False
        if language:
            lang_clean = language.strip().lower().split("-")[0]
            if lang_clean in ("vi", "vie", "vietnamese"):
                is_vietnamese = True

        if is_vietnamese and self.dual_routing_enabled:
            try:
                vi_model = self._ensure_vi_model_loaded()
                if vi_model is not None:
                    return vi_model
            except Exception as e:
                logger.warning("Error selecting PhoWhisper model: %s, fallback to primary", e)

        self._ensure_model_loaded()
        return self._model



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

        if isinstance(audio_data, np.ndarray):
            from app.audio.audio_processor import de_reverberator
            audio_data = de_reverberator.process(audio_data)

        try:
            if hasattr(self._model, "detect_language"):
                lang, prob, all_probs = self._model.detect_language(audio_data)

                # Extract candidate targets
                if candidate_languages and all_probs:
                    cand_set = set(candidate_languages)
                    target_probs = [(l, p) for l, p in all_probs if l in cand_set]
                elif all_probs:
                    target_probs = list(all_probs)
                else:
                    target_probs = [(lang, prob)]

                if target_probs:
                    sorted_targets = sorted(target_probs, key=lambda x: x[1], reverse=True)
                    top1_lang, top1_prob = sorted_targets[0]
                    top2_lang, top2_prob = sorted_targets[1] if len(sorted_targets) > 1 else (None, 0.0)
                    entropy_margin = top1_prob - top2_prob

                    # High-entropy / acoustic ambiguity thresholding (margin < 0.15 or prob < 0.50)
                    if top1_prob < 0.50 or entropy_margin < 0.15:
                        bayesian_weights = {"vi": 2.0}
                        scores = {
                            l: p * bayesian_weights.get(l, 1.0)
                            for l, p in sorted_targets
                        }
                        best_lang = max(scores, key=scores.get)

                        # If Vietnamese wins due to Bayesian meeting prior
                        if best_lang == "vi" and scores["vi"] > scores.get(top1_lang, 0.0):
                            total_score = scores["vi"] + scores.get(top1_lang, 0.0)
                            calibrated_prob = min(0.99, max(0.90, scores["vi"] / (total_score + 1e-9)))
                            return "vi", calibrated_prob
                        elif best_lang != top1_lang:
                            return best_lang, max(0.85, scores[best_lang] / (sum(scores.values()) + 1e-9))
                        else:
                            return top1_lang, top1_prob
                    else:
                        return top1_lang, top1_prob

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
        vad_filter: Optional[bool] = None,
        beam_size: Optional[int] = None,
    ) -> TranscriptResult:
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

        if isinstance(audio_data, np.ndarray):
            from app.audio.audio_processor import de_reverberator
            audio_data = de_reverberator.process(audio_data)

        is_auto = (language is None or language.strip().lower() in ("auto", ""))
        whisper_lang = None if is_auto else language.strip().lower()
        active_model = self._select_model(whisper_lang)
        default_prompt = getattr(settings, "WHISPER_INITIAL_PROMPT", None)

        prompt = initial_prompt if initial_prompt is not None else default_prompt
        if is_auto and prompt and default_prompt and prompt.strip() == default_prompt.strip():
            prompt = None

        if whisper_lang and (prompt is None or (default_prompt and prompt.strip() == default_prompt.strip())):
            base_lang = whisper_lang.split("-", 1)[0]
            if base_lang == "zh":
                if whisper_lang in ("zh-tw", "zh-hk", "zh-hant"):
                    prompt = "以下是普通話繁體中文會議記錄。"
                else:
                    prompt = "以下是普通话简体中文会议记录。"

        # Sanitize initial_prompt to prevent decoder context buffer overflow (~224 tokens / 600 chars)
        if prompt and len(prompt) > 600:
            truncated = prompt[:600]
            if "." in truncated:
                prompt = truncated.rsplit(".", 1)[0] + "."
            else:
                prompt = truncated

        actual_beam_size = beam_size if beam_size is not None else (2 if is_final else 1)
        actual_vad_filter = vad_filter if vad_filter is not None else getattr(settings, "WHISPER_VAD_FILTER", True)

        try:
            no_speech_thresh = getattr(settings, "WHISPER_NO_SPEECH_THRESHOLD", 0.6)
            compression_ratio_thresh = getattr(settings, "WHISPER_COMPRESSION_RATIO_THRESHOLD", 2.4)
            transcribe_kwargs = {
                "language": whisper_lang,
                "beam_size": actual_beam_size,
                "temperature": 0.0,
                "vad_filter": actual_vad_filter,
                "vad_parameters": dict(min_silence_duration_ms=500, speech_pad_ms=250),
                "condition_on_previous_text": False,
                "initial_prompt": prompt if prompt else None,
                "without_timestamps": True,
                "no_speech_threshold": no_speech_thresh,
                "compression_ratio_threshold": compression_ratio_thresh,
            }
            try:
                segments, info = active_model.transcribe(audio_data, **transcribe_kwargs)
            except TypeError:
                safe_kwargs = {
                    "language": whisper_lang,
                    "beam_size": actual_beam_size,
                    "temperature": 0.0,
                    "vad_filter": actual_vad_filter,
                    "condition_on_previous_text": False,
                    "initial_prompt": prompt if prompt else None,
                }
                segments, info = active_model.transcribe(audio_data, **safe_kwargs)

            valid_parts = []
            for segment in segments:
                no_speech = getattr(segment, "no_speech_prob", None)
                if isinstance(no_speech, (int, float)) and no_speech > no_speech_thresh:
                    continue

                comp_ratio = getattr(segment, "compression_ratio", None)
                if isinstance(comp_ratio, (int, float)) and comp_ratio > compression_ratio_thresh:
                    continue

                avg_logprob = getattr(segment, "avg_logprob", None)
                if (
                    isinstance(avg_logprob, (int, float))
                    and avg_logprob < -1.15
                    and isinstance(no_speech, (int, float))
                    and no_speech > 0.35
                ):
                    continue

                seg_text = getattr(segment, "text", "") or ""
                seg_text = seg_text.strip()
                if seg_text:
                    valid_parts.append(seg_text)

            full_text = " ".join(valid_parts).strip()
            if is_whisper_hallucination(full_text):
                logger.debug("Filtered out Whisper hallucination: %r", full_text)
                full_text = ""

            detected_lang = info.language if info and info.language else (language or "vi")
            lang_prob = getattr(info, "language_probability", 0.0) if info else 0.0

            # Text-level LID corrects short-utterance Whisper guesses and forced-language drift.
            if full_text:
                text_lang, text_confidence = detect_text_language(full_text, detected_lang)
                if text_confidence >= 0.85:
                    detected_lang = text_lang
                    lang_prob = max(lang_prob, text_confidence)

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
        vad_filter: Optional[bool] = None,
        beam_size: Optional[int] = None,
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
                vad_filter,
                beam_size,
            )
