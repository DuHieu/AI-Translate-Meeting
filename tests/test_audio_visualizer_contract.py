from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_participant_tile_uses_livekit_speaking_state_and_visual_cues():
    source = read("components/meeting/ParticipantTile.tsx")

    assert "useIsSpeaking(participant)" in source
    assert "participant.isSpeaking" in source
    assert "ring-emerald-400" in source
    assert "shadow-[0_0_20px_rgba(52,211,153,0.35)]" in source
    assert "animate-pulse" in source
    assert 'aria-label="Đang nói"' in source
    assert "animate-bounce" in source


def test_floating_self_view_applies_local_speaking_border():
    source = read("components/meeting/FloatingSelfView.tsx")

    assert "useIsSpeaking(participant)" in source
    assert "participant.isSpeaking" in source
    assert "ring-emerald-400" in source


def test_meeting_bottom_bar_renders_live_microphone_visualizer():
    source = read("components/meeting/MeetingBottomBar.tsx")

    assert "isSpeaking" in source
    assert "isMicOn ? (" in source
    assert 'aria-label="Mức âm thanh microphone"' in source
    assert "animate-bounce" in source
    assert "bg-emerald-400" in source


def test_meeting_shell_passes_local_speaking_state_to_bottom_bar():
    source = read("components/meeting/MeetingShell.tsx")

    # LiveKit speaking still used for UX (e.g. hand-lower); mic ring uses VAD only.
    assert "useIsSpeaking(localParticipant)" in source
    assert "isSpeaking={isVadSpeaking}" in source
    assert "isSpeaking: isVadSpeaking" in source
