import json
import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.config.settings import settings
from app.translation.contextual_provider import (
    ContextualTranslationProvider,
    TranslationContextRequest,
)
from app.translation.cache import TranslationCache
from app.translation.local_provider import LocalTranslationProvider
from app.translation.premium_provider import (
    PremiumTranslationConfig,
    PremiumTranslationProvider,
)
from app.translation.quota_manager import TokenQuotaManager
from app.websocket.transcribe_handler import TranscribeWebSocketHandler


class FakeResponse:
    def __init__(self, status_code: int, payload: object):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class SequenceHttpClient:
    def __init__(self, *responses_or_errors: object):
        self._responses = iter(responses_or_errors)
        self.calls: list[tuple[str, str, dict]] = []
        self.is_closed = False

    async def get(self, url: str, **kwargs):
        self.calls.append(("GET", url, kwargs))
        result = next(self._responses)
        if isinstance(result, Exception):
            raise result
        return result

    async def post(self, url: str, **kwargs):
        self.calls.append(("POST", url, kwargs))
        result = next(self._responses)
        if isinstance(result, Exception):
            raise result
        return result


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "gtx_failure",
    [
        FakeResponse(429, {"error": "rate limited"}),
        httpx.ReadTimeout("GTX timed out"),
    ],
)
async def test_local_provider_fails_over_from_gtx_to_mymemory(gtx_failure):
    provider = LocalTranslationProvider(
        backend="multi_cloud",
        secondary_backend="mymemory",
    )
    provider._redis = None
    client = SequenceHttpClient(
        gtx_failure,
        FakeResponse(
            200,
            {"responseStatus": 200, "responseData": {"translatedText": "Good morning"}},
        ),
    )
    provider._http_client = client

    result = await provider.translate("Chào buổi sáng", "vi", "en")

    assert result == "Good morning"
    assert [call[1] for call in client.calls] == [
        "https://translate.googleapis.com/translate_a/single",
        "https://api.mymemory.translated.net/get",
    ]
    assert client.calls[1][2]["params"] == {
        "q": "Chào buổi sáng",
        "langpair": "vi|en",
    }


def test_premium_credentials_prioritize_byok(monkeypatch):
    monkeypatch.setattr(settings, "PRO_TRANSLATION_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "PRO_GEMINI_API_KEY", "server-gemini-key")
    provider = PremiumTranslationProvider()

    credentials = provider.resolve_active_credentials(
        PremiumTranslationConfig(
            tier="pro",
            byok_enabled=True,
            byok_provider="openai",
            byok_api_key="  personal-openai-key  ",
        )
    )

    assert credentials == ("openai", "personal-openai-key")


@pytest.mark.parametrize(
    ("preferred_provider", "server_keys", "expected"),
    [
        ("openai", {"PRO_OPENAI_API_KEY": "openai-key"}, ("openai", "openai-key")),
        ("gemini", {"PRO_GEMINI_API_KEY": "gemini-key"}, ("gemini", "gemini-key")),
        ("deepl", {"PRO_DEEPL_API_KEY": "deepl-key"}, ("deepl", "deepl-key")),
        (
            "openai",
            {"PRO_GEMINI_API_KEY": "fallback-gemini-key"},
            ("gemini", "fallback-gemini-key"),
        ),
    ],
)
def test_premium_credentials_use_configured_server_key(
    monkeypatch,
    preferred_provider,
    server_keys,
    expected,
):
    monkeypatch.setattr(settings, "PRO_TRANSLATION_PROVIDER", preferred_provider)
    for name in ("PRO_OPENAI_API_KEY", "PRO_GEMINI_API_KEY", "PRO_DEEPL_API_KEY"):
        monkeypatch.setattr(settings, name, server_keys.get(name, ""))

    credentials = PremiumTranslationProvider().resolve_active_credentials(
        PremiumTranslationConfig(tier="pro")
    )

    assert credentials == expected


@pytest.mark.asyncio
async def test_contextual_pro_without_key_falls_back_without_calling_premium(monkeypatch):
    for name in ("PRO_OPENAI_API_KEY", "PRO_GEMINI_API_KEY", "PRO_DEEPL_API_KEY"):
        monkeypatch.setattr(settings, name, "")

    fallback = MagicMock(spec=LocalTranslationProvider)
    fallback.translate = AsyncMock(return_value="Fallback translation")
    premium = MagicMock(spec=PremiumTranslationProvider)
    premium.resolve_active_credentials.return_value = None
    premium.translate = AsyncMock()
    provider = ContextualTranslationProvider(
        fallback_provider=fallback,
        premium_provider=premium,
        quota_manager=TokenQuotaManager(quota=10000, enable_redis=False),
    )

    result = await provider.translate_contextual(
        TranslationContextRequest(
            meetingId="meeting-pro",
            speakerId="speaker-1",
            sourceLanguage="vi",
            targetLanguage="en",
            text="Nội dung cần dịch bằng cơ chế dự phòng.",
            translationTier="pro",
        )
    )

    assert result == "Fallback translation"
    premium.translate.assert_not_awaited()
    fallback.translate.assert_awaited_once()


@pytest.mark.asyncio
async def test_contextual_provider_falls_back_when_premium_api_fails():
    fallback = MagicMock(spec=LocalTranslationProvider)
    fallback.translate = AsyncMock(return_value="Fast fallback")
    premium = MagicMock(spec=PremiumTranslationProvider)
    premium.resolve_active_credentials.return_value = ("openai", "secret-key")
    premium.translate = AsyncMock(side_effect=httpx.ReadTimeout("premium timeout"))
    provider = ContextualTranslationProvider(
        fallback_provider=fallback,
        premium_provider=premium,
        quota_manager=TokenQuotaManager(quota=10000, enable_redis=False),
    )

    result = await provider.translate_contextual(
        TranslationContextRequest(
            meetingId="meeting-pro",
            speakerId="speaker-1",
            sourceLanguage="vi",
            targetLanguage="en",
            text="Một câu hoàn toàn mới cần dịch.",
            translationTier="pro",
        )
    )

    assert result == "Fast fallback"
    premium.translate.assert_awaited_once()
    fallback.translate.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("provider_name", "api_key", "response_payload", "expected_url", "expected_text"),
    [
        (
            "openai",
            "openai-test-key",
            {"choices": [{"message": {"content": "OpenAI translation"}}]},
            "https://api.openai.com/v1/chat/completions",
            "OpenAI translation",
        ),
        (
            "gemini",
            "gemini-test-key",
            {"candidates": [{"content": {"parts": [{"text": "Gemini translation"}]}}]},
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
            "Gemini translation",
        ),
        (
            "deepl",
            "deepl-test-key:fx",
            {"translations": [{"text": "DeepL translation"}]},
            "https://api-free.deepl.com/v2/translate",
            "DeepL translation",
        ),
        (
            "groq",
            "gsk_groq_test_key",
            {"choices": [{"message": {"content": "Groq fast translation"}}]},
            "https://api.groq.com/openai/v1/chat/completions",
            "Groq fast translation",
        ),
        (
            "deepseek",
            "sk-deepseek-test-key",
            {"choices": [{"message": {"content": "DeepSeek translation"}}]},
            "https://api.deepseek.com/v1/chat/completions",
            "DeepSeek translation",
        ),
        (
            "qwen",
            "sk-qwen-test-key",
            {"choices": [{"message": {"content": "Qwen translation"}}]},
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            "Qwen translation",
        ),
    ],
)
async def test_premium_provider_calls_real_http_contract_without_key_in_url(
    monkeypatch,
    provider_name,
    api_key,
    response_payload,
    expected_url,
    expected_text,
):
    monkeypatch.setattr(settings, "PRO_GEMINI_MODEL", "gemini-2.0-flash")
    monkeypatch.setattr(
        settings, "PRO_QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    captured_requests: list[httpx.Request] = []

    async def respond(request: httpx.Request) -> httpx.Response:
        captured_requests.append(request)
        return httpx.Response(200, json=response_payload)

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        provider = PremiumTranslationProvider(http_client=client)
        result = await provider.translate(
            "Nội dung cuộc họp",
            "vi",
            "en",
            context=[{"speaker": "Alice", "source": "Ngữ cảnh"}],
            glossary={"PRD": "Product requirements document"},
            provider_name=provider_name,
            api_key=api_key,
        )

    assert result == expected_text
    assert len(captured_requests) == 1
    assert str(captured_requests[0].url) == expected_url
    assert api_key not in str(captured_requests[0].url)


@pytest.mark.asyncio
async def test_websocket_config_reaches_contextual_translator_without_logging_key(caplog):
    translator = ContextualTranslationProvider()
    translator.translate = AsyncMock(return_value="Translated")
    cache = MagicMock(spec=TranslationCache)
    cache.build_general_key.side_effect = lambda **kwargs: f"general:{kwargs['provider_version']}"
    cache.build_key.side_effect = lambda **kwargs: f"context:{kwargs['provider_version']}"
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock(return_value=True)
    handler = TranscribeWebSocketHandler(translator=translator, cache=cache)
    handler.laya.classify_sentence = AsyncMock(return_value=([], 0.0))
    secret = "byok-secret-must-not-appear"

    websocket = MagicMock()
    websocket.state = SimpleNamespace(livekit_identity="livekit-user-1")
    websocket.send_text = AsyncMock()
    websocket.receive = AsyncMock(
        side_effect=[
            {
                "type": "websocket.receive",
                "text": json.dumps(
                    {
                        "type": "config",
                        "domain": "business",
                        "translationTier": "pro",
                        "byokEnabled": True,
                        "byokProvider": "gemini",
                        "byokApiKey": secret,
                    }
                ),
            },
            {
                "type": "websocket.receive",
                "text": json.dumps(
                    {
                        "text": "Nội dung bí mật cần dịch.",
                        "language": "vi",
                        "isFinal": True,
                    }
                ),
            },
            {"type": "websocket.disconnect"},
        ]
    )

    with caplog.at_level(logging.DEBUG):
        await handler.handle(
            websocket,
            "meeting-1",
            "participant-1",
            "Alice",
            "vi",
            "en",
            already_accepted=True,
        )

    translated_calls = [
        call
        for call in translator.translate.await_args_list
        if call.args and call.args[0] == "Nội dung bí mật cần dịch."
    ]
    assert len(translated_calls) == 1
    assert translated_calls[0].kwargs["translation_tier"] == "pro"
    assert translated_calls[0].kwargs["byok_enabled"] is True
    assert translated_calls[0].kwargs["byok_provider"] == "gemini"
    assert translated_calls[0].kwargs["byok_api_key"] == secret
    provider_versions = [
        call.kwargs["provider_version"] for call in cache.build_general_key.call_args_list
    ]
    assert any(version.startswith("meeting-v1:byok:gemini:") for version in provider_versions)
    assert all(secret not in version for version in provider_versions)
    assert secret not in caplog.text


def test_auto_select_engine_asian_pair_prefers_qwen():
    from app.translation.premium_provider import auto_select_engine

    assert auto_select_engine("vi", "ja", ["groq", "qwen", "openai"]) == "qwen"
    assert auto_select_engine("en", "zh", ["qwen", "groq"]) == "qwen"
    assert auto_select_engine("ko", "en", ["qwen", "openai"]) == "qwen"


def test_auto_select_engine_non_asian_pair_prefers_groq():
    from app.translation.premium_provider import auto_select_engine

    assert auto_select_engine("en", "fr", ["groq", "deepseek", "openai"]) == "groq"
    assert auto_select_engine("de", "es", ["deepseek", "openai"]) == "openai"


def test_get_available_providers_reflects_configured_keys(monkeypatch):
    for key in (
        "PRO_OPENAI_API_KEY",
        "PRO_GEMINI_API_KEY",
        "PRO_DEEPL_API_KEY",
        "PRO_GROQ_API_KEY",
        "PRO_DEEPSEEK_API_KEY",
        "PRO_QWEN_API_KEY",
    ):
        monkeypatch.setattr(settings, key, "")

    provider = PremiumTranslationProvider()
    assert provider.get_available_providers() == []

    monkeypatch.setattr(settings, "PRO_GROQ_API_KEY", "gsk_123")
    monkeypatch.setattr(settings, "PRO_DEEPSEEK_API_KEY", "sk_456")
    assert provider.get_available_providers() == ["groq", "deepseek"]


@pytest.mark.asyncio
async def test_get_translation_providers_api_endpoint(monkeypatch):
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    monkeypatch.setattr(settings, "PRO_GROQ_API_KEY", "gsk_test")
    monkeypatch.setattr(settings, "PRO_OPENAI_API_KEY", "sk_test")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/translation/providers")
        assert res.status_code == 200
        data = res.json()
        assert "available" in data
        assert "recommended" in data
        assert "metadata" in data
        assert "groq" in data["available"]
        assert "openai" in data["available"]


def test_auto_select_engine_cost_and_speed_modes():
    from app.translation.premium_provider import auto_select_engine

    all_providers = ["groq", "gemini", "deepseek", "qwen", "openai", "deepl"]

    # 1. Cost saving mode: Gemini ($0.10/M) and DeepSeek/Qwen ($0.14/M) beat Groq ($0.59) and DeepL ($20)
    assert auto_select_engine("vi", "en", all_providers, mode="cost_saving") == "gemini"
    assert auto_select_engine("vi", "ja", ["deepseek", "groq", "deepl"], mode="cost_saving") == "deepseek"

    # 2. Ultra fast mode: Groq LPU (~160ms) beats all others
    assert auto_select_engine("vi", "ja", all_providers, mode="ultra_fast") == "groq"
    assert auto_select_engine("en", "fr", ["gemini", "openai", "deepl"], mode="ultra_fast") == "gemini"

    # 3. Maximum quality mode: Qwen for Asian, DeepL for European
    assert auto_select_engine("vi", "ja", all_providers, mode="maximum_quality") == "qwen"
    assert auto_select_engine("en", "de", all_providers, mode="maximum_quality") == "deepl"


def test_resolve_active_credentials_in_auto_mode(monkeypatch):
    from app.translation.premium_provider import PremiumTranslationProvider, PremiumTranslationConfig

    monkeypatch.setattr(settings, "PRO_TRANSLATION_PROVIDER", "auto")
    monkeypatch.setattr(settings, "PRO_QWEN_API_KEY", "qwen-secret-key")
    monkeypatch.setattr(settings, "PRO_GROQ_API_KEY", "groq-secret-key")
    monkeypatch.setattr(settings, "PRO_DEEPL_API_KEY", "deepl-secret-key")

    provider = PremiumTranslationProvider()

    # Asian pair: Vi -> Ja dynamically resolves Qwen
    cred_asian = provider.resolve_active_credentials(
        PremiumTranslationConfig(tier="pro"),
        source_language="vi",
        target_language="ja",
    )
    assert cred_asian == ("qwen", "qwen-secret-key")

    # Non-Asian pair: En -> Fr dynamically resolves Groq (lowest latency in balanced mode)
    cred_euro = provider.resolve_active_credentials(
        PremiumTranslationConfig(tier="pro"),
        source_language="en",
        target_language="fr",
    )
    assert cred_euro == ("groq", "groq-secret-key")


@pytest.mark.asyncio
async def test_models_and_recommend_and_tts_cache_api(monkeypatch):
    from httpx import ASGITransport, AsyncClient, Response as HttpxResponse
    from app.main import app

    monkeypatch.setattr(settings, "PRO_QWEN_API_KEY", "qwen-key")
    monkeypatch.setattr(settings, "PRO_GEMINI_API_KEY", "gemini-key")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET /api/translation/models returns catalog of MT, STT, TTS
        res_models = await client.get("/api/translation/models")
        assert res_models.status_code == 200
        catalog_data = res_models.json()
        assert "catalog" in catalog_data
        assert "stt" in catalog_data
        assert "tts" in catalog_data
        assert any(m["provider"] == "qwen" for m in catalog_data["catalog"])

        # 2. GET /api/translation/recommend returns pair-tailored smart recommendation
        res_rec = await client.get("/api/translation/recommend?source=vi&target=ja")
        assert res_rec.status_code == 200
        rec_data = res_rec.json()
        assert rec_data["recommended_engine"] == "qwen"
        assert rec_data["model_profile"]["provider"] == "qwen"

        # 3. GET /api/translation/tts uses memory cache on repeated queries
        from app.api import providers as providers_module
        providers_module._tts_cache.clear()

        fake_audio = b"fake-audio-mp3-bytes"
        async def fake_get(*args, **kwargs):
            return HttpxResponse(200, content=fake_audio)

        monkeypatch.setattr(providers_module._tts_http_client, "get", fake_get)

        # First call -> MISS
        res_tts1 = await client.get("/api/translation/tts?tl=vi&q=Xin ch\xc3\xa0o")
        assert res_tts1.status_code == 200
        assert res_tts1.headers["x-tts-cache"] == "MISS"
        assert res_tts1.content == fake_audio

        # Second call -> HIT (0 network calls)
        res_tts2 = await client.get("/api/translation/tts?tl=vi&q=Xin ch\xc3\xa0o")
        assert res_tts2.status_code == 200
        assert res_tts2.headers["x-tts-cache"] == "HIT"
        assert res_tts2.content == fake_audio


