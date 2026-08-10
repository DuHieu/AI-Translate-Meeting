from dataclasses import dataclass
from typing import Optional


@dataclass
class TranscriptResult:
    text: str
    language: str
    is_final: bool


class SpeechToTextService:
    def __init__(self, model_size: str = "small", device: str = "cpu", compute_type: str = "int8"):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model = None

    async def transcribe(self, audio: bytes, language: Optional[str] = "vi") -> TranscriptResult:
        """Transcribe audio chunk using Whisper or fallback mock for the current MVP."""
        if not audio:
            return TranscriptResult(text="", language=language or "vi", is_final=True)

        # Placeholder transcript result for health/demo flow until real Whisper loading is wired.
        return TranscriptResult(
            text="Xin chào, chúng ta bắt đầu cuộc họp nhé.",
            language=language or "vi",
            is_final=True,
        )
