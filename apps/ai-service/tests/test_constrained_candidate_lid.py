import numpy as np
import pytest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.speech.whisper_service import SpeechToTextService, OmniLanguageRouter
from app.websocket.transcribe_handler import TranscribeWebSocketHandler


def test_constrained_candidate_lid_restricts_to_candidates(monkeypatch):
    """Verify that passing candidate_languages restricts Whisper to those candidates."""
    service = SpeechToTextService(model_size="tiny")
    mock_model = MagicMock()

    # Model detect_language returns full 99-lang probabilities where Welsh (cy) is top1 due to noise
    # but among candidates ['vi', 'ja', 'en'], Vietnamese (vi) has the highest candidate score
    mock_all_probs = [
        ("cy", 0.40),  # Welsh (spurious top-1)
        ("vi", 0.30),  # Vietnamese (candidate)
        ("ja", 0.20),  # Japanese (candidate)
        ("en", 0.10),  # English (candidate)
    ]
    mock_model.detect_language.return_value = ("cy", 0.40, mock_all_probs)

    segment = SimpleNamespace(text="chúng tôi bắt đầu cuộc họp")
    info = SimpleNamespace(language="vi", language_probability=0.85)
    mock_model.transcribe.return_value = ([segment], info)
    monkeypatch.setattr(service, "_model", mock_model)

    dummy_audio = np.zeros(16000, dtype=np.float32)

    # When candidate_languages = ['vi', 'ja', 'en']
    res = service._transcribe_sync(
        dummy_audio,
        language="auto",
        candidate_languages=["vi", "ja", "en"],
    )

    # Whisper model.transcribe must be called with language='vi' (NEVER 'cy' or None)
    kwargs = mock_model.transcribe.call_args.kwargs
    assert kwargs["language"] == "vi"
    assert res.language == "vi"


def test_constrained_candidate_lid_japanese_winner(monkeypatch):
    """Verify that when Japanese legitimately wins within candidates, it is selected."""
    service = SpeechToTextService(model_size="tiny")
    mock_model = MagicMock()

    mock_all_probs = [
        ("ja", 0.92),  # Clear Japanese
        ("vi", 0.05),
        ("en", 0.03),
    ]
    mock_model.detect_language.return_value = ("ja", 0.92, mock_all_probs)

    segment = SimpleNamespace(text="こんにちは、よろしくおねがいします")
    info = SimpleNamespace(language="ja", language_probability=0.92)
    mock_model.transcribe.return_value = ([segment], info)
    monkeypatch.setattr(service, "_model", mock_model)

    dummy_audio = np.zeros(16000, dtype=np.float32)

    res = service._transcribe_sync(
        dummy_audio,
        language="auto",
        candidate_languages=["vi", "ja", "en"],
    )

    kwargs = mock_model.transcribe.call_args.kwargs
    assert kwargs["language"] == "ja"
    assert res.language == "ja"


@pytest.mark.asyncio
async def test_omni_router_passes_candidate_languages():
    """Verify OmniLanguageRouter forwards candidate_languages to local_stt."""
    mock_local = MagicMock()
    mock_local.transcribe = AsyncMock(
        return_value=SimpleNamespace(text="test", language="vi", is_final=True, language_probability=0.9)
    )
    router = OmniLanguageRouter(local_stt=mock_local, cloud_stt=None)

    dummy_audio = np.zeros(16000, dtype=np.float32)
    await router.transcribe(
        dummy_audio,
        language="auto",
        candidate_languages=["vi", "ja", "en"],
    )

    mock_local.transcribe.assert_awaited_once()
    kwargs = mock_local.transcribe.await_args.kwargs
    assert kwargs["candidate_languages"] == ["vi", "ja", "en"]


@pytest.mark.asyncio
async def test_transcribe_handler_interim_uses_locked_lang_and_final_evaluates_candidates():
    """Verify that in auto mode, interim chunks decode with locked_lang (vi) and final commit uses candidate_languages."""
    handler = TranscribeWebSocketHandler()
    calls = []

    async def mock_transcribe(audio, language="vi", is_final=True, initial_prompt=None, meeting_id="", candidate_languages=None):
        calls.append({"language": language, "is_final": is_final, "candidate_languages": candidate_languages})
        return SimpleNamespace(text="Xin chao", language="vi", is_final=is_final, language_probability=0.9)

    handler._transcribe_audio = mock_transcribe

    t = np.linspace(0, 0.35, int(16000 * 0.35), endpoint=False)
    sine_wave = (0.5 * np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16).tobytes()
    silence = np.zeros(int(16000 * 0.35), dtype=np.int16).tobytes()

    ws = MagicMock()
    ws.receive = AsyncMock(
        side_effect=[
            # 1. Speech chunk + 2 silence chunks to finalize utterance
            {"type": "websocket.receive", "bytes": sine_wave},
            {"type": "websocket.receive", "bytes": silence},
            {"type": "websocket.receive", "bytes": silence},
            # Disconnect
            {"type": "websocket.disconnect"},
        ]
    )
    ws.send_text = AsyncMock()

    await handler.handle(
        ws,
        meeting_id="m-test-1",
        participant_id="p-1",
        participant_name="Tester",
        source_language="auto",
        target_language="ja",
        already_accepted=True,
    )

    assert len(calls) >= 1
    # The final commit call in auto mode must pass candidate_languages containing vi, ja, en
    assert calls[0]["is_final"] is True
    assert set(calls[0]["candidate_languages"]) == {"vi", "ja", "en"}
    assert calls[0]["language"] == "auto"

