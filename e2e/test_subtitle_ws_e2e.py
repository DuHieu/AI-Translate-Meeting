"""Subtitle WebSocket handshake against live AI service using join JWT."""

from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.parse import urlencode

import pytest

websockets = pytest.importorskip("websockets")


pytestmark = pytest.mark.e2e


@pytest.mark.asyncio
async def test_subtitle_ws_authenticate_with_join_token(
    ai_base: str, meeting_lifecycle: dict[str, Any]
) -> None:
    joined = meeting_lifecycle["join"]
    meeting_id = str(joined.get("meetingId") or meeting_lifecycle["meetingCode"])
    participant_id = str(joined["participantId"])
    subtitle_token = joined["subtitleToken"]

    query = urlencode(
        {
            "meetingId": meeting_id,
            "participantId": participant_id,
        }
    )
    ws_base = ai_base.replace("https://", "wss://").replace("http://", "ws://")
    uri = f"{ws_base}/ws/transcribe?{query}"

    async with websockets.connect(uri, open_timeout=20, close_timeout=5) as ws:
        await ws.send(json.dumps({"type": "authenticate", "token": subtitle_token}))
        raw = await asyncio.wait_for(ws.recv(), timeout=15)
        payload = json.loads(raw) if isinstance(raw, str) else json.loads(raw.decode())
        assert payload.get("type") == "authenticated", payload
