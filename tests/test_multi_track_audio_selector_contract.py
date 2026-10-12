from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_user_settings_multi_track_contract():
    source = read("utils/userSettings.ts")

    # 1. AudioTrackMode type
    assert "export type AudioTrackMode = 'original' | 'translated_only' | 'dual_ducking';" in source
    # 2. UserMeetingSettings interface includes track mode and dubbing volume
    assert "audioTrackMode: AudioTrackMode;" in source
    assert "dubbingTargetLanguage?: SupportedLanguage;" in source
    assert "dubbingVolume: number;" in source
    assert "duckedVolume: number;" in source
    # 3. Defaults
    assert "audioTrackMode: 'dual_ducking'" in source
    assert "dubbingVolume: 1.0" in source
    assert "duckedVolume: 0.18" in source


def test_audio_ducking_registry_multi_track_contract():
    source = read("utils/audioDuckingRegistry.ts")

    # 1. Mode type and methods
    assert "AudioTrackMode" in source
    assert "setMode(mode: AudioTrackMode)" in source
    assert "getMode(): AudioTrackMode" in source
    assert "subscribeMode" in source
    # 2. Volume resolution per mode
    assert "resolveTargetVolume(): number" in source
    assert "this.mode === 'translated_only'" in source
    assert "this.mode === 'original'" in source
    # 3. Ducking volume control
    assert "duckedVolume = 0.18" in source
    assert "setDuckedVolume" in source
    assert "rampVolume" in source


def test_use_audio_booth_multi_track_integration():
    source = read("hooks/useAudioBooth.ts")

    # 1. Options includes audioTrackMode and dubbingVolume
    assert "audioTrackMode?: AudioTrackMode;" in source
    assert "dubbingVolume?: number;" in source
    # 2. Effective mode resolution and sync
    assert "effectiveMode" in source
    assert "isBoothActive" in source
    assert "audioDuckingRegistry.setMode(effectiveMode)" in source
    # 3. Volume passed to speakText
    assert "effectiveVolume" in source
    assert "speakText(" in source


def test_audio_track_selector_modal_contract():
    source = read("components/meeting/AudioTrackSelectorModal.tsx")

    # 1. Modal component exported
    assert "export const AudioTrackSelectorModal" in source
    # 2. Three listening modes represented
    assert "'dual_ducking'" in source
    assert "'translated_only'" in source
    assert "'original'" in source
    # 3. Key accessibility and interaction
    assert 'role="radiogroup"' in source
    assert 'role="radio"' in source
    assert "aria-checked" in source
    # 4. Controls: language, volume, test preview
    assert "SUPPORTED_DUBBING_LANGUAGES" in source
    assert "handleToggleTestVoice" in source
    assert "speakText" in source
    assert "stopSpeech" in source
    assert "accent-sky-500" in source


def test_meeting_bottom_bar_and_shell_integration():
    bottom_bar = read("components/meeting/MeetingBottomBar.tsx")
    shell = read("components/meeting/MeetingShell.tsx")

    # 1. BottomBar accepts audioTrackMode & trigger
    assert "audioTrackMode?: AudioTrackMode;" in bottom_bar
    assert "onOpenAudioTrackSelector?: () => void;" in bottom_bar
    assert "Kênh âm thanh" in bottom_bar
    assert "onOpenAudioTrackSelector" in bottom_bar

    # 2. Shell binds selector and modal
    assert "AudioTrackSelectorModal" in shell
    assert "isAudioTrackSelectorOpen" in shell
    assert "setIsAudioTrackSelectorOpen" in shell
    assert "audioTrackMode={audioTrackMode}" in shell
    assert "onOpenAudioTrackSelector={() => setIsAudioTrackSelectorOpen(true)}" in shell
    assert "<AudioTrackSelectorModal" in shell
