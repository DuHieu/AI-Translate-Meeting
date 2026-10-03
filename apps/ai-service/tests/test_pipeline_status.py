import json
import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest

from app.websocket.transcribe_handler import TranscribeWebSocketHandler
from app.websocket.meeting_connection_manager import MeetingConnectionManager


def _messages_of_type(websocket, message_type: str) -> list[dict]:
    return [
        payload
        for call in websocket.send_text.call_args_list
        if (payload := json.loads(call.args[0])).get("type") == message_type
    ]


def _websocket(*messages: dict, livekit_identity: str = "p_livekit_1"):
    websocket = MagicMock()
    websocket.state = SimpleNamespace(livekit_identity=livekit_identity)
    websocket.send_text = AsyncMock()
    websocket.receive = AsyncMock(side_effect=[*messages, {"type": "websocket.disconnect"}])
    return websocket


@pytest.mark.asyncio
async def test_overlap_tracker_measures_only_the_concurrent_interval():
    manager = MeetingConnectionManager()

    assert await manager.begin_utterance("meeting-1", "participant-1", at=10.0) is False
    assert await manager.begin_utterance("meeting-1", "participant-2", at=11.0) is True
    assert await manager.begin_utterance("meeting-1", "participant-3", at=12.0) is False

    assert await manager.end_utterance("meeting-1", "participant-3", at=13.0) is None
    assert await manager.end_utterance("meeting-1", "participant-2", at=14.5) == 3500.0
    assert await manager.end_utterance("meeting-1", "participant-1", at=15.0) is None


@pytest.mark.asyncio
async def test_text_final_broadcasts_translating_then_ready_with_signed_identity(caplog):
    handler = TranscribeWebSocketHandler()
    handler.translator.translate = AsyncMock(return_value="Hello")
    handler.laya.classify_sentence = AsyncMock(return_value=([], 0.0))
    websocket = _websocket(
        {
            "type": "websocket.receive",
            "text": json.dumps(
                {
                    "text": "Hello",
                    "language": "en",
                    "isFinal": True,
                    "liveKitIdentity": "spoofed-client-identity",
                }
            ),
        }
    )

    with caplog.at_level(logging.INFO, logger="ai_service"):
        await handler.handle(
            websocket,
            "meeting-1",
            "participant-1",
            "Alice",
            "en",
            "en",
            already_accepted=True,
        )

    statuses = _messages_of_type(websocket, "pipeline_status")
    assert [message["data"]["phase"] for message in statuses] == ["translating", "ready"]
    assert [message["data"]["sequence"] for message in statuses] == [1, 2]
    assert len({message["data"]["utteranceId"] for message in statuses}) == 1
    assert all(message["data"]["liveKitIdentity"] == "p_livekit_1" for message in statuses)
    assert all(
        message["data"]["liveKitIdentity"] != "spoofed-client-identity"
        for message in statuses
    )

    telemetry = [record.getMessage() for record in caplog.records if "event=pipeline_latency" in record.getMessage()]
    assert len(telemetry) == 1
    assert "input_kind=text" in telemetry[0]
    assert "finalization_to_ready_ms=" in telemetry[0]
    assert "Hello" not in telemetry[0]
    assert "Alice" not in telemetry[0]


@pytest.mark.asyncio
async def test_pipeline_status_is_isolated_to_its_meeting():
    handler = TranscribeWebSocketHandler()
    handler.translator.translate = AsyncMock(return_value="Hello")
    handler.laya.classify_sentence = AsyncMock(return_value=([], 0.0))

    source = _websocket(
        {
            "type": "websocket.receive",
            "text": json.dumps({"text": "Hello", "language": "en", "isFinal": True}),
        }
    )
    other_room = _websocket()
    await handler.connection_manager.register(
        meeting_id="meeting-2",
        participant_id="participant-2",
        websocket=other_room,
        participant_name="Bob",
        target_language="en",
        livekit_identity="p_livekit_2",
    )

    await handler.handle(
        source,
        "meeting-1",
        "participant-1",
        "Alice",
        "en",
        "en",
        already_accepted=True,
    )

    assert _messages_of_type(source, "pipeline_status")
    assert _messages_of_type(other_room, "pipeline_status") == []


@pytest.mark.asyncio
async def test_audio_final_broadcasts_transcribing_before_translating(monkeypatch, caplog):
    class DeterministicVad:
        def __init__(self):
            self._results = iter([True, False, False])

        def contains_speech(self, _audio):
            return next(self._results)

    monkeypatch.setattr("app.websocket.transcribe_handler.VoiceActivityDetector", DeterministicVad)

    handler = TranscribeWebSocketHandler()
    handler.translator.translate = AsyncMock(return_value="Hello")
    handler.stt.transcribe = AsyncMock(
        return_value=MagicMock(text="Hello", language="en")
    )
    handler.laya.classify_sentence = AsyncMock(return_value=([], 0.0))
    handler.connection_manager.begin_utterance = AsyncMock(return_value=True)
    handler.connection_manager.end_utterance = AsyncMock(return_value=125.0)

    speech = np.ones(5600, dtype=np.int16).tobytes()
    silence = np.zeros(5600, dtype=np.int16).tobytes()
    websocket = _websocket(
        {"type": "websocket.receive", "bytes": speech},
        {"type": "websocket.receive", "bytes": silence},
        {"type": "websocket.receive", "bytes": silence},
    )

    with caplog.at_level(logging.INFO, logger="ai_service"):
        await handler.handle(
            websocket,
            "meeting-1",
            "participant-1",
            "Alice",
            "en",
            "en",
            already_accepted=True,
        )

    statuses = _messages_of_type(websocket, "pipeline_status")
    assert [message["data"]["phase"] for message in statuses] == [
        "transcribing",
        "translating",
        "ready",
    ]
    assert [message["data"]["sequence"] for message in statuses] == [1, 2, 3]
    handler.connection_manager.begin_utterance.assert_awaited_once()
    handler.connection_manager.end_utterance.assert_awaited_once()
    telemetry = [record.getMessage() for record in caplog.records]
    assert any("event=overlap_started meeting_id=meeting-1" in entry for entry in telemetry)
    assert any(
        "event=overlap_completed meeting_id=meeting-1 duration_ms=125.0" in entry
        for entry in telemetry
    )


@pytest.mark.asyncio
async def test_pipeline_failure_broadcasts_safe_reason_code():
    handler = TranscribeWebSocketHandler()

    async def translate(text, *_args, **_kwargs):
        if text.startswith("Xin chào"):
            return "Hello"
        raise RuntimeError("provider leaked transcript: confidential sentence")

    handler.translator.translate = AsyncMock(side_effect=translate)
    websocket = _websocket(
        {
            "type": "websocket.receive",
            "text": json.dumps(
                {"text": "confidential sentence", "language": "vi", "isFinal": True}
            ),
        }
    )

    with pytest.raises(RuntimeError):
        await handler.handle(
            websocket,
            "meeting-1",
            "participant-1",
            "Alice",
            "vi",
            "en",
            already_accepted=True,
        )

    statuses = _messages_of_type(websocket, "pipeline_status")
    assert [message["data"]["phase"] for message in statuses] == ["translating", "failed"]
    assert statuses[-1]["data"]["reasonCode"] == "pipeline_error"
    assert "confidential sentence" not in json.dumps(statuses[-1])
