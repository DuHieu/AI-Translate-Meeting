import asyncio
import time

import pytest
from fastapi.testclient import TestClient

from app.main import app, ws_handler
from app.speech.whisper_service import SpeechToTextService, WhisperReadiness


class StubReadinessService:
    def __init__(self, state: str, error_code: str | None = None):
        self._snapshot = WhisperReadiness(state=state, error_code=error_code)

    def get_readiness(self) -> WhisperReadiness:
        return self._snapshot


def test_whisper_readiness_starts_not_started():
    service = SpeechToTextService(model_size="tiny")

    snapshot = service.get_readiness()

    assert snapshot.state == "not_started"
    assert snapshot.load_duration_ms is None
    assert snapshot.error_code is None


@pytest.mark.asyncio
async def test_concurrent_preload_loads_model_once(monkeypatch):
    service = SpeechToTextService(model_size="tiny")
    load_calls = 0

    def fake_load_model():
        nonlocal load_calls
        load_calls += 1
        time.sleep(0.05)
        return object()

    monkeypatch.setattr(service, "_load_model_sync", fake_load_model)

    first, second = await asyncio.gather(service.preload(), service.preload())

    assert first.state == "ready"
    assert second.state == "ready"
    assert load_calls == 1
    assert service.get_readiness().load_duration_ms is not None


@pytest.mark.asyncio
async def test_failed_preload_is_sanitized_and_can_be_retried(monkeypatch):
    service = SpeechToTextService(model_size="tiny")
    attempts = 0

    def flaky_load_model():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("private-model-path-must-not-leak")
        return object()

    monkeypatch.setattr(service, "_load_model_sync", flaky_load_model)

    failed = await service.preload()
    unchanged = await service.preload()
    recovered = await service.preload(retry_failed=True)

    assert failed.state == "failed"
    assert failed.error_code == "model_load_failed"
    assert "private-model-path" not in repr(failed)
    assert unchanged.state == "failed"
    assert recovered.state == "ready"
    assert attempts == 2


def test_liveness_stays_available_while_whisper_is_loading(monkeypatch):
    monkeypatch.setattr(
        app.state,
        "speech_to_text",
        StubReadinessService("loading"),
        raising=False,
    )

    response = TestClient(app).get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


@pytest.mark.parametrize(
    ("state", "error_code", "expected_code"),
    [
        ("not_started", None, "whisper_not_started"),
        ("loading", None, "whisper_loading"),
        ("failed", "model_load_failed", "model_load_failed"),
    ],
)
def test_readiness_returns_problem_details_until_model_is_ready(
    monkeypatch,
    state,
    error_code,
    expected_code,
):
    monkeypatch.setattr(
        app.state,
        "speech_to_text",
        StubReadinessService(state, error_code),
        raising=False,
    )

    response = TestClient(app).get("/health/ready")

    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/problem+json")
    problem = response.json()
    assert problem["status"] == 503
    assert problem["code"] == expected_code
    assert set(problem) == {"type", "title", "status", "detail", "code"}


def test_readiness_returns_model_metadata_when_ready(monkeypatch):
    service = StubReadinessService("ready")
    service._snapshot = WhisperReadiness(state="ready", load_duration_ms=123.4)
    monkeypatch.setattr(app.state, "speech_to_text", service, raising=False)

    response = TestClient(app).get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "whisper": {
            "status": "ready",
            "loadDurationMs": 123.4,
        },
        "translation": {"status": "ready"},
    }


def test_legacy_health_shape_remains_compatible(monkeypatch):
    monkeypatch.setattr(
        app.state,
        "speech_to_text",
        StubReadinessService("loading"),
        raising=False,
    )

    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "whisper": False,
        "whisperStatus": "loading",
        "translation": True,
    }


def test_health_and_websocket_share_the_same_stt_instance():
    assert app.state.speech_to_text is ws_handler.stt
