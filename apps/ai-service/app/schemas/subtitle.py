from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

class SubtitleData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    meetingId: str
    participantId: str
    participantName: str
    sourceLanguage: str
    targetLanguage: str
    originalText: str
    translatedText: str
    isFinal: bool = True
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    tags: list[str] = Field(default_factory=list)
    confidence: float = 0.0

class SubtitleBroadcastMessage(BaseModel):
    type: str = "subtitle"
    data: SubtitleData


PipelinePhase = Literal["transcribing", "translating", "ready", "failed"]


class PipelineStatusData(BaseModel):
    meetingId: str
    utteranceId: str
    participantId: str
    liveKitIdentity: str
    phase: PipelinePhase
    sequence: int = Field(ge=1)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expiresAt: str = Field(
        default_factory=lambda: (datetime.now(timezone.utc) + timedelta(seconds=3)).isoformat()
    )
    reasonCode: str | None = None


class PipelineStatusBroadcastMessage(BaseModel):
    type: Literal["pipeline_status"] = "pipeline_status"
    data: PipelineStatusData
