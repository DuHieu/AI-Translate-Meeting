import asyncio
import hashlib
import logging
import math
from typing import Any, Optional

from app.config.settings import settings

logger = logging.getLogger("ai_service.translation.quota")

PREMIUM_TIERS = {"pro", "byok"}


class TokenQuotaManager:
    """Tracks per-meeting premium translation usage in Redis with an L1 fallback."""

    def __init__(
        self,
        quota: Optional[int] = None,
        redis_client: Any = None,
        enable_redis: bool = True,
    ) -> None:
        self.quota = max(0, quota if quota is not None else settings.PRO_MEETING_TOKEN_QUOTA)
        self._memory: dict[str, dict[str, Any]] = {}
        self._last_tier_by_meeting: dict[str, str] = {}
        self._lock = asyncio.Lock()
        self._redis = redis_client
        if enable_redis and self._redis is None:
            self._redis = self._create_redis_client()

    @staticmethod
    def estimate_tokens(text: str, translated: str) -> int:
        character_count = len(text or "") + len(translated or "")
        return math.ceil(character_count / 4) if character_count else 0

    def _create_redis_client(self) -> Any:
        try:
            import redis.asyncio as redis

            common_options = {
                "socket_connect_timeout": 0.2,
                "socket_timeout": 0.2,
                "decode_responses": True,
            }
            if settings.REDIS_URL:
                return redis.Redis.from_url(settings.REDIS_URL, **common_options)
            return redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                **common_options,
            )
        except Exception:
            logger.warning("Redis quota tracker unavailable; using in-memory storage")
            return None

    @staticmethod
    def _normalize_tier(tier: Optional[str]) -> str:
        normalized = (tier or "standard").strip().lower()
        return normalized if normalized in PREMIUM_TIERS else "standard"

    @staticmethod
    def _key(meeting_id: str) -> str:
        meeting_hash = hashlib.sha256(meeting_id.encode("utf-8")).hexdigest()
        return f"translation:quota:{meeting_hash}"

    @staticmethod
    def _memory_key(meeting_id: str, tier: str) -> str:
        return f"{meeting_id}\0{tier}"

    def _empty_state(self, meeting_id: str, tier: str) -> dict[str, Any]:
        return {
            "meeting_id": meeting_id,
            "tier": tier,
            "total_tokens_used": 0,
            "downgraded": False,
            "downgrade_reason": None,
        }

    def _usage_response(self, state: dict[str, Any]) -> dict[str, Any]:
        used = max(0, int(state.get("total_tokens_used", 0)))
        tier = self._normalize_tier(str(state.get("tier", "standard")))
        quota = self.quota if tier in PREMIUM_TIERS else 0
        return {
            "meeting_id": str(state["meeting_id"]),
            "tier": tier,
            "total_tokens_used": used,
            "quota": quota,
            "remaining_quota": max(0, quota - used),
            "is_quota_exceeded": tier in PREMIUM_TIERS and used >= quota,
            "downgraded": bool(state.get("downgraded", False)),
            "downgrade_reason": state.get("downgrade_reason") or None,
        }

    def _disable_redis(self, operation: str, exc: Exception) -> None:
        logger.debug("Redis quota %s failed; using in-memory storage: %s", operation, exc)
        self._redis = None

    async def record_usage(
        self,
        meeting_id: str,
        text: str,
        translated: str,
        tier: str,
    ) -> int:
        normalized_tier = self._normalize_tier(tier)
        if normalized_tier not in PREMIUM_TIERS:
            return 0

        tokens = self.estimate_tokens(text, translated)
        if self._redis is not None:
            try:
                key = self._key(meeting_id)

                async def _pipeline_op() -> list[Any]:
                    async with self._redis.pipeline(transaction=True) as pipeline:
                        pipeline.hincrby(key, f"used:{normalized_tier}", tokens)
                        pipeline.hset(
                            key,
                            mapping={
                                "last_tier": normalized_tier,
                                f"downgraded:{normalized_tier}": "0",
                                f"reason:{normalized_tier}": "",
                            },
                        )
                        return await pipeline.execute()

                results = await asyncio.wait_for(_pipeline_op(), timeout=0.25)
                total = int(results[0])
                memory_key = self._memory_key(meeting_id, normalized_tier)
                async with self._lock:
                    state = self._memory.setdefault(
                        memory_key, self._empty_state(meeting_id, normalized_tier)
                    )
                    state["total_tokens_used"] = total
                    state["downgraded"] = False
                    state["downgrade_reason"] = None
                    self._last_tier_by_meeting[meeting_id] = normalized_tier
                return total
            except Exception as exc:
                self._disable_redis("write", exc)

        memory_key = self._memory_key(meeting_id, normalized_tier)
        async with self._lock:
            state = self._memory.setdefault(
                memory_key, self._empty_state(meeting_id, normalized_tier)
            )
            state["total_tokens_used"] += tokens
            self._last_tier_by_meeting[meeting_id] = normalized_tier
            if state["total_tokens_used"] < self.quota:
                state["downgraded"] = False
                state["downgrade_reason"] = None
            return int(state["total_tokens_used"])

    async def is_quota_exceeded(self, meeting_id: str, tier: str = "pro") -> bool:
        usage = await self.get_usage(meeting_id, tier=tier)
        return bool(usage["is_quota_exceeded"])

    async def get_usage(
        self,
        meeting_id: str,
        tier: Optional[str] = None,
    ) -> dict[str, Any]:
        requested_tier = self._normalize_tier(tier) if tier is not None else None
        if self._redis is not None:
            try:
                values = await asyncio.wait_for(
                    self._redis.hgetall(self._key(meeting_id)),
                    timeout=0.25,
                )
                effective_tier = requested_tier or self._normalize_tier(values.get("last_tier"))
                state = self._empty_state(meeting_id, effective_tier)
                state["total_tokens_used"] = int(values.get(f"used:{effective_tier}", 0))
                state["downgraded"] = values.get(f"downgraded:{effective_tier}") == "1"
                state["downgrade_reason"] = values.get(f"reason:{effective_tier}") or None
                async with self._lock:
                    self._memory[self._memory_key(meeting_id, effective_tier)] = dict(state)
                    self._last_tier_by_meeting[meeting_id] = effective_tier
                return self._usage_response(state)
            except Exception as exc:
                self._disable_redis("read", exc)

        async with self._lock:
            effective_tier = requested_tier or self._last_tier_by_meeting.get(
                meeting_id, "standard"
            )
            memory_key = self._memory_key(meeting_id, effective_tier)
            state = dict(
                self._memory.get(
                    memory_key, self._empty_state(meeting_id, effective_tier)
                )
            )
        return self._usage_response(state)

    async def mark_downgraded(
        self,
        meeting_id: str,
        tier: str,
        reason: str,
    ) -> None:
        normalized_tier = self._normalize_tier(tier)
        if normalized_tier not in PREMIUM_TIERS:
            return

        if self._redis is not None:
            try:
                await asyncio.wait_for(
                    self._redis.hset(
                        self._key(meeting_id),
                        mapping={
                            "last_tier": normalized_tier,
                            f"downgraded:{normalized_tier}": "1",
                            f"reason:{normalized_tier}": reason,
                        },
                    ),
                    timeout=0.25,
                )
                memory_key = self._memory_key(meeting_id, normalized_tier)
                async with self._lock:
                    state = self._memory.setdefault(
                        memory_key, self._empty_state(meeting_id, normalized_tier)
                    )
                    state["downgraded"] = True
                    state["downgrade_reason"] = reason
                    self._last_tier_by_meeting[meeting_id] = normalized_tier
                return
            except Exception as exc:
                self._disable_redis("downgrade update", exc)

        memory_key = self._memory_key(meeting_id, normalized_tier)
        async with self._lock:
            state = self._memory.setdefault(
                memory_key, self._empty_state(meeting_id, normalized_tier)
            )
            state["downgraded"] = True
            state["downgrade_reason"] = reason
            self._last_tier_by_meeting[meeting_id] = normalized_tier

    async def reset_usage(self, meeting_id: str) -> None:
        if self._redis is not None:
            try:
                await asyncio.wait_for(
                    self._redis.delete(self._key(meeting_id)),
                    timeout=0.25,
                )
            except Exception as exc:
                self._disable_redis("reset", exc)

        prefix = f"{meeting_id}\0"
        async with self._lock:
            for key in [key for key in self._memory if key.startswith(prefix)]:
                self._memory.pop(key, None)
            self._last_tier_by_meeting.pop(meeting_id, None)


quota_manager = TokenQuotaManager()
