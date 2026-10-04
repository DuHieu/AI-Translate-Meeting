from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_SRC = ROOT / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_floating_subtitle_preference_and_setting_exist() -> None:
    meeting_types = read("types/meeting.ts")
    settings = read("components/meeting/MeetingSettingsDialog.tsx")
    shell = read("components/meeting/MeetingShell.tsx")

    assert "floatingSubtitleWidget: boolean;" in meeting_types
    assert "['floatingSubtitleWidget', 'Cửa sổ phụ đề nổi (PiP)'" in settings
    assert "Cho phép mở phụ đề nổi để xem khi dùng Google Meet hoặc Zoom" in settings
    assert "floatingSubtitleWidget: true" in shell


def test_bottom_bar_hides_or_toggles_floating_subtitles_from_preference() -> None:
    bottom_bar = read("components/meeting/MeetingBottomBar.tsx")
    shell = read("components/meeting/MeetingShell.tsx")

    assert "isFloatingSubtitleEnabled" in bottom_bar
    assert "isFloatingSubtitleActive" in bottom_bar
    assert "onToggleFloatingSubtitle" in bottom_bar
    assert "isFloatingSubtitleEnabled &&" in bottom_bar
    assert "Phụ đề nổi" in bottom_bar

    assert "const [isFloatingSubtitleActive, setIsFloatingSubtitleActive]" in shell
    assert "isFloatingSubtitleEnabled={sidecarPreferences.floatingSubtitleWidget}" in shell
    assert "isFloatingSubtitleActive={isFloatingSubtitleActive}" in shell
    assert "onToggleFloatingSubtitle={handleToggleFloatingSubtitle}" in shell


def test_shell_gates_compact_draggable_widget_and_passes_recent_subtitles() -> None:
    shell = read("components/meeting/MeetingShell.tsx")
    widget = read("components/meeting/FloatingSubtitleWidget.tsx")

    assert "isFloatingSubtitleActive && sidecarPreferences.floatingSubtitleWidget" in shell
    assert "<FloatingSubtitleWidget" in shell
    assert "subtitles={subtitleHistory}" in shell
    assert "onClose={() => setIsFloatingSubtitleActive(false)}" in shell

    assert "subtitles.slice(-3)" in widget
    assert "translatedText" in widget
    assert "onPointerDown" in widget
    assert "onPointerMove" in widget
    assert "onPointerUp" in widget
    assert "Thu nhỏ cửa sổ phụ đề nổi" in widget
