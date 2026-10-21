from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"
ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_subtitle_hook_streams_vad_gated_16khz_pcm_with_browser_fallback():
    hook = read("hooks/useSubtitle.ts")
    capture = read("hooks/subtitleAudioCapture.ts")
    worklet = (
        ROOT / "apps" / "web" / "public" / "audio-processors" / "vad-processor.js"
    ).read_text(encoding="utf-8")

    assert "startSubtitleAudioCapture" in hook
    assert "isSpeaking" in hook
    assert "[isMicOn, isAiReady, audioTrack" in hook
    assert "subtitleWsService.sendSpeechText" in hook

    assert "export const AUDIO_CHUNK_MS = 350;" in capture
    assert "audioWorklet.addModule" in capture
    assert "vad-audio-processor" in capture
    assert "createScriptProcessor" in capture  # legacy fallback for older browsers
    assert "16000" in capture
    assert "Int16Array" in capture
    assert "getUserSettings().vadSensitivity" in capture
    assert "low: 0.003" in capture
    assert "medium: 0.006" in capture
    assert "high: 0.011" in capture
    assert "VAD_HANGOVER_CHUNKS = 2" in capture
    assert "webkitSpeechRecognition" in capture
    assert "continuous = true" in capture
    assert "interimResults = true" in capture
    assert "new MediaRecorder" in capture

    assert "registerProcessor('vad-audio-processor'" in worklet
    assert "SPEECH_CHUNK" in worklet
    assert "SILENCE_HEARTBEAT" in worklet
    assert "5600" in worklet


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


def test_meeting_mic_speaking_indicator_uses_vad_not_livekit_or():
    shell = read("components/meeting/MeetingShell.tsx")
    assert "isSpeaking: isVadSpeaking" in shell
    assert "isSpeaking={isVadSpeaking}" in shell
    assert "isVadSpeaking || isLocalSpeaking" not in shell
