from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_use_audio_booth_guardrails_contract():
    source = read("hooks/useAudioBooth.ts")

    # 1. Only speaks isFinal utterances
    assert "latest.isFinal" in source
    # 2. Filters out self utterances
    assert "currentUserId && latest.participantId === currentUserId" in source
    # 3. Drops stale utterances queued > 2.5s
    assert "ageMs > 2500" in source
    assert "Dropping stale queue item" in source
    # 4. Dynamic speech rate based on lag and backlog
    assert "pendingCount > 1 || ageMs > 800" in source
    assert "speechRate = 1.25" in source
    assert "speechRate = 1.12" in source
    # 5. Integrates ducking registry and speech synthesis
    assert "audioDuckingRegistry.setDucked(true)" in source
    assert "audioDuckingRegistry.setDucked(false)" in source
    assert "speakText" in source
    assert "stopSpeech" in source
    # 6. Returns isDucked and isSpeaking
    assert "isDucked: audioDuckingRegistry.getDucked()" in source
    assert "isSpeaking: isSpeakingRef.current" in source


def test_audio_ducking_registry_contract():
    source = read("utils/audioDuckingRegistry.ts")

    assert "AudioDuckingRegistry" in source
    assert "duckedVolume = 0.18" in source
    assert "rampVolume" in source
    assert "getDuckedVolume" in source
    assert "setDuckedVolume" in source
    assert "setDucked" in source
    assert "register" in source
    assert "unregister" in source


def test_meeting_bottom_bar_integrates_audio_booth():
    source = read("components/meeting/MeetingBottomBar.tsx")

    assert "Headphones" in source
    assert "isAudioBoothActive" in source
    assert "onToggleAudioBooth" in source
    assert "Audio Booth" in source
    assert "Ducking -18dB" in source


def test_meeting_shell_binds_audio_booth_lifecycle():
    source = read("components/meeting/MeetingShell.tsx")

    assert "useAudioBooth" in source
    assert "sidecarPreferences.audioBooth" in source
    assert "handleToggleAudioBooth" in source
    assert "isAudioBoothActive={sidecarPreferences.audioBooth}" in source
    assert "onToggleAudioBooth={handleToggleAudioBooth}" in source
    assert "audioBoothToast" in source
