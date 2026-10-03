import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_glossary_stats_returns_metadata_and_term_counts():
    response = client.get("/glossary/stats")
    assert response.status_code == 200
    data = response.json()

    assert "version" in data
    assert "filename" in data
    assert "language_pairs" in data
    assert "domain_term_counts" in data
    assert "vi_ja" in data["language_pairs"]
    assert "ja_vi" in data["language_pairs"]
    assert data["preserved_terms_count"] > 0
    assert "engineering" in data["domain_term_counts"]["vi_ja"]
    assert "business" in data["domain_term_counts"]["vi_ja"]


def test_reload_glossary_returns_success_and_stats():
    response = client.post("/glossary/reload")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "reloaded"
    assert "stats" in data
    assert data["stats"]["preserved_terms_count"] > 0
