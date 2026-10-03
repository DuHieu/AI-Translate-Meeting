from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.config.settings import settings
from app.main import app, ws_handler, ws_rate_limiter


SIGNING_KEY = "test-only-subtitle-signing-key-32-characters"
ISSUER = "ai-translate-meeting-api"
AUDIENCE = "ai-translate-meeting-ai-service"


def _token(
    meeting_id: str,
    participant_id: str,
    *,
    expires_delta: timedelta,
    participant_name: str | None = None,
    source_language: str | None = None,
    target_language: str | None = None,
    livekit_identity: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": participant_id,
        "meetingId": meeting_id,
        "participantId": participant_id,
        "scope": "subtitle:write",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "nbf": now,
        "exp": now + expires_delta,
    }
    if participant_name is not None:
        payload["participantName"] = participant_name
    if source_language is not None:
        payload["sourceLanguage"] = source_language
    if target_language is not None:
        payload["targetLanguage"] = target_language
    if livekit_identity is not None:
        payload["liveKitIdentity"] = livekit_identity
    return jwt.encode(payload, SIGNING_KEY, algorithm="HS256")


@pytest.fixture(autouse=True)
def configure_subtitle_token(monkeypatch):
    monkeypatch.setattr(settings, "SUBTITLE_TOKEN_SIGNING_KEY", SIGNING_KEY)
    monkeypatch.setattr(settings, "SUBTITLE_TOKEN_ISSUER", ISSUER)
    monkeypatch.setattr(settings, "SUBTITLE_TOKEN_AUDIENCE", AUDIENCE)
    ws_rate_limiter._local_counts.clear()


def _assert_rejected(meeting_id: str, participant_id: str, auth_message: dict, expected_code: int):
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as rejected:
        with client.websocket_connect(
            f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
        ) as websocket:
            websocket.send_json(auth_message)
            websocket.receive_json()

    assert rejected.value.code == expected_code


def test_websocket_rejects_missing_session_token():
    _assert_rejected(str(uuid4()), str(uuid4()), {"type": "authenticate"}, 4401)


def test_websocket_rejects_expired_session_token():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=-1))

    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": token},
        4401,
    )


def test_websocket_rejects_token_bound_to_another_meeting():
    requested_meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(str(uuid4()), participant_id, expires_delta=timedelta(minutes=5))

    _assert_rejected(
        requested_meeting_id,
        participant_id,
        {"type": "authenticate", "token": token},
        4403,
    )


def test_websocket_accepts_token_bound_to_requested_session(monkeypatch):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(
        meeting_id,
        participant_id,
        expires_delta=timedelta(minutes=5),
        participant_name="  Du Hieu  ",
        source_language="VI",
        target_language="JA",
    )

    async def accepted_handler(
        websocket,
        received_meeting_id,
        received_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        assert already_accepted is True
        assert received_meeting_id == meeting_id
        assert received_participant_id == participant_id
        await websocket.send_json({"type": "test-complete"})

    monkeypatch.setattr(ws_handler, "handle", accepted_handler)
    client = TestClient(app)

    with client.websocket_connect(
        f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
    ) as websocket:
        websocket.send_json({"type": "authenticate", "token": token})
        assert websocket.receive_json() == {"type": "authenticated"}
        assert websocket.receive_json() == {"type": "test-complete"}


def test_websocket_propagates_signed_livekit_identity(monkeypatch):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    livekit_identity = "p_0123456789abcdef"
    token = _token(
        meeting_id,
        participant_id,
        expires_delta=timedelta(minutes=5),
        livekit_identity=livekit_identity,
    )

    async def accepted_handler(
        websocket,
        received_meeting_id,
        received_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        assert already_accepted is True
        assert websocket.state.livekit_identity == livekit_identity
        await websocket.send_json({"type": "test-complete"})

    monkeypatch.setattr(ws_handler, "handle", accepted_handler)
    client = TestClient(app)

    with client.websocket_connect(
        f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
    ) as websocket:
        websocket.send_json({"type": "authenticate", "token": token})
        assert websocket.receive_json() == {"type": "authenticated"}
        assert websocket.receive_json() == {"type": "test-complete"}


def test_websocket_accepts_token_with_valid_metadata(monkeypatch):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(
        meeting_id,
        participant_id,
        expires_delta=timedelta(minutes=5),
        participant_name="  Du Hieu  ",
        source_language="VI",
        target_language="JA",
    )

    async def accepted_handler(
        websocket,
        received_meeting_id,
        received_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        assert already_accepted is True
        assert received_meeting_id == meeting_id
        assert received_participant_id == participant_id
        assert participant_name == "Du Hieu"
        assert source_language == "vi"
        assert target_language == "ja"
        await websocket.send_json({"type": "test-complete"})

    monkeypatch.setattr(ws_handler, "handle", accepted_handler)
    client = TestClient(app)

    with client.websocket_connect(
        f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
    ) as websocket:
        websocket.send_json({
            "type": "authenticate",
            "token": token,
            "participantName": "  Du Hieu  ",
            "sourceLanguage": "VI",
            "targetLanguage": "JA",
        })
        assert websocket.receive_json() == {"type": "authenticated"}
        assert websocket.receive_json() == {"type": "test-complete"}


def test_websocket_does_not_trust_unsigned_participant_name(monkeypatch):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=5))

    async def accepted_handler(
        websocket,
        received_meeting_id,
        received_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        assert participant_name == "Participant"
        await websocket.send_json({"type": "test-complete"})

    monkeypatch.setattr(ws_handler, "handle", accepted_handler)
    client = TestClient(app)

    with client.websocket_connect(
        f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
    ) as websocket:
        websocket.send_json({
            "type": "authenticate",
            "token": token,
            "participantName": "Spoofed Host",
            "sourceLanguage": "vi",
            "targetLanguage": "ja",
        })
        assert websocket.receive_json() == {"type": "authenticated"}
        assert websocket.receive_json() == {"type": "test-complete"}


def test_websocket_normalizes_blank_participant_name(monkeypatch):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=5))

    async def accepted_handler(
        websocket,
        received_meeting_id,
        received_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        assert participant_name == "Participant"
        await websocket.send_json({"type": "test-complete"})

    monkeypatch.setattr(ws_handler, "handle", accepted_handler)
    client = TestClient(app)

    with client.websocket_connect(
        f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
    ) as websocket:
        websocket.send_json({
            "type": "authenticate",
            "token": token,
            "participantName": "    ",
        })
        assert websocket.receive_json() == {"type": "authenticated"}
        assert websocket.receive_json() == {"type": "test-complete"}


def test_websocket_normalizes_oversized_participant_name(monkeypatch):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    oversized_name = "X" * 150
    token = _token(
        meeting_id,
        participant_id,
        expires_delta=timedelta(minutes=5),
        participant_name=oversized_name,
    )

    async def accepted_handler(
        websocket,
        received_meeting_id,
        received_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        assert len(participant_name) == 100
        assert participant_name == "X" * 100
        await websocket.send_json({"type": "test-complete"})

    monkeypatch.setattr(ws_handler, "handle", accepted_handler)
    client = TestClient(app)

    with client.websocket_connect(
        f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
    ) as websocket:
        websocket.send_json({
            "type": "authenticate",
            "token": token,
            "participantName": oversized_name,
        })
        assert websocket.receive_json() == {"type": "authenticated"}
        assert websocket.receive_json() == {"type": "test-complete"}


def test_websocket_rejects_unsupported_language():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(
        meeting_id,
        participant_id,
        expires_delta=timedelta(minutes=5),
        participant_name="FromAuthFrame",
        source_language="vi",
        target_language="ja",
    )

    # Unsupported source language
    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": token, "sourceLanguage": "xx"},
        4400,
    )

    # Unsupported target language
    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": token, "targetLanguage": "zz"},
        4400,
    )


@pytest.mark.parametrize("src,tgt", [("ko", "en"), ("zh", "vi"), ("fr", "ja"), ("de", "en"), ("es", "vi")])
def test_websocket_accepts_popular_languages(monkeypatch, src, tgt):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(
        meeting_id,
        participant_id,
        expires_delta=timedelta(minutes=5),
        participant_name="GlobalSpeaker",
        source_language=src,
        target_language=tgt,
    )

    async def accepted_handler(
        websocket,
        received_meeting_id,
        received_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        assert source_language == src
        assert target_language == tgt
        await websocket.send_json({"type": "test-complete"})

    monkeypatch.setattr(ws_handler, "handle", accepted_handler)
    client = TestClient(app)

    with client.websocket_connect(
        f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}"
    ) as websocket:
        websocket.send_json({"type": "authenticate", "token": token})
        assert websocket.receive_json() == {"type": "authenticated"}
        assert websocket.receive_json() == {"type": "test-complete"}



def test_websocket_rejects_invalid_token_before_metadata_validation():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    expired_token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=-1))

    # Even with unsupported language, token rejection takes precedence with 4401
    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": expired_token, "sourceLanguage": "invalid-lang"},
        4401,
    )

    cross_room_token = _token(str(uuid4()), participant_id, expires_delta=timedelta(minutes=5))
    # Even with unsupported language, cross-room token rejection takes precedence with 4403
    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": cross_room_token, "sourceLanguage": "invalid-lang"},
        4403,
    )


def test_websocket_ignores_metadata_in_url_query(monkeypatch):
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(
        meeting_id,
        participant_id,
        expires_delta=timedelta(minutes=5),
        participant_name="FromAuthFrame",
        source_language="vi",
        target_language="ja",
    )

    async def accepted_handler(
        websocket,
        received_meeting_id,
        received_participant_id,
        participant_name,
        source_language,
        target_language,
        already_accepted=False,
    ):
        assert participant_name == "FromAuthFrame"
        assert source_language == "vi"
        assert target_language == "ja"
        await websocket.send_json({"type": "test-complete"})

    monkeypatch.setattr(ws_handler, "handle", accepted_handler)
    client = TestClient(app)

    # URL contains query params that must be ignored
    with client.websocket_connect(
        f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}&participantName=FromUrl&sourceLanguage=ja&targetLanguage=vi"
    ) as websocket:
        websocket.send_json({
            "type": "authenticate",
            "token": token,
            "participantName": "FromAuthFrame",
            "sourceLanguage": "vi",
            "targetLanguage": "ja",
        })
        assert websocket.receive_json() == {"type": "authenticated"}
        assert websocket.receive_json() == {"type": "test-complete"}


def test_websocket_rejects_token_bound_to_another_participant():
    meeting_id = str(uuid4())
    requested_participant_id = str(uuid4())
    other_participant_id = str(uuid4())
    token = _token(meeting_id, other_participant_id, expires_delta=timedelta(minutes=5))

    _assert_rejected(
        meeting_id,
        requested_participant_id,
        {"type": "authenticate", "token": token},
        4403,
    )


def test_websocket_rejects_malformed_token_before_metadata_validation():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())

    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": "not.a.valid.jwt.token", "sourceLanguage": "invalid-lang"},
        4401,
    )


def test_websocket_rejects_non_string_participant_name():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=5))

    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": token, "participantName": 12345},
        4400,
    )


def test_websocket_rejects_non_string_language_code():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=5))

    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": token, "sourceLanguage": 999},
        4400,
    )
    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": token, "targetLanguage": True},
        4400,
    )


def test_websocket_rejects_whitespace_language_code():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=5))

    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": token, "sourceLanguage": "   "},
        4400,
    )


def test_websocket_rejects_non_dict_metadata_field():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=5))

    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "authenticate", "token": token, "metadata": "not-a-dict"},
        4400,
    )


def test_websocket_rejects_non_auth_initial_message():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())

    _assert_rejected(
        meeting_id,
        participant_id,
        {"type": "chat", "message": "hello"},
        4401,
    )


def test_websocket_rejects_token_in_url_when_missing_in_auth_frame():
    meeting_id = str(uuid4())
    participant_id = str(uuid4())
    token = _token(meeting_id, participant_id, expires_delta=timedelta(minutes=5))

    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as rejected:
        with client.websocket_connect(
            f"/ws/transcribe?meetingId={meeting_id}&participantId={participant_id}&token={token}"
        ) as websocket:
            websocket.send_json({"type": "authenticate"})
            websocket.receive_json()

    assert rejected.value.code == 4401



