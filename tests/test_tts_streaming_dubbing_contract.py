import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_clause_chunker_and_tts_streamer_exist_and_conform() -> None:
    chunker_file = ROOT / "apps" / "ai-service" / "app" / "translation" / "clause_chunker.py"
    streamer_file = ROOT / "apps" / "ai-service" / "app" / "translation" / "tts_streamer.py"
    providers_file = ROOT / "apps" / "ai-service" / "app" / "api" / "providers.py"

    assert chunker_file.exists(), "clause_chunker.py must exist"
    assert streamer_file.exists(), "tts_streamer.py must exist"
    assert providers_file.exists(), "providers.py must exist"

    chunker_content = chunker_file.read_text(encoding="utf-8")
    assert "class ClauseChunker" in chunker_content
    assert "def split_into_clauses" in chunker_content
    assert "class ClauseChunk" in chunker_content

    streamer_content = streamer_file.read_text(encoding="utf-8")
    assert "class HighSpeedTtsStreamer" in streamer_content
    assert "stream_speech_chunks" in streamer_content
    assert "EDGE_VOICE_MAP" in streamer_content
    assert "vi-VN-HoaiMyNeural" in streamer_content

    providers_content = providers_file.read_text(encoding="utf-8")
    assert "/tts/voices" in providers_content
    assert "/tts/clauses" in providers_content
    assert "/tts/stream" in providers_content


def test_frontend_clause_streaming_and_audio_booth_conform() -> None:
    buffer_file = ROOT / "apps" / "web" / "src" / "utils" / "clauseStreamBuffer.ts"
    streamer_file = ROOT / "apps" / "web" / "src" / "utils" / "highSpeedTtsStreamer.ts"
    booth_file = ROOT / "apps" / "web" / "src" / "hooks" / "useAudioBooth.ts"

    assert buffer_file.exists(), "clauseStreamBuffer.ts must exist"
    assert streamer_file.exists(), "highSpeedTtsStreamer.ts must exist"
    assert booth_file.exists(), "useAudioBooth.ts must exist"

    buffer_content = buffer_file.read_text(encoding="utf-8")
    assert "class ClauseStreamBuffer" in buffer_content
    assert "splitIntoClauses" in buffer_content

    streamer_content = streamer_file.read_text(encoding="utf-8")
    assert "class HighSpeedTtsStreamer" in streamer_content
    assert "enqueueText" in streamer_content

    booth_content = booth_file.read_text(encoding="utf-8")
    assert "defaultClauseStreamBuffer" in booth_content
    assert "splitIntoClauses" in booth_content


def test_frontend_clause_stream_buffer_runtime_execution() -> None:
    cmd = ["node", "--experimental-strip-types", "scripts/test-clause-stream-buffer.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT / "apps" / "web"),
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        shell=True,
    )
    assert proc.returncode == 0, f"Runtime tests failed: {proc.stderr}\n{proc.stdout}"
    assert "ALL 5 runtime checks for ClauseStreamBuffer PASSED!" in proc.stdout
