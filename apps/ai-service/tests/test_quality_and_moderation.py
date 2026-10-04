import asyncio
import json
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.audio.quality_filter import SpeechQualityFilter
from app.security.moderation import ContentModerationFilter
from app.websocket.transcribe_handler import TranscribeWebSocketHandler
from app.schemas.subtitle import SubtitleBroadcastMessage


# ---------------------------------------------------------------------------
# 1. Speech Quality Filter Tests
# ---------------------------------------------------------------------------
def test_speech_quality_filter_hallucinations():
    """Verify classic Whisper hallucinations in VI, EN, JA are properly rejected."""
    q_filter = SpeechQualityFilter()

    # Vietnamese hallucinations
    ok_vi, reason_vi = q_filter.filter_speech("Cảm ơn các bạn đã theo dõi video.", language="vi")
    assert not ok_vi
    assert reason_vi == "whisper_hallucination"

    ok_vi2, _ = q_filter.filter_speech("Hãy đăng ký kênh để ủng hộ nhé.", language="vi")
    assert not ok_vi2

    # English hallucinations
    ok_en, reason_en = q_filter.filter_speech("Thank you for watching!", language="en")
    assert not ok_en
    assert reason_en == "whisper_hallucination"

    ok_en2, _ = q_filter.filter_speech("Please subscribe to my channel.", language="en")
    assert not ok_en2

    # Japanese hallucinations
    ok_ja, reason_ja = q_filter.filter_speech("ご視聴ありがとうございました。", language="ja")
    assert not ok_ja
    assert reason_ja == "whisper_hallucination"


def test_speech_quality_filter_pure_fillers():
    """Verify utterances composed purely of meaningless filler sounds are dropped."""
    q_filter = SpeechQualityFilter()

    # Vietnamese fillers
    ok, reason = q_filter.filter_speech("ừm...", language="vi")
    assert not ok
    assert reason == "pure_filler"

    ok2, _ = q_filter.filter_speech("à ờ ừm", language="vi")
    assert not ok2

    # English fillers
    ok_en, _ = q_filter.filter_speech("um uh", language="en")
    assert not ok_en

    # Japanese fillers
    ok_ja, _ = q_filter.filter_speech("ええと", language="ja")
    assert not ok_ja

    # Meaningful sentences containing filler words must NOT be dropped
    valid_vi, _ = q_filter.filter_speech("À, chúng ta bắt đầu cuộc họp nhé.", language="vi")
    assert valid_vi

    valid_ja, _ = q_filter.filter_speech("あの、次のアジェンダについて説明します。", language="ja")
    assert valid_ja


def test_speech_quality_filter_acoustic_noise_and_loops():
    """Verify music symbols, brackets, and repeating word loops are rejected."""
    q_filter = SpeechQualityFilter()

    # Acoustic artifacts
    ok_noise, reason_noise = q_filter.filter_speech("♪ ♫ ♪", language="vi")
    assert not ok_noise
    assert reason_noise == "acoustic_noise"

    ok_cough, _ = q_filter.filter_speech("[tiếng ho]", language="vi")
    assert not ok_cough

    # Infinite repetition loops
    ok_loop, reason_loop = q_filter.filter_speech("ha ha ha ha ha ha", language="vi")
    assert not ok_loop
    assert reason_loop == "repetition_loop"


# ---------------------------------------------------------------------------
# 2. Content Moderation & Policy Guard Tests
# ---------------------------------------------------------------------------
def test_content_moderation_profanity_masking():
    """Verify profanity is masked with *** in 'mask' mode across VI, EN, JA."""
    mod = ContentModerationFilter(default_mode="mask")

    # Vietnamese
    is_violated_vi, masked_vi, action_vi = mod.moderate("Dự án này làm ăn như vcl.", language="vi")
    assert is_violated_vi
    assert action_vi == "masked"
    assert "vcl" not in masked_vi
    assert "***" in masked_vi

    # English
    is_violated_en, masked_en, action_en = mod.moderate("This is fucking broken.", language="en")
    assert is_violated_en
    assert action_en == "masked"
    assert "fucking" not in masked_en
    assert "***" in masked_en

    # Japanese
    is_violated_ja, masked_ja, action_ja = mod.moderate("このクソ野郎が！", language="ja")
    assert is_violated_ja
    assert action_ja == "masked"
    assert "クソ野郎" not in masked_ja
    assert "***" in masked_ja


def test_content_moderation_drop_policy():
    """Verify that in 'drop' policy mode, violating utterances are suppressed completely."""
    mod = ContentModerationFilter(default_mode="drop")

    is_violated, text_out, action = mod.moderate("What the fuck is this?", language="en", mode="drop")
    assert is_violated
    assert action == "dropped"
    assert text_out == ""


def test_content_moderation_dlp_pii_masking():
    """Verify credit card numbers and passwords/api-keys are redacted."""
    mod = ContentModerationFilter()

    # Credit card
    cc_input = "Vui lòng thanh toán qua số thẻ 4532-1234-5678-9012 nhé."
    is_violated_cc, sanitized_cc, _ = mod.moderate(cc_input, language="vi")
    assert is_violated_cc
    assert "4532-1234-5678-9012" not in sanitized_cc
    assert "[CARD REDACTED]" in sanitized_cc

    # Secret key
    secret_input = "Here is my password: superSecretPassword123"
    is_violated_sec, sanitized_sec, _ = mod.moderate(secret_input, language="en")
    assert is_violated_sec
    assert "superSecretPassword123" not in sanitized_sec
    assert "[REDACTED]" in sanitized_sec


# ---------------------------------------------------------------------------
# 3. Pipeline Integration Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_transcribe_handler_drops_hallucination_without_translating():
    """Verify websocket handler drops hallucination and does not broadcast subtitle."""
    handler = TranscribeWebSocketHandler()

    ws = MagicMock()
    ws.send_text = AsyncMock()
    ws.accept = AsyncMock()

    # User triggers a classic Whisper hallucination
    ws.receive = AsyncMock(side_effect=[
        {
            "type": "websocket.receive",
            "text": json.dumps({"text": "Cảm ơn các bạn đã theo dõi video.", "language": "vi", "isFinal": True}),
        },
        {"type": "websocket.disconnect"},
    ])

    await handler.handle(
        ws,
        meeting_id="meeting-hallucination-test",
        participant_id="user-1",
        participant_name="User",
        source_language="vi",
        target_language="ja",
        already_accepted=True,
    )

    # Broadcast subtitles should NOT contain the hallucination
    sent_subs = [
        SubtitleBroadcastMessage.model_validate_json(call.args[0])
        for call in ws.send_text.call_args_list
        if '"type":"subtitle"' in call.args[0] or '"type": "subtitle"' in call.args[0]
    ]

    hallucination_broadcasts = [s for s in sent_subs if "theo dõi video" in s.data.originalText]
    assert len(hallucination_broadcasts) == 0


@pytest.mark.asyncio
async def test_transcribe_handler_masks_profanity_before_broadcasting():
    """Verify websocket handler sanitizes profanities so listeners receive clean text."""
    handler = TranscribeWebSocketHandler()

    ws = MagicMock()
    ws.send_text = AsyncMock()
    ws.accept = AsyncMock()

    # Speaker utters sentence with vulgarity in 'mask' mode
    ws.receive = AsyncMock(side_effect=[
        {
            "type": "websocket.receive",
            "text": json.dumps({"text": "Hệ thống bị lỗi vcl rồi anh em.", "language": "vi", "isFinal": True}),
        },
        {"type": "websocket.disconnect"},
    ])

    await handler.handle(
        ws,
        meeting_id="meeting-moderation-test",
        participant_id="user-1",
        participant_name="User",
        source_language="vi",
        target_language="vi",  # same language for direct inspection
        already_accepted=True,
    )

    sent_subs = [
        SubtitleBroadcastMessage.model_validate_json(call.args[0])
        for call in ws.send_text.call_args_list
        if '"type":"subtitle"' in call.args[0] or '"type": "subtitle"' in call.args[0]
    ]

    target_sub = next((s for s in sent_subs if "Hệ thống bị lỗi" in s.data.originalText), None)
    assert target_sub is not None
    assert "vcl" not in target_sub.data.originalText
    assert "***" in target_sub.data.originalText
