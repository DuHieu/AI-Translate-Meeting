import pytest
from unittest.mock import MagicMock
from app.speech.whisper_service import SpeechToTextService


def test_dual_model_routing_selects_vi_model_for_vietnamese():
    service = SpeechToTextService(model_size="tiny")
    primary_mock = MagicMock(name="primary_multilingual")
    vi_mock = MagicMock(name="vi_specialized")

    service._model = primary_mock
    service._vi_model = vi_mock
    service.dual_routing_enabled = True

    # Vietnamese variants route to vi_model
    assert service._select_model("vi") is vi_mock
    assert service._select_model("vi-VN") is vi_mock
    assert service._select_model("vietnamese") is vi_mock


def test_dual_model_routing_preserves_multilingual_whisper_for_en_and_ja():
    service = SpeechToTextService(model_size="tiny")
    primary_mock = MagicMock(name="primary_multilingual")
    vi_mock = MagicMock(name="vi_specialized")

    service._model = primary_mock
    service._vi_model = vi_mock
    service.dual_routing_enabled = True

    # English and Japanese MUST route to primary model (prevents catastrophic forgetting)
    assert service._select_model("en") is primary_mock
    assert service._select_model("en-US") is primary_mock
    assert service._select_model("ja") is primary_mock
    assert service._select_model("ja-JP") is primary_mock
    assert service._select_model("ko") is primary_mock
    assert service._select_model(None) is primary_mock
    assert service._select_model("auto") is primary_mock


def test_dual_model_routing_fallback_when_vi_load_fails(monkeypatch):
    service = SpeechToTextService(model_size="tiny")
    primary_mock = MagicMock(name="primary_multilingual")
    service._model = primary_mock
    service.dual_routing_enabled = True

    # Simulate failing PhoWhisper load
    def failing_load():
        raise RuntimeError("PhoWhisper file not found")

    monkeypatch.setattr(service, "_load_vi_model_sync", failing_load)

    # Should gracefully fall back to primary model without crashing
    selected = service._select_model("vi")
    assert selected is primary_mock


def test_dual_model_routing_disabled_routes_all_to_primary():
    service = SpeechToTextService(model_size="tiny")
    primary_mock = MagicMock(name="primary_multilingual")
    vi_mock = MagicMock(name="vi_specialized")

    service._model = primary_mock
    service._vi_model = vi_mock
    service.dual_routing_enabled = False

    assert service._select_model("vi") is primary_mock
    assert service._select_model("en") is primary_mock
    assert service._select_model("ja") is primary_mock


def test_resolve_device_and_compute_type():
    from app.speech.whisper_service import resolve_device_and_compute_type

    dev, compute = resolve_device_and_compute_type("cpu", "int8")
    assert dev == "cpu"
    assert compute == "int8"

    dev, compute = resolve_device_and_compute_type("cpu", "auto")
    assert dev == "cpu"
    assert compute == "int8"


@pytest.mark.asyncio
async def test_transcribe_passes_vad_filter_and_beam_size():
    import numpy as np

    service = SpeechToTextService(model_size="tiny")
    mock_model = MagicMock()
    mock_segment = MagicMock()
    mock_segment.text = "Xin chào các bạn."
    mock_segment.no_speech_prob = 0.05
    mock_segment.compression_ratio = 1.2
    mock_info = MagicMock()
    mock_info.language = "vi"
    mock_info.language_probability = 0.95
    mock_model.transcribe.return_value = ([mock_segment], mock_info)
    service._model = mock_model
    service.dual_routing_enabled = False

    dummy_pcm = np.zeros(16000, dtype=np.float32)
    long_prompt = "A" * 700 + ". " + "B" * 50

    # Interim chunk: beam_size=1, vad_filter=False
    res = await service.transcribe(
        dummy_pcm,
        language="vi",
        is_final=False,
        initial_prompt=long_prompt,
        vad_filter=False,
        beam_size=1,
    )
    assert res.text == "Xin chào các bạn."
    assert mock_model.transcribe.called
    called_kwargs = mock_model.transcribe.call_args[1]
    assert called_kwargs["beam_size"] == 1
    assert called_kwargs["vad_filter"] is False
    assert len(called_kwargs["initial_prompt"]) <= 600

