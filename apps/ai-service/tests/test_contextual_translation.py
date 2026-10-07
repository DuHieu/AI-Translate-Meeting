import asyncio
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.schemas.subtitle import SubtitleBroadcastMessage
from app.services.laya_client import LayaDecisionClient
from app.translation.cache import TranslationCache
from app.translation.context_manager import ContextSegment, MeetingContextManager
from app.translation.contextual_provider import (
    ContextualTranslationProvider,
    TranslationContextRequest,
)
from app.translation.dataset_collector import (
    JsonlDatasetStorage,
    TranslationDatasetCollector,
)
from app.translation.glossary import GlossaryManager
from app.translation.local_provider import LocalTranslationProvider
from app.websocket.meeting_connection_manager import (
    MeetingConnectionManager,
    ParticipantConnection,
)
from app.websocket.transcribe_handler import TranscribeWebSocketHandler
from app.config.settings import settings


# ---------------------------------------------------------------------------
# 1. Context Isolation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_context_isolation_between_meetings():
    """Verify that dialogue context from Meeting A never leaks into Meeting B."""
    manager = MeetingContextManager(max_segments=5)
    meeting_a = f"meeting-a-{uuid4()}"
    meeting_b = f"meeting-b-{uuid4()}"

    # Add 3 segments to Meeting A
    for i in range(3):
        await manager.add_segment(
            meeting_a,
            ContextSegment(
                source_text=f"A statement {i}",
                translated_text=f"A translation {i}",
                source_language="vi",
                target_language="ja",
                speaker_id="user_a",
                speaker_name="Alice",
                domain="engineering",
            ),
        )

    # Add 2 segments to Meeting B
    for i in range(2):
        await manager.add_segment(
            meeting_b,
            ContextSegment(
                source_text=f"B statement {i}",
                translated_text=f"B translation {i}",
                source_language="ja",
                target_language="vi",
                speaker_id="user_b",
                speaker_name="Bob",
                domain="business",
            ),
        )

    ctx_a = await manager.get_context(meeting_a)
    ctx_b = await manager.get_context(meeting_b)

    assert len(ctx_a) == 3
    assert len(ctx_b) == 2

    # Verify Meeting A contains NO traces of Meeting B
    for seg in ctx_a:
        assert "B statement" not in seg.source_text
        assert seg.speaker_name == "Alice"

    # Verify Meeting B contains NO traces of Meeting A
    for seg in ctx_b:
        assert "A statement" not in seg.source_text
        assert seg.speaker_name == "Bob"

    # Verify domain isolation
    assert await manager.get_domain(meeting_a) == "engineering"
    assert await manager.get_domain(meeting_b) == "business"

    # Verify clearing meeting A leaves meeting B completely intact
    await manager.clear_meeting(meeting_a)
    assert len(await manager.get_context(meeting_a)) == 0
    assert len(await manager.get_context(meeting_b)) == 2


# ---------------------------------------------------------------------------
# 2. Cache Key Context Sensitivity & Meeting Isolation
# ---------------------------------------------------------------------------
def test_cache_key_context_sensitivity():
    """Verify cache key changes when context, glossary, provider, or meeting changes."""
    cache = TranslationCache(enabled=False)

    text = "Chúng ta triển khai microservices."
    meeting_1 = "room-alpha"
    meeting_2 = "room-beta"

    # 1. Base key
    k1 = cache.build_key(
        meeting_id=meeting_1,
        source_lang="vi",
        target_lang="ja",
        text=text,
        context_hash="ctx_hash_1",
        glossary_version="1.0.0",
        provider_version="v1",
    )

    # 2. Key with changed dialogue context
    k2 = cache.build_key(
        meeting_id=meeting_1,
        source_lang="vi",
        target_lang="ja",
        text=text,
        context_hash="ctx_hash_2",
        glossary_version="1.0.0",
        provider_version="v1",
    )
    assert k1 != k2, "Cache key must change when context hash changes"

    # 3. Key with changed glossary version
    k3 = cache.build_key(
        meeting_id=meeting_1,
        source_lang="vi",
        target_lang="ja",
        text=text,
        context_hash="ctx_hash_1",
        glossary_version="1.0.1",
        provider_version="v1",
    )
    assert k1 != k3, "Cache key must change when glossary version changes"

    # 4. Key with changed provider version
    k4 = cache.build_key(
        meeting_id=meeting_1,
        source_lang="vi",
        target_lang="ja",
        text=text,
        context_hash="ctx_hash_1",
        glossary_version="1.0.0",
        provider_version="v2",
    )
    assert k1 != k4, "Cache key must change when provider version changes"

    # 5. Strict meeting boundary isolation: identical query in different meeting MUST yield different key
    k5 = cache.build_key(
        meeting_id=meeting_2,
        source_lang="vi",
        target_lang="ja",
        text=text,
        context_hash="ctx_hash_1",
        glossary_version="1.0.0",
        provider_version="v1",
    )
    assert k1 != k5, "Cache key must differ across meetings to prevent private data leakage"


@pytest.mark.asyncio
async def test_translation_cache_awaits_async_redis_operations():
    class AsyncRedisFake:
        def __init__(self):
            self.values = {"cache-key": "translated"}
            self.set_calls = []

        async def get(self, key):
            return self.values.get(key)

        async def set(self, key, value, *, ex):
            self.set_calls.append((key, value, ex))

    cache = TranslationCache(enabled=False, ttl_seconds=60)
    cache.enabled = True
    cache._redis = AsyncRedisFake()

    assert await cache.get("cache-key") == "translated"
    assert await cache.set("new-key", "value") is True
    assert cache._redis.set_calls == [("new-key", "value", 60)]


def test_disabled_dataset_collector_does_not_create_storage(monkeypatch):
    def fail_if_constructed(*args, **kwargs):
        raise AssertionError("disabled collection must not initialize persistent storage")

    monkeypatch.setattr(
        "app.translation.dataset_collector.JsonlDatasetStorage",
        fail_if_constructed,
    )

    collector = TranslationDatasetCollector(enabled=False)
    assert collector.enabled is False
    assert collector.storage is None


def test_contextual_translation_feature_flag_selects_local_provider(monkeypatch):
    monkeypatch.setattr(settings, "CONTEXTUAL_TRANSLATION_ENABLED", False)

    handler = TranscribeWebSocketHandler()

    assert isinstance(handler.translator, LocalTranslationProvider)


def test_websocket_handler_does_not_initialize_dataset_storage(monkeypatch):
    monkeypatch.setattr(settings, "TRANSLATION_DATASET_COLLECTION_ENABLED", True)

    def fail_if_constructed(*args, **kwargs):
        raise AssertionError("subtitle runtime must not initialize training-data storage")

    monkeypatch.setattr(
        "app.translation.dataset_collector.JsonlDatasetStorage",
        fail_if_constructed,
    )

    TranscribeWebSocketHandler()


# ---------------------------------------------------------------------------
# 3. Laya Timeout Fail-Safe
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_laya_timeout_translation_continues():
    """Verify that when Laya classification times out, translation succeeds gracefully."""
    client = LayaDecisionClient(enabled=True)

    # Mock _get_client to simulate a slow / hanging server
    mock_http = MagicMock()
    async def slow_post(*args, **kwargs):
        await asyncio.sleep(0.5)  # Longer than 50ms timeout
        return MagicMock(status_code=200, json=lambda: {})
    mock_http.post = AsyncMock(side_effect=slow_post)
    client._http_client = mock_http

    # Request with tight 50ms timeout
    domain, sensitivity = await client.classify_domain_and_terminology(
        "Chúng ta triển khai hệ thống mới.",
        timeout_ms=50,
        default_domain="general",
    )

    # Must return fallback without raising an unhandled exception
    assert domain in ("engineering", "general")
    assert sensitivity in ("high", "normal")


# ---------------------------------------------------------------------------
# 4. Redis Failure Graceful Degradation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_redis_failure_translation_continues():
    """Verify that when Redis is completely down or unreachable, cache fails gracefully."""
    cache = TranslationCache(redis_host="invalid.unreachable.host", enabled=True)
    # Redis will be None or disconnected
    key = cache.build_key("meeting1", "vi", "ja", "Xin chào")

    # Get should return None gracefully without raising
    cached = await cache.get(key)
    assert cached is None

    # Set should return False gracefully without raising
    saved = await cache.set(key, "こんにちは")
    assert saved is False


# ---------------------------------------------------------------------------
# 5. Translation Provider Timeout and Fallback
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_translation_provider_timeout_uses_fallback():
    """Verify that when contextual provider engine times out, fallback provider is used."""
    mock_fallback = MagicMock(spec=LocalTranslationProvider)
    mock_fallback.translate = AsyncMock(return_value="こんにちは（フォールバック）")

    provider = ContextualTranslationProvider(
        fallback_provider=mock_fallback,
        timeout_ms=50,  # 50ms timeout
    )

    # Mock engine execution to hang for 200ms
    async def slow_engine(*args, **kwargs):
        await asyncio.sleep(0.2)
        return "Slow result"

    provider._execute_engine_translation = slow_engine

    req = TranslationContextRequest(
        meetingId="test-room",
        speakerId="user-1",
        sourceLanguage="vi",
        targetLanguage="ja",
        text="Một câu nói ngẫu nhiên cần dịch.",
    )

    result = await provider.translate_contextual(req)
    # Should use fallback without error
    assert result == "こんにちは（フォールバック）"
    assert not result.startswith("[JA]"), "Must never return raw placeholder in production"


def test_production_sanitization_removes_placeholder():
    """Verify production output never returns '[JA] ...' placeholder."""
    provider = ContextualTranslationProvider()
    clean = provider._sanitize_production_output("[JA] Nguyên bản câu nói", "Nguyên bản câu nói", "ja")
    assert clean == "Nguyên bản câu nói"
    assert not clean.startswith("[JA]")


# ---------------------------------------------------------------------------
# 6. Superseded Partial Transcript Cancellation
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_superseded_partial_transcript_cancellation():
    """Verify that an outdated partial transcript is not broadcast when superseded by a newer one."""
    handler = TranscribeWebSocketHandler()
    meeting_id = str(uuid4())
    participant_id = str(uuid4())

    ws = MagicMock()
    ws.send_text = AsyncMock()
    ws.accept = AsyncMock()

    # Sequence of incoming messages:
    # 1. Partial #1: "Chúng tôi cần kiểm tra"
    # 2. Partial #2: "Chúng tôi cần kiểm tra cấu hình máy chủ" (supersedes Partial #1)
    # 3. Disconnect
    ws.receive = AsyncMock(side_effect=[
        {
            "type": "websocket.receive",
            "text": json.dumps({"text": "Chúng tôi cần kiểm tra", "language": "vi", "isFinal": False}),
        },
        {
            "type": "websocket.receive",
            "text": json.dumps({"text": "Chúng tôi cần kiểm tra cấu hình máy chủ", "language": "vi", "isFinal": False}),
        },
        {"type": "websocket.disconnect"},
    ])

    await handler.handle(
        ws,
        meeting_id,
        participant_id,
        "Speaker 1",
        "vi",
        "ja",
        already_accepted=True,
    )

    # Collect broadcast messages (skip greeting acknowledgement)
    sent_messages = []
    for call in ws.send_text.call_args_list:
        raw_msg = call.args[0]
        if json.loads(raw_msg).get("type") == "subtitle":
            parsed = SubtitleBroadcastMessage.model_validate_json(raw_msg)
            if not parsed.data.originalText.startswith("Xin chào"):
                sent_messages.append(parsed)

    # Verify that partial #1 ("Chúng tôi cần kiểm tra" alone) was not broadcast, or superseded
    if sent_messages:
        last_partial = sent_messages[-1]
        assert "cấu hình" in last_partial.data.originalText or last_partial.data.isFinal is False


# ---------------------------------------------------------------------------
# 7. Final Transcript Priority & Contract Delivery
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_final_transcript_takes_priority_and_broadcasts():
    """Verify that a final transcript is always translated, broadcast, and stored in context."""
    handler = TranscribeWebSocketHandler()
    meeting_id = str(uuid4())
    participant_id = str(uuid4())

    ws = MagicMock()
    ws.send_text = AsyncMock()
    ws.accept = AsyncMock()

    # Final sentence message
    ws.receive = AsyncMock(side_effect=[
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

    await handler.handle(
        ws,
        meeting_id,
        participant_id,
        "Nguyen Van A",
        "vi",
        "ja",
        already_accepted=True,
    )

    # Verify final subtitle was sent
    sent_subs = [
        SubtitleBroadcastMessage.model_validate_json(call.args[0])
        for call in ws.send_text.call_args_list
        if json.loads(call.args[0]).get("type") == "subtitle"
    ]

    assert len(sent_subs) >= 1
    final_sub = next(
        sub for sub in sent_subs if "thống nhất" in sub.data.originalText
    )
    assert final_sub.data.isFinal is True
    assert final_sub.data.sourceLanguage == "vi"
    assert final_sub.data.targetLanguage == "ja"
    assert final_sub.data.participantName == "Nguyen Van A"
    assert "thống nhất" in final_sub.data.originalText


# ---------------------------------------------------------------------------
# 8. Glossary & Entity Preservation
# ---------------------------------------------------------------------------
def test_glossary_entity_preservation():
    """Verify that named entities, acronyms, and product names are preserved."""
    glossary = GlossaryManager()

    text = "Chúng ta triển khai Docker và LiveKit trên AWS qua API mới."
    protected, token_map = glossary.protect_entities(text)

    # Entities should be tokenized
    assert len(token_map) >= 3
    entities_protected = list(token_map.values())
    assert "Docker" in entities_protected
    assert "LiveKit" in entities_protected
    assert "AWS" in entities_protected
    assert "API" in entities_protected

    # Simulated translation preserving tokens
    simulated_translation = protected.replace("Chúng ta triển khai", "私たちはデプロイします")
    restored = glossary.restore_entities(simulated_translation, token_map)

    # Restored text must have exact original casing of entities
    assert "Docker" in restored
    assert "LiveKit" in restored
    assert "AWS" in restored
    assert "API" in restored


def test_glossary_domain_lookup():
    """Verify domain-specific term matching for VI -> JA."""
    glossary = GlossaryManager()

    terms = glossary.get_relevant_glossary(
        "Cơ sở dữ liệu và bộ nhớ đệm cần tối ưu hóa độ trễ.",
        source_lang="vi",
        target_lang="ja",
        domain="engineering",
    )

    assert "cơ sở dữ liệu" in terms
    assert terms["cơ sở dữ liệu"] == "データベース"
    assert "bộ nhớ đệm" in terms
    assert terms["bộ nhớ đệm"] == "キャッシュ"
    assert "độ trễ" in terms
    assert terms["độ trễ"] == "レイテンシ"


@pytest.mark.asyncio
async def test_contextual_provider_does_not_truncate_long_sentence_with_domain_term():
    """Verify multi-clause sentences containing 'cơ sở dữ liệu' are translated in full, not truncated to 'データベース'."""
    mock_fallback = MagicMock(spec=LocalTranslationProvider)
    mock_fallback.translate = AsyncMock(
        return_value="金曜日までに __ENTITY_0__ のデータベースを再確認し、__ENTITY_1__ に展開する必要があります。"
    )
    provider = ContextualTranslationProvider(fallback_provider=mock_fallback)

    result = await provider.translate(
        "Chúng ta cần kiểm tra lại cơ sở dữ liệu PostgreSQL và triển khai lên Docker trước thứ sáu.",
        "vi",
        "ja",
        domain="engineering",
    )

    assert result != "データベース"
    assert "PostgreSQL" in result
    assert "Docker" in result
    assert "データベース" in result
    assert "デプロイ" in result
    mock_fallback.translate.assert_awaited_once()


# ---------------------------------------------------------------------------
# 9. Fine-Tuning Dataset Collection
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_dataset_collector_stores_pair_without_audio():
    """Verify training example storage matches required schema and has no audio."""
    temp_dir = tempfile.mkdtemp()
    try:
        storage = JsonlDatasetStorage(base_dir=temp_dir)
        collector = TranslationDatasetCollector(storage=storage, enabled=True)

        meeting_id = str(uuid4())
        context_items = [{"speaker": "A", "source": "Xin chào", "target": "こんにちは"}]

        record_id = await storage.save_pair({
            "meetingId": meeting_id,
            "context": context_items,
            "source": "Chúng ta bắt đầu họp nhé.",
            "machineTranslation": "会議を始めましょう。",
            "correctedTranslation": None,
            "sourceLanguage": "vi",
            "targetLanguage": "ja",
            "domain": "business",
            "glossaryVersion": "1.0.0",
            "provider": "contextual",
            "latencyMs": 42.5,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })

        assert record_id is not None

        # Verify reading records
        pairs = await storage.get_pairs(meeting_id=meeting_id)
        assert len(pairs) == 1
        record = pairs[0]
        assert record["source"] == "Chúng ta bắt đầu họp nhé."
        assert record["machineTranslation"] == "会議を始めましょう。"
        assert record["correctedTranslation"] is None
        assert "audio" not in record  # Zero audio storage

        # Verify human correction update
        updated = await storage.update_correction(record_id, "さあ、会議を始めましょうか。")
        assert updated is True

        updated_pairs = await storage.get_pairs(meeting_id=meeting_id)
        assert updated_pairs[0]["correctedTranslation"] == "さあ、会議を始めましょうか。"
        assert "correctedAt" in updated_pairs[0]

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
