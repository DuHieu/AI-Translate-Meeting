from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.translation.contextual_provider import (
    ContextualTranslationProvider,
    TranslationContextRequest,
)
from app.translation.local_provider import LocalTranslationProvider
from app.translation.premium_provider import PremiumTranslationProvider
from app.translation.quota_manager import TokenQuotaManager


@pytest.mark.asyncio
async def test_quota_manager_counts_source_and_translation_tokens():
    manager = TokenQuotaManager(quota=10, enable_redis=False)

    total = await manager.record_usage(
        meeting_id="meeting-usage",
        text="1234",
        translated="5678",
        tier="pro",
    )

    usage = await manager.get_usage("meeting-usage", tier="pro")
    assert total == 2
    assert usage == {
        "meeting_id": "meeting-usage",
        "tier": "pro",
        "total_tokens_used": 2,
        "quota": 10,
        "remaining_quota": 8,
        "is_quota_exceeded": False,
        "downgraded": False,
        "downgrade_reason": None,
    }


@pytest.mark.asyncio
async def test_quota_manager_falls_back_to_memory_when_redis_fails():
    class BrokenRedis:
        async def hgetall(self, _key):
            raise ConnectionError("redis unavailable")

    manager = TokenQuotaManager(quota=10, redis_client=BrokenRedis())

    await manager.get_usage("meeting-redis-failure", tier="pro")
    await manager.record_usage("meeting-redis-failure", "1234", "", "pro")

    usage = await manager.get_usage("meeting-redis-failure")
    assert usage["tier"] == "pro"
    assert usage["total_tokens_used"] == 1


@pytest.mark.asyncio
async def test_premium_translation_records_usage():
    manager = TokenQuotaManager(quota=100, enable_redis=False)
    fallback = MagicMock(spec=LocalTranslationProvider)
    fallback.translate = AsyncMock(return_value="Fallback translation")
    premium = MagicMock(spec=PremiumTranslationProvider)
    premium.resolve_active_credentials.return_value = ("openai", "secret-key")
    premium.translate = AsyncMock(return_value="Premium translation")
    provider = ContextualTranslationProvider(
        fallback_provider=fallback,
        premium_provider=premium,
        quota_manager=manager,
    )

    result = await provider.translate_contextual(
        TranslationContextRequest(
            meetingId="meeting-premium",
            speakerId="speaker-1",
            sourceLanguage="vi",
            targetLanguage="en",
            text="Nội dung mới cần dịch bằng AI.",
            translationTier="pro",
        )
    )

    usage = await manager.get_usage("meeting-premium", tier="pro")
    assert result == "Premium translation"
    assert usage["total_tokens_used"] > 0
    assert usage["remaining_quota"] < usage["quota"]
    assert provider.last_provider_name == "premium_ai"
    fallback.translate.assert_not_awaited()


@pytest.mark.asyncio
async def test_quota_exhaustion_downgrades_without_interrupting_subtitles():
    manager = TokenQuotaManager(quota=1, enable_redis=False)
    await manager.record_usage("meeting-downgrade", "1234", "", "pro")

    fallback = MagicMock(spec=LocalTranslationProvider)
    fallback.translate = AsyncMock(return_value="Fast fallback")
    fallback.last_provider_name = "google_gtx"
    premium = MagicMock(spec=PremiumTranslationProvider)
    premium.resolve_active_credentials.return_value = ("openai", "secret-key")
    premium.translate = AsyncMock(return_value="Premium translation")
    provider = ContextualTranslationProvider(
        fallback_provider=fallback,
        premium_provider=premium,
        quota_manager=manager,
    )

    result = await provider.translate_contextual(
        TranslationContextRequest(
            meetingId="meeting-downgrade",
            speakerId="speaker-1",
            sourceLanguage="vi",
            targetLanguage="en",
            text="Phụ đề vẫn phải tiếp tục.",
            translationTier="pro",
        )
    )

    usage = await manager.get_usage("meeting-downgrade", tier="pro")
    assert result == "Fast fallback"
    assert provider.last_provider_name == "downgraded_gtx"
    assert usage["is_quota_exceeded"] is True
    assert usage["downgraded"] is True
    assert usage["downgrade_reason"] == "quota_exceeded"
    premium.translate.assert_not_awaited()
    fallback.translate.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_translation_usage_api(monkeypatch):
    from app.api import providers
    from app.main import app

    manager = TokenQuotaManager(quota=20, enable_redis=False)
    await manager.record_usage("meeting-api", "12345678", "12345678", "pro")
    monkeypatch.setattr(providers, "quota_manager", manager)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/translation/usage/meeting-api")

    assert response.status_code == 200
    assert response.json() == {
        "meeting_id": "meeting-api",
        "tier": "pro",
        "total_tokens_used": 4,
        "quota": 20,
        "remaining_quota": 16,
        "is_quota_exceeded": False,
        "downgraded": False,
        "downgrade_reason": None,
    }
