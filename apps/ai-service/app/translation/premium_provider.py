import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from app.config.settings import settings
from app.translation.glossary import normalize_language_code
from app.translation.pii_firewall import TwoWayPiiFirewall

logger = logging.getLogger(__name__)


SUPPORTED_PREMIUM_PROVIDERS = ("openai", "gemini", "deepl", "groq", "deepseek", "qwen")

# Providers that use OpenAI-compatible /v1/chat/completions endpoints
_OPENAI_COMPATIBLE_PROVIDERS = frozenset({"openai", "groq", "deepseek", "qwen"})

# Asian language codes — prefer Qwen-MT for these pairs
_ASIAN_LANGS = frozenset({"vi", "zh", "ja", "ko"})


# Specialized AI Model Catalog across Machine Translation, STT, and TTS
SPECIALIZED_MODEL_CATALOG: list[dict[str, Any]] = [
    {
        "provider": "qwen",
        "model_name": "qwen-mt-turbo",
        "category": "MT",
        "specialization": "Asian Specialized MT (Vi/Ja/Zh/Ko)",
        "latency_ms_avg": 280,
        "cost_input_per_m": 0.14,
        "cost_output_per_m": 0.28,
        "bleu_tier": "S+",
        "recommended_pairs": ["vi-ja", "ja-vi", "vi-zh", "zh-vi", "ja-zh", "ko-ja"],
        "description": "Model chuyên dịch thuật sâu của Alibaba, tối ưu đặc biệt cho cặp ngôn ngữ Á Đông với ngữ điệu tự nhiên và chuẩn thuật ngữ kinh doanh.",
    },
    {
        "provider": "gemini",
        "model_name": "gemini-2.0-flash",
        "category": "MT",
        "specialization": "Ultra-Low Cost & Fast Multilingual MT",
        "latency_ms_avg": 250,
        "cost_input_per_m": 0.10,
        "cost_output_per_m": 0.40,
        "bleu_tier": "A+",
        "recommended_pairs": ["vi-ja", "vi-en", "ja-en", "all"],
        "description": "Mô hình đa phương thức tốc độ cao của Google, chi phí cực rẻ ($0.10/1M tokens) với độ trễ thấp phù hợp cho cuộc họp trực tiếp.",
    },
    {
        "provider": "deepseek",
        "model_name": "deepseek-chat",
        "category": "MT",
        "specialization": "Budget Conversational & Technical MT",
        "latency_ms_avg": 350,
        "cost_input_per_m": 0.14,
        "cost_output_per_m": 0.28,
        "bleu_tier": "A+",
        "recommended_pairs": ["vi-en", "vi-ja", "vi-zh"],
        "description": "Mô hình suy luận ngữ cảnh sâu với chi phí siêu tiết kiệm, dịch rất chuẩn tiếng Việt và thuật ngữ công nghệ.",
    },
    {
        "provider": "groq",
        "model_name": "llama-3.3-70b-versatile",
        "category": "MT",
        "specialization": "Ultra-Fast LPU Hardware Accelerated MT",
        "latency_ms_avg": 160,
        "cost_input_per_m": 0.59,
        "cost_output_per_m": 0.79,
        "bleu_tier": "A",
        "recommended_pairs": ["vi-en", "en-vi", "en-es", "en-fr", "realtime_interim"],
        "description": "Chạy trên chip LPU chuyên dụng của Groq với tốc độ siêu nhanh (~160ms), lý tưởng cho hiển thị phụ đề trực tiếp không độ trễ.",
    },
    {
        "provider": "deepl",
        "model_name": "DeepL API Pro/Free",
        "category": "MT",
        "specialization": "European & Corporate Formal MT",
        "latency_ms_avg": 300,
        "cost_input_per_m": 20.0,
        "cost_output_per_m": 20.0,
        "bleu_tier": "S",
        "recommended_pairs": ["en-ja", "ja-en", "en-de", "en-fr"],
        "description": "Chuẩn mực vàng của ngành dịch thuật cho các ngôn ngữ châu Âu và Nhật - Anh với văn phong hành chính trang trọng.",
    },
    {
        "provider": "openai",
        "model_name": "gpt-4o-mini",
        "category": "MT",
        "specialization": "General Enterprise Fallback MT",
        "latency_ms_avg": 380,
        "cost_input_per_m": 0.15,
        "cost_output_per_m": 0.60,
        "bleu_tier": "A",
        "recommended_pairs": ["all"],
        "description": "Mô hình đa nhiệm phổ biến của OpenAI, phục vụ làm tầng dự phòng tin cậy cho doanh nghiệp.",
    },
    {
        "provider": "local_gtx",
        "model_name": "Google GTX Neural Multi-Thread",
        "category": "MT",
        "specialization": "Zero-Cost Standard Fallback",
        "latency_ms_avg": 220,
        "cost_input_per_m": 0.0,
        "cost_output_per_m": 0.0,
        "bleu_tier": "B+",
        "recommended_pairs": ["all"],
        "description": "Engine dịch đa luồng hoàn toàn miễn phí ($0 token), làm lưới an toàn dự phòng vĩnh viễn khi ngoại mạng có sự cố.",
    },
    {
        "provider": "whisper",
        "model_name": "faster-whisper-tiny / small int8",
        "category": "STT",
        "specialization": "Real-time Acoustic Speech-to-Text with VAD",
        "latency_ms_avg": 180,
        "cost_input_per_m": 0.0,
        "cost_output_per_m": 0.0,
        "bleu_tier": "A+",
        "recommended_pairs": ["vi", "ja", "en", "multilingual"],
        "description": "Công nghệ nhận diện giọng nói cục bộ Faster-Whisper int8 kèm bộ lọc phát hiện tiếng nói VAD Energy+RMS, xử lý hoàn toàn trên CPU.",
    },
    {
        "provider": "edge_tts",
        "model_name": "Microsoft Neural Voice Studio",
        "category": "TTS",
        "specialization": "Simultaneous Cabin Voice Synthesis",
        "latency_ms_avg": 190,
        "cost_input_per_m": 0.0,
        "cost_output_per_m": 0.0,
        "bleu_tier": "S",
        "recommended_pairs": ["vi-VN", "ja-JP", "en-US"],
        "description": "Giọng đọc truyền cảm phòng thu chuẩn studio (Hoài My, Nanami, Jenny) dành cho cabin dịch trực tiếp, chi phí $0.",
    },
]


def auto_select_engine(
    source_lang: str,
    target_lang: str,
    available_providers: list[str],
    mode: str = "balanced",
) -> str:
    """Pick the optimal specialized engine for a language pair and routing mode.

    Modes:
    - 'balanced': Default. Asian pairs -> Qwen-MT; others -> Groq > OpenAI > DeepSeek > DeepL > Gemini.
    - 'cost_saving': Prioritize lowest cost per token: Gemini ($0.10) > DeepSeek ($0.14) > Qwen ($0.14) > OpenAI ($0.15) > Groq > DeepL.
    - 'ultra_fast': Prioritize lowest latency: Groq (~160ms) > Gemini (~250ms) > Qwen (~280ms) > DeepL (~300ms) > DeepSeek > OpenAI.
    - 'maximum_quality': Prioritize specialized MT: Qwen-MT for Asian, DeepL for European.
    """
    sl = source_lang.lower().strip().split("-", 1)[0]
    tl = target_lang.lower().strip().split("-", 1)[0]
    is_asian_pair = sl in _ASIAN_LANGS or tl in _ASIAN_LANGS

    if mode == "cost_saving":
        for p in ("gemini", "deepseek", "qwen", "openai", "groq", "deepl"):
            if p in available_providers:
                return p

    elif mode == "ultra_fast":
        for p in ("groq", "gemini", "qwen", "deepl", "deepseek", "openai"):
            if p in available_providers:
                return p

    elif mode == "maximum_quality":
        if is_asian_pair and "qwen" in available_providers:
            return "qwen"
        if not is_asian_pair and "deepl" in available_providers:
            return "deepl"
        for p in ("qwen", "deepl", "deepseek", "gemini", "openai", "groq"):
            if p in available_providers:
                return p

    # Default 'balanced' (Strictly preserves existing unit test contract)
    if is_asian_pair and "qwen" in available_providers:
        return "qwen"
    for preferred in ("groq", "openai", "deepseek", "deepl", "gemini"):
        if preferred in available_providers:
            return preferred
    return "openai"


@dataclass(slots=True)
class PremiumTranslationConfig:
    tier: str = "standard"
    byok_enabled: bool = False
    byok_provider: str = "openai"
    byok_api_key: str = ""


class PremiumTranslationProvider:
    """HTTP adapter for server-managed Pro credentials and user-provided BYOK credentials.

    Supports: openai, gemini, deepl (existing) + groq, deepseek, qwen (new — OpenAI-compatible).
    """

    def __init__(self, http_client: Optional[httpx.AsyncClient] = None):
        self._http_client = http_client
        self._owns_http_client = http_client is None

    async def _get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            timeout_seconds = max(0.1, settings.TRANSLATION_TIMEOUT_MS / 1000.0)
            connect_timeout = min(3.0, timeout_seconds)
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(timeout_seconds, connect=connect_timeout)
            )
            self._owns_http_client = True
        return self._http_client

    async def close(self) -> None:
        if self._owns_http_client and self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None

    def get_available_providers(self) -> list[str]:
        """Return list of providers that have an API key configured on the server."""
        providers: list[str] = []
        if settings.PRO_OPENAI_API_KEY.strip():
            providers.append("openai")
        if settings.PRO_GEMINI_API_KEY.strip():
            providers.append("gemini")
        if settings.PRO_DEEPL_API_KEY.strip():
            providers.append("deepl")
        if settings.PRO_GROQ_API_KEY.strip():
            providers.append("groq")
        if settings.PRO_DEEPSEEK_API_KEY.strip():
            providers.append("deepseek")
        if settings.PRO_QWEN_API_KEY.strip():
            providers.append("qwen")
        return providers

    def resolve_active_credentials(
        self,
        config: Optional[PremiumTranslationConfig],
        source_language: Optional[str] = None,
        target_language: Optional[str] = None,
        mode: str = "balanced",
    ) -> Optional[tuple[str, str]]:
        if config is None:
            return None

        byok_provider = config.byok_provider.strip().lower()
        byok_key = config.byok_api_key.strip()
        if config.byok_enabled and byok_key and byok_provider in SUPPORTED_PREMIUM_PROVIDERS:
            return byok_provider, byok_key

        if config.tier.strip().lower() != "pro":
            return None

        server_keys: dict[str, str] = {
            "openai": settings.PRO_OPENAI_API_KEY.strip(),
            "gemini": settings.PRO_GEMINI_API_KEY.strip(),
            "deepl": settings.PRO_DEEPL_API_KEY.strip(),
            "groq": settings.PRO_GROQ_API_KEY.strip(),
            "deepseek": settings.PRO_DEEPSEEK_API_KEY.strip(),
            "qwen": settings.PRO_QWEN_API_KEY.strip(),
        }
        available_server_providers = [p for p, k in server_keys.items() if k]
        if not available_server_providers:
            return None

        preferred = settings.PRO_TRANSLATION_PROVIDER.strip().lower()
        if preferred == "auto":
            sl = (source_language or "vi").strip().lower()
            tl = (target_language or "ja").strip().lower()
            selected = auto_select_engine(sl, tl, available_server_providers, mode=mode)
            if selected in server_keys and server_keys[selected]:
                return selected, server_keys[selected]

        ordered_providers = [preferred, *SUPPORTED_PREMIUM_PROVIDERS]
        for provider_name in dict.fromkeys(ordered_providers):
            if provider_name in server_keys and server_keys[provider_name]:
                return provider_name, server_keys[provider_name]
        return None

    # ------------------------------------------------------------------ #
    #  Public translate entry-point
    # ------------------------------------------------------------------ #

    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
        *,
        context: Optional[list[dict[str, Any]]] = None,
        glossary: Optional[dict[str, str]] = None,
        config: Optional[PremiumTranslationConfig] = None,
        provider_name: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> str:
        clean_text = text.strip()
        if not clean_text:
            return ""

        # Determine candidate providers to try
        candidates: list[tuple[str, str]] = []
        if provider_name and api_key:
            candidates.append((provider_name.strip().lower(), api_key.strip()))
        else:
            primary = self.resolve_active_credentials(
                config,
                source_language=source_language,
                target_language=target_language,
            )
            if primary is None:
                return ""
            candidates.append((primary[0].strip().lower(), primary[1].strip()))

        # Auto-fallback: if primary fails, try remaining server-configured providers
        server_keys = {
            "groq": settings.PRO_GROQ_API_KEY.strip(),
            "qwen": settings.PRO_QWEN_API_KEY.strip(),
            "deepseek": settings.PRO_DEEPSEEK_API_KEY.strip(),
            "openai": settings.PRO_OPENAI_API_KEY.strip(),
            "gemini": settings.PRO_GEMINI_API_KEY.strip(),
            "deepl": settings.PRO_DEEPL_API_KEY.strip(),
        }
        for p, k in server_keys.items():
            if k and not any(cand[0] == p for cand in candidates):
                candidates.append((p, k))

        source_language = normalize_language_code(source_language)
        target_language = normalize_language_code(target_language)
        client = await self._get_http_client()

        # 2-Way PII Firewall: Mask sensitive personal information before sending to external model
        mask_result = TwoWayPiiFirewall.mask(clean_text)
        query_text = mask_result.masked_text

        last_error: Optional[Exception] = None
        for prov_name, key in candidates:
            if prov_name not in SUPPORTED_PREMIUM_PROVIDERS or not key.strip():
                continue
            try:
                translated_raw = ""
                if prov_name in _OPENAI_COMPATIBLE_PROVIDERS:
                    translated_raw = await self._translate_openai_compatible(
                        client,
                        query_text,
                        source_language,
                        target_language,
                        context or [],
                        glossary or {},
                        key.strip(),
                        prov_name,
                    )
                elif prov_name == "gemini":
                    translated_raw = await self._translate_gemini(
                        client,
                        query_text,
                        source_language,
                        target_language,
                        context or [],
                        glossary or {},
                        key.strip(),
                    )
                else:
                    translated_raw = await self._translate_deepl(
                        client,
                        query_text,
                        source_language,
                        target_language,
                        context or [],
                        glossary or {},
                        key.strip(),
                    )

                if translated_raw.strip():
                    if mask_result.restore_map:
                        return TwoWayPiiFirewall.restore(translated_raw, mask_result.restore_map)
                    return translated_raw
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Premium provider %s encountered error (%s); trying fallback provider...",
                    prov_name,
                    str(exc),
                )
                continue

        if last_error is not None:
            raise last_error
        return ""

    # ------------------------------------------------------------------ #
    #  Shared system prompt
    # ------------------------------------------------------------------ #

    @staticmethod
    def _prompt(
        source_language: str,
        target_language: str,
        context: list[dict[str, Any]],
        glossary: dict[str, str],
    ) -> str:
        return (
            "You are an enterprise real-time bilingual meeting interpreter. "
            f"Translate the current utterance from {source_language} to {target_language}. "
            "Maintain natural meeting dialogue tone, consistency with prior dialogue context, numbers, and technical terms. "
            "CRITICAL RULES:\n"
            "1. Output ONLY the translation. Never add explanations or quotes.\n"
            "2. Keep placeholder tokens like '__PII_EMAIL_1__', '__PII_PHONE_1__', '__PII_AMOUNT_1__', '__PII_NUMBER_1__' exactly verbatim and unchanged in the translation.\n"
            "3. Apply the glossary strictly when terms appear.\n"
            f"Prior Meeting Context: {json.dumps(context[-10:], ensure_ascii=False)}\n"
            f"Glossary: {json.dumps(glossary, ensure_ascii=False)}"
        )

    # ------------------------------------------------------------------ #
    #  OpenAI-compatible handler (openai / groq / deepseek / qwen)
    # ------------------------------------------------------------------ #

    def _get_openai_compatible_config(self, provider: str) -> tuple[str, str, str]:
        """Return (chat_endpoint_url, model, provider_tag) for an OpenAI-compatible provider."""
        if provider == "groq":
            return (
                f"{settings.PRO_GROQ_BASE_URL.rstrip('/')}/chat/completions",
                settings.PRO_GROQ_MODEL,
                "groq",
            )
        if provider == "deepseek":
            return (
                f"{settings.PRO_DEEPSEEK_BASE_URL.rstrip('/')}/chat/completions",
                settings.PRO_DEEPSEEK_MODEL,
                "deepseek",
            )
        if provider == "qwen":
            return (
                f"{settings.PRO_QWEN_BASE_URL.rstrip('/')}/chat/completions",
                settings.PRO_QWEN_MODEL,
                "qwen",
            )
        # Default: openai (preserves literal "https://api.openai.com/v1/chat/completions")
        return (
            "https://api.openai.com/v1/chat/completions",
            settings.PRO_OPENAI_MODEL,
            "openai",
        )

    async def _translate_openai_compatible(
        self,
        client: httpx.AsyncClient,
        text: str,
        source_language: str,
        target_language: str,
        context: list[dict[str, Any]],
        glossary: dict[str, str],
        api_key: str,
        provider: str,
    ) -> str:
        endpoint_url, model, _ = self._get_openai_compatible_config(provider)
        system_instruction = self._prompt(source_language, target_language, context, glossary)
        if provider == "qwen":
            # qwen-mt-turbo strictly requires roles in [user, assistant], no system role allowed
            messages = [
                {"role": "user", "content": f"{system_instruction}\n\nUtterance to translate: {text}"}
            ]
        else:
            messages = [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": text},
            ]
        payload = {
            "model": model,
            "temperature": 0.1,
            "messages": messages,
        }
        try:
            response = await client.post(
                endpoint_url,
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            # Fallback for Groq if the requested model is not found on user's tier
            if provider == "groq" and exc.response.status_code == 404 and model != "qwen/qwen3.8-27b":
                payload["model"] = "qwen/qwen3.8-27b"
                response = await client.post(
                    endpoint_url,
                    headers={"Authorization": f"Bearer {api_key}"},
                    json=payload,
                )
                response.raise_for_status()
            else:
                raise

        data = response.json()
        choices = data.get("choices") if isinstance(data, dict) else None
        if not isinstance(choices, list) or not choices:
            return ""
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        return str(message.get("content") or "").strip() if isinstance(message, dict) else ""

    # ------------------------------------------------------------------ #
    #  Gemini (native REST — not OpenAI-compatible)
    # ------------------------------------------------------------------ #

    async def _translate_gemini(
        self,
        client: httpx.AsyncClient,
        text: str,
        source_language: str,
        target_language: str,
        context: list[dict[str, Any]],
        glossary: dict[str, str],
        api_key: str,
    ) -> str:
        model = settings.PRO_GEMINI_MODEL.strip() or "gemini-3.1-flash-lite"
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                f"{self._prompt(source_language, target_language, context, glossary)}\n"
                                f"Current utterance: {text}"
                            )
                        }
                    ],
                }
            ],
            "generationConfig": {"temperature": 0.1},
        }
        try:
            response = await client.post(
                endpoint,
                headers={"x-goog-api-key": api_key},
                json=payload,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404 and model != "gemini-3.1-flash-lite":
                endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent"
                response = await client.post(
                    endpoint,
                    headers={"x-goog-api-key": api_key},
                    json=payload,
                )
                response.raise_for_status()
            else:
                raise
        data = response.json()
        candidates = data.get("candidates") if isinstance(data, dict) else None
        if not isinstance(candidates, list) or not candidates:
            return ""
        content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
        parts = content.get("parts") if isinstance(content, dict) else None
        if not isinstance(parts, list):
            return ""
        return "".join(
            str(part.get("text") or "") for part in parts if isinstance(part, dict)
        ).strip()

    # ------------------------------------------------------------------ #
    #  DeepL (non-OpenAI-compatible)
    # ------------------------------------------------------------------ #

    async def _translate_deepl(
        self,
        client: httpx.AsyncClient,
        text: str,
        source_language: str,
        target_language: str,
        context: list[dict[str, Any]],
        glossary: dict[str, str],
        api_key: str,
    ) -> str:
        url = (
            "https://api-free.deepl.com/v2/translate"
            if api_key.endswith(":fx")
            else "https://api.deepl.com/v2/translate"
        )
        prompt_context = self._prompt(source_language, target_language, context, glossary)
        response = await client.post(
            url,
            headers={"Authorization": f"DeepL-Auth-Key {api_key}"},
            data={
                "text": text,
                "source_lang": source_language.upper(),
                "target_lang": target_language.upper(),
                "context": prompt_context,
            },
        )
        response.raise_for_status()
        data = response.json()
        translations = data.get("translations") if isinstance(data, dict) else None
        if not isinstance(translations, list) or not translations:
            return ""
        first = translations[0]
        return str(first.get("text") or "").strip() if isinstance(first, dict) else ""
