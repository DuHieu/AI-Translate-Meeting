import logging
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.api.health import router as health_router
from app.websocket.transcribe_handler import TranscribeWebSocketHandler

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s %(message)s"
)
logger = logging.getLogger("ai_service")

app = FastAPI(
    title="AI Translate Meeting - AI Service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)

ws_handler = TranscribeWebSocketHandler()

@app.websocket("/ws/transcribe")
async def websocket_endpoint(
    websocket: WebSocket,
    meetingId: str = "default",
    participantId: str = "default",
    participantName: str = "Participant",
    sourceLanguage: str = "vi",
    targetLanguage: str = "en",
):
    await ws_handler.handle(
        websocket,
        meetingId,
        participantId,
        participantName,
        sourceLanguage,
        targetLanguage,
    )
