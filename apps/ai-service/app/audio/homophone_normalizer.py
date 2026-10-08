import re
from typing import Optional

try:
    import opencc
    _OPENCC_T2S = opencc.OpenCC("t2s")
    _OPENCC_S2T = opencc.OpenCC("s2t")
except Exception:
    _OPENCC_T2S = None
    _OPENCC_S2T = None


# Fallback Chinese Traditional <-> Simplified character mapping for resilient normalization
_ZH_T2S_MAP: dict[str, str] = {
    '這': '这', '個': '个', '測': '测', '試': '试', '項': '项',
    '們': '们', '進': '进', '討': '讨', '論': '论', '該': '该',
    '度': '度', '經': '经', '點': '点', '開': '开', '關': '关',
    '會': '会', '議': '议', '說': '说', '話': '话', '語': '语',
}
_ZH_S2T_MAP: dict[str, str] = {v: k for k, v in _ZH_T2S_MAP.items()}


# High-frequency Vietnamese acoustic homophones in IT and business meetings
_COMMON_HOMOPHONE_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Technical & Meeting Terms
    (re.compile(r"\b(?:chó|chốt|trút)\s+giải\s+pháp\s+(?:chiến|truyền|triển)\s+khai\b", re.IGNORECASE), "chốt giải pháp triển khai"),
    (re.compile(r"\btrút\s+giải\s+pháp\b", re.IGNORECASE), "chốt giải pháp"),
    (re.compile(r"\bgiải\s+pháp\s+triển\s+hai\b", re.IGNORECASE), "giải pháp triển khai"),
    (re.compile(r"\b(?:chiến|truyền)\s+khai\s+trên\b", re.IGNORECASE), "triển khai trên"),
    (re.compile(r"\btriển\s+hai\s+trên\b", re.IGNORECASE), "triển khai trên"),
    (re.compile(r"\btruyền\s+khai\b", re.IGNORECASE), "triển khai"),
    (re.compile(r"\bbảo\s+cáo\s+dự\s+án\b", re.IGNORECASE), "báo cáo dự án"),
    (re.compile(r"\bgửi\s+bảo\s+cáo\b", re.IGNORECASE), "gửi báo cáo"),
    (re.compile(r"\btiến\s+đỏ\s+dự\s+án\b", re.IGNORECASE), "tiến độ dự án"),
    (re.compile(r"\bnghiệm\s+thu\s+dự\s+án\b", re.IGNORECASE), "nghiệm thu dự án"),
    # General & Phonetic Variant Homophones
    (re.compile(r"\bmặc\s+khác\b", re.IGNORECASE), "mặt khác"),
    (re.compile(r"\bbăng\s+và\s+tích\b", re.IGNORECASE), "băng và tuyết"),
    (re.compile(r"\bquân\s+năm\b", re.IGNORECASE), "quanh năm"),
    (re.compile(r"\bdần\s+như\b", re.IGNORECASE), "gần như"),
    (re.compile(r"\bdáng\s+đoạn\b", re.IGNORECASE), "gián đoạn"),
    (re.compile(r"\bhình\s+tưởng\b", re.IGNORECASE), "hiện tượng"),
    # Spoken Time & Numbers
    (re.compile(r"\bmời\s+bởi\s+giơ\b", re.IGNORECASE), "17 giờ"),
    (re.compile(r"\bmời\s+bảy\s+giờ\b", re.IGNORECASE), "17 giờ"),
    (re.compile(r"\bmười\s+bẩy\s+giờ\b", re.IGNORECASE), "17 giờ"),
    (re.compile(r"\bmười\s+hai\s+giờ\b", re.IGNORECASE), "12 giờ"),
    (re.compile(r"\bhăm\s+mốt\s+giờ\b", re.IGNORECASE), "21 giờ"),
    # Foreign Acronyms & Spoken Phonetics
    (re.compile(r"\b(?:ê\s*đúp\s*u\s*ét|a\s*w\s*s|ây\s*đắp\s*liu\s*ét|ây\s*đáp\s*lưu\s*ét|ây\s*đáp\s*liu\s*ét)\b", re.IGNORECASE), "AWS"),

    (re.compile(r"\b(?:ki\s*bờ\s*nét|cu\s*bơ\s*nét|cúp\s*bơ\s*nét|kiu\s*bơ\s*nét|k8s)\b", re.IGNORECASE), "Kubernetes"),
    (re.compile(r"\b(?:đốc\s*cơ|đóc\s*cơ|dóc\s*cơ)\b", re.IGNORECASE), "Docker"),
    (re.compile(r"\b(?:pi\s*rờ|p\s*r\b|pi\s*are)\b", re.IGNORECASE), "PR"),
    (re.compile(r"\b(?:ghít\s*hắp|gít\s*hắp)\b", re.IGNORECASE), "GitHub"),
    (re.compile(r"\b(?:bắc\s*lốc|bách\s*lốc)\b", re.IGNORECASE), "Backlog"),
    (re.compile(r"\b(?:hắt\s*phích|hót\s*phích|hót\s*fix)\b", re.IGNORECASE), "Hotfix"),
    (re.compile(r"\b(?:mít\s*ting|mít\s*tinh)\b", re.IGNORECASE), "Meeting"),
    (re.compile(r"\b(?:sì\s*pờ\s*rin|sờ\s*prin)\b", re.IGNORECASE), "Sprint"),
    (re.compile(r"\b(?:đép\s*lôi|đì\s*ploi)\b", re.IGNORECASE), "Deploy"),
]

class AcousticHomophoneNormalizer:
    """
    Sub-millisecond local in-memory acoustic and technical homophone normalizer.
    Corrects frequent acoustic misrecognitions (Acoustic Homophones) from Whisper Base
    for Vietnamese meeting contexts without external cloud API calls.
    """

    def __init__(self, custom_corrections: Optional[dict[str, str]] = None):
        self.custom_corrections = custom_corrections or {}

    def normalize(self, text: str, language: str = "vi") -> str:
        if not text or not isinstance(text, str):
            return ""

        clean_text = text.strip()
        lang_code = (language or "vi").lower().split("-", 1)[0]
        full_lang = (language or "vi").lower()

        # Chinese OpenCC Normalization (Traditional -> Simplified standardization)
        if lang_code in ("zh", "chinese"):
            if full_lang in ("zh-tw", "zh-hk", "zh-hant"):
                if _OPENCC_S2T:
                    try:
                        return _OPENCC_S2T.convert(clean_text)
                    except Exception:
                        pass
                return "".join(_ZH_S2T_MAP.get(c, c) for c in clean_text)
            else:
                if _OPENCC_T2S:
                    try:
                        return _OPENCC_T2S.convert(clean_text)
                    except Exception:
                        pass
                return "".join(_ZH_T2S_MAP.get(c, c) for c in clean_text)

        if lang_code not in ("vi", "vietnamese"):
            return clean_text

        # 1. Apply high-frequency regex patterns
        for pattern, replacement in _COMMON_HOMOPHONE_PATTERNS:
            def _sub(match: re.Match, r=replacement) -> str:
                m_str = match.group(0)
                if m_str and m_str[0].isupper() and r and r[0].islower():
                    return r[0].upper() + r[1:]
                return r

            clean_text = pattern.sub(_sub, clean_text)

        # 2. Apply room / custom glossary corrections
        for wrong_term, correct_term in self.custom_corrections.items():
            pattern = re.compile(rf"\b{re.escape(wrong_term)}\b", re.IGNORECASE)
            clean_text = pattern.sub(correct_term, clean_text)

        return clean_text

# Global singleton
homophone_normalizer = AcousticHomophoneNormalizer()
