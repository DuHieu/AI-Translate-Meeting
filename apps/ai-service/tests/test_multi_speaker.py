import asyncio
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import jwt
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.config.settings import settings
from app.main import app, ws_handler
from app.schemas.subtitle import SubtitleBroadcastMessage
from app.websocket.meeting_connection_manager import MeetingConnectionManager, ParticipantConnection
from app.websocket.transcribe_handler import TranscribeWebSocketHandler

SIGNING_KEY = "test-only-subtitle-signing-key-32-characters"
ISSUER = "ai-translate-meeting-api"
AUDIENCE = "ai-translate-meeting-ai-service"


def _subtitle_messages(send_calls):
    return [
        SubtitleBroadcastMessage.model_validate(payload)
        for call in send_calls
        if (payload := json.loads(call.args[0])).get("type") == "subtitle"
    ]


@pytest.mark.asyncio
async def test_old_disconnect_does_not_unregister_replacement_connection():
    manager = MeetingConnectionManager()
    old_ws = MagicMock()
    new_ws = MagicMock()

    old_connection = await manager.register(
        "meeting-1", "participant-1", old_ws, "Speaker", "en"
    )
    new_connection = await manager.register(
        "meeting-1", "participant-1", new_ws, "Speaker", "ja"
    )

    await manager.unregister("meeting-1", "participant-1", old_connection)

    listeners = await manager.get_listeners("meeting-1")
    assert listeners == [new_connection]


@pytest.mark.asyncio
async def test_oversized_audio_frame_is_closed_before_decode_or_stt(monkeypatch):
    handler = TranscribeWebSocketHandler()
    websocket = MagicMock()
    websocket.send_text = AsyncMock()
    websocket.close = AsyncMock()
    websocket.receive = AsyncMock(
        return_value={
            "type": "websocket.receive",
            "bytes": b"x" * (settings.WS_MAX_AUDIO_FRAME_BYTES + 1),
        }
    )
    handler.translator.translate = AsyncMock(return_value="Hello")
    handler.stt.transcribe = AsyncMock()

    await handler.handle(
        websocket,
        "meeting-1",
        "participant-1",
        "Participant",
        "vi",
        "en",
        already_accepted=True,
    )

    websocket.close.assert_awaited_once_with(code=1009)
    handler.stt.transcribe.assert_not_awaited()


@pytest.mark.asyncio
async def test_oversized_text_frame_is_closed_before_translation():
    handler = TranscribeWebSocketHandler()
    websocket = MagicMock()
    websocket.send_text = AsyncMock()
    websocket.close = AsyncMock()
    websocket.receive = AsyncMock(
        return_value={
            "type": "websocket.receive",
            "text": "x" * (settings.WS_MAX_TEXT_FRAME_BYTES + 1),
        }
    )
    handler.translator.translate = AsyncMock(return_value="Hello")

    await handler.handle(
        websocket,
        "meeting-1",
        "participant-1",
        "Participant",
        "vi",
        "en",
        already_accepted=True,
    )

    websocket.close.assert_awaited_once_with(code=1009)
    assert handler.translator.translate.await_count == 1


def _create_token(
    meeting_id: str,
    participant_id: str,
    participant_name: str | None = None,
    source_language: str | None = None,
    target_language: str | None = None,
    *,
    expires_delta: timedelta = timedelta(minutes=10),
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": participant_id,
        "jti": str(uuid4()),
        "meetingId": meeting_id,
        "participantId": participant_id,
        "scope": "subtitle:write",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "nbf": now,
        "exp": now + expires_delta,
    }
    if participant_name:
        payload["participantName"] = participant_name
        payload["displayName"] = participant_name
    if source_language:
        payload["sourceLanguage"] = source_language
    if target_language:
        payload["targetLanguage"] = target_language

    return jwt.encode(payload, SIGNING_KEY, algorithm="HS256")


@pytest.fixture(autouse=True)
def configure_auth_env(monkeypatch):
    monkeypatch.setattr(settings, "SUBTITLE_TOKEN_SIGNING_KEY", SIGNING_KEY)
    monkeypatch.setattr(settings, "SUBTITLE_TOKEN_ISSUER", ISSUER)
    monkeypatch.setattr(settings, "SUBTITLE_TOKEN_AUDIENCE", AUDIENCE)


def test_two_different_jwts_produce_distinct_speaker_identities(monkeypatch):
    meeting_id = str(uuid4())
    p1_id = str(uuid4())
    p2_id = str(uuid4())

    token1 = _create_token(meeting_id, p1_id, "Alice", "en", "vi")
    token2 = _create_token(meeting_id, p2_id, "Bob", "ja", "en")

    captured_speakers = []

    async def mock_handle(
        websocket,
        rec_meeting_id,
        rec_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        captured_speakers.append((rec_participant_id, participant_name, source_language, target_language))
        await websocket.send_json({"type": "done"})

    monkeypatch.setattr(ws_handler, "handle", mock_handle)
    client = TestClient(app)

    with client.websocket_connect(f"/ws/transcribe?meetingId={meeting_id}&participantId={p1_id}") as ws1:
        ws1.send_json({"type": "authenticate", "token": token1})
        assert ws1.receive_json() == {"type": "authenticated"}
        assert ws1.receive_json() == {"type": "done"}

    with client.websocket_connect(f"/ws/transcribe?meetingId={meeting_id}&participantId={p2_id}") as ws2:
        ws2.send_json({"type": "authenticate", "token": token2})
        assert ws2.receive_json() == {"type": "authenticated"}
        assert ws2.receive_json() == {"type": "done"}

    assert len(captured_speakers) == 2
    assert captured_speakers[0] == (p1_id, "Alice", "en", "vi")
    assert captured_speakers[1] == (p2_id, "Bob", "ja", "en")


def test_client_cannot_spoof_participant_name_in_auth_frame(monkeypatch):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    signed_name = "Authentic Speaker"
    spoofed_name = "Spoofed Admin"

    token = _create_token(meeting_id, participant_id, signed_name, "vi", "en")
    captured_identity = {}

    async def mock_handle(
        websocket,
        rec_meeting_id,
        rec_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        captured_identity["name"] = participant_name
        captured_identity["id"] = rec_participant_id
        await websocket.send_json({"type": "done"})

    monkeypatch.setattr(ws_handler, "handle", mock_handle)
    client = TestClient(app)

    with client.websocket_connect(f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}") as ws:
        # Client maliciously sends a different participantName in the auth frame
        ws.send_json({
            "type": "authenticate",
            "token": token,
            "participantName": spoofed_name,
        })
        assert ws.receive_json() == {"type": "authenticated"}
        assert ws.receive_json() == {"type": "done"}

    # Must prioritize signed JWT identity over client's spoofed frame
    assert captured_identity["name"] == signed_name
    assert captured_identity["id"] == participant_id


@pytest.mark.asyncio
async def test_concurrent_audio_streams_isolate_audio_buffers():
    handler = TranscribeWebSocketHandler()
    meeting_id = str(uuid4())
    p1_id = str(uuid4())
    p2_id = str(uuid4())

    ws1 = MagicMock()
    ws1.receive = AsyncMock()
    ws1.send_text = AsyncMock()
    ws1.accept = AsyncMock()

    ws2 = MagicMock()
    ws2.receive = AsyncMock()
    ws2.send_text = AsyncMock()
    ws2.accept = AsyncMock()

    # Generate speech-like fake PCM bytes and silence bytes
    t = np.linspace(0, 0.35, int(16000 * 0.35), endpoint=False)
    sine_wave_p1 = (0.5 * np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16).tobytes()
    sine_wave_p2 = (0.5 * np.sin(2 * np.pi * 880 * t) * 32767).astype(np.int16).tobytes()
    silence = np.zeros(int(16000 * 0.35), dtype=np.int16).tobytes()

    # Participant 1 sends speech chunk + 2 silence chunks to finalize utterance
    ws1.receive.side_effect = [
        {"type": "websocket.receive", "bytes": sine_wave_p1},
        {"type": "websocket.receive", "bytes": silence},
        {"type": "websocket.receive", "bytes": silence},
        {"type": "websocket.disconnect"},
    ]

    # Participant 2 sends speech chunk + 2 silence chunks to finalize utterance
    ws2.receive.side_effect = [
        {"type": "websocket.receive", "bytes": sine_wave_p2},
        {"type": "websocket.receive", "bytes": silence},
        {"type": "websocket.receive", "bytes": silence},
        {"type": "websocket.disconnect"},
    ]

    transcribed_audios = []

    async def mock_transcribe(audio, language="vi", is_final=True):
        transcribed_audios.append(np.copy(audio))
        return MagicMock(text="Hello", language="en")

    handler.stt.transcribe = mock_transcribe
    handler.translator.translate = AsyncMock(return_value="Xin chào")

    # Run both handlers concurrently with asyncio.gather
    await asyncio.gather(
        handler.handle(ws1, meeting_id, p1_id, "Speaker 1", "en", "vi", already_accepted=True),
        handler.handle(ws2, meeting_id, p2_id, "Speaker 2", "en", "vi", already_accepted=True),
    )

    # Transcribe should be invoked for both independently
    assert len(transcribed_audios) >= 2
    # Verify the audio buffers were isolated and not mixed together
    # (Each speech buffer only had 1 participant's waveform + silence)
    for audio in transcribed_audios:
        # Buffer length corresponds to 1 speech chunk + 2 silence chunks = 3 * 5600 = 16800 samples
        assert len(audio) <= 16800


@pytest.mark.asyncio
async def test_concurrent_speakers_broadcast_to_all_listeners_with_target_language_fanout():
    handler = TranscribeWebSocketHandler()
    meeting_id = str(uuid4())
    p1_id = str(uuid4())
    p2_id = str(uuid4())
    p3_id = str(uuid4())

    # Listener 1 (Speaker 1, target=vi)
    ws1 = MagicMock()
    ws1.send_text = AsyncMock()
    ws1.accept = AsyncMock()
    ws1.receive = AsyncMock(side_effect=[
        {"type": "websocket.receive", "text": '{"text": "Good morning", "language": "en", "isFinal": true}'},
        {"type": "websocket.disconnect"},
    ])

    # Listener 2 (Speaker 2, target=ja)
    ws2 = MagicMock()
    ws2.send_text = AsyncMock()
    ws2.accept = AsyncMock()
    ws2.receive = AsyncMock(side_effect=[
        {"type": "websocket.receive", "text": '{"text": "Ohayou", "language": "ja", "isFinal": true}'},
        {"type": "websocket.disconnect"},
    ])

    # Listener 3 (Passive Listener, target=en)
    ws3 = MagicMock()
    ws3.send_text = AsyncMock()
    ws3.accept = AsyncMock()
    ws3.receive = AsyncMock(side_effect=[
        {"type": "websocket.disconnect"},
    ])

    # Mock translation provider
    async def mock_translate(text, src, target, **kwargs):
        if target == "vi":
            return f"{text} (translated to vi)"
        if target == "ja":
            return f"{text} (translated to ja)"
        if target == "en":
            return f"{text} (translated to en)"
        return text

    handler.translator.translate = AsyncMock(side_effect=mock_translate)

    # Pre-register ws3 in connection manager so it receives broadcasts
    await handler.connection_manager.register(
        meeting_id=meeting_id,
        participant_id=p3_id,
        websocket=ws3,
        participant_name="Passive Listener",
        target_language="en",
    )

    await asyncio.gather(
        handler.handle(ws1, meeting_id, p1_id, "Speaker 1", "en", "vi", already_accepted=True),
        handler.handle(ws2, meeting_id, p2_id, "Speaker 2", "ja", "ja", already_accepted=True),
    )

    # Verify ws3 (Listener 3) received broadcasts from both Speaker 1 and Speaker 2 in English ('en')
    sent_to_ws3 = _subtitle_messages(ws3.send_text.call_args_list)

    speakers_received_by_ws3 = {sub.data.participantName for sub in sent_to_ws3}
    assert "Speaker 1" in speakers_received_by_ws3
    assert "Speaker 2" in speakers_received_by_ws3

    # Verify targetLanguage delivered to ws3 is 'en'
    for sub in sent_to_ws3:
        assert sub.data.targetLanguage == "en"

    # Verify ws1 (target=vi) received translation in Vietnamese
    sent_to_ws1 = _subtitle_messages(ws1.send_text.call_args_list)
    for sub in sent_to_ws1:
        assert sub.data.targetLanguage == "vi"


@pytest.mark.asyncio
async def test_translation_provider_called_once_per_unique_target_language():
    handler = TranscribeWebSocketHandler()
    meeting_id = str(uuid4())

    # 3 listeners all requesting targetLanguage='vi'
    ws_list = [MagicMock(send_text=AsyncMock()) for _ in range(3)]
    for idx, ws in enumerate(ws_list):
        await handler.connection_manager.register(
            meeting_id=meeting_id,
            participant_id=f"p_{idx}",
            websocket=ws,
            participant_name=f"User {idx}",
            target_language="vi",
        )

    speaker_ws = MagicMock()
    speaker_ws.send_text = AsyncMock()
    speaker_ws.receive = AsyncMock(side_effect=[
        {"type": "websocket.receive", "text": '{"text": "Hello world", "language": "en", "isFinal": true}'},
        {"type": "websocket.disconnect"},
    ])

    handler.translator.translate = AsyncMock(return_value="Xin chào thế giới")

    await handler.handle(
        speaker_ws,
        meeting_id,
        "speaker_id",
        "Speaker",
        "en",
        "vi",
        already_accepted=True,
    )

    # Even though there are 4 participants wanting 'vi' (including the speaker),
    # translator.translate should only be called once for 'vi'!
    vi_calls = [
        call for call in handler.translator.translate.call_args_list
        if call.args[0] == "Hello world" and call.args[2] == "vi"
    ]
    assert len(vi_calls) == 1


@pytest.mark.asyncio
async def test_cross_room_isolation_does_not_leak_subtitles():
    handler = TranscribeWebSocketHandler()
    room_a = str(uuid4())
    room_b = str(uuid4())

    ws_a = MagicMock(send_text=AsyncMock())
    ws_b = MagicMock(send_text=AsyncMock())

    await handler.connection_manager.register(room_a, "p_a", ws_a, "User A", "en")
    await handler.connection_manager.register(room_b, "p_b", ws_b, "User B", "en")

    speaker_ws = MagicMock()
    speaker_ws.send_text = AsyncMock()
    speaker_ws.receive = AsyncMock(side_effect=[
        {"type": "websocket.receive", "text": '{"text": "Secret in room A", "language": "en", "isFinal": true}'},
        {"type": "websocket.disconnect"},
    ])

    await handler.handle(
        speaker_ws,
        room_a,
        "speaker_a",
        "Speaker A",
        "en",
        "en",
        already_accepted=True,
    )

    # Room B's websocket must not receive any messages from Room A
    assert ws_b.send_text.call_count == 0


@pytest.mark.asyncio
async def test_broken_or_slow_socket_does_not_block_room():
    handler = TranscribeWebSocketHandler()
    meeting_id = str(uuid4())

    slow_or_broken_ws = MagicMock()
    slow_or_broken_ws.send_text = AsyncMock(side_effect=RuntimeError("Broken pipe"))

    healthy_ws = MagicMock()
    healthy_ws.send_text = AsyncMock()

    await handler.connection_manager.register(meeting_id, "broken_p", slow_or_broken_ws, "Broken User", "en")
    await handler.connection_manager.register(meeting_id, "healthy_p", healthy_ws, "Healthy User", "en")

    speaker_ws = MagicMock()
    speaker_ws.send_text = AsyncMock()
    speaker_ws.receive = AsyncMock(side_effect=[
        {"type": "websocket.receive", "text": '{"text": "Broadcast message", "language": "en", "isFinal": true}'},
        {"type": "websocket.disconnect"},
    ])

    # Should not raise exception despite the broken socket
    await handler.handle(
        speaker_ws,
        meeting_id,
        "speaker_id",
        "Speaker",
        "en",
        "en",
        already_accepted=True,
    )

    # Healthy websocket still received the broadcast
    assert healthy_ws.send_text.call_count > 0


@pytest.mark.asyncio
async def test_laya_enrichment_updates_exact_utterance_id():
    handler = TranscribeWebSocketHandler()
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    participant_name = "Alice"

    enriched_event = asyncio.Event()

    ws = MagicMock()

    async def mock_send(msg_text):
        if "action_item" in msg_text:
            enriched_event.set()

    ws.send_text = AsyncMock(side_effect=mock_send)

    async def mock_receive():
        if not hasattr(mock_receive, "called"):
            mock_receive.called = True
            return {"type": "websocket.receive", "text": '{"text": "Tôi sẽ gửi tài liệu ngày mai", "language": "vi", "isFinal": true}'}
        await asyncio.wait_for(enriched_event.wait(), timeout=1.0)
        return {"type": "websocket.disconnect"}

    ws.receive = AsyncMock(side_effect=mock_receive)

    handler.laya.classify_sentence = AsyncMock(return_value=(["action_item"], 0.95))
    handler.translator.translate = AsyncMock(return_value="I will send document tomorrow")

    await handler.handle(
        ws,
        meeting_id,
        participant_id,
        participant_name,
        "vi",
        "en",
        already_accepted=True,
    )

    sent_messages = _subtitle_messages(ws.send_text.call_args_list)

    # Find final subtitle and enriched subtitle
    initial_speech = next((m for m in sent_messages if m.data.originalText == "Tôi sẽ gửi tài liệu ngày mai" and not m.data.tags), None)
    enriched_speech = next((m for m in sent_messages if "action_item" in m.data.tags), None)

    assert initial_speech is not None
    assert enriched_speech is not None
    # Both initial and enriched must share the EXACT SAME utterance ID and speaker identity
    assert initial_speech.data.id == enriched_speech.data.id
    assert enriched_speech.data.participantId == participant_id
    assert enriched_speech.data.participantName == participant_name
    assert enriched_speech.data.confidence == 0.95
