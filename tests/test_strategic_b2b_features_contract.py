from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps" / "web"
WEB_SRC = WEB / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_custom_business_glossary_is_persisted_and_synced() -> None:
    api = read("api/meetingApi.ts")
    settings = read("utils/userSettings.ts")
    dialog = read("components/meeting/MeetingSettingsDialog.tsx")

    assert "async getRoomGlossary(" in api
    assert "async updateRoomGlossary(" in api
    assert "/api/glossary/${encodeURIComponent(code)}" in api
    assert "customGlossary: Record<string, string>" in settings
    assert "Từ điển thuật ngữ riêng" in dialog
    assert "meetingApi.getRoomGlossary" in dialog
    assert "meetingApi.updateRoomGlossary" in dialog


def test_public_recap_route_uses_server_and_local_cache() -> None:
    app = read("App.tsx")
    page = read("pages/PublicRecapPage.tsx")
    api = read("api/meetingApi.ts")
    modal = read("components/meeting/PostMeetingModal.tsx")

    assert 'path="/recap/:meetingCode"' in app
    assert "meetingApi.getMeetingMinutes" in page
    assert "getCachedMeetingMinutes" in api
    assert "setCachedMeetingMinutes" in api
    assert "Tổ chức cuộc họp song ngữ miễn phí với LayaMeet" in page
    assert "getPublicRecapUrl" in modal


def test_document_picture_in_picture_has_safe_fallback() -> None:
    widget = read("components/meeting/FloatingSubtitleWidget.tsx")

    assert "documentPictureInPicture" in widget
    assert "requestWindow" in widget
    assert "Mở PiP ngoài màn hình" in widget
    assert "Trình duyệt chưa hỗ trợ" in widget


def test_branded_pdf_export_is_wired_to_all_recap_surfaces() -> None:
    utility = read("utils/brandedPdfExport.ts")
    assert "export async function exportBrandedMeetingPdf" in utility
    assert "branding.logoUrl" in utility
    assert ".print()" in utility

    for relative_path in (
        "components/meeting/PostMeetingModal.tsx",
        "components/subtitle/SubtitlePanel.tsx",
        "pages/PublicRecapPage.tsx",
    ):
        source = read(relative_path)
        assert "exportBrandedMeetingPdf" in source
        assert "Xuất biên bản PDF" in source


def test_workflow_sync_and_minutes_qa_are_reused() -> None:
    sync_panel = read("components/meeting/WorkflowSyncPanel.tsx")
    qa_panel = read("components/meeting/MinutesQaPanel.tsx")

    assert "Slack" in sync_panel
    assert "Trello" in sync_panel
    assert "Jira" in sync_panel
    assert "Custom Webhook" in sync_panel
    assert "syncMeetingActions" in sync_panel

    assert "Hỏi đáp AI với Biên bản họp" in qa_panel
    assert "askMeetingMinutes" in qa_panel
    assert "citation.timestamp" in qa_panel
    assert "citation.speaker" in qa_panel

    for relative_path in (
        "components/meeting/PostMeetingModal.tsx",
        "components/subtitle/SubtitlePanel.tsx",
    ):
        assert "WorkflowSyncPanel" in read(relative_path)

    for relative_path in (
        "components/subtitle/SubtitlePanel.tsx",
        "pages/PublicRecapPage.tsx",
    ):
        assert "MinutesQaPanel" in read(relative_path)


def test_meeting_shell_passes_context_required_by_strategic_features() -> None:
    shell = read("components/meeting/MeetingShell.tsx")

    assert "meetingCode={session.meetingCode}" in shell
    assert "history={subtitleHistory}" in shell
