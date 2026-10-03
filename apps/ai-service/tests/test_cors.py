from fastapi.testclient import TestClient

from app.main import app


def test_cors_allows_only_configured_origins():
    client = TestClient(app)

    allowed = client.get("/health", headers={"Origin": "http://localhost:3000"})
    blocked = client.get("/health", headers={"Origin": "https://malicious.example"})

    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-origin" not in blocked.headers
