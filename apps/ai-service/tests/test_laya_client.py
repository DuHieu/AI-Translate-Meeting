import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.laya_client import LayaDecisionClient
from app.schemas.subtitle import SubtitleData


@pytest.mark.asyncio
async def test_laya_client_disabled():
    client = LayaDecisionClient(enabled=False)
    tags, prob = await client.classify_sentence("Anh Nam nhớ gửi báo cáo trước 5h nhé")
    assert tags == []
    assert prob == 0.0


@pytest.mark.asyncio
async def test_laya_client_short_text():
    client = LayaDecisionClient(enabled=True)
    tags, prob = await client.classify_sentence("Hi")
    assert tags == []
    assert prob == 0.0


@pytest.mark.asyncio
async def test_laya_client_action_item_success():
    client = LayaDecisionClient(
        base_url="http://mock-laya:8000",
        confidence_threshold=0.80,
        enabled=True,
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "answers": {
            "action_item": {"noul": 0.88, "confidence": 0.88},
            "decision_made": {"noul": 0.15, "confidence": 0.85},
            "critical_risk": {"noul": 0.05, "confidence": 0.95},
            "unanswered_question": {"noul": 0.10, "confidence": 0.90},
        }
    }

    mock_http = AsyncMock()
    mock_http.is_closed = False
    mock_http.post.return_value = mock_resp
    client._http_client = mock_http

    tags, prob = await client.classify_sentence("Anh Nam nhớ gửi báo cáo trước 5h chiều nay nhé.")
    assert "action_item" in tags
    assert "decision" not in tags
    assert prob == 0.88
    await client.close()


@pytest.mark.asyncio
async def test_laya_client_decision_success():
    client = LayaDecisionClient(
        base_url="http://mock-laya:8000",
        confidence_threshold=0.80,
        enabled=True,
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "answers": {
            "action_item": {"noul": 0.20, "confidence": 0.80},
            "decision_made": {"noul": 0.94, "confidence": 0.94},
            "critical_risk": {"noul": 0.10, "confidence": 0.90},
            "unanswered_question": {"noul": 0.05, "confidence": 0.95},
        }
    }

    mock_http = AsyncMock()
    mock_http.is_closed = False
    mock_http.post.return_value = mock_resp
    client._http_client = mock_http

    tags, prob = await client.classify_sentence("Chúng ta thống nhất chốt phương án B cho kiến trúc hệ thống.")
    assert "decision" in tags
    assert "action_item" not in tags
    assert prob == 0.94
    await client.close()


@pytest.mark.asyncio
async def test_laya_client_critical_risk_and_question_success():
    client = LayaDecisionClient(
        base_url="http://mock-laya:8000",
        confidence_threshold=0.80,
        enabled=True,
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "answers": {
            "action_item": {"noul": 0.10, "confidence": 0.90},
            "decision_made": {"noul": 0.05, "confidence": 0.95},
            "critical_risk": {"noul": 0.92, "confidence": 0.92},
            "unanswered_question": {"noul": 0.89, "confidence": 0.89},
        }
    }

    mock_http = AsyncMock()
    mock_http.is_closed = False
    mock_http.post.return_value = mock_resp
    client._http_client = mock_http

    tags, prob = await client.classify_sentence("Cụm database production đang bị sập, ai có thể kiểm tra gấp không?")
    assert "critical_risk" in tags
    assert "question" in tags
    assert prob == 0.92
    await client.close()


def test_laya_client_classify_sentence_locally_heuristics():
    client = LayaDecisionClient()

    # Risk detection
    risk_tags, _ = client.classify_sentence_locally("Hệ thống database đang gặp rủi ro nghiêm trọng và có nguy cơ outage.")
    assert "critical_risk" in risk_tags

    # Question detection
    q_tags, _ = client.classify_sentence_locally("Khi nào chúng ta có thể deploy bản vá lỗi này?")
    assert "question" in q_tags

    # Action detection
    action_tags, _ = client.classify_sentence_locally("Tôi sẽ làm bản thiết kế chi tiết trước 5h chiều nay.")
    assert "action_item" in action_tags

    # Decision detection
    dec_tags, _ = client.classify_sentence_locally("Hai bên thống nhất chốt phương án triển khai qua Docker.")
    assert "decision" in dec_tags


@pytest.mark.asyncio
async def test_laya_client_handles_server_error():
    client = LayaDecisionClient(
        base_url="http://mock-laya:8000",
        confidence_threshold=0.80,
        enabled=True,
    )

    mock_http = AsyncMock()
    mock_http.is_closed = False
    mock_http.post.side_effect = Exception("Connection refused")
    client._http_client = mock_http

    tags, prob = await client.classify_sentence("Câu này máy chủ Laya đang bận.")
    assert tags == []
    assert prob == 0.0
    await client.close()


@pytest.mark.asyncio
async def test_laya_logs_do_not_contain_transcript(caplog):
    transcript = "confidential customer transcript"
    client = LayaDecisionClient(enabled=True)
    response = MagicMock(status_code=503)
    mock_http = AsyncMock()
    mock_http.is_closed = False
    mock_http.post.return_value = response
    client._http_client = mock_http

    with caplog.at_level("INFO"):
        await client.classify_sentence(transcript)

    assert transcript not in caplog.text


def test_subtitle_data_with_tags():
    data = SubtitleData(
        meetingId="m-123",
        participantId="p-456",
        participantName="Nam Nguyen",
        sourceLanguage="vi",
        targetLanguage="en",
        originalText="Anh Nam cập nhật spec nhé",
        translatedText="Nam, please update the spec",
        tags=["action_item", "critical_risk"],
        confidence=0.89,
    )
    assert "action_item" in data.tags
    assert "critical_risk" in data.tags
    assert data.confidence == 0.89
    d = data.model_dump()
    assert "critical_risk" in d["tags"]
    assert d["confidence"] == 0.89
