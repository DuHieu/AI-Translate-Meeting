import hashlib
import logging
from contextvars import ContextVar
from typing import Optional
import httpx

from app.config.settings import settings
from app.translation.base import TranslationProvider
from app.translation.glossary import normalize_language_code
from app.translation import qa_evaluator
from app.audio.quality_filter import SpeechQualityFilter
from app.translation.pii_firewall import TwoWayPiiFirewall

logger = logging.getLogger("ai_service.translation")


class LocalTranslationProvider(TranslationProvider):
    """
    Real-time Translation Provider with Redis caching and graceful fallback.
    Performs real multi-language translation (e.g. VI -> JA, JA -> VI, VI -> EN).
    """

    def __init__(
        self,
        redis_host: Optional[str] = None,
        redis_port: Optional[int] = None,
        backend: Optional[str] = None,
        secondary_backend: Optional[str] = None,
        offline_service_url: Optional[str] = None,
        cache_enabled: Optional[bool] = None,
    ):
        self.redis_host = redis_host or settings.REDIS_HOST
        self.redis_port = redis_port or settings.REDIS_PORT
        self.backend = (backend or getattr(settings, "TRANSLATION_BACKEND", "gtx_cloud")).lower()
        self.secondary_backend = (
            secondary_backend
            or getattr(settings, "TRANSLATION_SECONDARY_BACKEND", "mymemory")
        ).lower()
        self.offline_service_url = offline_service_url or getattr(
            settings, "OFFLINE_TRANSLATION_URL", "http://translation-service:5000/translate"
        )
        self.cache_enabled = (
            cache_enabled
            if cache_enabled is not None
            else getattr(settings, "TRANSLATION_CACHE_ENABLED", False)
        )
        self._redis = None
        self._http_client: Optional[httpx.AsyncClient] = None
        self._last_provider_name: ContextVar[str] = ContextVar(
            f"local_translation_provider_{id(self)}",
            default="offline_pattern",
        )
        self._last_provider_name_val: str = "offline_pattern"
        self._quality_filter = SpeechQualityFilter()
        if self.cache_enabled:
            self._init_redis()

        self._sample_dict = {
            ("vi", "ja", "Xin chào, chúng ta bắt đầu cuộc họp nhé."): "こんにちは、会議を始めましょう。",
            ("vi", "en", "Xin chào, chúng ta bắt đầu cuộc họp nhé."): "Hello, let's start the meeting.",
            ("en", "vi", "Hello, let's start the meeting."): "Xin chào, chúng ta bắt đầu cuộc họp nhé.",
            ("en", "ja", "Hello, let's start the meeting."): "こんにちは、会議を始めましょう。",
            ("ja", "vi", "こんにちは、会議を始めましょう。"): "Xin chào, chúng ta bắt đầu cuộc họp nhé.",
            ("ja", "en", "こんにちは、会議を始めましょう。"): "Hello, let's start the meeting.",
            ("ja", "vi", "はい、始めましょう。"): "Vâng, chúng ta bắt đầu nhé.",
            ("ja", "en", "はい、始めましょう。"): "Yes, let's start.",
            ("vi", "en", "Cảm ơn mọi người."): "Thank you, everyone.",
            ("vi", "ja", "Cảm ơn mọi người."): "皆様、ありがとうございます。",
            ("en", "vi", "Thank you, everyone."): "Cảm ơn mọi người.",
            ("en", "ja", "Thank you, everyone."): "皆様、ありがとうございます。",
            ("ja", "vi", "皆様、ありがとうございます。"): "Cảm ơn mọi người.",
            ("ja", "en", "皆様、ありがとうございます。"): "Thank you, everyone.",
            ("vi", "en", "Mọi người có nghe rõ tôi không?"): "Can everyone hear me clearly?",
            ("vi", "ja", "Mọi người có nghe rõ tôi không?"): "皆様、私の声が聞こえていますか。",
            ("en", "vi", "Can everyone hear me clearly?"): "Mọi người có nghe rõ tôi không?",
            ("en", "ja", "Can everyone hear me clearly?"): "皆様、私の声が聞こえていますか。",
            ("ja", "vi", "皆様、私の声が聞こえていますか。"): "Mọi người có nghe rõ tôi không?",
            ("ja", "en", "皆様、私の声が聞こえていますか。"): "Can everyone hear me clearly?",
            ("vi", "en", "Tôi đồng ý."): "I agree.",
            ("vi", "ja", "Tôi đồng ý."): "賛成です。",
            ("en", "vi", "I agree."): "Tôi đồng ý.",
            ("en", "ja", "I agree."): "賛成です。",
            ("ja", "vi", "賛成です。"): "Tôi đồng ý.",
            ("ja", "en", "賛成です。"): "I agree.",
        }

    @property
    def last_provider_name(self) -> str:
        var_val = self._last_provider_name.get()
        if var_val != "offline_pattern":
            return var_val
        return self._last_provider_name_val

    @last_provider_name.setter
    def last_provider_name(self, value: str) -> None:
        self._last_provider_name_val = value
        try:
            self._last_provider_name.set(value)
        except Exception:
            pass

    def _init_redis(self):
        try:
            import redis.asyncio as redis
            self._redis = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                socket_timeout=0.5,
                decode_responses=True,
            )
        except Exception:
            logger.warning("Redis translation cache initialization skipped")
            self._redis = None

    async def _get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=httpx.Timeout(4.0, connect=2.0))
        return self._http_client

    async def close(self):
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None

    async def _cache_translation(self, cache_key: Optional[str], translated_text: str) -> None:
        if not self.cache_enabled or not self._redis or not cache_key or not translated_text:
            return
        is_valid, _ = self._quality_filter.filter_translation(translated_text)
        if not is_valid:
            return
        try:
            await self._redis.set(cache_key, translated_text, ex=86400)
        except Exception:
            logger.debug("Redis translation cache write failed")

    async def _translate_gtx(
        self,
        client: httpx.AsyncClient,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        response = await client.get(
            "https://translate.googleapis.com/translate_a/single",
            params={
                "client": "gtx",
                "sl": source_language,
                "tl": target_language,
                "dt": "t",
                "q": text,
            },
        )
        if response.status_code != 200:
            return ""
        data = response.json()
        if not isinstance(data, list) or not data or not isinstance(data[0], list):
            return ""
        return "".join(
            str(part[0])
            for part in data[0]
            if isinstance(part, list) and part and part[0]
        ).strip()

    async def _translate_mymemory(
        self,
        client: httpx.AsyncClient,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        response = await client.get(
            "https://api.mymemory.translated.net/get",
            params={
                "q": text,
                "langpair": f"{source_language}|{target_language}",
            },
        )
        if response.status_code != 200:
            return ""
        data = response.json()
        if not isinstance(data, dict):
            return ""
        response_data = data.get("responseData")
        if not isinstance(response_data, dict):
            return ""
        translated_text = str(response_data.get("translatedText") or "").strip()
        if not translated_text or "MYMEMORY WARNING" in translated_text.upper():
            return ""

        response_status = data.get("responseStatus")
        quota_message = str(data.get("responseDetails") or "").lower()
        quota_failed = response_status not in (None, 200, "200") or any(
            marker in quota_message for marker in ("quota", "limit", "usage")
        )
        if quota_failed and translated_text.casefold() == text.casefold():
            return ""
        return translated_text

    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        clean_text = text.strip()
        if not clean_text:
            return ""

        source_language = normalize_language_code(source_language)
        target_language = normalize_language_code(target_language)

        # Same language: pass through instantly
        if source_language.lower() == target_language.lower():
            self.last_provider_name = "offline_pattern"
            return clean_text

        learned = qa_evaluator.qa_manager.get_learned_translation(
            source_language, target_language, clean_text
        )
        if learned is not None:
            self.last_provider_name = "learned_pattern"
            return learned

        # 1. Exact sample cache
        key = (source_language.lower(), target_language.lower(), clean_text)
        if key in self._sample_dict:
            self.last_provider_name = "offline_pattern"
            return self._sample_dict[key]

        # 2. Strict local dictionary mode (zero external network I/O)
        if self.backend == "local_dictionary":
            self.last_provider_name = "tagged_fallback"
            return f"[{target_language.upper()}] {clean_text}"

        # 3. Redis Cache Lookup
        cache_key = None
        if self.cache_enabled and self._redis:
            try:
                text_hash = hashlib.md5(clean_text.encode("utf-8")).hexdigest()
                cache_key = f"trans:{source_language}:{target_language}:{text_hash}"
                cached_val = await self._redis.get(cache_key)
                if cached_val:
                    is_valid, _ = self._quality_filter.filter_translation(cached_val, target_language)
                    if not is_valid:
                        try:
                            await self._redis.delete(cache_key)
                        except Exception:
                            pass
                    else:
                        logger.debug("Translation cache hit")
                        self.last_provider_name = "cache"
                        return cached_val
            except Exception:
                logger.debug("Redis translation cache lookup failed")

        # 4. Offline Internal Service Translation (Air-Gapped Container API)
        if self.backend == "offline_http":
            try:
                client = await self._get_http_client()
                resp = await client.post(
                    self.offline_service_url,
                    json={
                        "q": clean_text,
                        "source": source_language,
                        "target": target_language,
                        "format": "text",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    translated_text = data.get("translatedText") or data.get("translation")
                    if translated_text:
                        translated_text = str(translated_text).strip()
                        await self._cache_translation(cache_key, translated_text)
                        self.last_provider_name = "offline_pattern"
                        return translated_text
            except Exception as ex:
                logger.warning(
                    "Offline translation service (%s) failed: %s; using fallback",
                    self.offline_service_url,
                    ex,
                )

        # 5. Fast cloud translation with automatic GTX -> MyMemory failover.
        # PII Firewall: mask sensitive data before sending to external cloud APIs,
        # restore original values after receiving the translated result.
        elif self.backend in ("gtx_cloud", "multi_cloud"):
            client = await self._get_http_client()
            translated_text = ""
            translated_provider = "google_gtx"

            # Mask PII before any external network call
            mask_result = TwoWayPiiFirewall.mask(clean_text)
            text_to_send = mask_result.masked_text

            try:
                translated_text = await self._translate_gtx(
                    client,
                    text_to_send,
                    source_language,
                    target_language,
                )
            except Exception:
                logger.warning("Primary fast translation engine failed; trying secondary engine")

            if not translated_text and self.secondary_backend == "mymemory":
                try:
                    translated_text = await self._translate_mymemory(
                        client,
                        text_to_send,
                        source_language,
                        target_language,
                    )
                    translated_provider = "mymemory"
                except Exception:
                    logger.warning("Secondary fast translation engine failed; using safe fallback")

            if translated_text:
                # Restore PII tokens to original values before returning / caching
                if mask_result.pii_count > 0:
                    translated_text = TwoWayPiiFirewall.restore(translated_text, mask_result.restore_map)
                await self._cache_translation(cache_key, translated_text)
                self.last_provider_name = translated_provider
                return translated_text

        # 6. Fallback if offline or all translation attempts failed
        self.last_provider_name = "tagged_fallback"
        return f"[{target_language.upper()}] {clean_text}"
