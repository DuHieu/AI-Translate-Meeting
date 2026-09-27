from datetime import datetime, timezone
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
