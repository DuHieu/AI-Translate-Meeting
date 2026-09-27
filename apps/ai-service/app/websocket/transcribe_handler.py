import logging

from fastapi import WebSocket, WebSocketDisconnect

from app.schemas.subtitle import SubtitleBroadcastMessage, SubtitleData
from app.speech.whisper_service import SpeechToTextService
from app.translation.local_provider import LocalTranslationProvider
from app.services.laya_client import LayaDecisionClient

logger = logging.getLogger("ai_service")


class TranscribeWebSocketHandler:
    def __init__(self):
        self.stt = SpeechToTextService()
        self.translator = LocalTranslationProvider()
        self.laya = LayaDecisionClient()

    async def handle(
        self,
        websocket: WebSocket,
        meeting_id: str,
        participant_id: str,
        participant_name: str,
        source_language: str,
        target_language: str,
    ):
        await websocket.accept()
        logger.info("WebSocket connected meeting=%s participant=%s", meeting_id, participant_id)
        connected_message = await self._build_subtitle_message(
            meeting_id,
            participant_id,
            participant_name,
            source_language,
            target_language,
            "Xin chào, chúng ta bắt đầu cuộc họp nhé.",
            True,
        )
        await websocket.send_text(
            connected_message.model_dump_json()
        )

        try:
            while True:
                data = await websocket.receive_bytes()
                logger.info(
                    "Received audio bytes meeting=%s participant=%s size=%s",
                    meeting_id,
                    participant_id,
                    len(data),
                )

                transcript = await self.stt.transcribe(data, source_language)
                if not transcript.text.strip():
                    continue

                message = await self._build_subtitle_message(
                    meeting_id,
                    participant_id,
                    participant_name,
                    transcript.language,
                    target_language,
                    transcript.text,
                    transcript.is_final,
                )
                await websocket.send_text(message.model_dump_json())
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected meeting=%s participant=%s", meeting_id, participant_id)

    async def _build_subtitle_message(
        self,
        meeting_id: str,
        participant_id: str,
        participant_name: str,
        source_language: str,
        target_language: str,
        original_text: str,
        is_final: bool,
    ) -> SubtitleBroadcastMessage:
        translated_text = await self.translator.translate(
            original_text,
            source_language,
            target_language,
        )

        tags: list[str] = []
        confidence = 0.0
        if is_final and original_text:
            tags, confidence = await self.laya.classify_sentence(original_text)

        return SubtitleBroadcastMessage(
            data=SubtitleData(
                meetingId=meeting_id,
                participantId=participant_id,
                participantName=participant_name,
                sourceLanguage=source_language,
                targetLanguage=target_language,
                originalText=original_text,
                translatedText=translated_text,
                isFinal=is_final,
                tags=tags,
                confidence=confidence,
            )
        )
