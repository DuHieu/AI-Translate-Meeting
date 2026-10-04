from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_live_view_is_final_only_bounded_and_always_follows_latest():
    source = read("components/subtitle/LiveSubtitleView.tsx")

    assert "LIVE_SUBTITLE_LIMIT = 12" in source
    assert ".filter((item) => item.isFinal)" in source
    assert ".slice(-LIVE_SUBTITLE_LIMIT)" in source
    assert "scrollIntoView" in source
    assert "Cuộn xuống mới nhất" not in source
    assert "Search" not in source
    assert "handleReplay" not in source


def test_export_history_is_separate_from_render_history():
    hook = read("hooks/useSubtitle.ts")
    panel = read("components/subtitle/SubtitlePanel.tsx")

    assert "exportHistoryRef" in hook
    assert "getExportHistory" in hook
    assert "getExportHistory" in panel
    assert "exportHistory" in panel


def test_overlay_is_translation_first_and_mobile_opens_recent_sheet():
    overlay = read("components/subtitle/SubtitleOverlay.tsx")

    assert "line-clamp-2" in overlay
    assert "showOriginal" in overlay
    assert "recentSubtitles" in overlay
    assert "aria-modal=\"true\"" in overlay
    assert "&& !isMobileSheetOpen" in overlay
    assert "handleReplay" not in overlay
    assert "ArrowUpDown" not in overlay


def test_optional_modules_default_off_and_live_tab_remains_available():
    shell = read("components/meeting/MeetingShell.tsx")
    settings = read("components/meeting/MeetingSettingsDialog.tsx")
    panel = read("components/subtitle/SubtitlePanel.tsx")

    assert "DEFAULT_SIDECAR_PREFERENCES" in shell
    assert "showActions: false" in shell
    assert "showRecap: false" in shell
    assert "showChat: false" in shell
    assert "audioBooth: false" in shell
    assert "showOriginal: false" in shell
    assert "Tiện ích" in settings
    assert "Phụ đề luôn bật" in settings
    assert "preferences.showActions" in panel
    assert "preferences.showRecap" in panel
    assert "preferences.showChat" in panel


def test_target_language_change_refreshes_signed_subtitle_token():
    api = read("api/meetingApi.ts")
    shell = read("components/meeting/MeetingShell.tsx")

    assert "updateSubtitlePreferences" in api
    assert "subtitle-preferences" in api
    assert "setSubtitleToken" in shell
    assert "setSubtitleTargetLanguage" in shell


def test_waiting_invite_card_stacks_on_mobile_without_crushing_text():
    stage = read("components/meeting/MeetingStage.tsx")

    assert "flex-col" in stage
    assert "sm:flex-row" in stage
    assert "left-3 right-3" in stage
    assert "whitespace-nowrap" in stage
    assert "w-full shrink-0" in stage
    assert "sm:w-auto" in stage
