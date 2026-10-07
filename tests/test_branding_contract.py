import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
API_DTOS = ROOT / "apps" / "api" / "DTOs" / "SystemDtos.cs"
SYSTEM_CONTROLLER = ROOT / "apps" / "api" / "Controllers" / "SystemController.cs"
MEETING_API = ROOT / "apps" / "web" / "src" / "api" / "meetingApi.ts"
MEETING_SHELL = ROOT / "apps" / "web" / "src" / "components" / "meeting" / "MeetingShell.tsx"
MEETING_TOP_BAR = ROOT / "apps" / "web" / "src" / "components" / "meeting" / "MeetingTopBar.tsx"
POST_MEETING_MODAL = ROOT / "apps" / "web" / "src" / "components" / "meeting" / "PostMeetingModal.tsx"
SUBTITLE_PANEL = ROOT / "apps" / "web" / "src" / "components" / "subtitle" / "SubtitlePanel.tsx"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _typescript_interface_fields(source: str, interface_name: str) -> set[str]:
    match = re.search(
        rf"export interface {interface_name}\s*\{{(?P<body>.*?)\}}",
        source,
        re.DOTALL,
    )
    assert match is not None, f"Missing {interface_name}"
    return {
        line.strip().removesuffix(";")
        for line in match.group("body").splitlines()
        if line.strip()
    }


def test_backend_branding_endpoint_contract() -> None:
    dto_source = _read(API_DTOS)
    controller_source = _read(SYSTEM_CONTROLLER)

    assert "public sealed record BrandingConfigDto(" in dto_source
    for field in (
        "string BrandName",
        "string Slogan",
        "string? LogoUrl",
        "string PrimaryColor",
        "string CopyrightText",
    ):
        assert field in dto_source

    assert '[HttpGet("branding")]' in controller_source
    assert "ActionResult<BrandingConfigDto>" in controller_source
    assert '"LayaMeet"' in controller_source or '"ViMeet"' in controller_source
    assert '"Nền tảng họp trực tuyến thông minh song ngữ"' in controller_source
    assert '"#0284c7"' in controller_source
    assert '"© LayaMeet"' in controller_source or '"© ViMeet"' in controller_source


def test_frontend_branding_type_and_api_contract() -> None:
    source = _read(MEETING_API)

    assert _typescript_interface_fields(source, "BrandingConfigDto") == {
        "brandName: string",
        "slogan: string",
        "logoUrl: string | null",
        "primaryColor: string",
        "copyrightText: string",
    }
    assert "getBrandingConfig(): Promise<BrandingConfigDto>" in source
    assert "/api/system/branding" in source
    assert "handleResponse<BrandingConfigDto>" in source


def test_active_branding_is_shared_by_meeting_ui_and_markdown_exports() -> None:
    shell_source = _read(MEETING_SHELL)
    top_bar_source = _read(MEETING_TOP_BAR)
    modal_source = _read(POST_MEETING_MODAL)
    subtitle_source = _read(SUBTITLE_PANEL)

    assert "meetingApi.getBrandingConfig()" in shell_source
    assert "branding={branding}" in shell_source
    assert "branding.brandName" in top_bar_source
    assert "branding.logoUrl" in top_bar_source

    for export_source in (modal_source, subtitle_source):
        assert "branding.brandName" in export_source
        assert "branding.copyrightText" in export_source
