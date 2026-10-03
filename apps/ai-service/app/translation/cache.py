import hashlib
import logging
from typing import Optional

from app.config.settings import settings

logger = logging.getLogger("ai_service.translation.cache")


class TranslationCache:
    """
    Redis-backed Translation Cache with strict multi-factor isolation:
    - meetingId (meeting boundary isolation preventing cross-meeting leakage)
    - sourceLanguage & targetLanguage
    - provider & model version
    - glossary version
    - rolling context hash
    - source text hash

    Graceful degradation: all Redis failures fail open without breaking subtitles.
    """

    def __init__(
        self,
        redis_host: Optional[str] = None,
        redis_port: Optional[int] = None,
        redis_url: Optional[str] = None,
        enabled: Optional[bool] = None,
        ttl_seconds: Optional[int] = None,
    ):
        self.enabled = enabled if enabled is not None else settings.TRANSLATION_CACHE_ENABLED
        self.ttl = ttl_seconds or settings.TRANSLATION_CACHE_TTL_SECONDS
        self.redis_host = redis_host or settings.REDIS_HOST
        self.redis_port = redis_port or settings.REDIS_PORT
        self.redis_url = redis_url or settings.REDIS_URL
        self._redis = None
        self._init_redis()

    def _init_redis(self):
        if not self.enabled:
            return
        try:
            import redis.asyncio as redis
            if self.redis_url:
                self._redis = redis.Redis.from_url(
                    self.redis_url,
                    socket_timeout=0.5,
                    decode_responses=True,
                )
            else:
                self._redis = redis.Redis(
                    host=self.redis_host,
                    port=self.redis_port,
                    socket_timeout=0.5,
                    decode_responses=True,
                )
            logger.info("Redis translation cache configured")
        except Exception:
            logger.warning("Redis translation cache unavailable; continuing without cache")
            self._redis = None

    def build_key(
        self,
        meeting_id: str,
        source_lang: str,
        target_lang: str,
        text: str,
        context_hash: str = "no_ctx",
        glossary_version: str = "1.0.0",
        provider_version: str = "default",
    ) -> str:
        """
        Builds a collision-resistant, context-sensitive cache key strictly bound to meetingId.
        Key structure:
        trans:{meeting_id_hash}:{source_lang}:{target_lang}:{provider}:{glossary}:{context_hash}:{text_hash}
        """
        meeting_hash = hashlib.sha256(meeting_id.encode("utf-8")).hexdigest()[:12] if meeting_id else "global"
        text_clean = text.strip()
        text_hash = hashlib.sha256(text_clean.encode("utf-8")).hexdigest()[:16]

        s_lang = source_lang.strip().lower()
        t_lang = target_lang.strip().lower()

        return f"trans:{meeting_hash}:{s_lang}:{t_lang}:{provider_version}:{glossary_version}:{context_hash}:{text_hash}"

    async def get(self, key: str) -> Optional[str]:
        """Looks up a translation. Returns None on cache miss or Redis error."""
        if not self.enabled or self._redis is None:
            return None
        try:
            val = await self._redis.get(key)
            if val:
                logger.debug("Translation cache HIT key=%s", key[:40])
                return str(val)
            logger.debug("Translation cache MISS key=%s", key[:40])
            return None
        except Exception:
            logger.debug("Redis translation cache read failed")
            return None

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """Saves a translation with configured TTL. Fails gracefully."""
        if not self.enabled or self._redis is None:
            return False
        try:
            ttl_val = ttl or self.ttl
            await self._redis.set(key, value, ex=ttl_val)
            logger.debug("Translation cache SET key=%s ttl=%d", key[:40], ttl_val)
            return True
        except Exception:
            logger.debug("Redis translation cache write failed")
            return False
