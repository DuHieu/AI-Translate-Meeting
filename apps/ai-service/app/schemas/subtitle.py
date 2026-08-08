from pydantic import BaseModel, Field
from typing import Dict, Optional
from datetime import datetime

class SubtitleData(BaseModel):
    meetingId: str
    participantId: str
    participantName: str
    sourceLanguage: str
    originalText: str
    translations: Dict[str, str] = Field(default_factory=dict)
    isFinal: bool = True
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

class SubtitleBroadcastMessage(BaseModel):
    type: str = "subtitle"
    data: SubtitleData
