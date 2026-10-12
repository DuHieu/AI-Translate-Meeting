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
