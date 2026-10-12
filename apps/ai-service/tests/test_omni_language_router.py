"""Unit tests for OmniLanguageRouter and cultural dialect prompts."""

from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest

from app.speech.whisper_service import (
    CULTURAL_INITIAL_PROMPTS,
    OmniLanguageRouter,
    TranscriptResult,
    get_cultural_initial_prompt,
)
from app.schemas.subtitle import resolve_text_direction


def _audio(seconds: float = 0.5) -> np.ndarray:
    t = np.linspace(0, seconds, int(16000 * seconds), endpoint=False)
    return (0.2 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)


def test_cultural_prompts_cover_blueprint_languages():
    for lang in ("vi", "en", "ja", "zh", "ar", "ko"):
        assert lang in CULTURAL_INITIAL_PROMPTS
        assert get_cultural_initial_prompt(lang)
    assert get_cultural_initial_prompt("auto") is None
    assert "اجتماع" in CULTURAL_INITIAL_PROMPTS["ar"]


def test_resolve_text_direction_rtl_for_arabic_family():
    assert resolve_text_direction("ar") == "rtl"
    assert resolve_text_direction("ar-SA") == "rtl"
    assert resolve_text_direction("he") == "rtl"
    assert resolve_text_direction("vi") == "ltr"
    assert resolve_text_direction("en") == "ltr"


@pytest.mark.asyncio
async def test_omni_router_vi_prefers_local():
    local = MagicMock()
    local.transcribe = AsyncMock(
        return_value=TranscriptResult(text="xin chào", language="vi", is_final=True)
    )
    cloud = MagicMock()
    cloud.transcribe_audio_chunk = AsyncMock(return_value=("cloud", "vi", 0.9))
    router = OmniLanguageRouter(local_stt=local, cloud_stt=cloud)

    result = await router.transcribe(_audio(), language="vi", is_final=True, meeting_id="m")

    assert result.text == "xin chào"
    local.transcribe.assert_awaited_once()
    cloud.transcribe_audio_chunk.assert_not_awaited()


@pytest.mark.asyncio
async def test_omni_router_ja_prefers_groq():
    local = MagicMock()
    local.transcribe = AsyncMock(
        return_value=TranscriptResult(text="local", language="ja", is_final=True)
    )
    cloud = MagicMock()
    cloud.transcribe_audio_chunk = AsyncMock(return_value=("こんにちは", "ja", 0.95))
    router = OmniLanguageRouter(local_stt=local, cloud_stt=cloud)

    result = await router.transcribe(_audio(), language="ja", is_final=True, meeting_id="m")

    assert result.text == "こんにちは"
    assert result.language == "ja"
    cloud.transcribe_audio_chunk.assert_awaited_once()
    local.transcribe.assert_not_awaited()


@pytest.mark.asyncio
async def test_omni_router_without_cloud_always_local():
    local = MagicMock()
    local.transcribe = AsyncMock(
        return_value=TranscriptResult(text="only local", language="en", is_final=True)
    )
    router = OmniLanguageRouter(local_stt=local, cloud_stt=None)

    result = await router.transcribe(_audio(), language="en", is_final=True)

    assert result.text == "only local"
    local.transcribe.assert_awaited_once()


def test_to_float32_mono_decodes_int16_pcm_bytes():
    samples = np.array([0, 16384, -16384, 32767], dtype="<i2")
    raw = samples.tobytes()

    decoded = OmniLanguageRouter._to_float32_mono(raw)

    assert decoded.dtype == np.float32
    assert decoded.shape == (4,)
    np.testing.assert_allclose(decoded[0], 0.0, atol=1e-6)
    np.testing.assert_allclose(decoded[1], 0.5, atol=1e-3)
    np.testing.assert_allclose(decoded[2], -0.5, atol=1e-3)
    np.testing.assert_allclose(decoded[3], 32767 / 32768.0, atol=1e-5)


def test_to_float32_mono_rejects_odd_length_bytes():
    with pytest.raises(TypeError, match="int16 PCM"):
        OmniLanguageRouter._to_float32_mono(b"\x00\x01\x02")


@pytest.mark.asyncio
async def test_omni_router_groq_path_accepts_int16_pcm_bytes():
    local = MagicMock()
    local.transcribe = AsyncMock(
        side_effect=AssertionError("local must not run for successful groq path")
    )
    cloud = MagicMock()
    cloud.transcribe_audio_chunk = AsyncMock(return_value=("hello", "en", 0.91))
    router = OmniLanguageRouter(local_stt=local, cloud_stt=cloud)

    pcm_bytes = (np.array([1000, -1000, 2000], dtype="<i2")).tobytes()
    result = await router.transcribe(pcm_bytes, language="en", is_final=True, meeting_id="m")

    assert result.text == "hello"
    cloud.transcribe_audio_chunk.assert_awaited_once()
    sent = cloud.transcribe_audio_chunk.await_args.args[0]
    assert isinstance(sent, np.ndarray)
    assert sent.dtype == np.float32
    np.testing.assert_allclose(sent[0], 1000 / 32768.0, atol=1e-5)
