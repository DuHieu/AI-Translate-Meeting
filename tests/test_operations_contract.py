from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_database_backups_are_not_tracked() -> None:
    gitignore = _read(".gitignore")

    assert "backups/" in gitignore


def test_backup_script_fails_when_pg_dump_fails() -> None:
    script = _read("scripts/backup-database.ps1")

    assert "$dumpExitCode = $LASTEXITCODE" in script
    assert "if ($dumpExitCode -ne 0)" in script


def test_restore_script_is_safe_by_default_and_checks_native_commands() -> None:
    script = _read("scripts/restore-database.ps1")

    assert "[switch]$AllowExistingTarget" in script
    assert "_restore_test" in script
    assert "$restoreExitCode = $LASTEXITCODE" in script
    assert "if ($restoreExitCode -ne 0)" in script
    assert "if ($tableCount -lt 1)" in script
    assert "ValidatePattern" in script


def test_runbook_uses_real_script_parameters_and_safe_restore_target() -> None:
    runbook = _read("docs/production-runbook.md")

    assert "-DatabaseName" not in runbook
    assert "-BackupFilePath" not in runbook
    assert "-Database " in runbook
    assert "-BackupFile " in runbook
    assert "ai_translate_meeting_restore_test" in runbook
    assert "Restoring drops and recreates the target database" not in runbook


def test_livekit_has_real_healthcheck_and_api_waits_for_it() -> None:
    compose = _read("docker-compose.yml")
    livekit_section = compose.split("  livekit:", 1)[1].split("  api:", 1)[0]
    api_section = compose.split("  api:", 1)[1].split("  ai-service:", 1)[0]

    assert "healthcheck:" in livekit_section
    assert "wget --spider -q http://127.0.0.1:7880" in livekit_section
    assert "livekit:" in api_section
    assert "condition: service_healthy" in api_section


def test_ai_service_preloads_whisper_with_persistent_cache_and_real_healthcheck() -> None:
    compose = _read("docker-compose.yml")
    ai_section = compose.split("  ai-service:", 1)[1].split("  laya:", 1)[0]
    volumes_section = compose.split("volumes:", 1)[1]
    env_example = _read(".env.example")

    assert "WHISPER_MODEL=${WHISPER_MODEL:-tiny}" in ai_section
    assert "WHISPER_DEVICE=${WHISPER_DEVICE:-cpu}" in ai_section
    assert "WHISPER_COMPUTE_TYPE=${WHISPER_COMPUTE_TYPE:-int8}" in ai_section
    assert "WHISPER_PRELOAD=${WHISPER_PRELOAD:-true}" in ai_section
    assert "whisper_cache:/root/.cache/huggingface" in ai_section
    assert "healthcheck:" in ai_section
    assert "/health/ready" in ai_section
    assert "whisper_cache:" in volumes_section
    assert "WHISPER_PRELOAD=true" in env_example
    assert "AI_MODEL_START_PERIOD=180s" in env_example


def test_smoke_script_checks_ai_liveness_and_readiness() -> None:
    smoke = _read("scripts/smoke-test.ps1")

    assert 'AI Service - Liveness (/health/live)' in smoke
    assert 'AI Service - Readiness (/health/ready)' in smoke
