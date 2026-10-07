from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_SRC = ROOT / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_top_bar_exposes_plan_and_countdown_contract() -> None:
    source = read("components/meeting/MeetingTopBar.tsx")

    assert "isProPlan?: boolean" in source
    assert "timeRemainingSeconds?: number | null" in source
    assert "onOpenUpgradeModal?: () => void" in source
    assert "Pro Unlimited ⚡" in source
    assert "Free ·" in source
    assert "timeRemainingSeconds <= FREE_MEETING_WARNING_SECONDS" in source
    assert "onClick={onOpenUpgradeModal}" in source


def test_upgrade_required_modal_exposes_conversion_actions() -> None:
    source = read("components/meeting/UpgradeRequiredModal.tsx")

    assert "interface UpgradeRequiredModalProps" in source
    assert "isOpen: boolean" in source
    assert "isTimeExpired: boolean" in source
    assert "onUpgrade: () => void" in source
    assert "onLeaveMeeting: () => void" in source
    assert "Hết thời lượng miễn phí (40 phút)" in source
    assert "Nâng cấp LayaMeet Pro" in source or "Nâng cấp ViMeet Pro" in source
    assert "Không giới hạn thời lượng" in source
    assert "Cabin phiên dịch tai nghe" in source
    assert "Xuất biên bản họp" in source
    assert "Nâng cấp ngay qua VietQR" in source
    assert "Rời cuộc họp" in source


def test_meeting_shell_enforces_free_limit_and_wires_upgrade_modal() -> None:
    source = read("components/meeting/MeetingShell.tsx")

    assert "const FREE_MEETING_LIMIT_SECONDS = 40 * 60" in source
    assert "const FREE_MEETING_WARNING_SECONDS = 5 * 60" in source
    assert "const [timeRemainingSeconds, setTimeRemainingSeconds]" in source
    assert "const [isTimeExpired, setIsTimeExpired]" in source
    assert "hasShownTimeWarningRef" in source
    assert "setIsTimeExpired(true)" in source
    assert "setIsUpgradeModalOpen(true)" in source
    assert "Chỉ còn 5 phút miễn phí" in source
    assert "timeRemainingSeconds={timeRemainingSeconds}" in source
    assert "onOpenUpgradeModal={handleOpenUpgradeModal}" in source
    assert "<UpgradeRequiredModal" in source
    assert "isTimeExpired={isTimeExpired}" in source
    assert "onUpgrade={handleUpgrade}" in source
    assert "onLeaveMeeting={onLeaveRoom}" in source
