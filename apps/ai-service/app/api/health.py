from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/health")
async def health_check(request: Request):
    readiness = request.app.state.speech_to_text.get_readiness()
    return {
        "status": "healthy",
        "whisper": readiness.state == "ready",
        "whisperStatus": readiness.state,
        "translation": True,
    }


@router.get("/health/live")
async def liveness_check():
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_check(request: Request):
    readiness = request.app.state.speech_to_text.get_readiness()
    if readiness.state == "ready":
        return {
            "status": "ready",
            "whisper": {
                "status": "ready",
                "loadDurationMs": (
                    round(readiness.load_duration_ms, 1)
                    if readiness.load_duration_ms is not None
                    else None
                ),
            },
            "translation": {"status": "ready"},
        }

    code = readiness.error_code or f"whisper_{readiness.state}"
    detail = (
        "Whisper model failed to initialize."
        if readiness.state == "failed"
        else "Whisper model is still initializing."
    )
    return JSONResponse(
        status_code=503,
        media_type="application/problem+json",
        headers={"Retry-After": "2"},
        content={
            "type": "about:blank",
            "title": "AI model is not ready",
            "status": 503,
            "detail": detail,
            "code": code,
        },
    )
