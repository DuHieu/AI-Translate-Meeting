import json
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.translation.cache import TranslationCache
from app.translation.contextual_provider import ContextualTranslationProvider
from app.translation.dataset_collector import JsonlDatasetStorage
from app.translation.qa_evaluator import (
    TranslationQaManager,
    compute_translation_accuracy,
    scrub_pii,
)


@pytest.fixture
def qa_manager(tmp_path):
    return TranslationQaManager(
        storage=JsonlDatasetStorage(base_dir=str(tmp_path / "dataset")),
        cache=TranslationCache(enabled=False),
        learned_patterns_path=tmp_path / "learned_patterns.json",
        qa_training_mode_enabled=False,
    )


def test_scrub_pii_masks_supported_sensitive_values():
    source = (
        "Email an@example.com, gọi +84 912 345 678, chuyển $500 hoặc "
        "200.000đ, tài khoản 123456789012."
    )

    scrubbed, was_scrubbed = scrub_pii(source)

    assert was_scrubbed is True
    assert "an@example.com" not in scrubbed
    assert "+84 912 345 678" not in scrubbed
    assert "$500" not in scrubbed
    assert "200.000đ" not in scrubbed
    assert "123456789012" not in scrubbed
    assert {"[EMAIL]", "[PHONE]", "[AMOUNT]", "[NUMBER]"}.issubset(
        set(scrubbed.replace(",", "").replace(".", "").split())
    )


def test_compute_translation_accuracy_penalizes_unsafe_output():
    healthy = compute_translation_accuracy(
        source_text="Chúng ta bắt đầu cuộc họp",
        translated_text="Let's start the meeting",
        source_lang="vi",
        target_lang="en",
        stt_confidence=0.96,
        provider="premium_ai",
    )
    fallback = compute_translation_accuracy(
        source_text="Chúng ta bắt đầu cuộc họp",
        translated_text="[EN] Chúng ta bắt đầu cuộc họp",
        source_lang="vi",
        target_lang="en",
        stt_confidence=0.96,
        provider="tagged_fallback",
    )

    assert 0 <= fallback["accuracyScore"] < healthy["accuracyScore"] <= 100
    assert healthy["accuracyScore"] >= 90


@pytest.mark.asyncio
async def test_record_segment_keeps_zero_text_stats_when_collection_is_disabled(qa_manager):
    await qa_manager.record_segment(
        meeting_code="ROOM-001",
        source_lang="vi",
        target_lang="ja",
        source_text="Nội dung khách hàng tuyệt mật",
        translated_text="顧客の機密コンテンツ",
        stt_confidence=0.92,
        provider="google_gtx",
        latency_ms=84.5,
        cache_hit=False,
    )

    summary = qa_manager.get_summary()
    serialized_stats = json.dumps(summary, ensure_ascii=False)

    assert summary["totalSegments"] == 1
    assert summary["meetings"][0]["meetingCode"] == "ROOM-001"
    assert summary["meetings"][0]["languagePairs"] == ["vi→ja"]
    assert "Nội dung khách hàng tuyệt mật" not in serialized_stats
    assert "顧客の機密コンテンツ" not in serialized_stats
    assert qa_manager.get_samples() == []
    assert await qa_manager.storage.get_pairs() == []


@pytest.mark.asyncio
async def test_opt_in_collection_persists_only_scrubbed_text(qa_manager):
    qa_manager.qa_training_mode_enabled = True

    await qa_manager.record_segment(
        meeting_code="ROOM-PII",
        source_lang="vi",
        target_lang="en",
        source_text="Gửi mail tới ceo@example.com và gọi 0901234567",
        translated_text="Send mail to ceo@example.com and call 0901234567",
        provider="google_gtx",
        latency_ms=30,
    )

    samples = qa_manager.get_samples()
    persisted = await qa_manager.storage.get_pairs()
    serialized = json.dumps([samples, persisted], ensure_ascii=False)
    assert len(samples) == len(persisted) == 1
    assert "ceo@example.com" not in serialized
    assert "0901234567" not in serialized
    assert "[EMAIL]" in serialized
    assert "[PHONE]" in serialized


@pytest.mark.asyncio
async def test_train_pattern_is_immediately_used_by_contextual_provider(qa_manager, monkeypatch):
    from app.translation import qa_evaluator

    monkeypatch.setattr(qa_evaluator, "qa_manager", qa_manager)
    fallback = AsyncMock()
    fallback.translate = AsyncMock(return_value="wrong external translation")
    provider = ContextualTranslationProvider(fallback_provider=fallback)

    trained = await qa_manager.train_pattern(
        source_lang="vi",
        target_lang="ja",
        source_text="Chốt phương án alpha",
        corrected_translation="アルファ案を確定します。",
        domain="engineering",
    )
    translated = await provider.translate(
        "  CHỐT PHƯƠNG ÁN ALPHA  ",
        "VI",
        "JA",
    )

    assert trained["status"] == "trained"
    assert translated == "アルファ案を確定します。"
    assert provider.last_provider_name == "learned_pattern"
    fallback.translate.assert_not_awaited()


@pytest.mark.asyncio
async def test_train_pattern_scrubs_pii_before_persistence_and_lookup(qa_manager):
    trained = await qa_manager.train_pattern(
        source_lang="vi",
        target_lang="en",
        source_text="Gọi số 0901234567",
        corrected_translation="Call 0901234567",
    )

    persisted = qa_manager.learned_patterns_path.read_text(encoding="utf-8")
    assert "0901234567" not in persisted
    assert trained["sourceText"] == "Gọi số [PHONE]"
    assert trained["translation"] == "Call [PHONE]"
    assert qa_manager.get_learned_translation(
        "vi", "en", "Gọi số 0901234567"
    ) == "Call [PHONE]"


def test_translation_qa_api_requires_rfc7807_admin_authentication():
    client = TestClient(app)

    response = client.get("/api/translation-qa/summary")

    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json() == {
        "type": "about:blank",
        "title": "Unauthorized",
        "status": 401,
        "detail": "A valid admin key is required.",
    }


def test_train_api_hot_loads_pattern(monkeypatch, qa_manager):
    from app.api import translation_qa
    from app.translation import qa_evaluator

    monkeypatch.setattr(translation_qa, "qa_manager", qa_manager)
    monkeypatch.setattr(qa_evaluator, "qa_manager", qa_manager)
    client = TestClient(app)

    response = client.post(
        "/api/translation-qa/train",
        headers={"X-Admin-Key": "layameet-admin-secret-2026"},
        json={
            "sourceLanguage": "vi",
            "targetLanguage": "en",
            "sourceText": "Duyệt kế hoạch quý",
            "correctedTranslation": "Approve the quarterly plan",
            "domain": "business",
        },
    )

    assert response.status_code == 200
    assert response.json()["translation"] == "Approve the quarterly plan"
    assert qa_manager.get_learned_translation(
        "vi", "en", "duyệt kế hoạch quý"
    ) == "Approve the quarterly plan"


def test_train_api_rejects_blank_text_with_problem_details():
    client = TestClient(app)

    response = client.post(
        "/api/translation-qa/train",
        headers={"X-Admin-Key": "layameet-admin-secret-2026"},
        json={
            "sourceLanguage": "vi",
            "targetLanguage": "en",
            "sourceText": "   ",
            "correctedTranslation": "",
        },
    )

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["status"] == 422


def test_translation_qa_api_returns_problem_details_for_internal_errors(monkeypatch):
    from app.api import translation_qa

    monkeypatch.setattr(
        translation_qa.qa_manager,
        "get_summary",
        lambda: (_ for _ in ()).throw(RuntimeError("sensitive internal detail")),
    )
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(
        "/api/translation-qa/summary",
        headers={"X-Admin-Key": "layameet-admin-secret-2026"},
    )

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json() == {
        "type": "about:blank",
        "title": "Internal Server Error",
        "status": 500,
        "detail": "The translation QA request could not be completed.",
    }
