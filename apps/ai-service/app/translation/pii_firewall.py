import re
from typing import NamedTuple


# Regex pattern definitions for sensitive PII entities
_EMAIL_RE = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+", re.IGNORECASE)
_AMOUNT_RE = re.compile(
    r"(?<!\w)(?:[$¥€£]\s*\d[\d.,]*|\d[\d.,]*\s*(?:k|tr|triệu|tỷ|nghìn|ngàn|vạn|usd|vnd|jpy|eur|đ|₫|\$|¥|€|£)(?:\s*(?:vnd|usd|jpy|eur|đ|₫))?)(?!\w)",
    re.IGNORECASE,
)
_PHONE_RE = re.compile(
    r"(?<!\w)(?:\+\d{1,3}[\s.-]?(?:\d{2,4}[\s.-]?){2,4}\d{3,4}|0(?:[\s.-]?\d){8,10})(?!\w)"
)
_LONG_NUMBER_RE = re.compile(r"(?<!\d)\d{8,}(?!\d)")


class MaskResult(NamedTuple):
    masked_text: str
    restore_map: dict[str, str]
    pii_count: int


class TwoWayPiiFirewall:
    """
    Two-way sensitive information firewall inspired by OneAIFW & Immersive Translate.
    - Encodes sensitive PII entities into contextual non-translatable tokens before sending to external LLM/APIs.
    - Token format: __PII_EMAIL_1__, __PII_PHONE_1__, __PII_AMOUNT_1__, __PII_NUMBER_1__
    - Decodes tokens back to original verbatim values after receiving translation.
    - Robust case-insensitive fallback restore matching.
    """

    @staticmethod
    def has_pii(text: str) -> bool:
        if not text:
            return False
        return bool(
            _EMAIL_RE.search(text)
            or _AMOUNT_RE.search(text)
            or _PHONE_RE.search(text)
            or _LONG_NUMBER_RE.search(text)
        )

    @classmethod
    def mask(cls, text: str) -> MaskResult:
        if not text:
            return MaskResult(masked_text="", restore_map={}, pii_count=0)

        masked = str(text)
        restore_map: dict[str, str] = {}
        counter = {"EMAIL": 0, "PHONE": 0, "AMOUNT": 0, "NUMBER": 0}

        # 1. Mask Emails
        def _replace_email(match: re.Match) -> str:
            val = match.group(0)
            counter["EMAIL"] += 1
            token = f"__PII_EMAIL_{counter['EMAIL']}__"
            restore_map[token] = val
            return token

        masked = _EMAIL_RE.sub(_replace_email, masked)

        # 2. Mask Phone numbers
        def _replace_phone(match: re.Match) -> str:
            val = match.group(0)
            counter["PHONE"] += 1
            token = f"__PII_PHONE_{counter['PHONE']}__"
            restore_map[token] = val
            return token

        masked = _PHONE_RE.sub(_replace_phone, masked)

        # 3. Mask Amounts / Currencies
        def _replace_amount(match: re.Match) -> str:
            val = match.group(0)
            counter["AMOUNT"] += 1
            token = f"__PII_AMOUNT_{counter['AMOUNT']}__"
            restore_map[token] = val
            return token

        masked = _AMOUNT_RE.sub(_replace_amount, masked)

        # 4. Mask Long Numbers (credit cards, account ids, etc.)
        def _replace_number(match: re.Match) -> str:
            val = match.group(0)
            # Skip if part of an existing placeholder token
            counter["NUMBER"] += 1
            token = f"__PII_NUMBER_{counter['NUMBER']}__"
            restore_map[token] = val
            return token

        # Only search numbers not already inside __PII_*__
        masked = _LONG_NUMBER_RE.sub(_replace_number, masked)

        total_pii = sum(counter.values())
        return MaskResult(masked_text=masked, restore_map=restore_map, pii_count=total_pii)

    @classmethod
    def restore(cls, translated_text: str, restore_map: dict[str, str]) -> str:
        if not translated_text or not restore_map:
            return translated_text or ""

        restored = str(translated_text)
        # Direct exact match replacement
        for token, original_val in restore_map.items():
            if token in restored:
                restored = restored.replace(token, original_val)
            else:
                # Tolerant fallback: Handle LLM alterations (e.g. whitespace or lowercase)
                pattern = re.compile(re.escape(token), re.IGNORECASE)
                restored = pattern.sub(original_val, restored)

                # Tolerant fallback 2: Handle spaces injected around underscores e.g. "__ PII_EMAIL_1 __"
                entity_type_match = re.match(r"__PII_([A-Z]+)_(\d+)__", token)
                if entity_type_match:
                    kind, idx = entity_type_match.groups()
                    relaxed_pattern = re.compile(
                        rf"_{{1,2}}\s*PII_{kind}_{idx}\s*_{{1,2}}", re.IGNORECASE
                    )
                    restored = relaxed_pattern.sub(original_val, restored)

        return restored
