from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest

from app.audio.vad import VoiceActivityDetector
from app.config.settings import settings
from app.schemas.subtitle import SubtitleBroadcastMessage
from app.speech.whisper_service import SpeechToTextService, detect_text_language
from app.translation.glossary import GlossaryManager
from app.translation.contextual_provider import ContextualTranslationProvider
from app.translation.local_provider import LocalTranslationProvider
from app.websocket.transcribe_handler import (
    TranscribeWebSocketHandler,
    _prepare_audio_frame,
)


@pytest.mark.parametrize(
    ("text", "fallback", "expected"),
    [
        ("chung ta bat dau cuoc hop nhe", "en", "vi"),
        ("Can everyone hear me clearly?", "vi", "en"),
        ("会議を始めましょう。", "vi", "ja"),
        ("회의를 시작하겠습니다.", "vi", "ko"),
        ("我们开始会议吧。", "vi", "zh"),
        ("Bonjour, commençons la réunion.", "vi", "fr"),
        ("Réunion", "vi", "fr"),
        ("Guten Morgen, beginnen wir die Besprechung.", "vi", "de"),
        ("Hola, empecemos la reunión.", "vi", "es"),
        ("Reunión", "vi", "es"),
    ],
)
def test_detect_text_language_supports_meeting_languages(text, fallback, expected):
    language, confidence = detect_text_language(text, fallback)

    assert language == expected
    assert confidence >= 0.85


def test_auto_lid_does_not_send_default_english_prompt_to_whisper(monkeypatch):
    service = SpeechToTextService(model_size="tiny")
    model = MagicMock()
    segment = SimpleNamespace(text="xin chao moi nguoi")
    info = SimpleNamespace(language="vi", language_probability=0.7)
    model.transcribe.return_value = ([segment], info)
    monkeypatch.setattr(service, "_model", model)

    service._transcribe_sync(
        np.zeros(16000, dtype=np.float32),
        language="auto",
        initial_prompt=settings.WHISPER_INITIAL_PROMPT,
    )

    kwargs = model.transcribe.call_args.kwargs
    assert kwargs["language"] is None
    assert kwargs["initial_prompt"] is None


def test_forced_whisper_language_switches_when_text_evidence_is_clear(monkeypatch):
    service = SpeechToTextService(model_size="tiny")
    model = MagicMock()
    segment = SimpleNamespace(text="Can everyone hear me clearly?")
    info = SimpleNamespace(language="vi", language_probability=0.93)
    model.transcribe.return_value = ([segment], info)
    monkeypatch.setattr(service, "_model", model)

    result = service._transcribe_sync(
        np.zeros(16000, dtype=np.float32),
        language="vi",
    )

    assert result.language == "en"
    assert result.language_probability >= 0.85


def test_vad_defaults_detect_quiet_laptop_microphones():
    vad = VoiceActivityDetector()

    assert vad.energy_threshold == 0.00015
    assert vad.rms_threshold == 0.006


def test_webm_cluster_is_never_reinterpreted_as_raw_pcm():
    ebml = b"\x1a\x45\xdf\xa3"
    cluster = b"\x1f\x43\xb6\x75"
    first_frame = ebml + b"webm-init" + cluster + b"first-opus"

    first_payload, webm_header, is_container = _prepare_audio_frame(first_frame, None)
    next_payload, _, next_is_container = _prepare_audio_frame(
        cluster + b"next-opus",
        webm_header,
    )
    orphan_payload, _, orphan_is_container = _prepare_audio_frame(
        cluster + b"orphan-opus",
        None,
    )

    assert first_payload == first_frame
    assert webm_header == ebml + b"webm-init"
    assert is_container is True
    assert next_payload == webm_header + cluster + b"next-opus"
    assert next_is_container is True
    assert orphan_payload is None
    assert orphan_is_container is True


@pytest.mark.parametrize(
    "translated_token",
    [
        "__ENTITY_0__",
        "__entity_0__",
        "__ THỰC THỂ _ 0 __",
        "__エンティティ_0__",
        "__실체_0__",
        "__实体_0__",
    ],
)
def test_restore_entities_handles_translated_placeholder_tokens(translated_token):
    glossary = GlossaryManager()

    restored = glossary.restore_entities(
        f"Hãy kiểm tra {translated_token} trước khi deploy.",
        {"__ENTITY_0__": "LiveKit"},
    )

    assert restored == "Hãy kiểm tra LiveKit trước khi deploy."


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("source", "target", "text", "expected"),
    [
        ("vi", "en", "Cảm ơn mọi người.", "Thank you, everyone."),
        ("en", "vi", "Thank you, everyone.", "Cảm ơn mọi người."),
        ("vi", "ja", "Cảm ơn mọi người.", "皆様、ありがとうございます。"),
        ("ja", "vi", "皆様、ありがとうございます。", "Cảm ơn mọi người."),
        ("en", "ja", "Thank you, everyone.", "皆様、ありがとうございます。"),
        ("ja", "en", "皆様、ありがとうございます。", "Thank you, everyone."),
    ],
)
async def test_local_provider_has_bidirectional_meeting_phrase_fallbacks(
    source,
    target,
    text,
    expected,
):
    provider = LocalTranslationProvider(backend="local_dictionary")

    assert await provider.translate(text, source, target) == expected


@pytest.mark.asyncio
async def test_contextual_provider_uses_common_phrase_before_entity_protection():
    provider = ContextualTranslationProvider(
        fallback_provider=LocalTranslationProvider(backend="local_dictionary")
    )

    translated = await provider.translate(
        "Thank you, everyone.",
        "en",
        "ja",
    )

    assert translated == "皆様、ありがとうございます。"


@pytest.mark.asyncio
async def test_solo_speaker_pivots_from_target_language_back_to_configured_source():
    translator = MagicMock()

    async def translate(text, source_language, target_language, **_kwargs):
        if text.startswith("Xin chào"):
            return "こんにちは、会議を始めましょう。"
        return f"{source_language}->{target_language}:{text}"

    translator.translate = AsyncMock(side_effect=translate)
    handler = TranscribeWebSocketHandler(translator=translator)
    websocket = MagicMock()
    websocket.send_text = AsyncMock()
    websocket.accept = AsyncMock()
    websocket.receive = AsyncMock(
        side_effect=[
            {
                "type": "websocket.receive",
                "text": '{"text":"Cảm ơn mọi người.","language":"vi","isFinal":true}',
            },
            {"type": "websocket.disconnect"},
        ]
    )

    await handler.handle(
        websocket,
        meeting_id="solo-pivot",
        participant_id="speaker",
        participant_name="Speaker",
        source_language="ja",
        target_language="vi",
        already_accepted=True,
    )

    sent_messages = [
        SubtitleBroadcastMessage.model_validate_json(call.args[0])
        for call in websocket.send_text.call_args_list
        if '"type":"subtitle"' in call.args[0] or '"type": "subtitle"' in call.args[0]
    ]
    result = next(message for message in sent_messages if "Cảm ơn" in message.data.originalText)

    assert result.data.sourceLanguage == "vi"
    assert result.data.targetLanguage == "ja"
    assert result.data.translatedText == "vi->ja:Cảm ơn mọi người."
