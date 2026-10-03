import asyncio
import hashlib
import json
import logging
from collections import deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from app.config.settings import settings

logger = logging.getLogger("ai_service.translation.context")


@dataclass
class ContextSegment:
    source_text: str
    translated_text: str
    source_language: str
    target_language: str
    speaker_id: str = "unknown"
    speaker_name: str = "Participant"
    domain: str = "general"
    glossary: dict[str, str] = field(default_factory=dict)
    is_final: bool = True
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "speakerId": self.speaker_id,
            "speakerName": self.speaker_name,
            "sourceLanguage": self.source_language,
            "targetLanguage": self.target_language,
            "text": self.source_text,
            "translation": self.translated_text,
            "domain": self.domain,
            "glossary": self.glossary,
            "isFinal": self.is_final,
            "timestamp": self.timestamp,
        }

    def to_prompt_context(self) -> dict[str, Any]:
        """Compact representation for translation prompts to avoid token bloat."""
        res = {
            "speaker": self.speaker_name,
            "source": self.source_text,
            "target": self.translated_text,
        }
        if self.glossary:
            res["glossary"] = self.glossary
        return res


class MeetingContextManager:
    """
    Manages isolated rolling context per meeting.
    Guarantees strict meeting boundary isolation — context from Meeting A never enters Meeting B.
    Maintains the most recent 5-10 transcript segments per meeting.
    """

    def __init__(self, max_segments: Optional[int] = None):
        self.max_segments = max_segments or settings.TRANSLATION_CONTEXT_MAX_SEGMENTS
        self._rooms: dict[str, deque[ContextSegment]] = {}
        self._room_domains: dict[str, str] = {}
        self._lock = asyncio.Lock()

    async def add_segment(self, meeting_id: str, segment: ContextSegment) -> None:
        """Appends a new transcript segment to the meeting's rolling buffer."""
        if not meeting_id:
            return
        async with self._lock:
            if meeting_id not in self._rooms:
                self._rooms[meeting_id] = deque(maxlen=self.max_segments)
            self._rooms[meeting_id].append(segment)
            if segment.domain and segment.domain != "general":
                self._room_domains[meeting_id] = segment.domain

    async def get_context(
        self,
        meeting_id: str,
        max_segments: Optional[int] = None,
    ) -> list[ContextSegment]:
        """Returns recent segments for the specified meeting strictly isolated by meeting_id."""
        if not meeting_id:
            return []
        async with self._lock:
            buffer = self._rooms.get(meeting_id)
            if not buffer:
                return []
            limit = max_segments or self.max_segments
            # Return last N segments
            return list(buffer)[-limit:]

    async def get_prompt_context(
        self,
        meeting_id: str,
        max_segments: int = 5,
    ) -> list[dict[str, Any]]:
        """Returns minimum useful compact context for translation model input."""
        segments = await self.get_context(meeting_id, max_segments=max_segments)
        return [s.to_prompt_context() for s in segments]

    async def get_context_hash(
        self,
        meeting_id: str,
        max_segments: int = 5,
    ) -> str:
        """
        Computes a stable hash representing recent meeting context.
        Used to ensure translation cache keys invalidate whenever dialogue context changes.
        """
        segments = await self.get_context(meeting_id, max_segments=max_segments)
        if not segments:
            return "no_ctx"
        # Hash source and translations of recent context
        fingerprint = "|".join(
            f"{s.speaker_name}:{s.source_text}->{s.translated_text}" for s in segments
        )
        return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:16]

    async def get_domain(self, meeting_id: str) -> str:
        async with self._lock:
            return self._room_domains.get(meeting_id, "general")

    async def set_domain(self, meeting_id: str, domain: str) -> None:
        if not meeting_id or not domain:
            return
        async with self._lock:
            self._room_domains[meeting_id] = domain

    async def clear_meeting(self, meeting_id: str) -> None:
        """Cleans up meeting memory when all participants disconnect."""
        async with self._lock:
            self._rooms.pop(meeting_id, None)
            self._room_domains.pop(meeting_id, None)
