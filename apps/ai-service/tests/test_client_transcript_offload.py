"""Sprint 3: client_transcript bypasses server STT (desktop offload)."""

import json
import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.websocket.transcribe_handler import TranscribeWebSocketHandler


def _websocket(*messages: dict, livekit_identity: str = "p_desktop_1"):
    websocket = MagicMock()
    websocket.state = SimpleNamespace(livekit_identity=livekit_identity)
    websocket.send_text = AsyncMock()
    websocket.receive = AsyncMock(side_effect=[*messages, {"type": "websocket.disconnect"}])
    return websocket


def _messages_of_type(websocket, message_type: str) -> list[dict]:
    return [
        payload
        for call in websocket.send_text.call_args_list
        if (payload := json.loads(call.args[0])).get("type") == message_type
    ]


@pytest.mark.asyncio
async def test_client_transcript_skips_stt_and_broadcasts(caplog):
    handler = TranscribeWebSocketHandler()
    handler.translator.translate = AsyncMock(return_value="المشروع جاهز للنشر")
    handler.laya.classify_sentence = AsyncMock(return_value=(["decision"], 0.91))
    handler.stt.transcribe = AsyncMock(
        side_effect=AssertionError("server STT must not run for client_transcript")
    )

    websocket = _websocket(
        {
            "type": "websocket.receive",
            "text": json.dumps(
                {
                    "type": "client_transcript",
                    "text": "Dự án đã sẵn sàng triển khai",
                    "sourceLanguage": "vi",
                    "isFinal": True,
                    "confidence": 0.98,
                }
            ),
        }
    )

    with caplog.at_level(logging.INFO, logger="ai_service"):
        await handler.handle(
            websocket,
            "meeting-1",
            "participant-1",
            "Desktop User",
            "vi",
            "ar",
            already_accepted=True,
        )

    handler.stt.transcribe.assert_not_awaited()

    subtitles = _messages_of_type(websocket, "subtitle")
    finals = [
        item
        for item in subtitles
        if item["data"].get("originalText") == "Dự án đã sẵn sàng triển khai"
    ]
    assert finals
    assert finals[0]["data"]["translatedText"] == "المشروع جاهز للنشر"
    assert finals[0]["data"]["direction"] == "rtl"
    assert finals[0]["data"]["isFinal"] is True

    telemetry = [
        record.getMessage()
        for record in caplog.records
        if "event=pipeline_latency" in record.getMessage()
    ]
    assert telemetry
    assert "input_kind=client_transcript" in telemetry[0]


@pytest.mark.asyncio
async def test_client_transcript_keeps_explicit_source_language_despite_lid(monkeypatch):
    """Explicit desktop sourceLanguage must not be overwritten by text LID."""
    import app.websocket.transcribe_handler as handler_mod

    # Force LID to claim English at high confidence so a regression would flip lang→en.
    monkeypatch.setattr(
        handler_mod,
        "detect_text_language",
        lambda text, hint=None: ("en", 0.99),
    )

    handler = TranscribeWebSocketHandler()
    handler.translator.translate = AsyncMock(side_effect=lambda text, src, tgt, **_k: f"{src}->{tgt}:{text}")
    handler.laya.classify_sentence = AsyncMock(return_value=([], 0.0))
    handler.stt.transcribe = AsyncMock(
        side_effect=AssertionError("server STT must not run for client_transcript")
    )
    handler.connection_manager.update_speaker_language = AsyncMock()
    captured_langs: list[str] = []

    async def _capture_dispatch(**kwargs):
        captured_langs.append(str(kwargs["source_lang"]))
        return f"{kwargs['source_lang']}->{kwargs['target_lang']}:{kwargs['text']}"

    handler._dispatch_translate = AsyncMock(side_effect=_capture_dispatch)

    websocket = _websocket(
        {
            "type": "websocket.receive",
            "text": json.dumps(
                {
                    "type": "client_transcript",
                    "text": "Please review the sprint backlog and deploy checklist today.",
                    "sourceLanguage": "vi",
                    "isFinal": True,
                    "confidence": 0.99,
                }
            ),
        }
    )

    await handler.handle(
        websocket,
        "meeting-1",
        "participant-1",
        "Desktop User",
        "vi",
        "en",
        already_accepted=True,
    )

    subtitles = _messages_of_type(websocket, "subtitle")
    finals = [
        item
        for item in subtitles
        if item["data"].get("originalText")
        == "Please review the sprint backlog and deploy checklist today."
    ]
    assert finals
    assert finals[0]["data"]["sourceLanguage"] == "vi"
    handler.connection_manager.update_speaker_language.assert_awaited()
    assert handler.connection_manager.update_speaker_language.await_args.args[2] == "vi"
    assert "vi" in captured_langs
    assert "en" not in captured_langs
