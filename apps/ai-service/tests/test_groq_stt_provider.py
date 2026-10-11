import asyncio
import io
import wave
from unittest.mock import AsyncMock, MagicMock

import httpx
import numpy as np
import pytest

from app.speech.groq_whisper_service import (
    GROQ_TRANSCRIPTIONS_URL,
    GroqSpeechToTextService,
    GroqSTTError,
    float32_to_wav_bytes,
)
from app.speech.whisper_service import TranscriptResult
from app.websocket.transcribe_handler import TranscribeWebSocketHandler

FAKE_KEY = "gsk_test_secret_key_never_logged"


def _audio(seconds: float = 1.0) -> np.ndarray:
    t = np.linspace(0, seconds, int(16000 * seconds), endpoint=False)
    return (0.3 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)


def _service(handler, timeout_seconds: float = 2.0) -> GroqSpeechToTextService:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return GroqSpeechToTextService(
        api_key=FAKE_KEY,
        model="whisper-large-v3-turbo",
        timeout_seconds=timeout_seconds,
        http_client=client,
    )


def test_wav_encoding_is_16khz_mono_int16_in_memory():
    audio = _audio(0.5)
    wav_bytes = float32_to_wav_bytes(audio)

    assert wav_bytes[:4] == b"RIFF"
    with wave.open(io.BytesIO(wav_bytes), "rb") as wav_file:
        assert wav_file.getnchannels() == 1
        assert wav_file.getsampwidth() == 2
        assert wav_file.getframerate() == 16000
        assert wav_file.getnframes() == len(audio)


def test_wav_encoding_clips_out_of_range_samples():
    wav_bytes = float32_to_wav_bytes(np.array([2.0, -2.0], dtype=np.float32))
    with wave.open(io.BytesIO(wav_bytes), "rb") as wav_file:
        samples = np.frombuffer(wav_file.readframes(2), dtype="<i2")
    assert samples.tolist() == [32767, -32767]


@pytest.mark.asyncio
async def test_transcribe_sends_multipart_request_and_parses_verbose_json():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("authorization")
        captured["body"] = request.read()
        return httpx.Response(
            200,
            json={
                "text": " Chúng ta là một đội.",
                "language": "vietnamese",
                "duration": 1.0,
                "segments": [
                    {
                        "text": " Chúng ta là một đội.",
                        "avg_logprob": -0.1,
                        "no_speech_prob": 0.01,
                        "compression_ratio": 1.1,
                    }
                ],
            },
        )

    service = _service(handler)
    text, lang, confidence = await service.transcribe_audio_chunk(
        _audio(), source_lang="vi", prompt="Thuật ngữ: sprint, deploy."
    )
    await service.close()

    assert captured["url"] == GROQ_TRANSCRIPTIONS_URL
    assert captured["auth"] == f"Bearer {FAKE_KEY}"
    body = captured["body"]
    assert b'name="file"; filename="audio.wav"' in body
    assert b"Content-Type: audio/wav" in body
    assert b'name="model"\r\n\r\nwhisper-large-v3-turbo' in body
    assert b'name="response_format"\r\n\r\nverbose_json' in body
    assert b'name="temperature"\r\n\r\n0.0' in body
    assert b'name="language"\r\n\r\nvi' in body
    assert b'name="prompt"' in body

    assert text == "Chúng ta là một đội."
    assert lang == "vi"
    assert 0.85 <= confidence <= 1.0


@pytest.mark.asyncio
async def test_auto_language_omits_language_field_and_maps_detected_name():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.read()
        return httpx.Response(
            200,
            json={
                "text": "こんにちは、会議を始めます。",
                "language": "japanese",
                "segments": [{"text": "こんにちは、会議を始めます。", "avg_logprob": -0.2}],
            },
        )

    service = _service(handler)
    text, lang, _ = await service.transcribe_audio_chunk(_audio(), source_lang="auto")
    await service.close()

    assert b'name="language"' not in captured["body"]
    assert text == "こんにちは、会議を始めます。"
    assert lang == "ja"


@pytest.mark.asyncio
async def test_hallucinated_segments_are_dropped_like_local_model():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "text": "Hello team. Thank you for watching.",
                "language": "english",
                "segments": [
                    {"text": "Hello team.", "avg_logprob": -0.1, "no_speech_prob": 0.05},
                    {"text": "Thank you for watching.", "avg_logprob": -1.5, "no_speech_prob": 0.95},
                ],
            },
        )

    service = _service(handler)
    text, _, _ = await service.transcribe_audio_chunk(_audio(), source_lang="en")
    await service.close()

    assert text == "Hello team."


@pytest.mark.asyncio
@pytest.mark.parametrize("status_code", [401, 429, 500, 503])
async def test_non_200_status_raises_for_fallback(status_code):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json={"error": {"code": "rate_limit_exceeded"}})

    service = _service(handler)
    with pytest.raises(GroqSTTError):
        await service.transcribe_audio_chunk(_audio(), source_lang="vi")
    await service.close()


@pytest.mark.asyncio
async def test_httpx_timeout_raises_for_fallback():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    service = _service(handler)
    with pytest.raises(GroqSTTError, match="timeout"):
        await service.transcribe_audio_chunk(_audio(), source_lang="vi")
    await service.close()


@pytest.mark.asyncio
async def test_total_deadline_is_enforced():
    async def handler(request: httpx.Request) -> httpx.Response:
        await asyncio.sleep(1.0)
        return httpx.Response(200, json={"text": "late"})

    service = _service(handler, timeout_seconds=0.05)
    with pytest.raises(GroqSTTError, match="timeout"):
        await service.transcribe_audio_chunk(_audio(), source_lang="vi")
    await service.close()


@pytest.mark.asyncio
async def test_missing_api_key_raises_without_network_call():
    service = GroqSpeechToTextService(api_key="", http_client=MagicMock())
    assert service.is_configured is False
    with pytest.raises(GroqSTTError):
        await service.transcribe_audio_chunk(_audio(), source_lang="vi")


@pytest.mark.asyncio
async def test_api_key_is_never_logged(caplog):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text=f"echo {request.headers.get('authorization')}")

    service = _service(handler)
    with caplog.at_level("DEBUG"):
        with pytest.raises(GroqSTTError):
            await service.transcribe_audio_chunk(_audio(), source_lang="vi")
    await service.close()

    assert FAKE_KEY not in caplog.text


def _handler_with(cloud_stt, local_result: TranscriptResult) -> tuple[TranscribeWebSocketHandler, AsyncMock]:
    local_stt = MagicMock()
    local_stt.transcribe = AsyncMock(return_value=local_result)
    handler = TranscribeWebSocketHandler(
        stt=local_stt,
        translator=MagicMock(),
        cloud_stt=cloud_stt,
    )
    return handler, local_stt.transcribe


@pytest.mark.asyncio
async def test_handler_uses_groq_result_when_successful():
    cloud = MagicMock()
    cloud.transcribe_audio_chunk = AsyncMock(return_value=("Xin chào cả nhóm", "vi", 0.93))
    handler, local_transcribe = _handler_with(
        cloud, TranscriptResult(text="local", language="vi", is_final=True)
    )

    result = await handler._transcribe_audio(
        _audio(), language="vi", is_final=True, initial_prompt="p", meeting_id="m1"
    )

    assert result.text == "Xin chào cả nhóm"
    assert result.language == "vi"
    assert result.language_probability == 0.93
    assert result.is_final is True
    cloud.transcribe_audio_chunk.assert_awaited_once()
    local_transcribe.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "error",
    [GroqSTTError("http_429"), GroqSTTError("timeout"), RuntimeError("unexpected")],
)
async def test_handler_falls_back_to_local_when_groq_fails(error):
    cloud = MagicMock()
    cloud.transcribe_audio_chunk = AsyncMock(side_effect=error)
    local_result = TranscriptResult(text="kết quả local", language="vi", is_final=True)
    handler, local_transcribe = _handler_with(cloud, local_result)

    result = await handler._transcribe_audio(
        _audio(), language="vi", is_final=True, initial_prompt=None, meeting_id="m1"
    )

    assert result is local_result
    local_transcribe.assert_awaited_once()
    assert local_transcribe.await_args.kwargs["vad_filter"] is False


@pytest.mark.asyncio
async def test_handler_local_provider_skips_cloud(monkeypatch):
    from app.config.settings import settings

    monkeypatch.setattr(settings, "STT_PROVIDER", "local")
    monkeypatch.setattr(settings, "GROQ_API_KEY", FAKE_KEY)
    local_result = TranscriptResult(text="local", language="vi", is_final=True)
    handler, local_transcribe = _handler_with(None, local_result)

    assert handler.cloud_stt is None
    result = await handler._transcribe_audio(
        _audio(), language="vi", is_final=True, initial_prompt=None, meeting_id="m1"
    )
    assert result is local_result
    local_transcribe.assert_awaited_once()


def test_handler_groq_provider_requires_api_key(monkeypatch):
    from app.config.settings import settings

    monkeypatch.setattr(settings, "STT_PROVIDER", "groq")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    handler, _ = _handler_with(None, TranscriptResult(text="", language="vi", is_final=True))
    assert handler.cloud_stt is None

    monkeypatch.setattr(settings, "GROQ_API_KEY", FAKE_KEY)
    handler, _ = _handler_with(None, TranscriptResult(text="", language="vi", is_final=True))
    assert isinstance(handler.cloud_stt, GroqSpeechToTextService)
