import os
import secrets
from typing import Any, Callable

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from fastapi.routing import APIRoute
from pydantic import BaseModel, Field

from app.translation.qa_evaluator import qa_manager


def problem_details(status: int, title: str, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": title,
            "status": status,
            "detail": detail,
        },
    )


class AdminAuthorizationError(Exception):
    pass


class ProblemDetailsRoute(APIRoute):
    def get_route_handler(self) -> Callable:
        original = super().get_route_handler()

        async def handler(request: Request) -> Response:
            try:
                return await original(request)
            except AdminAuthorizationError:
                return problem_details(401, "Unauthorized", "A valid admin key is required.")
            except RequestValidationError:
                return problem_details(422, "Validation Error", "The request payload is invalid.")
            except Exception:
                return problem_details(
                    500,
                    "Internal Server Error",
                    "The translation QA request could not be completed.",
                )

        return handler


router = APIRouter(
    prefix="/api/translation-qa",
    tags=["translation-qa"],
    route_class=ProblemDetailsRoute,
)


def _accepted_admin_keys() -> tuple[str, ...]:
    configured = (os.getenv("ADMIN_SECRET_KEY") or "").strip()
    is_production = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")
    if is_production:
        if not configured:
            return ()
        return (configured,)
    fallback = configured or "vimeet-admin-secret-2026"
    return tuple(dict.fromkeys((fallback, "vimeet-admin-secret-2026", "layameet-admin-secret-2026")))


async def require_admin_key(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
    key: str | None = Query(default=None),
) -> None:
    is_production = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")
    # In production, query parameter key is forbidden to avoid leaking secrets in access logs
    candidate = (x_admin_key or ("" if is_production else key) or "").strip()
    if not candidate or not any(
        secrets.compare_digest(candidate, accepted) for accepted in _accepted_admin_keys()
    ):
        raise AdminAuthorizationError()


class TranslationQaSettingsRequest(BaseModel):
    qaTrainingModeEnabled: bool


class TrainPatternRequest(BaseModel):
    sampleId: str | None = Field(default=None, max_length=100)
    sourceLanguage: str = Field(min_length=1, max_length=20)
    targetLanguage: str = Field(min_length=1, max_length=20)
    sourceText: str = Field(min_length=1, max_length=10_000)
    correctedTranslation: str = Field(min_length=1, max_length=10_000)
    domain: str = Field(default="general", max_length=100)


class DeletePatternRequest(BaseModel):
    sourceLanguage: str = Field(min_length=1, max_length=20)
    targetLanguage: str = Field(min_length=1, max_length=20)
    sourceText: str = Field(min_length=1, max_length=10_000)


def _non_blank(*values: str) -> bool:
    return all(value.strip() for value in values)


@router.get("/summary", dependencies=[Depends(require_admin_key)])
async def get_summary() -> dict[str, Any]:
    return qa_manager.get_summary()


@router.post("/settings", dependencies=[Depends(require_admin_key)])
async def update_settings(payload: TranslationQaSettingsRequest) -> dict[str, bool]:
    qa_manager.qa_training_mode_enabled = payload.qaTrainingModeEnabled
    return {"qaTrainingModeEnabled": qa_manager.qa_training_mode_enabled}


@router.get("/samples", dependencies=[Depends(require_admin_key)])
async def get_samples(meetingId: str | None = Query(default=None, max_length=200)) -> dict[str, Any]:
    return {
        "samples": qa_manager.get_samples(meetingId),
        "learnedPatterns": qa_manager.get_learned_patterns(),
    }


@router.post("/train", dependencies=[Depends(require_admin_key)], response_model=None)
async def train_pattern(payload: TrainPatternRequest):
    if not _non_blank(
        payload.sourceLanguage,
        payload.targetLanguage,
        payload.sourceText,
        payload.correctedTranslation,
    ):
        return problem_details(422, "Validation Error", "Language and translation text cannot be blank.")
    return await qa_manager.train_pattern(
        source_lang=payload.sourceLanguage,
        target_lang=payload.targetLanguage,
        source_text=payload.sourceText,
        corrected_translation=payload.correctedTranslation,
        domain=payload.domain,
        sample_id=payload.sampleId,
    )


@router.delete("/patterns", dependencies=[Depends(require_admin_key)], response_model=None)
async def delete_pattern(payload: DeletePatternRequest):
    if not _non_blank(payload.sourceLanguage, payload.targetLanguage, payload.sourceText):
        return problem_details(422, "Validation Error", "Pattern fields cannot be blank.")
    removed = qa_manager.remove_pattern(
        payload.sourceLanguage,
        payload.targetLanguage,
        payload.sourceText,
    )
    if not removed:
        return problem_details(404, "Not Found", "The learned pattern was not found.")
    return {"removed": True}


@router.get("/export", dependencies=[Depends(require_admin_key)])
async def export_dataset() -> PlainTextResponse:
    return PlainTextResponse(
        await qa_manager.export_jsonl(),
        media_type="application/x-ndjson",
        headers={"Content-Disposition": 'attachment; filename="translation-training.jsonl"'},
    )
