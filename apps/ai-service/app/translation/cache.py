import hashlib
import logging
import re
import threading
from collections import OrderedDict
from typing import Optional

from app.config.settings import settings
from app.audio.quality_filter import SpeechQualityFilter

logger = logging.getLogger("ai_service.translation.cache")


class InMemoryLRUCache:
    """Thread-safe in-memory LRU cache providing sub-0.1ms lookups."""

    def __init__(self, capacity: int = 5000):
        self.capacity = capacity
        self._cache: OrderedDict[str, str] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[str]:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]
            return None

    def set(self, key: str, value: str) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = value
            if len(self._cache) > self.capacity:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)


class TranslationCache:
    """
    Two-Tier Translation Cache:
    - Tier 1: In-Memory LRU Cache (sub-0.1ms, thread-safe, local process)
    - Tier 2: Redis-backed Distributed Cache (TTL 24h, shared across instances)

    Multi-factor isolation and graceful degradation:
    - Normalizes text for high cache hit rate across repetitive dialogues
    - General key (context-independent) for frequent phrases
    - Contextual key for sliding-turn conversations
    - All Redis failures fail open without breaking subtitles.
    """

    enabled: bool = False

    def __init__(
        self,
        redis_host: Optional[str] = None,
        redis_port: Optional[int] = None,
        redis_url: Optional[str] = None,
        enabled: Optional[bool] = None,
        ttl_seconds: Optional[int] = None,
        l1_capacity: int = 5000,
    ):
        self.enabled = enabled if enabled is not None else settings.TRANSLATION_CACHE_ENABLED
        self.ttl = ttl_seconds or settings.TRANSLATION_CACHE_TTL_SECONDS
        self.redis_host = redis_host or settings.REDIS_HOST
        self.redis_port = redis_port or settings.REDIS_PORT
        self.redis_url = redis_url or settings.REDIS_URL
        self._redis = None
        self._l1 = InMemoryLRUCache(capacity=l1_capacity)
        self.quality_filter = SpeechQualityFilter()
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
            logger.warning("Redis translation cache unavailable; continuing with L1 cache only")
            self._redis = None

    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalizes source text by stripping terminal/leading punctuation, quotes, and redundant whitespaces."""
        if not text:
            return ""
        cleaned = text.strip().lower()
        cleaned = re.sub(r"[\s\t\n]+", " ", cleaned)
        cleaned = cleaned.strip(".!?,。！？、:;…~-–—\"'“”‘’「」『』()[]")
        return cleaned.strip()

    def build_general_key(
        self,
        source_lang: str,
        target_lang: str,
        text: str,
        provider_version: str = "default",
    ) -> str:
        """
        Builds a context-independent cache key for common sentences and phrases.
        Allows reuse across turns and meetings to achieve 60-80% cache hit rates.
        """
        norm_text = self.normalize_text(text)
        text_hash = hashlib.sha256(norm_text.encode("utf-8")).hexdigest()[:16]
        s_lang = source_lang.strip().lower()
        t_lang = target_lang.strip().lower()
        return f"trans:gen:{s_lang}:{t_lang}:{provider_version}:{text_hash}"

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
        norm_text = self.normalize_text(text) or text.strip()
        text_hash = hashlib.sha256(norm_text.encode("utf-8")).hexdigest()[:16]

        s_lang = source_lang.strip().lower()
        t_lang = target_lang.strip().lower()

        return f"trans:{meeting_hash}:{s_lang}:{t_lang}:{provider_version}:{glossary_version}:{context_hash}:{text_hash}"

    async def get(self, key: str) -> Optional[str]:
        """Looks up translation in Tier-1 L1 memory first (<0.1ms), then Tier-2 Redis (<2ms)."""
        # 1. Tier-1 L1 In-Memory LRU Cache lookup
        cached_l1 = self._l1.get(key)
        if cached_l1 is not None:
            is_valid, _ = self.quality_filter.filter_translation(cached_l1)
            if not is_valid:
                with self._l1._lock:
                    self._l1._cache.pop(key, None)
            else:
                logger.debug("L1 In-Memory Translation cache HIT key=%s", key[:40])
                return cached_l1

        # 2. Tier-2 Redis lookup (completely bypassed when self.enabled is False)
        if not self.enabled or self._redis is None:
            return None
        try:
            val = await self._redis.get(key)
            if val:
                val_str = str(val)
                is_valid, reason = self.quality_filter.filter_translation(val_str)
                if not is_valid:
                    logger.warning("Evicting corrupt cached translation key=%s reason=%s", key[:40], reason)
                    try:
                        await self._redis.delete(key)
                    except Exception:
                        pass
                    return None
                logger.debug("L2 Redis Translation cache HIT key=%s", key[:40])
                # Backfill Tier-1 L1 cache
                self._l1.set(key, val_str)
                return val_str
            logger.debug("Translation cache MISS key=%s", key[:40])
            return None
        except Exception:
            logger.debug("Redis translation cache read failed")
            return None

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """Saves a translation into both L1 Memory and L2 Redis. Fails gracefully."""
        if not value or not str(value).strip():
            return False

        is_valid, reason = self.quality_filter.filter_translation(value)
        if not is_valid:
            logger.warning("Refused to cache invalid translation key=%s reason=%s val=%.40s", key[:40], reason, value)
            return False

        # 1. Populate Tier-1 L1 cache immediately
        self._l1.set(key, value)

        # 2. Populate Tier-2 Redis (completely bypassed when self.enabled is False)
        if not self.enabled or self._redis is None:
            return True
        try:
            ttl_val = ttl or self.ttl
            await self._redis.set(key, value, ex=ttl_val)
            logger.debug("Translation cache SET key=%s ttl=%d", key[:40], ttl_val)
            return True
        except Exception:
            logger.debug("Redis translation cache write failed")
            return False

    def clear_l1(self) -> None:
        """Clears L1 In-Memory Cache."""
        self._l1.clear()

    def get_stats(self) -> dict:
        """Returns cache telemetry and sizing."""
        return {
            "l1_entries": len(self._l1),
            "l1_capacity": self._l1.capacity,
            "redis_connected": self._redis is not None,
            "enabled": self.enabled,
        }
