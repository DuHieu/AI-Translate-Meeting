from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_SRC = ROOT / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_e2ee_preference_toggle_and_default_exist() -> None:
    meeting_types = read("types/meeting.ts")
    settings = read("components/meeting/MeetingSettingsDialog.tsx")
    shell = read("components/meeting/MeetingShell.tsx")

    assert "e2eeEnabled: boolean;" in meeting_types
    assert "['e2eeEnabled', 'Mã hóa đầu cuối (E2EE)'" in settings
    assert (
        "Bảo vệ âm thanh & hình ảnh bằng khóa mã hóa riêng tư giữa các đầu cuối"
        in settings
    )
    assert "e2eeEnabled: false" in shell


def test_e2ee_badge_is_conditionally_rendered_and_wired() -> None:
    shell = read("components/meeting/MeetingShell.tsx")
    top_bar = read("components/meeting/MeetingTopBar.tsx")

    assert "isE2eeEnabled={sidecarPreferences.e2eeEnabled}" in shell
    assert "isE2eeEnabled?: boolean;" in top_bar
    assert "isE2eeEnabled = false" in top_bar
    assert "{isE2eeEnabled && (" in top_bar
    assert 'aria-label="Cuộc họp được bảo vệ bằng mã hóa đầu cuối"' in top_bar
    assert "E2EE Secured 🔒" in top_bar
    assert "ShieldCheck" in top_bar
    assert "emerald" in top_bar
