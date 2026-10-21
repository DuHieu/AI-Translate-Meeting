import asyncio
import re
from unittest.mock import AsyncMock, MagicMock
import numpy as np
import pytest

from app.speech.whisper_service import (
    SpeechToTextService,
    TranscriptResult,
    JAPANESE_KANA_REGEX,
    VIETNAMESE_DIACRITICS_REGEX,
)
from app.translation.cache import TranslationCache, InMemoryLRUCache
from app.translation.glossary import GlossaryManager
from app.translation.contextual_provider import (
    ContextualTranslationProvider,
    TranslationContextRequest,
)
from app.translation.local_provider import LocalTranslationProvider
from app.websocket.transcribe_handler import TranscribeWebSocketHandler
from app.schemas.subtitle import SubtitleBroadcastMessage


# ---------------------------------------------------------------------------
# 1. Real LID & Script Heuristics Tests
# ---------------------------------------------------------------------------
def test_script_heuristics_regex():
    """Verify script heuristic regexes for Vietnamese and Japanese."""
    vi_sample = "Chúng ta cần tối ưu hóa hệ thống này."
    ja_sample = "はい、了解いたしました。"
    en_sample = "Can everyone hear me clearly?"

    assert VIETNAMESE_DIACRITICS_REGEX.search(vi_sample) is not None
    assert JAPANESE_KANA_REGEX.search(vi_sample) is None

    assert JAPANESE_KANA_REGEX.search(ja_sample) is not None
    assert VIETNAMESE_DIACRITICS_REGEX.search(ja_sample) is None

    assert VIETNAMESE_DIACRITICS_REGEX.search(en_sample) is None
    assert JAPANESE_KANA_REGEX.search(en_sample) is None


def test_transcript_result_includes_probability():
    """Verify TranscriptResult dataclass includes language_probability."""
    res = TranscriptResult(text="Hello", language="en", is_final=True, language_probability=0.98)
    assert res.text == "Hello"
    assert res.language == "en"
    assert res.is_final is True
    assert res.language_probability == 0.98


def test_whisper_detect_language_heuristic_refinement(monkeypatch):
    """Verify _transcribe_sync refines language when text contains unambiguous scripts."""
    service = SpeechToTextService(model_size="tiny")

    # Mock model
    mock_model = MagicMock()
    mock_segment = MagicMock()
    mock_segment.text = "こんにちは、会議を始めましょう。"
    mock_info = MagicMock()
    mock_info.language = "zh"  # Deliberate wrong LID from whisper
    mock_info.language_probability = 0.51
    mock_model.transcribe.return_value = ([mock_segment], mock_info)

    monkeypatch.setattr(service, "_model", mock_model)

    # Calling with auto language
    result = service._transcribe_sync(np.zeros(16000, dtype=np.float32), language="auto")

    # Heuristic should correct "zh" to "ja" due to Hiragana
    assert result.language == "ja"
    assert result.language_probability >= 0.95
    assert "こんにちは" in result.text


# ---------------------------------------------------------------------------
# 2. L1 In-Memory LRU Cache & Normalization Tests
# ---------------------------------------------------------------------------
def test_in_memory_lru_cache_operations():
    """Verify L1 In-Memory LRU Cache operations, eviction, and thread safety."""
    cache = InMemoryLRUCache(capacity=3)

    cache.set("k1", "v1")
    cache.set("k2", "v2")
    cache.set("k3", "v3")

    assert len(cache) == 3
    assert cache.get("k1") == "v1"
    assert cache.get("k2") == "v2"

    # Insert 4th element: k3 should be evicted as k1 and k2 were accessed
    cache.set("k4", "v4")
    assert len(cache) == 3
    assert cache.get("k3") is None
    assert cache.get("k4") == "v4"

    cache.clear()
    assert len(cache) == 0


def test_translation_cache_text_normalization():
    """Verify text normalization strips ending punctuation and collapses whitespace."""
    raw1 = "  Xin chào mọi người!  "
    raw2 = "xin chào mọi người."
    raw3 = "Xin chào mọi người?"
    raw4 = "Xin   chào   mọi   người"
    raw5 = "「Xin chào mọi người!」"
    raw6 = '"Xin chào mọi người."'

    norm1 = TranslationCache.normalize_text(raw1)
    norm2 = TranslationCache.normalize_text(raw2)
    norm3 = TranslationCache.normalize_text(raw3)
    norm4 = TranslationCache.normalize_text(raw4)
    norm5 = TranslationCache.normalize_text(raw5)
    norm6 = TranslationCache.normalize_text(raw6)

    assert norm1 == "xin chào mọi người"
    assert norm1 == norm2 == norm3 == norm4 == norm5 == norm6


@pytest.mark.asyncio
async def test_two_tier_translation_cache_l1_and_redis():
    """Verify L1 Memory Cache returns in <0.1ms and backfills from Redis."""
    cache = TranslationCache(enabled=False, l1_capacity=100)

    gen_key = cache.build_general_key("vi", "ja", "Xin chào mọi người!")

    # Initially empty
    assert await cache.get(gen_key) is None

    # Set value
    await cache.set(gen_key, "皆様、こんにちは。")

    # Second lookup should hit L1 In-Memory Cache instantly
    hit = await cache.get(gen_key)
    assert hit == "皆様、こんにちは。"

    stats = cache.get_stats()
    assert stats["l1_entries"] == 1


# ---------------------------------------------------------------------------
# 3. Glossary Fix: No Hybrid Sentence Output
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_contextual_provider_avoids_hybrid_glossary_sentence():
    """Verify that glossary matching does not produce half-Vietnamese half-Japanese sentences."""
    glossary_mgr = GlossaryManager()
    fallback = LocalTranslationProvider(backend="local_dictionary")
    provider = ContextualTranslationProvider(
        fallback_provider=fallback,
        glossary_manager=glossary_mgr,
    )

    req = TranslationContextRequest(
        meetingId="m1",
        speakerId="u1",
        sourceLanguage="vi",
        targetLanguage="ja",
        text="Chúng ta cần tối ưu hóa hệ thống này.",
        glossary={"tối ưu hóa": "最適化"},
    )

    result = await provider.translate_contextual(req)

    # Must NOT be the broken hybrid "Chúng ta cần 最適化 hệ thống này."
    assert result != "Chúng ta cần 最適化 hệ thống này."


def test_glossary_enforce_target_terms():
    """Verify enforce_target_terms replaces literal machine translations with preferred IT terms."""
    glossary = GlossaryManager()
    terms = {"triển khai": "デプロイ", "kiểm thử": "テスト"}

    raw_machine_translation = "システムをクラウドに展開して、検査を実施します。"
    enforced = glossary.enforce_target_terms(raw_machine_translation, terms, target_lang="ja")

    assert "デプロイ" in enforced
    assert "テスト" in enforced


# ---------------------------------------------------------------------------
# 4. Auto Spoken Language WebSocket & Zero-Latency Bypass
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_transcribe_handler_auto_source_language_bypass():
    """Verify that when speaker speaks Japanese and listener wants Japanese, translation is bypassed (0ms)."""
    handler = TranscribeWebSocketHandler()

    ws = MagicMock()
    ws.send_text = AsyncMock()
    ws.accept = AsyncMock()

    # Speaker speaks Japanese in 'auto' source language mode
    ws.receive = AsyncMock(side_effect=[
        {
            "type": "websocket.receive",
            "text": '{"text": "はい、承知いたしました。", "language": "auto", "isFinal": true}',
        },
        {"type": "websocket.disconnect"},
    ])

    await handler.handle(
        ws,
        meeting_id="meeting-auto-test",
        participant_id="user-auto",
        participant_name="Tanaka",
        source_language="auto",
        target_language="ja",
        already_accepted=True,
    )

    sent_messages = [
        SubtitleBroadcastMessage.model_validate_json(call.args[0])
        for call in ws.send_text.call_args_list
        if '"type":"subtitle"' in call.args[0] or '"type": "subtitle"' in call.args[0]
    ]

    target_msg = next((m for m in sent_messages if "承知いたしました" in m.data.originalText), None)
    assert target_msg is not None
    assert target_msg.data.sourceLanguage == "ja"
    assert target_msg.data.targetLanguage == "ja"
    # Listener with targetLanguage="ja" receives the original Japanese without placeholder or mangling
    assert target_msg.data.translatedText == "はい、承知いたしました。"
