from fastapi import WebSocket, WebSocketDisconnect
import json
import logging
from app.translation.local_provider import LocalTranslationProvider
from app.speech.whisper_service import SpeechToTextService

logger = logging.getLogger("ai_service")

class TranscribeWebSocketHandler:
    def __init__(self):
        self.stt = SpeechToTextService()
        self.translator = LocalTranslationProvider()

    async def handle(self, websocket: WebSocket, meeting_id: str, participant_id: str):
        await websocket.accept()
        logger.info("WebSocket connected meeting=%s participant=%s", meeting_id, participant_id)
        try:
            while True:
                data = await websocket.receive_bytes()
                # Process audio chunk
                logger.info(
                    "Received audio bytes meeting=%s participant=%s size=%s",
                    meeting_id,
                    participant_id,
                    len(data),
                )

                # Mock response for testing WS flow
                res = {
                    "type": "subtitle",
                    "data": {
                        "meetingId": meeting_id,
                        "participantId": participant_id,
                        "participantName": "Hieu",
                        "sourceLanguage": "vi",
                        "originalText": "Xin chào mọi người.",
                        "translations": {
                            "en": "Hello everyone.",
                            "ja": "みなさん、こんにちは。"
                        },
                        "isFinal": True,
                        "timestamp": "2026-08-09T00:00:00Z"
                    }
                }
                await websocket.send_text(json.dumps(res))
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected meeting=%s participant=%s", meeting_id, participant_id)
