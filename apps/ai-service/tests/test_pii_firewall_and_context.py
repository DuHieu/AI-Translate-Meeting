import json
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.translation.contextual_provider import (
    ContextualTranslationProvider,
    TranslationContextRequest,
)
from app.translation.local_provider import LocalTranslationProvider
from app.translation.pii_firewall import TwoWayPiiFirewall
from app.translation.premium_provider import (
    PremiumTranslationConfig,
    PremiumTranslationProvider,
)


def test_pii_firewall_masks_and_restores_email():
    text = "Vui lòng gửi tài liệu tới alice.smith@enterprise.com nhé."
    res = TwoWayPiiFirewall.mask(text)

    assert "alice.smith@enterprise.com" not in res.masked_text
    assert "__PII_EMAIL_1__" in res.masked_text
    assert res.pii_count == 1
    assert res.restore_map["__PII_EMAIL_1__"] == "alice.smith@enterprise.com"

    mock_llm_translation = "Please send the document to __PII_EMAIL_1__."
    restored = TwoWayPiiFirewall.restore(mock_llm_translation, res.restore_map)
    assert restored == "Please send the document to alice.smith@enterprise.com."


def test_pii_firewall_masks_and_restores_phone():
    text = "Số điện thoại khẩn cấp của tôi là +84 912 345 678."
    res = TwoWayPiiFirewall.mask(text)

    assert "+84 912 345 678" not in res.masked_text
    assert "__PII_PHONE_1__" in res.masked_text
    assert res.pii_count == 1

    mock_llm_translation = "My emergency phone number is __PII_PHONE_1__."
    restored = TwoWayPiiFirewall.restore(mock_llm_translation, res.restore_map)
    assert restored == "My emergency phone number is +84 912 345 678."


def test_pii_firewall_masks_and_restores_amount():
    text = "Dự án này dự kiến có ngân sách khoảng $50,000 hoặc 1.2 tỷ VND."
    res = TwoWayPiiFirewall.mask(text)

    assert "$50,000" not in res.masked_text
    assert "1.2 tỷ VND" not in res.masked_text
    assert "__PII_AMOUNT_" in res.masked_text
    assert res.pii_count >= 2

    mock_llm_translation = "This project has a budget of __PII_AMOUNT_1__ or __PII_AMOUNT_2__."
    restored = TwoWayPiiFirewall.restore(mock_llm_translation, res.restore_map)
    assert "$50,000" in restored
    assert "1.2 tỷ VND" in restored


def test_pii_firewall_tolerant_to_llm_token_spacing_or_case():
    restore_map = {"__PII_EMAIL_1__": "bob@corp.vn"}

    # Tolerant to lowercase
    t1 = "Send it to __pii_email_1__."
    assert TwoWayPiiFirewall.restore(t1, restore_map) == "Send it to bob@corp.vn."

    # Tolerant to spaces around underscores
    t2 = "Send it to __ PII_EMAIL_1 __."
    assert TwoWayPiiFirewall.restore(t2, restore_map) == "Send it to bob@corp.vn."


@pytest.mark.asyncio
async def test_premium_provider_masks_pii_before_http_request():
    captured_payloads = []

    async def mock_transport_respond(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode("utf-8"))
        captured_payloads.append(body)
        user_message = body["messages"][1]["content"]
        # LLM returns message with placeholder preserved intact
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": f"Translated: {user_message}"}}]},
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(mock_transport_respond)) as client:
        provider = PremiumTranslationProvider(http_client=client)
        raw_text = "Liên hệ với support@layameet.com hoặc gọi +84 909 111 222."
        result = await provider.translate(
            raw_text,
            "vi",
            "en",
            provider_name="groq",
            api_key="mock_key",
        )

    assert len(captured_payloads) == 1
    sent_prompt = captured_payloads[0]["messages"][1]["content"]

    # Verify sensitive data was NOT sent to Groq
    assert "support@layameet.com" not in sent_prompt
    assert "+84 909 111 222" not in sent_prompt
    assert "__PII_EMAIL_1__" in sent_prompt
    assert "__PII_PHONE_1__" in sent_prompt

    # Verify final result has the original PII cleanly restored
    assert "support@layameet.com" in result
    assert "+84 909 111 222" in result


@pytest.mark.asyncio
async def test_contextual_provider_masks_pii_in_fallback_flow():
    mock_fallback = MagicMock(spec=LocalTranslationProvider)

    async def echo_translate(text, sl, tl):
        # Fallback translates while keeping placeholder
        return f"Echo: {text}"

    mock_fallback.translate = AsyncMock(side_effect=echo_translate)
    mock_fallback.last_provider_name = "google_gtx"

    mock_premium = MagicMock(spec=PremiumTranslationProvider)
    mock_premium.resolve_active_credentials.return_value = None

    contextual = ContextualTranslationProvider(
        fallback_provider=mock_fallback,
        premium_provider=mock_premium,
    )

    result = await contextual.translate_contextual(
        TranslationContextRequest(
            meetingId="meeting-test",
            speakerId="speaker-1",
            sourceLanguage="vi",
            targetLanguage="en",
            text="Gửi email cho info@customer.vn ngay.",
            translationTier="standard",
        )
    )

    call_args = mock_fallback.translate.call_args[0]
    sent_to_fallback = call_args[0]

    # Verify sensitive email was masked before calling fallback provider
    assert "info@customer.vn" not in sent_to_fallback
    assert "__PII_EMAIL_1__" in sent_to_fallback

    # Verify output has email restored
    assert "info@customer.vn" in result
