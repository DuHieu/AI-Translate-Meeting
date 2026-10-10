import asyncio
import json
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.translation.cache import TranslationCache
from app.translation.contextual_provider import (
    ContextualTranslationProvider,
    TranslationContextRequest,
)
from app.translation.glossary import GlossaryManager
from app.translation.local_provider import LocalTranslationProvider
from app.translation.pii_firewall import TwoWayPiiFirewall
from app.websocket.transcribe_handler import TranscribeWebSocketHandler
from app.schemas.subtitle import SubtitleBroadcastMessage


# ==============================================================================
# 1. SEMANTIC FIDELITY & NO PLACEHOLDER LEAKAGE TEST (Anti-False-Pass)
# ==============================================================================
@pytest.mark.asyncio
async def test_translation_never_leaks_raw_placeholder_or_untranslated_in_production():
    """
    STRICT CONTRACT:
    The translation output MUST NOT return raw '[JA] ...' or identical non-translated
    text when translated between different languages.
    """
    glossary_mgr = GlossaryManager()
    provider = ContextualTranslationProvider(
        fallback_provider=LocalTranslationProvider(backend="local_dictionary"),
        glossary_manager=glossary_mgr,
    )

    req = TranslationContextRequest(
        meetingId="prod-room-1",
        speakerId="user-1",
        sourceLanguage="vi",
        targetLanguage="ja",
        text="Xin chào, chúng ta bắt đầu cuộc họp nhé.",
    )

    output = await provider.translate_contextual(req)

    # 1. Must never contain untranslated tag placeholders like [JA] or [EN]
    assert not output.startswith("[JA]")
    assert not output.startswith("[EN]")
    assert not output.startswith("[VI]")

    # 2. Must be actual valid Japanese text
    assert "こんにちは" in output or "会議" in output or "始めましょう" in output
    assert output != req.text, "Output must be translated, not returning identical input"


# ==============================================================================
# 2. GLOSSARY TERM PRESERVATION & ENFORCEMENT UNDER PRO & LOCAL TRANSLATION
# ==============================================================================
@pytest.mark.asyncio
async def test_glossary_enforcement_replaces_technical_jargon_strictly():
    """
    Tests that specialized technical terms defined in room glossary are strictly
    enforced and NOT ignored or mistranslated.
    """
    glossary_mgr = GlossaryManager()
    fake_fallback = MagicMock(spec=LocalTranslationProvider)
    # Simulator of machine translation that used literal, non-standard terms
    fake_fallback.translate = AsyncMock(
        return_value="システムをクラウドに展開して、検査を実施します。"
    )

    provider = ContextualTranslationProvider(
        fallback_provider=fake_fallback,
        glossary_manager=glossary_mgr,
    )

    req = TranslationContextRequest(
        meetingId="tech-room",
        speakerId="dev-lead",
        sourceLanguage="vi",
        targetLanguage="ja",
        text="Chúng ta triển khai và kiểm thử hệ thống.",
        glossary={"triển khai": "デプロイ", "kiểm thử": "テスト"},
    )

    result = await provider.translate_contextual(req)

    # Must replace '展開' with 'デプロイ' and '検査' with 'テスト'
    assert "デプロイ" in result
    assert "テスト" in result
    assert "展開" not in result
    assert "検査" not in result


# ==============================================================================
# 3. PII MASKING & 100% UNMASK INTEGRITY TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_pii_firewall_roundtrip_integrity_under_translation():
    """
    Ensures that customer emails, phone numbers, and keys are NEVER sent in raw form
    to translation engines, and are RESTORED with 100% fidelity in final output.
    """
    original_text = "Liên hệ với hieu.du@company.ai hoặc gọi +84 987 654 321 để lấy API key sk-live-999."

    # 1. Verify masking protects secrets
    masked = TwoWayPiiFirewall.mask(original_text)
    assert "hieu.du@company.ai" not in masked.masked_text
    assert "+84 987 654 321" not in masked.masked_text
    assert "sk-live-999" not in masked.masked_text
    assert masked.pii_count >= 3

    # 2. Simulate cloud translation returning tokens intact
    token_keys = list(masked.restore_map.keys())
    simulated_cloud_translated = f"Contact at {token_keys[0]} or call {token_keys[1]} to get key {token_keys[2]}."

    # 3. Verify restoration
    restored = TwoWayPiiFirewall.restore(simulated_cloud_translated, masked.restore_map)
    assert "hieu.du@company.ai" in restored
    assert "+84 987 654 321" in restored
    assert "sk-live-999" in restored


# ==============================================================================
# 4. NORMALIZED CACHE COLLISION & HIT RATE INTEGRITY
# ==============================================================================
@pytest.mark.asyncio
async def test_cache_hits_on_punctuation_variations_without_cross_meeting_leak():
    """
    Verifies that 'Xin chào!', 'Xin chào.', and 'Xin chào   ' hit the same cache entry,
    while DIFFERENT meetings have strictly isolated keys.
    """
    cache = TranslationCache(enabled=False, l1_capacity=500)

    # Key generation for punctuation variations
    k1 = cache.build_general_key("vi", "en", "Xin chào mọi người.")
    k2 = cache.build_general_key("vi", "en", "Xin chào mọi người!")
    k3 = cache.build_general_key("vi", "en", "  xin chào mọi người   ")
    k4 = cache.build_general_key("vi", "en", "Xin chào mọi người?")

    # All should resolve to identical normalized key
    assert k1 == k2 == k3 == k4, "Cache keys must match regardless of boundary punctuation or whitespace"

    # Store translation
    await cache.set(k1, "Hello everyone.")

    # Retrieve using variation
    hit = await cache.get(k2)
    assert hit == "Hello everyone."

    # Contextual key isolation between different meeting IDs
    ctx_m1 = cache.build_key(
        meeting_id="meeting-ALPHA",
        source_lang="vi",
        target_lang="en",
        text="Bí mật dự án",
    )
    ctx_m2 = cache.build_key(
        meeting_id="meeting-BETA",
        source_lang="vi",
        target_lang="en",
        text="Bí mật dự án",
    )
    assert ctx_m1 != ctx_m2, "Contextual cache must NEVER leak across meeting boundaries"


# ==============================================================================
# 5. CONCURRENT WEBSOCKET BROADCAST STRESS & INTEGRITY TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_websocket_broadcast_concurrent_listeners_accuracy():
    """
    Simulates a multi-lingual room with 3 participants (1 speaker, 1 JA listener, 1 EN listener).
    Verifies:
    1. Each listener receives subtitles in THEIR chosen target language.
    2. Zero cross-talk or race conditions during concurrent dispatch.
    """
    handler = TranscribeWebSocketHandler()

    ws_speaker = MagicMock()
    ws_speaker.send_text = AsyncMock()
    ws_speaker.accept = AsyncMock()
    ws_speaker.receive = AsyncMock(side_effect=[
        {
            "type": "websocket.receive",
            "text": json.dumps({
                "text": "Chúng ta thống nhất chốt giải pháp triển khai trên đám mây.",
                "language": "vi",
                "isFinal": True,
            }),
        },
        {"type": "websocket.disconnect"},
    ])

    ws_listener_ja = MagicMock()
    ws_listener_ja.send_text = AsyncMock()

    ws_listener_en = MagicMock()
    ws_listener_en.send_text = AsyncMock()

    # Pre-register listeners in meeting manager
    meeting_id = "stress-multi-lang-room"
    await handler.connection_manager.register(
        meeting_id=meeting_id,
        participant_id="user-ja",
        websocket=ws_listener_ja,
        participant_name="Sato",
        target_language="ja",
    )
    await handler.connection_manager.register(
        meeting_id=meeting_id,
        participant_id="user-en",
        websocket=ws_listener_en,
        participant_name="John",
        target_language="en",
    )

    await handler.handle(
        websocket=ws_speaker,
        meeting_id=meeting_id,
        participant_id="user-speaker",
        participant_name="An",
        source_language="vi",
        target_language="vi",
        already_accepted=True,
    )

    # 1. JA Listener verification
    ja_calls = [
        SubtitleBroadcastMessage.model_validate_json(call.args[0])
        for call in ws_listener_ja.send_text.call_args_list
        if '"type":"subtitle"' in call.args[0] or '"type": "subtitle"' in call.args[0]
    ]
    assert len(ja_calls) > 0
    final_ja = next(m for m in ja_calls if "triển khai" in m.data.originalText)
    assert final_ja.data.targetLanguage == "ja"
    assert "クラウド" in final_ja.data.translatedText or "合意" in final_ja.data.translatedText

    # 2. EN Listener verification
    en_calls = [
        SubtitleBroadcastMessage.model_validate_json(call.args[0])
        for call in ws_listener_en.send_text.call_args_list
        if '"type":"subtitle"' in call.args[0] or '"type": "subtitle"' in call.args[0]
    ]
    assert len(en_calls) > 0
    final_en = next(m for m in en_calls if "triển khai" in m.data.originalText)
    assert final_en.data.targetLanguage == "en"
    assert final_en.data.translatedText != ""
    assert not final_en.data.translatedText.startswith("[EN]")
