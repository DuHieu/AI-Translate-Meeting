from pathlib import Path
import os
import re
import shutil
import subprocess
import tempfile
import pytest

ROOT = Path(__file__).resolve().parents[1]
GIT_BASH = Path(r"C:\Program Files\Git\bin\bash.exe")
if GIT_BASH.exists():
    BASH_PATH = str(GIT_BASH)
else:
    candidate = shutil.which("bash")
    if candidate and "system32" in candidate.lower():
        BASH_PATH = None
    else:
        BASH_PATH = candidate


def _read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def _run_bash(script_relative: str, *args: str) -> subprocess.CompletedProcess:
    script_path = str(ROOT / script_relative).replace("\\", "/")
    cmd = [BASH_PATH, script_path, *args]
    return subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )


# ---------------------------------------------------------------------------
# Preflight Tooling Contract Tests
# ---------------------------------------------------------------------------

def test_preflight_script_exists_and_has_strict_bash_header() -> None:
    path = ROOT / "scripts" / "preflight.sh"
    assert path.is_file(), "scripts/preflight.sh must exist"
    content = path.read_text(encoding="utf-8")
    assert content.startswith("#!/usr/bin/env bash") or content.startswith("#!/bin/bash")
    assert "set -Eeuo pipefail" in content


def test_preflight_script_validates_required_variables() -> None:
    content = _read("scripts/preflight.sh")
    required_vars = [
        "APP_DOMAIN",
        "LIVEKIT_DOMAIN",
        "POSTGRES_PASSWORD",
        "LIVEKIT_API_SECRET",
        "SUBTITLE_TOKEN_SIGNING_KEY",
        "ADMISSION_TOKEN_SIGNING_KEY",
        "SESSION_TOKEN_SIGNING_KEY",
    ]
    for var in required_vars:
        assert var in content, f"preflight.sh must check {var}"


def test_preflight_script_validates_minimum_secret_lengths() -> None:
    content = _read("scripts/preflight.sh")
    assert "32" in content


def test_preflight_script_validates_secret_isolation() -> None:
    content = _read("scripts/preflight.sh")
    assert "ADMISSION_TOKEN_SIGNING_KEY" in content
    assert "SUBTITLE_TOKEN_SIGNING_KEY" in content
    assert "SESSION_TOKEN_SIGNING_KEY" in content


def test_preflight_script_never_echoes_secret_values() -> None:
    content = _read("scripts/preflight.sh")
    assert 'echo "$POSTGRES_PASSWORD"' not in content
    assert 'echo "$LIVEKIT_API_SECRET"' not in content
    assert 'echo "$SUBTITLE_TOKEN_SIGNING_KEY"' not in content
    assert 'echo "$ADMISSION_TOKEN_SIGNING_KEY"' not in content
    assert 'echo "$SESSION_TOKEN_SIGNING_KEY"' not in content
    assert 'printf "%s" "$POSTGRES_PASSWORD"' not in content


@pytest.mark.skipif(not os.path.exists(BASH_PATH), reason="Bash not available on host")
def test_preflight_fails_fast_on_missing_env_file() -> None:
    result = _run_bash("scripts/preflight.sh", "/nonexistent/root", "/nonexistent/root/.env.production")
    assert result.returncode == 2
    assert "Environment file not found" in result.stderr or "Environment file not found" in result.stdout


@pytest.mark.skipif(not os.path.exists(BASH_PATH), reason="Bash not available on host")
def test_preflight_fails_fast_when_mandatory_variable_missing() -> None:
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".env") as tf:
        tf.write("APP_DOMAIN=meet.example.com\n")
        tf_path = tf.name

    try:
        norm_path = tf_path.replace("\\", "/")
        result = _run_bash("scripts/preflight.sh", str(ROOT), norm_path)
        assert result.returncode == 2
        assert "Missing mandatory environment variable" in result.stderr or "Missing mandatory environment variable" in result.stdout
    finally:
        os.unlink(tf_path)


@pytest.mark.skipif(not os.path.exists(BASH_PATH), reason="Bash not available on host")
def test_preflight_fails_fast_when_secret_too_short() -> None:
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".env") as tf:
        tf.write("""APP_DOMAIN=meet.example.com
LIVEKIT_DOMAIN=rtc.example.com
POSTGRES_DB=ai_translate_meeting
POSTGRES_USER=ai_translate
POSTGRES_PASSWORD=short
LIVEKIT_API_KEY=key-long-enough-1234
LIVEKIT_API_SECRET=sec-12345678901234567890123456789012
SUBTITLE_TOKEN_SIGNING_KEY=sub-12345678901234567890123456789012
ADMISSION_TOKEN_SIGNING_KEY=adm-12345678901234567890123456789012
SESSION_TOKEN_SIGNING_KEY=ses-12345678901234567890123456789012
""")
        tf_path = tf.name

    try:
        norm_path = tf_path.replace("\\", "/")
        result = _run_bash("scripts/preflight.sh", str(ROOT), norm_path)
        assert result.returncode == 2
        assert "too short" in (result.stderr + result.stdout)
        # Ensure secret value 'short' is not printed
        assert "short" not in result.stdout
    finally:
        os.unlink(tf_path)


@pytest.mark.skipif(not os.path.exists(BASH_PATH), reason="Bash not available on host")
def test_preflight_fails_fast_when_signing_keys_reused() -> None:
    shared_key = "this-is-a-shared-secret-that-is-32-chars-long"
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".env") as tf:
        tf.write(f"""APP_DOMAIN=meet.example.com
LIVEKIT_DOMAIN=rtc.example.com
POSTGRES_DB=ai_translate_meeting
POSTGRES_USER=ai_translate
POSTGRES_PASSWORD=postgres-super-secure-pass-12345
LIVEKIT_API_KEY=key-long-enough-1234
LIVEKIT_API_SECRET=sec-12345678901234567890123456789012
SUBTITLE_TOKEN_SIGNING_KEY={shared_key}
ADMISSION_TOKEN_SIGNING_KEY={shared_key}
SESSION_TOKEN_SIGNING_KEY=ses-12345678901234567890123456789012
""")
        tf_path = tf.name

    try:
        norm_path = tf_path.replace("\\", "/")
        result = _run_bash("scripts/preflight.sh", str(ROOT), norm_path)
        assert result.returncode == 2
        assert "Security isolation violation" in (result.stderr + result.stdout)
        assert shared_key not in (result.stderr + result.stdout)
    finally:
        os.unlink(tf_path)


# ---------------------------------------------------------------------------
# Profile Configurations Contract Tests (Pilot vs Business)
# ---------------------------------------------------------------------------

def test_profile_configuration_files_exist() -> None:
    pilot_path = ROOT / "config" / "profiles" / "pilot.env"
    business_path = ROOT / "config" / "profiles" / "business.env"
    assert pilot_path.is_file(), "config/profiles/pilot.env must exist"
    assert business_path.is_file(), "config/profiles/business.env must exist"


def test_pilot_profile_specifications() -> None:
    content = _read("config/profiles/pilot.env")
    assert "PROFILE=pilot" in content
    assert "WHISPER_MODEL=tiny" in content
    assert "LAYA_ENABLED=false" in content
    assert "WHISPER_COMPUTE_TYPE=int8" in content
    assert "hypothesis" in content.lower() or "chưa phải capacity guarantee" in content.lower() or "experimental" in content.lower()


def test_business_profile_specifications() -> None:
    content = _read("config/profiles/business.env")
    assert "PROFILE=business" in content
    assert "WHISPER_MODEL=small" in content
    assert "LAYA_ENABLED=true" in content
    assert "WHISPER_COMPUTE_TYPE=int8" in content
    assert "load test" in content.lower() or "xác định bằng load test" in content.lower()


# ---------------------------------------------------------------------------
# Safe Configuration Generator Contract Tests
# ---------------------------------------------------------------------------

def test_config_generator_script_exists() -> None:
    path = ROOT / "scripts" / "generate-config.sh"
    assert path.is_file(), "scripts/generate-config.sh must exist"
    content = path.read_text(encoding="utf-8")
    assert "set -Eeuo pipefail" in content
    assert "chmod 600" in content


def test_config_generator_creates_unique_strong_secrets() -> None:
    content = _read("scripts/generate-config.sh")
    assert "openssl rand" in content or "/dev/urandom" in content
    assert 'echo "$secret"' not in content
    assert "chmod 600" in content


@pytest.mark.skipif(not os.path.exists(BASH_PATH), reason="Bash not available on host")
def test_config_generator_generates_distinct_secrets_for_both_profiles() -> None:
    for profile, expected_model in [("pilot", "tiny"), ("business", "small")]:
        with tempfile.NamedTemporaryFile("w", delete=False, suffix=".env") as tf:
            tf_path = tf.name

        try:
            norm_path = tf_path.replace("\\", "/")
            result = _run_bash(
                "scripts/generate-config.sh",
                "--app-domain", "test.example.com",
                "--livekit-domain", "rtc.example.com",
                "--profile", profile,
                "--output", norm_path,
            )
            assert result.returncode == 0, f"Generator failed: {result.stderr}"
            generated_content = Path(tf_path).read_text(encoding="utf-8")

            # Check profile-specific variables
            assert f"WHISPER_MODEL={expected_model}" in generated_content
            assert "APP_DOMAIN=test.example.com" in generated_content

            # Extract secrets to verify length and uniqueness
            secrets = {}
            for line in generated_content.splitlines():
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    if any(term in k for term in ["KEY", "SECRET", "PASSWORD"]):
                        secrets[k] = v

            # Verify lengths >= 16/32
            for k, v in secrets.items():
                if k == "LIVEKIT_API_KEY":
                    assert len(v) >= 16, f"{k} is too short ({len(v)})"
                else:
                    assert len(v) >= 32, f"{k} is too short ({len(v)})"

            # Verify all secrets are distinct
            secret_values = list(secrets.values())
            assert len(secret_values) == len(set(secret_values)), "Secrets must be distinct"

            # Verify output stdout never printed the secret values
            for v in secret_values:
                assert v not in result.stdout
                assert v not in result.stderr
        finally:
            if os.path.exists(tf_path):
                os.unlink(tf_path)


# ---------------------------------------------------------------------------
# Rollback Safety Contract Tests
# ---------------------------------------------------------------------------

def test_rollback_script_never_destroys_volumes_or_data() -> None:
    content = _read("scripts/rollback-production.sh")
    assert "docker volume rm" not in content
    assert "down -v" not in content
    assert "dropdb" not in content


# ---------------------------------------------------------------------------
# Sanitized Diagnostic Bundle Contract Tests
# ---------------------------------------------------------------------------

def test_diagnostics_script_exists_and_sanitizes_bundle() -> None:
    path = ROOT / "scripts" / "diagnostics.sh"
    assert path.is_file(), "scripts/diagnostics.sh must exist"
    content = path.read_text(encoding="utf-8")
    assert "set -Eeuo pipefail" in content
    assert "sed" in content or "awk" in content or "grep" in content
    assert "tar" in content or "zip" in content


def test_diagnostics_sanitizer_regex_redacts_sensitive_data() -> None:
    content = _read("scripts/diagnostics.sh")
    # Verify the regexes cover JWTs, Bearer headers, passwords, and transcripts
    assert "REDACTED_JWT" in content
    assert "REDACTED_TOKEN" in content
    assert "REDACTED_SECRET" in content
    assert "REDACTED_TRANSCRIPT" in content


# ---------------------------------------------------------------------------
# Product Positioning & Documentation Contract Tests
# ---------------------------------------------------------------------------

def test_self_hosted_product_doc_exists_and_defines_boundaries() -> None:
    path = ROOT / "docs" / "self-hosted-product.md"
    assert path.is_file(), "docs/self-hosted-product.md must exist"
    content = path.read_text(encoding="utf-8")

    assert "Private bilingual AI meeting workspace" in content
    assert "Zoom" in content
    assert "data ownership" in content.lower() or "sở hữu dữ liệu" in content.lower()
    assert "không lưu audio thô" in content.lower() or "no raw audio" in content.lower()
    assert "pilot" in content.lower()
    assert "business" in content.lower()
    assert "offline" in content.lower() or "external" in content.lower()


# ---------------------------------------------------------------------------
# Admin Bootstrap Contract Tests
# ---------------------------------------------------------------------------

def test_admin_bootstrap_script_exists_and_has_strict_bash_header() -> None:
    path = ROOT / "scripts" / "bootstrap-admin.sh"
    assert path.is_file(), "scripts/bootstrap-admin.sh must exist"
    content = path.read_text(encoding="utf-8")
    assert content.startswith("#!/usr/bin/env bash") or content.startswith("#!/bin/bash")
    assert "set -Eeuo pipefail" in content


def test_admin_bootstrap_script_never_echoes_secrets() -> None:
    content = _read("scripts/bootstrap-admin.sh")
    assert 'echo "$POSTGRES_PASSWORD"' not in content
    assert 'echo "$LIVEKIT_API_SECRET"' not in content
    assert 'echo "$SUBTITLE_TOKEN_SIGNING_KEY"' not in content
    assert 'echo "$ADMISSION_TOKEN_SIGNING_KEY"' not in content
    assert 'echo "$SESSION_TOKEN_SIGNING_KEY"' not in content


@pytest.mark.skipif(not os.path.exists(BASH_PATH), reason="Bash not available on host")
def test_admin_bootstrap_fails_when_env_file_missing() -> None:
    result = _run_bash("scripts/bootstrap-admin.sh", "--env-file", "/nonexistent/.env")
    assert result.returncode != 0
    assert "not found" in (result.stderr + result.stdout).lower()


# ---------------------------------------------------------------------------
# Audit & Host Security Contract Tests
# ---------------------------------------------------------------------------

def test_system_status_and_audit_contracts() -> None:
    dtos = _read("apps/api/DTOs/SystemDtos.cs")
    assert "RequireHostAuthentication" in dtos

    controller = _read("apps/api/Controllers/SystemController.cs")
    assert 'HttpGet("status")' in controller
    assert 'HttpGet("audit")' in controller
    assert "GetAuditEvents" in controller


def test_system_audit_service_sanitizes_jwts_and_secrets() -> None:
    audit_service = _read("apps/api/Services/AuditLogService.cs")
    assert "REDACTED_JWT" in audit_service
    assert "REDACTED_TOKEN" in audit_service
    assert "Sanitize" in audit_service


def test_load_test_uses_shared_room_for_multi_speaker_benchmark() -> None:
    load_test = _read("scripts/load-test.py")
    assert "meeting_code" in load_test
    assert "invites" in load_test


def test_admin_bootstrap_displays_license_and_organization_info() -> None:
    sh_content = _read("scripts/bootstrap-admin.sh")
    ps1_content = _read("scripts/bootstrap-admin.ps1")
    assert "License / Organization" in sh_content
    assert "LICENSE_ORG" in sh_content
    assert "License / Organization" in ps1_content
    assert "licenseOrg" in ps1_content


def test_commercial_licensing_contract_definitions() -> None:
    dtos = _read("apps/api/DTOs/SystemDtos.cs")
    assert "SystemLicenseInfoDto" in dtos
    assert "MaxConcurrentRooms" in dtos
    assert "MaxParticipantsPerRoom" in dtos
    assert "AllowedFeatures" in dtos

    license_service = _read("apps/api/Services/LicenseService.cs")
    assert "ILicenseService" in license_service
    assert "FixedTimeEquals" in license_service
    assert "CanCreateRoom" in license_service

    controller = _read("apps/api/Controllers/SystemController.cs")
    assert 'HttpGet("license")' in controller

    web_service = _read("apps/web/src/services/systemService.ts")
    assert "SystemLicenseInfo" in web_service
    assert "fetchSystemLicense" in web_service


def test_native_linux_backup_and_restore_contract() -> None:
    backup_sh = _read("scripts/backup-database.sh")
    restore_sh = _read("scripts/restore-database.sh")

    assert "chmod 600" in backup_sh
    assert "pg_dump" in backup_sh
    assert "gzip -9" in backup_sh
    assert "POSTGRES_PASSWORD" not in backup_sh or "$POSTGRES_PASSWORD" in backup_sh

    assert "createdb" in restore_sh
    assert "information_schema.tables" in restore_sh
    assert "_restore_test" in restore_sh
    assert "--allow-existing" in restore_sh


def test_turnkey_setup_script_contract() -> None:
    setup_sh = _read("scripts/setup-self-hosted.sh")

    assert "--app-domain" in setup_sh
    assert "--livekit-domain" in setup_sh
    assert "--profile" in setup_sh
    assert "preflight.sh" in setup_sh
    assert "generate-config.sh" in setup_sh
    assert "smoke-test.sh" in setup_sh
    assert "bootstrap-admin.sh" in setup_sh




