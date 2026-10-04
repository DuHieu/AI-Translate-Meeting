from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_SRC = ROOT / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_file_sharing_preference_and_attachment_types_exist():
    meeting_types = read("types/meeting.ts")

    assert "fileSharing: boolean;" in meeting_types
    assert "attachment?:" in meeting_types
    assert "summaryTranslation?: string;" in meeting_types


def test_file_sharing_toggle_is_available_and_enabled_by_default():
    settings = read("components/meeting/MeetingSettingsDialog.tsx")
    shell = read("components/meeting/MeetingShell.tsx")

    assert "['fileSharing', 'Chia sẻ tệp & tài liệu'" in settings
    assert "Cho phép đính kèm tệp và dịch nhanh trong chat" in settings
    assert "fileSharing: true" in shell


def test_subtitle_panel_gates_file_input_and_renders_attachment_summary():
    panel = read("components/subtitle/SubtitlePanel.tsx")

    assert "preferences.fileSharing && (" in panel
    assert 'type="file"' in panel
    assert "Paperclip" in panel
    assert "message.attachment" in panel
    assert "message.attachment.summaryTranslation" in panel
