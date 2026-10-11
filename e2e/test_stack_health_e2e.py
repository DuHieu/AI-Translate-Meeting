"""Stack health probes — production gate before user flows."""

from __future__ import annotations

import pytest
import requests


pytestmark = pytest.mark.e2e


def test_api_live_and_ready(http: requests.Session, api_base: str) -> None:
    live = http.get(f"{api_base}/health/live", timeout=10)
    assert live.status_code == 200
    assert "Healthy" in live.text or live.json().get("status") in (None, "Healthy", "ok")

    ready = http.get(f"{api_base}/health/ready", timeout=10)
    assert ready.status_code == 200


def test_ai_live_and_ready(http: requests.Session, ai_base: str) -> None:
    live = http.get(f"{ai_base}/health/live", timeout=10)
    assert live.status_code == 200

    ready = http.get(f"{ai_base}/health/ready", timeout=10)
    assert ready.status_code == 200
    body = ready.json() if ready.headers.get("content-type", "").startswith("application/json") else {}
    # Accept either structured ready payload or plain text containing ready.
    assert body.get("status") in (None, "ready", "ok") or "ready" in ready.text.lower()


def test_web_root(http: requests.Session, web_base: str) -> None:
    response = http.get(f"{web_base}/", timeout=15)
    assert response.status_code == 200
    assert len(response.text) > 100


def test_livekit_http_reachable(http: requests.Session, livekit_http: str) -> None:
    response = http.get(livekit_http, timeout=10)
    # LiveKit may return 200 or non-upgrade upgrade rejection; connection proves reachability.
    assert response.status_code < 500


def test_system_status(http: requests.Session, api_base: str) -> None:
    response = http.get(f"{api_base}/api/system/status", timeout=15)
    assert response.status_code == 200
    assert "profile" in response.text.lower()
