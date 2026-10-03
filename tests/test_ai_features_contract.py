from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def test_ai_recap_engine_contract():
    recap_engine_source = (WEB_SRC / "utils" / "aiRecapEngine.ts").read_text(encoding="utf-8")

    assert "export function generateMeetingRecap" in recap_engine_source
    assert "executiveHighlights" in recap_engine_source
    assert "speakerStats" in recap_engine_source
    assert "topics" in recap_engine_source
    assert "TopicCluster" in recap_engine_source
    assert "SpeakerParticipation" in recap_engine_source


def test_speech_and_audio_utilities_contract():
    speech_source = (WEB_SRC / "utils" / "speechAndAudio.ts").read_text(encoding="utf-8")

    assert "export function detectSpokenLanguage" in speech_source
    assert "export function speakText" in speech_source
    assert "export function stopSpeech" in speech_source
    assert "export function playActionNotificationChime" in speech_source
    assert "SpeechSynthesisUtterance" in speech_source
    assert "AudioContext" in speech_source


def test_subtitle_panel_integrates_ai_recap_and_audio_replay():
    panel_source = (WEB_SRC / "components" / "subtitle" / "SubtitlePanel.tsx").read_text(
        encoding="utf-8"
    )

    # Volume2 replay icon integrated
    assert "Volume2" in panel_source
    assert "handlePlayAudio" in panel_source
    assert "stopSpeech" in panel_source

    # AI Meeting Intelligence and Chime toggle integrated
    assert "generateMeetingRecap" in panel_source
    assert "handleGenerateRecap" in panel_source
    assert "isGeneratingRecap" in panel_source
    assert "toggleChime" in panel_source
    assert "ai-action-chime-enabled" in panel_source

    # AI Recap integrated in exported Word and Markdown documents
    assert "recap.executiveHighlights" in panel_source
    assert "recap.topics" in panel_source
    assert "recap.speakerStats" in panel_source


def test_subtitle_overlay_integrates_audio_replay():
    overlay_source = (WEB_SRC / "components" / "subtitle" / "SubtitleOverlay.tsx").read_text(
        encoding="utf-8"
    )

    assert "Volume2" in overlay_source
    assert "speakText" in overlay_source
    assert "handleReplay" in overlay_source
