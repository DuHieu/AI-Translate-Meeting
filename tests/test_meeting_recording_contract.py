from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_SRC = ROOT / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_meeting_recording_preference_and_toggle_exist() -> None:
    meeting_types = read("types/meeting.ts")
    settings = read("components/meeting/MeetingSettingsDialog.tsx")
    shell = read("components/meeting/MeetingShell.tsx")

    assert "meetingRecording: boolean;" in meeting_types
    assert "['meetingRecording', 'Ghi hình cuộc họp'" in settings
    assert "Cho phép ghi lại video và phụ đề để xuất sau cuộc họp" in settings
    assert "meetingRecording: true" in shell


def test_recording_state_is_wired_to_bottom_and_top_bars() -> None:
    shell = read("components/meeting/MeetingShell.tsx")
    bottom_bar = read("components/meeting/MeetingBottomBar.tsx")
    top_bar = read("components/meeting/MeetingTopBar.tsx")

    assert "const [isRecording, setIsRecording]" in shell
    assert "handleToggleRecording" in shell
    assert "isRecordingEnabled={sidecarPreferences.meetingRecording}" in shell
    assert "onToggleRecording={handleToggleRecording}" in shell
    assert "isRecording={isRecording}" in shell

    assert "isRecordingEnabled" in bottom_bar
    assert "onToggleRecording" in bottom_bar
    assert "CircleDot" in bottom_bar
    assert "Ghi hình" in bottom_bar
    assert "Dừng ghi" in bottom_bar
    assert "danger={isRecording}" in bottom_bar

    assert "isRecording" in top_bar
    assert "REC" in top_bar
    assert "animate-pulse" in top_bar


def test_post_meeting_modal_offers_completed_recording_download() -> None:
    shell = read("components/meeting/MeetingShell.tsx")
    modal = read("components/meeting/PostMeetingModal.tsx")

    assert "recordingDownloadUrl" in shell
    assert "recordingDownloadUrl={recordingDownloadUrl}" in shell
    assert "recordingDownloadUrl" in modal
    assert "Bản ghi cuộc họp" in modal
    assert "download=" in modal
