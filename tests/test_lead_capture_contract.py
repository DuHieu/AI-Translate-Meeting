from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
API_SRC = ROOT / "apps" / "api"
WEB_SRC = ROOT / "apps" / "web" / "src"


def read_api(relative_path: str) -> str:
    return (API_SRC / relative_path).read_text(encoding="utf-8")


def read_web(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_system_dtos_define_lead_capture_contract() -> None:
    source = read_api("DTOs/SystemDtos.cs")

    assert "public sealed record CreateLeadRequest(" in source
    for field in (
        "string FullName",
        "string Email",
        "string? Company",
        "string? TeamSize",
        "string? LanguagePair",
        "string? DeploymentModel",
        "string? Notes",
    ):
        assert field in source

    assert "public sealed record CreateLeadResponse(" in source
    for field in (
        "bool Success",
        "string Message",
        "DateTime SubmittedAtUtc",
    ):
        assert field in source


def test_system_controller_implements_lead_endpoint_and_audit() -> None:
    source = read_api("Controllers/SystemController.cs")

    assert '[HttpPost("lead")]' in source
    assert "SubmitLeadAsync" in source
    assert "CreateLeadRequest request" in source
    assert "CreateLeadResponse" in source
    assert "ProblemDetails" in source
    assert "_auditLogService.LogEvent" in source
    assert '"EnterpriseLeadCaptured"' in source


def test_web_api_and_contact_form_wire_lead_submission() -> None:
    api_source = read_web("api/meetingApi.ts")
    contact_source = read_web("components/home/ContactSection.tsx")

    assert "export interface CreateLeadRequest" in api_source
    assert "export interface CreateLeadResponse" in api_source
    assert "async submitEnterpriseLead(data: CreateLeadRequest): Promise<CreateLeadResponse>" in api_source
    assert "/api/system/lead" in api_source

    assert "meetingApi.submitEnterpriseLead" in contact_source
    assert "isSubmitting" in contact_source
    assert "isSubmitted" in contact_source
