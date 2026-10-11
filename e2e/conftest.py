"""Shared fixtures for production E2E tests against a live stack."""

from __future__ import annotations

import os
import time
from typing import Any, Iterator

import pytest
import requests


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers", "e2e: production end-to-end tests requiring a live stack"
    )


@pytest.fixture(scope="session")
def api_base() -> str:
    return os.getenv("E2E_API_URL", "http://127.0.0.1:5000").rstrip("/")


@pytest.fixture(scope="session")
def ai_base() -> str:
    return os.getenv("E2E_AI_URL", "http://127.0.0.1:8000").rstrip("/")


@pytest.fixture(scope="session")
def web_base() -> str:
    return os.getenv("E2E_WEB_URL", "http://127.0.0.1:3000").rstrip("/")


@pytest.fixture(scope="session")
def livekit_http() -> str:
    return os.getenv("E2E_LIVEKIT_HTTP", "http://127.0.0.1:7880").rstrip("/")


@pytest.fixture(scope="session")
def http() -> requests.Session:
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    return session


def wait_http_ok(url: str, *, timeout: float = 180.0, interval: float = 2.0) -> None:
    deadline = time.time() + timeout
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code < 500:
                return
        except Exception as exc:  # noqa: BLE001 — wait loop
            last_error = exc
        time.sleep(interval)
    raise AssertionError(f"Timed out waiting for {url}: {last_error}")


@pytest.fixture(scope="session", autouse=True)
def require_stack(api_base: str, ai_base: str, web_base: str) -> None:
    wait_http_ok(f"{api_base}/health/ready", timeout=60)
    wait_http_ok(f"{ai_base}/health/ready", timeout=60)
    wait_http_ok(f"{web_base}/", timeout=60)


@pytest.fixture
def meeting_lifecycle(
    http: requests.Session, api_base: str
) -> Iterator[dict[str, Any]]:
    """Create meeting → join with host admission → yield tokens → end meeting."""
    create = http.post(
        f"{api_base}/api/meetings",
        json={"name": "E2E Lifecycle Meeting"},
        timeout=20,
    )
    assert create.status_code in (200, 201), create.text
    body = create.json()
    code = body["meetingCode"]
    host_token = body["hostToken"]

    join = http.post(
        f"{api_base}/api/meetings/{code}/join",
        json={
            "displayName": "E2E Tester",
            "spokenLanguage": "vi",
            "targetLanguage": "en",
            "admissionToken": host_token,
        },
        timeout=20,
    )
    assert join.status_code in (200, 201), join.text
    joined = join.json()
    assert joined.get("token"), joined
    assert joined.get("subtitleToken"), joined
    assert joined.get("liveKitUrl") or joined.get("LiveKitUrl"), joined

    payload = {
        "meetingCode": code,
        "hostToken": host_token,
        "join": joined,
    }
    try:
        yield payload
    finally:
        http.post(
            f"{api_base}/api/meetings/{code}/end",
            headers={"Authorization": f"Bearer {host_token}"},
            timeout=20,
        )
