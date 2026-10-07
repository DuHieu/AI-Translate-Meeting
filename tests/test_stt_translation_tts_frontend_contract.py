from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"
ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_subtitle_hook_streams_vad_gated_16khz_pcm_with_browser_fallback():
    source = read("hooks/useSubtitle.ts")

    assert "const AUDIO_CHUNK_MS = 350;" in source
    assert "createScriptProcessor" in source
    assert "16000" in source
    assert "Int16Array" in source
    assert "getUserSettings().vadSensitivity" in source
    assert "low: 0.003" in source
    assert "medium: 0.006" in source
    assert "high: 0.011" in source
    assert "const hangoverChunks = 3" in source
    assert "webkitSpeechRecognition" in source
    assert "continuous = true" in source
    assert "interimResults = true" in source
    assert "subtitleWsService.sendSpeechText" in source
    assert "new MediaRecorder" in source
    assert "[isMicOn, isAiReady, audioTrack]" in source


def test_tts_loads_matching_voice_and_resumes_before_speaking():
    source = read("utils/speechAndAudio.ts")

    assert "getVoices()" in source
    assert "onvoiceschanged" in source
    assert "utterance.voice" in source
    assert "speechSynthesis.resume()" in source
    assert source.index("speechSynthesis.resume()") < source.index("speechSynthesis.speak(utterance)")


def test_translation_timeouts_allow_cold_cloud_requests():
    settings = (ROOT / "apps" / "ai-service" / "app" / "config" / "settings.py").read_text(encoding="utf-8")
    provider = (ROOT / "apps" / "ai-service" / "app" / "translation" / "local_provider.py").read_text(encoding="utf-8")

    assert 'os.getenv("TRANSLATION_TIMEOUT_MS", "3500")' in settings
    assert "httpx.Timeout(4.0" in provider


def test_audio_booth_supports_solo_self_speech_and_refreshes_queue_age():
    hook = read("hooks/useAudioBooth.ts")
    shell = read("components/meeting/MeetingShell.tsx")

    assert "allowSelfSpeech?: boolean" in hook
    # Self-speech filter now uses item.participantId (forEach loop, not latest)
    assert "!allowSelfSpeech && currentUserId && item.participantId === currentUserId" in hook
    assert "item.enqueuedAt" in hook
    assert "Date.now()" in hook
    assert "allowSelfSpeech: participants.length <= 1" in shell


def test_live_subtitle_has_accessible_speaker_button_without_prohibited_identifier():
    source = read("components/subtitle/LiveSubtitleView.tsx")

    assert "Volume2" in source
    assert "speakText(item.translatedText || item.originalText, item.targetLanguage)" in source
    assert 'aria-label=' in source
    assert "handleReplay" not in source
    assert "Search" not in source
    assert "Cuộn xuống mới nhất" not in source
