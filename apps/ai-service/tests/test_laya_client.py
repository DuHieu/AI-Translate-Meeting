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


def test_subtitle_data_with_tags():
    data = SubtitleData(
        meetingId="m-123",
        participantId="p-456",
        participantName="Nam Nguyen",
        sourceLanguage="vi",
        targetLanguage="en",
        originalText="Anh Nam cập nhật spec nhé",
        translatedText="Nam, please update the spec",
        tags=["action_item"],
        confidence=0.89,
    )
    assert data.tags == ["action_item"]
    assert data.confidence == 0.89
    d = data.model_dump()
    assert d["tags"] == ["action_item"]
    assert d["confidence"] == 0.89
