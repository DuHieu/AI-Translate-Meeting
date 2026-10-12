import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.translation.clause_chunker import ClauseChunker, default_clause_chunker
from app.translation.tts_streamer import HighSpeedTtsStreamer, default_tts_streamer, EDGE_VOICE_MAP


def test_clause_chunker_splits_punctuation_and_merges_fragments():
    chunker = ClauseChunker(min_chars=12, max_chars=80, min_words=3)
    text = "Hôm nay chúng ta họp về Phase 7, thảo luận về Voice Dubbing, và chốt ngân sách quý tới."
    clauses = chunker.split_into_clauses(text, lang="vi")

    assert len(clauses) >= 2
    assert clauses[0].index == 0
    assert clauses[-1].is_terminal is True
    # Joined text must cover the original content
    combined = " ".join(c.text for c in clauses)
    assert "Phase 7" in combined
    assert "Voice Dubbing" in combined


def test_clause_chunker_handles_japanese_text():
    chunker = ClauseChunker()
    text = "本日はPhase 7の開発進捗を確認し、リアルタイム音声吹き替えについて議論します。"
    clauses = chunker.split_into_clauses(text, lang="ja")

    assert len(clauses) >= 1
    assert clauses[-1].is_terminal is True


def test_tts_streamer_voice_selection_and_rates():
    streamer = HighSpeedTtsStreamer()
    
    # Vietnamese
    assert streamer.get_voice("vi", gender="female") == "vi-VN-HoaiMyNeural"
    assert streamer.get_voice("vi", gender="male") == "vi-VN-NamMinhNeural"
    
    # English
    assert streamer.get_voice("en", gender="female") == "en-US-JennyNeural"
    assert streamer.get_voice("en", gender="male") == "en-US-GuyNeural"
    
    # Japanese
    assert streamer.get_voice("ja", gender="female") == "ja-JP-NanamiNeural"
    
    # Rates
    assert streamer.format_rate_string(1.0) == "+0%"
    assert streamer.format_rate_string(1.2) == "+15%"
    assert streamer.format_rate_string(1.35) == "+30%"
    assert streamer.format_rate_string(0.8) == "-15%"


@pytest.mark.asyncio
async def test_tts_voices_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/translation/tts/voices")
        assert resp.status_code == 200
        data = resp.json()
        assert data["engine"] == "edge-tts"
        assert data["latency_target_ms"] == 250
        assert "vi" in data["voices"]
        assert "en" in data["voices"]
        assert "ja" in data["voices"]


@pytest.mark.asyncio
async def test_tts_clauses_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/api/translation/tts/clauses",
            params={"q": "Xin chào mọi người, chúng tôi bắt đầu cuộc họp ngay bây giờ.", "tl": "vi"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_clauses"] >= 1
        assert len(data["clauses"]) >= 1
        assert data["clauses"][0]["text"]


@pytest.mark.asyncio
async def test_tts_stream_api(monkeypatch):
    # Mock stream_speech_chunks to return sample mp3 frames deterministically in test environment
    fake_audio_chunk = b"\xff\xfb\x90d" + b"\x00" * 60
    
    async def mock_stream(*args, **kwargs):
        yield fake_audio_chunk

    monkeypatch.setattr(default_tts_streamer, "stream_speech_chunks", mock_stream)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/api/translation/tts/stream",
            params={"q": "Hệ thống lồng tiếng tức thì", "tl": "vi", "gender": "female", "speed": 1.1},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "audio/mpeg"
        assert resp.headers["x-tts-engine"] == "edge-tts"
        assert resp.content == fake_audio_chunk
