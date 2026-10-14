import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from app.config.settings import settings
from app.speech.sherpa_service import (
    SherpaReadiness,
    SherpaStreamingService,
)
from app.speech.whisper_service import (
    OmniLanguageRouter,
    TranscriptResult,
)
from app.websocket.transcribe_handler import TranscribeWebSocketHandler


def _make_audio(seconds: float = 0.5) -> np.ndarray:
    t = np.linspace(0, seconds, int(16000 * seconds), endpoint=False)
    return (0.3 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)


def test_sherpa_readiness_starts_not_started(tmp_path):
    service = SherpaStreamingService(model_dir=str(tmp_path), auto_download=False)
    readiness = service.get_readiness()
    assert readiness.state == "not_started"
    assert readiness.load_duration_ms is None
    assert readiness.error_code is None


@pytest.mark.asyncio
async def test_sherpa_preload_fails_gracefully_when_files_missing(tmp_path):
    empty_dir = tmp_path / "empty_models"
    empty_dir.mkdir()
    service = SherpaStreamingService(model_dir=str(empty_dir), auto_download=False)

    readiness = await service.preload()

    assert readiness.state == "failed"
    assert readiness.error_code == "FileNotFoundError"
    assert service.get_readiness().state == "failed"


def test_sherpa_to_float32_mono_conversions():
    # 1. 1D float32 normalized
    f32_arr = np.array([0.0, 0.5, -0.5, 1.0], dtype=np.float32)
    res = SherpaStreamingService._to_float32_mono(f32_arr)
    assert res.dtype == np.float32
    np.testing.assert_allclose(res, f32_arr)

    # 2. 16-bit integer PCM array (>1.5)
    i16_arr = np.array([0, 16384, -16384, 32767], dtype=np.float32)
    res_scaled = SherpaStreamingService._to_float32_mono(i16_arr)
    assert res_scaled.dtype == np.float32
    np.testing.assert_allclose(res_scaled[1], 0.5, atol=1e-3)

    # 3. Raw int16 little-endian bytes
    pcm_bytes = np.array([0, 16384, -16384, 32767], dtype="<i2").tobytes()
    res_bytes = SherpaStreamingService._to_float32_mono(pcm_bytes)
    assert res_bytes.dtype == np.float32
    assert res_bytes.shape == (4,)
    np.testing.assert_allclose(res_bytes[1], 0.5, atol=1e-3)

    # 4. Empty bytes
    res_empty = SherpaStreamingService._to_float32_mono(b"")
    assert len(res_empty) == 0

    # 5. Odd length bytes (truncated safely)
    res_odd = SherpaStreamingService._to_float32_mono(b"\x00\x00\x01")
    assert len(res_odd) == 1


@pytest.mark.asyncio
async def test_sherpa_transcribe_with_mocked_recognizer(tmp_path):
    service = SherpaStreamingService(model_dir=str(tmp_path), auto_download=False)

    mock_recognizer = MagicMock()
    mock_stream = MagicMock()
    mock_recognizer.create_stream.return_value = mock_stream
    mock_recognizer.is_ready.side_effect = [True, False]
    mock_recognizer.get_result.return_value = "chúng ta bắt đầu cuộc họp dự án"

    service._recognizer = mock_recognizer
    service._readiness_state = "ready"

    audio = _make_audio(1.0)
    result = await service.transcribe(audio, language="auto", is_final=True)

    assert result.text == "chúng ta bắt đầu cuộc họp dự án"
    assert result.language == "vi"
    assert result.is_final is True
    assert result.language_probability > 0.8
    mock_stream.accept_waveform.assert_called_once()
    mock_stream.input_finished.assert_called_once()


@pytest.mark.asyncio
async def test_sherpa_transcribe_stream_chunk(tmp_path):
    service = SherpaStreamingService(model_dir=str(tmp_path), auto_download=False)

    mock_recognizer = MagicMock()
    mock_stream = MagicMock()
    mock_recognizer.is_ready.side_effect = [True, False]
    mock_recognizer.get_result.return_value = "xin chào"

    service._recognizer = mock_recognizer
    service._readiness_state = "ready"

    audio_chunk = _make_audio(0.3)
    text = await service.transcribe_stream_chunk(mock_stream, audio_chunk, is_final=False)

    assert text == "xin chào"
    mock_stream.accept_waveform.assert_called_once()
    mock_stream.input_finished.assert_not_called()


@pytest.mark.asyncio
async def test_omni_router_routes_to_sherpa_when_configured():
    local_stt = MagicMock()
    local_stt.transcribe = AsyncMock(
        return_value=TranscriptResult(text="local", language="vi", is_final=True)
    )

    sherpa_stt = MagicMock()
    sherpa_stt.transcribe = AsyncMock(
        return_value=TranscriptResult(text="kết quả từ sherpa transducer", language="vi", is_final=True)
    )

    with patch.object(settings, "STT_PROVIDER", "sherpa"):
        router = OmniLanguageRouter(
            local_stt=local_stt,
            cloud_stt=None,
            sherpa_stt=sherpa_stt,
        )

        res = await router.transcribe(_make_audio(), language="vi", is_final=True)

        assert res.text == "kết quả từ sherpa transducer"
        sherpa_stt.transcribe.assert_awaited_once()
        local_stt.transcribe.assert_not_awaited()


@pytest.mark.asyncio
async def test_omni_router_sherpa_fallback_to_local_on_failure():
    local_stt = MagicMock()
    local_stt.transcribe = AsyncMock(
        return_value=TranscriptResult(text="fallback local transcript", language="vi", is_final=True)
    )

    sherpa_stt = MagicMock()
    sherpa_stt.transcribe = AsyncMock(side_effect=RuntimeError("transducer model crash"))

    with patch.object(settings, "STT_PROVIDER", "sherpa"):
        router = OmniLanguageRouter(
            local_stt=local_stt,
            cloud_stt=None,
            sherpa_stt=sherpa_stt,
        )

        res = await router.transcribe(_make_audio(), language="vi", is_final=True)

        assert res.text == "fallback local transcript"
        sherpa_stt.transcribe.assert_awaited_once()
        local_stt.transcribe.assert_awaited_once()


@pytest.mark.asyncio
async def test_transcribe_handler_injects_sherpa_stt():
    mock_sherpa = MagicMock()
    handler = TranscribeWebSocketHandler(sherpa_stt=mock_sherpa)

    assert handler.sherpa_stt is mock_sherpa
    assert handler.omni_router.sherpa_stt is mock_sherpa
