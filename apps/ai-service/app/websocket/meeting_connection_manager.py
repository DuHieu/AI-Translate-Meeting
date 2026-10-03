import asyncio
import logging
import time
from dataclasses import dataclass, field
from fastapi import WebSocket

logger = logging.getLogger("ai_service")


@dataclass
class ParticipantConnection:
    websocket: WebSocket
    meeting_id: str
    participant_id: str
    participant_name: str
    livekit_identity: str
    target_language: str
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class MeetingConnectionManager:
    """
    Manages active WebSocket connections grouped by meetingId and participantId.
    Ensures per-socket send lock, concurrency isolation, and zero cross-room leakage.
    """

    def __init__(self):
        self._meetings: dict[str, dict[str, ParticipantConnection]] = {}
        self._active_utterances: dict[str, set[str]] = {}
        self._overlap_started_at: dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def begin_utterance(
        self,
        meeting_id: str,
        participant_id: str,
        *,
        at: float | None = None,
    ) -> bool:
        """Returns True only when this utterance starts a new overlap interval."""
        now = time.perf_counter() if at is None else at
        async with self._lock:
            active = self._active_utterances.setdefault(meeting_id, set())
            if participant_id in active:
                return False

            active.add(participant_id)
            if len(active) == 2 and meeting_id not in self._overlap_started_at:
                self._overlap_started_at[meeting_id] = now
                return True
            return False

    async def end_utterance(
        self,
        meeting_id: str,
        participant_id: str,
        *,
        at: float | None = None,
    ) -> float | None:
        """Returns a completed overlap interval in milliseconds, when one ends."""
        now = time.perf_counter() if at is None else at
        async with self._lock:
            active = self._active_utterances.get(meeting_id)
            if not active or participant_id not in active:
                return None

            active.remove(participant_id)
            overlap_ms: float | None = None
            if len(active) < 2:
                overlap_started_at = self._overlap_started_at.pop(meeting_id, None)
                if overlap_started_at is not None:
                    overlap_ms = max(0.0, (now - overlap_started_at) * 1000)

            if not active:
                self._active_utterances.pop(meeting_id, None)
            return overlap_ms

    async def register(
        self,
        meeting_id: str,
        participant_id: str,
        websocket: WebSocket,
        participant_name: str,
        target_language: str,
        livekit_identity: str | None = None,
    ) -> ParticipantConnection:
        async with self._lock:
            if meeting_id not in self._meetings:
                self._meetings[meeting_id] = {}

            conn = ParticipantConnection(
                websocket=websocket,
                meeting_id=meeting_id,
                participant_id=participant_id,
                participant_name=participant_name,
                livekit_identity=livekit_identity or participant_id,
                target_language=target_language,
            )
            self._meetings[meeting_id][participant_id] = conn
            logger.debug(
                "Registered connection meeting=%s participant=%s (total_in_room=%d)",
                meeting_id,
                participant_id,
                len(self._meetings[meeting_id]),
            )
            return conn

    async def unregister(
        self,
        meeting_id: str,
        participant_id: str,
        expected_connection: ParticipantConnection,
    ) -> None:
        async with self._lock:
            room = self._meetings.get(meeting_id)
            if room and room.get(participant_id) is expected_connection:
                room.pop(participant_id, None)
                if not room:
                    self._meetings.pop(meeting_id, None)
                logger.debug(
                    "Unregistered connection meeting=%s participant=%s",
                    meeting_id,
                    participant_id,
                )

    async def get_listeners(self, meeting_id: str) -> list[ParticipantConnection]:
        """
        Snapshots listener connections for the given meetingId and releases the lock immediately.
        STT and translation work must NOT be done while holding the lock.
        """
        async with self._lock:
            room = self._meetings.get(meeting_id)
            if not room:
                return []
            return list(room.values())

    async def update_target_language(self, meeting_id: str, participant_id: str, target_language: str) -> None:
        async with self._lock:
            room = self._meetings.get(meeting_id)
            if room and participant_id in room:
                room[participant_id].target_language = target_language
