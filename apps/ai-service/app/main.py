import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.api.health import router as health_router
from app.api.glossary import router as glossary_router
from app.api.translation_qa import router as translation_qa_router
from app.api.providers import router as providers_router
from app.api.polar_routes import router as polar_router
from app.config.settings import settings
from app.security.rate_limiter import WebSocketRateLimiter
from app.security.client_ip import resolve_client_ip
from app.security.subtitle_token import (
    SubtitleTokenError,
    SubtitleTokenForbidden,
    SubtitleTokenValidator,
)
from app.speech.whisper_service import SpeechToTextService
from app.translation.glossary import (
    get_room_glossary,
    set_room_glossary,
)
from app.websocket.transcribe_handler import TranscribeWebSocketHandler

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s %(message)s"
)
logger = logging.getLogger("ai_service")

speech_to_text = SpeechToTextService()


@asynccontextmanager
async def lifespan(application: FastAPI):
    preload_task: asyncio.Task | None = None
    if settings.WHISPER_PRELOAD:
        preload_task = asyncio.create_task(
            application.state.speech_to_text.preload(),
            name="whisper-model-preload",
        )
        application.state.whisper_preload_task = preload_task

    try:
        yield
    finally:
        if preload_task is not None and not preload_task.done():
            preload_task.cancel()
            with suppress(asyncio.CancelledError):
                await preload_task


app = FastAPI(
    title="AI Translate Meeting - AI Service",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.speech_to_text = speech_to_text

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip().rstrip("/")
        for origin in settings.CORS_ALLOWED_ORIGINS.split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(glossary_router)
app.include_router(translation_qa_router)
app.include_router(providers_router)
app.include_router(polar_router)


class RoomGlossaryRequest(BaseModel):
    terms: dict[str, str]


class RoomGlossaryResponse(BaseModel):
    meetingCode: str
    terms: dict[str, str]


@app.post("/api/glossary/{meeting_code}", response_model=RoomGlossaryResponse)
async def update_room_glossary(
    meeting_code: str,
    request: RoomGlossaryRequest,
):
    """Creates or replaces the dynamic glossary for one meeting."""
    try:
        set_room_glossary(meeting_code, request.terms)
    except (TypeError, ValueError) as exc:
        return JSONResponse(
            status_code=422,
            media_type="application/problem+json",
            content={
                "type": "about:blank",
                "title": "Invalid meeting glossary",
                "status": 422,
                "detail": str(exc),
                "code": "glossary_invalid",
            },
        )

    return RoomGlossaryResponse(
        meetingCode=meeting_code,
        terms=get_room_glossary(meeting_code),
    )


@app.get("/api/glossary/{meeting_code}", response_model=RoomGlossaryResponse)
async def read_room_glossary(meeting_code: str):
    """Returns the dynamic glossary registered for one meeting."""
    return RoomGlossaryResponse(
        meetingCode=meeting_code,
        terms=get_room_glossary(meeting_code),
    )

ws_handler = TranscribeWebSocketHandler(stt=speech_to_text)
ws_rate_limiter = WebSocketRateLimiter(
    redis_host=settings.REDIS_HOST,
    redis_port=settings.REDIS_PORT,
    limit=settings.WS_RATE_LIMIT_PER_MINUTE,
    window_seconds=60,
)
trusted_proxy_ips = {
    value.strip()
    for value in settings.TRUSTED_PROXY_IPS.split(",")
    if value.strip()
}

SUPPORTED_TARGET_LANGUAGES = frozenset({"vi", "en", "ja", "ko", "zh", "fr", "de", "es"})
SUPPORTED_SOURCE_LANGUAGES = frozenset({"auto", "vi", "en", "ja", "ko", "zh", "fr", "de", "es"})
SUPPORTED_LANGUAGES = SUPPORTED_TARGET_LANGUAGES
DEFAULT_SOURCE_LANGUAGE = "vi"
DEFAULT_TARGET_LANGUAGE = "en"
DEFAULT_PARTICIPANT_NAME = "Participant"
MAX_PARTICIPANT_NAME_LENGTH = 100


class InvalidMetadataError(Exception):
    """Untrusted WebSocket metadata failed validation."""


def _normalize_metadata(auth_message: dict) -> tuple[str, str, str]:
    if "metadata" in auth_message and not isinstance(auth_message["metadata"], dict):
        raise InvalidMetadataError()

    metadata_obj = auth_message.get("metadata") if isinstance(auth_message.get("metadata"), dict) else {}

    raw_name = auth_message.get("participantName")
    if raw_name is None:
        raw_name = auth_message.get("participant_name")
    if raw_name is None:
        raw_name = metadata_obj.get("participantName", metadata_obj.get("participant_name"))

    raw_source = auth_message.get("sourceLanguage")
    if raw_source is None:
        raw_source = auth_message.get("source_language")
    if raw_source is None:
        raw_source = metadata_obj.get("sourceLanguage", metadata_obj.get("source_language"))

    raw_target = auth_message.get("targetLanguage")
    if raw_target is None:
        raw_target = auth_message.get("target_language")
    if raw_target is None:
        raw_target = metadata_obj.get("targetLanguage", metadata_obj.get("target_language"))

    # 1. Normalize participant name: trim, max 100 chars, safe non-empty fallback
    if raw_name is None:
        participant_name = DEFAULT_PARTICIPANT_NAME
    elif isinstance(raw_name, str):
        trimmed_name = raw_name.strip()
        participant_name = trimmed_name[:MAX_PARTICIPANT_NAME_LENGTH] if trimmed_name else DEFAULT_PARTICIPANT_NAME
    else:
        raise InvalidMetadataError()

    # 2. Validate source language: auto, vi, en, ja, ... (case-insensitive)
    if raw_source is None:
        source_language = DEFAULT_SOURCE_LANGUAGE
    elif isinstance(raw_source, str):
        source_clean = raw_source.strip().lower()
        if source_clean not in SUPPORTED_SOURCE_LANGUAGES:
            raise InvalidMetadataError()
        source_language = source_clean
    else:
        raise InvalidMetadataError()

    # 3. Validate target language: vi, en, ja (case-insensitive)
    if raw_target is None:
        target_language = DEFAULT_TARGET_LANGUAGE
    elif isinstance(raw_target, str):
        target_clean = raw_target.strip().lower()
        if target_clean not in SUPPORTED_TARGET_LANGUAGES:
            raise InvalidMetadataError()
        target_language = target_clean
    else:
        raise InvalidMetadataError()

    return participant_name, source_language, target_language


@app.websocket("/ws/transcribe")
async def websocket_endpoint(
    websocket: WebSocket,
    meetingId: str = "default",
    participantId: str = "default",
):
    await websocket.accept()

    peer_ip = websocket.client.host if websocket.client else "unknown"
    client_ip = resolve_client_ip(
        peer_ip=peer_ip,
        forwarded_for=websocket.headers.get("x-forwarded-for"),
        trusted_proxy_ips=trusted_proxy_ips,
    )
    if not ws_rate_limiter.is_allowed(client_ip):
        logger.warning("WebSocket handshake rate limit exceeded for IP %s", client_ip)
        await websocket.close(code=4429)
        return

    try:
        validator = SubtitleTokenValidator(
            settings.SUBTITLE_TOKEN_SIGNING_KEY,
            settings.SUBTITLE_TOKEN_ISSUER,
            settings.SUBTITLE_TOKEN_AUDIENCE,
        )
    except ValueError:
        logger.error("Subtitle session authentication is not configured")
        await websocket.close(code=1011)
        return

    try:
        auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=5)
        if not isinstance(auth_message, dict) or auth_message.get("type") != "authenticate":
            raise SubtitleTokenError("Authentication message is required.")

        # Validate JWT token first
        claims = validator.validate(
            auth_message.get("token", ""),
            meetingId,
            participantId,
        )

        # Validate and normalize untrusted metadata after token validation
        participant_name, source_language, target_language = _normalize_metadata(auth_message)

        # Speaker identity is server-controlled. Legacy tokens without a signed
        # display name remain usable, but cannot adopt a client-provided name.
        participant_name = DEFAULT_PARTICIPANT_NAME
        if claims.participant_name:
            participant_name = claims.participant_name.strip()[:MAX_PARTICIPANT_NAME_LENGTH] or DEFAULT_PARTICIPANT_NAME
        if claims.source_language and claims.source_language.strip().lower() in SUPPORTED_SOURCE_LANGUAGES:
            source_language = claims.source_language.strip().lower()
        if claims.target_language and claims.target_language.strip().lower() in SUPPORTED_TARGET_LANGUAGES:
            target_language = claims.target_language.strip().lower()
        websocket.state.livekit_identity = claims.livekit_identity or participantId
    except SubtitleTokenForbidden:
        logger.warning(
            "WebSocket authorization rejected meeting=%s",
            meetingId,
        )
        await websocket.close(code=4403)
        return
    except (SubtitleTokenError, asyncio.TimeoutError, ValueError, TypeError):
        logger.warning(
            "WebSocket authentication rejected meeting=%s",
            meetingId,
        )
        await websocket.close(code=4401)
        return
    except InvalidMetadataError:
        logger.warning(
            "WebSocket metadata rejected meeting=%s",
            meetingId,
        )
        await websocket.close(code=4400)
        return

    await websocket.send_json({"type": "authenticated"})
    await ws_handler.handle(
        websocket,
        meetingId,
        participantId,
        participant_name,
        source_language,
        target_language,
        already_accepted=True,
    )
