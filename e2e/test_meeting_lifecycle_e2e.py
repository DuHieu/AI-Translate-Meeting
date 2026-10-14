"""Meeting create → join → leave → end against live .NET API + LiveKit tokens."""

from __future__ import annotations

from typing import Any

import pytest
import requests


pytestmark = pytest.mark.e2e


def test_create_join_returns_livekit_and_subtitle_tokens(
    meeting_lifecycle: dict[str, Any],
) -> None:
    joined = meeting_lifecycle["join"]
    assert meeting_lifecycle["meetingCode"]
    assert joined["participantId"]
    assert joined["token"]
    assert joined["subtitleToken"].count(".") == 2
    livekit = joined.get("liveKitUrl") or joined.get("LiveKitUrl")
    assert livekit and ("ws://" in livekit or "wss://" in livekit)


def test_get_meeting_with_host_token(
    http: requests.Session, api_base: str, meeting_lifecycle: dict[str, Any]
) -> None:
    code = meeting_lifecycle["meetingCode"]
    host = meeting_lifecycle["hostToken"]
    response = http.get(
        f"{api_base}/api/meetings/{code}",
        headers={"Authorization": f"Bearer {host}"},
        timeout=15,
    )
    assert response.status_code == 200
    assert code in response.text


def test_leave_meeting(
    http: requests.Session, api_base: str, meeting_lifecycle: dict[str, Any]
) -> None:
    code = meeting_lifecycle["meetingCode"]
    joined = meeting_lifecycle["join"]
    participant_id = joined["participantId"]
    token = joined.get("sessionToken") or meeting_lifecycle.get("hostToken")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    response = http.post(
        f"{api_base}/api/meetings/{code}/leave",
        headers=headers,
        json={"participantId": participant_id},
        timeout=15,
    )
    assert response.status_code in (200, 204), response.text


def test_invalid_meeting_code_returns_problem_details(
    http: requests.Session, api_base: str
) -> None:
    response = http.get(f"{api_base}/api/meetings/ZZZZZZ", timeout=15)
    assert response.status_code in (404, 400)
    content_type = response.headers.get("content-type", "")
    assert "json" in content_type
