from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

RTL_LANGUAGE_CODES = frozenset({"ar", "he", "fa", "ur"})


def resolve_text_direction(language: str | None) -> Literal["rtl", "ltr"]:
    if not language or not isinstance(language, str):
        return "ltr"
    base = language.strip().lower().split("-", 1)[0]
    return "rtl" if base in RTL_LANGUAGE_CODES else "ltr"


class LayaMetadata(BaseModel):
    isActionItem: bool = False
    isDecision: bool = False
    topic: str | None = None


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
    direction: Literal["rtl", "ltr"] = "ltr"
    latencyMs: float | None = None
    layaMetadata: LayaMetadata | None = None

    @model_validator(mode="after")
    def _apply_display_direction(self) -> "SubtitleData":
        # Display direction follows the listener's target language (translated line).
        self.direction = resolve_text_direction(self.targetLanguage)
        return self


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
