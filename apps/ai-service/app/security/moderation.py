import logging
import re
from typing import Optional

from app.config.settings import settings

logger = logging.getLogger("ai_service.security.moderation")


class ContentModerationFilter:
    """
    Enterprise Content Moderation & Policy Guard:
    - Detects profanity, toxic slurs, and offensive swearing across VI, EN, JA.
    - Masks or blocks DLP/PII leakage (credit card numbers, exposed passwords/keys).
    - Configurable policy actions: 'mask' (replace with ***) or 'drop' (suppress translation).
    """

    # Comprehensive profanity patterns
    PROFANITY_PATTERNS = {
        "vi": [
            r"\bđịt\w*\b",
            r"\bđụ\w*\b",
            r"\bđ[c|m]\b",
            r"\bđ[c|m]m\b",
            r"\bvcl\b",
            r"\bvãi\s*(?:lồn|cặc|đái|chưởng)\b",
            r"\bcon\s*mẹ\s*(?:mày|nó)\b",
            r"\bchó\s*(?:đẻ|chết)\b",
            r"\bmẹ\s*kiếp\b",
            r"\blồn\b",
            r"\bcặc\b",
            r"\bbuồi\b",
            r"\bđồ\s*súc\s*sinh\b",
        ],
        "en": [
            r"\bfuck(?:ing|er|ed)?\b",
            r"\bshit(?:ty|head)?\b",
            r"\bbitch(?:es)?\b",
            r"\basshole\b",
            r"\bmotherfucker\b",
            r"\bbastard\b",
            r"\bcunt\b",
            r"\bdickhead\b",
            r"\bnigger\b",
            r"\bfaggot\b",
        ],
        "ja": [
            r"くそ(?:野郎)?",
            r"クソ(?:野郎)?",
            r"死ね",
            r"馬鹿野郎",
            r"バカヤロー",
            r"キチガイ",
            r"ファック",
            r"くたばれ",
        ],
    }

    # DLP / Sensitive Data patterns
    CREDIT_CARD_REGEX = re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b")
    SECRET_KEY_REGEX = re.compile(
        r"(?i)\b(api[_-]?key|password|mật\s*khẩu|passwd|token)\s*[:=]\s*['\"]?([A-Za-z0-9_\-\.]{6,})['\"]?"
    )

    def __init__(self, enabled: Optional[bool] = None, default_mode: Optional[str] = None):
        self.enabled = (
            enabled if enabled is not None else settings.MODERATION_ENABLED
        )
        self.default_mode = (
            default_mode or getattr(settings, "MODERATION_POLICY_MODE", "mask")
        ).lower()

        # Compile regexes
        self._compiled_profanity = {}
        for lang, patterns in self.PROFANITY_PATTERNS.items():
            combined = "|".join(f"(?:{p})" for p in patterns)
            self._compiled_profanity[lang] = re.compile(combined, re.IGNORECASE)

    def contains_profanity(self, text: str, language: str = "vi") -> bool:
        """Checks if text contains offensive words in specified or common languages."""
        if not self.enabled or not text:
            return False

        lang_key = language.strip().lower()
        # Check specific language
        if lang_key in self._compiled_profanity:
            if self._compiled_profanity[lang_key].search(text):
                return True

        # Check English as ubiquitous secondary
        if lang_key != "en" and "en" in self._compiled_profanity:
            if self._compiled_profanity["en"].search(text):
                return True

        return False

    def mask_sensitive_data(self, text: str) -> tuple[str, bool]:
        """Masks credit card numbers and leaked secrets/passwords."""
        modified = False
        res = text

        if self.CREDIT_CARD_REGEX.search(res):
            res = self.CREDIT_CARD_REGEX.sub("[CARD REDACTED]", res)
            modified = True

        if self.SECRET_KEY_REGEX.search(res):
            res = self.SECRET_KEY_REGEX.sub(r"\1: [REDACTED]", res)
            modified = True

        return res, modified

    def mask_profanity(self, text: str, language: str = "vi") -> tuple[str, bool]:
        """Replaces matched profanity words with '***'."""
        if not text:
            return text, False

        lang_key = language.strip().lower()
        modified = False
        res = text

        if lang_key in self._compiled_profanity:
            res_new = self._compiled_profanity[lang_key].sub("***", res)
            if res_new != res:
                modified = True
                res = res_new

        if lang_key != "en" and "en" in self._compiled_profanity:
            res_new = self._compiled_profanity["en"].sub("***", res)
            if res_new != res:
                modified = True
                res = res_new

        return res, modified

    def moderate(
        self,
        text: str,
        language: str = "vi",
        mode: Optional[str] = None,
    ) -> tuple[bool, str, str]:
        """
        Executes enterprise content moderation.
        Returns:
            (is_violation, sanitized_text, action)
            where action in ('pass', 'masked', 'dropped')
        """
        if not self.enabled or not text or not text.strip():
            return False, text, "pass"

        policy_mode = (mode or self.default_mode).lower()

        # 1. Check profanity
        has_profanity = self.contains_profanity(text, language)

        # 2. Check DLP / PII
        sanitized_dlp, has_dlp = self.mask_sensitive_data(text)

        is_violation = has_profanity or has_dlp

        if not is_violation:
            return False, text, "pass"

        # If policy is 'drop', completely suppress offensive utterances
        if policy_mode == "drop":
            logger.info("Content moderation DROPPED violating utterance (mode=drop)")
            return True, "", "dropped"

        # Otherwise 'mask' (sanitization)
        sanitized_text, _ = self.mask_profanity(sanitized_dlp, language)
        logger.info("Content moderation MASKED violating terms (mode=mask)")
        return True, sanitized_text, "masked"
