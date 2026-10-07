import logging
import re
from typing import Optional

from app.config.settings import settings

logger = logging.getLogger("ai_service.audio.quality_filter")


class SpeechQualityFilter:
    """
    Speech Quality & Hallucination Guardrail:
    - Filters out classic Whisper hallucinations (YouTube outros, watermark phrases).
    - Drops pure filler/interjection utterances (e.g., 'ừm', 'ờ', 'um', 'uh', 'あの').
    - Drops repetitive looping sounds ('ha ha ha ha', 'a a a a').
    - Drops non-verbal acoustic notations ('[tiếng ho]', '♪', '♫', '...').
    """

    # Common Whisper phantom/hallucination sentences by language
    HALLUCINATION_PATTERNS = {
        "vi": [
            r"cảm ơn các bạn đã theo dõi",
            r"cảm ơn các bạn đã xem",
            r"hãy đăng ký kênh",
            r"chúc các bạn một ngày tốt lành",
            r"hẹn gặp lại các bạn",
            r"subtitles by",
            r"phụ đề bởi",
            r"chia sẻ và đăng ký",
            r"like và subscribe",
        ],
        "en": [
            r"thank you for watching",
            r"thanks for watching",
            r"please subscribe",
            r"like and subscribe",
            r"subtitles by",
            r"see you next time",
            r"thanks for listening",
            r"watching this video",
            r"don't forget to subscribe",
        ],
        "ja": [
            r"ご視聴ありがとうございました",
            r"チャンネル登録",
            r"高評価お願いします",
            r"それではまた",
            r"最後までご覧いただき",
            r"次回もよろしくお願いします",
        ],
    }

    # Pure filler words that convey zero semantic value in isolation
    PURE_FILLERS = {
        "vi": {"ừ", "ừm", "ờ", "à", "hả", "hmm", "ơ", "thế à", "à ừ", "uh", "um", "ê", "hở"},
        "en": {"um", "uh", "uh-huh", "hmm", "hm", "ah", "er", "oh", "huh"},
        "ja": {"ええと", "あの", "あー", "うーん", "えーと", "あっ", "えっ", "ふーん"},
    }

    # Acoustic noise patterns
    ACOUSTIC_NOISE_REGEX = re.compile(
        r"^[♪♫\*\.\,\?\!\s\-_–—\(\)\[\]]+$|"
        r"^\[(tiếng ho|tiếng cười|tiếng vỗ tay|nhạc|âm nhạc|music|applause|laughter|cough)\]$",
        re.IGNORECASE,
    )

    # Pathological repetition pattern (a word or sound repeated 3+ times consecutively)
    REPETITION_REGEX = re.compile(r"(\b\w+\b)(?:\s+\1){3,}", re.IGNORECASE)
    # Multi-word phrase repetition (e.g., 'đừng có đừng có đừng có')
    PHRASE_REPETITION_REGEX = re.compile(
        r"(\b(?:\w+\s+){1,3}\w+\b)(?:\s+\1){2,}", re.IGNORECASE
    )
    # CJK/Kana repeating loops (e.g., 'やめましょう やめましょう', 'しないでくださいしないでください')
    CJK_REPETITION_REGEX = re.compile(
        r"([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]{2,8})\1{2,}"
    )

    def __init__(self, enabled: Optional[bool] = None):
        self.enabled = (
            enabled if enabled is not None else settings.QUALITY_FILTER_ENABLED
        )
        self.hallucination_enabled = settings.HALLUCINATION_FILTER_ENABLED
        self.filler_enabled = settings.FILLER_FILTER_ENABLED

        # Compile regexes for performance
        self._compiled_hallucinations = {}
        for lang, patterns in self.HALLUCINATION_PATTERNS.items():
            combined = "|".join(f"(?:{p})" for p in patterns)
            self._compiled_hallucinations[lang] = re.compile(combined, re.IGNORECASE)

    def is_hallucination(self, text: str, language: str = "vi") -> bool:
        """Detects whether text matches known Whisper hallucination signatures."""
        if not self.enabled or not self.hallucination_enabled or not text:
            return False

        clean_text = text.strip().lower()

        # Check target language patterns
        lang_key = language.strip().lower()
        if lang_key in self._compiled_hallucinations:
            if self._compiled_hallucinations[lang_key].search(clean_text):
                return True

        # Check English hallucinations as cross-lingual fallback
        if lang_key != "en" and "en" in self._compiled_hallucinations:
            if self._compiled_hallucinations["en"].search(clean_text):
                return True

        return False

    def is_pure_filler(self, text: str, language: str = "vi") -> bool:
        """Detects if an utterance is composed solely of filler interjections."""
        if not self.enabled or not self.filler_enabled or not text:
            return False

        # Strip terminal punctuation
        clean_text = text.strip().lower().rstrip(".!?,。！？、:;…")
        if not clean_text:
            return True

        lang_key = language.strip().lower()
        filler_set = self.PURE_FILLERS.get(lang_key, set())
        filler_set_en = self.PURE_FILLERS.get("en", set())

        # Check single filler match
        if clean_text in filler_set or clean_text in filler_set_en:
            return True

        # Check if every word in a short token sequence (< 4 words) is a filler
        words = clean_text.split()
        if len(words) <= 3 and all((w in filler_set or w in filler_set_en) for w in words):
            return True

        return False

    def is_acoustic_noise(self, text: str) -> bool:
        """Detects if text contains solely music notation, brackets, or cough/applause markers."""
        if not text:
            return True
        clean = text.strip()
        return bool(self.ACOUSTIC_NOISE_REGEX.match(clean))

    def has_pathological_repetition(self, text: str) -> bool:
        """Detects looping stutter or infinite repeating words/phrases."""
        if not text:
            return False
        clean = text.strip()
        if self.REPETITION_REGEX.search(clean):
            return True
        if self.PHRASE_REPETITION_REGEX.search(clean):
            return True
        if self.CJK_REPETITION_REGEX.search(clean):
            return True
        words = clean.split()
        if len(words) >= 6:
            unique_ratio = len(set(w.lower() for w in words)) / len(words)
            if unique_ratio < 0.35:
                return True
        return False

    def filter_speech(self, text: str, language: str = "vi") -> tuple[bool, str]:
        """
        Main quality filter pipeline.
        Returns:
            (is_valid, rejection_reason)
        """
        if not text or not text.strip():
            return False, "empty"

        clean_text = text.strip()

        if self.is_acoustic_noise(clean_text):
            return False, "acoustic_noise"

        if self.is_hallucination(clean_text, language):
            return False, "whisper_hallucination"

        if self.is_pure_filler(clean_text, language):
            return False, "pure_filler"

        if self.has_pathological_repetition(clean_text):
            return False, "repetition_loop"

        return True, ""

    CORRUPT_TRANSLATION_MARKERS = (
        "mymemory warning",
        "quota exceeded",
        "too many requests",
        "translation limit",
        "[error]",
        "error:",
    )

    def filter_translation(self, text: str, language: str = "") -> tuple[bool, str]:
        """
        Validates that a translated string is genuine and not corrupted or looping.
        Used to protect cache from being poisoned by flawed translation artifacts.
        """
        if not text or not text.strip():
            return False, "empty"

        clean = text.strip()
        lower = clean.lower()

        for marker in self.CORRUPT_TRANSLATION_MARKERS:
            if marker in lower:
                return False, f"corrupt_marker:{marker}"

        if self.is_acoustic_noise(clean):
            return False, "acoustic_noise"

        if self.has_pathological_repetition(clean):
            return False, "repetition_loop"

        if self.is_hallucination(clean, language):
            return False, "hallucination"

        return True, ""
