from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def _read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def _compose() -> dict:
    return yaml.safe_load(_read("docker-compose.production.yml"))


def test_production_compose_only_exposes_edge_and_livekit_media_ports() -> None:
    compose = _compose()
    services = compose["services"]

    for service_name in ("postgres", "redis", "api", "ai-service", "laya", "web"):
        assert "ports" not in services[service_name]

    assert set(services["caddy"]["ports"]) == {"80:80", "443:443", "443:443/udp"}
    assert set(services["livekit"]["ports"]) == {"7881:7881", "7882:7882/udp"}


def test_production_compose_uses_immutable_images_and_safe_runtime_settings() -> None:
    source = _read("docker-compose.production.yml")
    compose = _compose()
    services = compose["services"]

    for service_name in ("api", "ai-service", "laya", "web"):
        assert "${IMAGE_TAG:?" in services[service_name]["image"]
        assert services[service_name]["pull_policy"] == "always"
        assert "no-new-privileges:true" in services[service_name]["security_opt"]

    assert services["api"]["environment"]["ASPNETCORE_ENVIRONMENT"] == "Production"
    assert services["api"]["environment"]["Database__MigrateOnStartup"] == "false"
    assert services["migrate"]["command"] == ["--migrate-only"]
    assert services["migrate"]["restart"] == "no"
    assert "--migrate-only" in _read("apps/api/Program.cs")
    assert services["ai-service"]["environment"]["TRUSTED_PROXY_IPS"] == "172.30.0.10"
    assert "postgres_data:" in source
    assert "whisper_cache:" in source
    assert "caddy_data:" in source


def test_livekit_and_caddy_are_configured_for_public_tls_vps() -> None:
    livekit = _read("infra/livekit/livekit.production.yaml")
    caddy = _read("infra/caddy/Caddyfile")

    assert "use_external_ip: true" in livekit
    assert "address: redis:6379" in livekit
    assert "{$APP_DOMAIN}" in caddy
    assert "{$LIVEKIT_DOMAIN}" in caddy
    assert "reverse_proxy web:3000" in caddy
    assert "reverse_proxy livekit:7880" in caddy


def test_laya_image_is_pinned_to_cpu_only_torch() -> None:
    dockerfile = _read("apps/laya/Dockerfile")

    assert '"laya[serve]==0.3.20"' in dockerfile
    assert "https://download.pytorch.org/whl/cpu" in dockerfile


def test_ai_service_does_not_duplicate_laya_ml_runtime() -> None:
    requirements = _read("apps/ai-service/requirements.txt")

    assert "torch" not in requirements.lower()
    assert "transformers" not in requirements.lower()


def test_production_env_template_contains_names_not_real_secrets() -> None:
    env_template = _read(".env.production.example")
    gitignore = _read(".gitignore")

    required_names = (
        "APP_DOMAIN",
        "LIVEKIT_DOMAIN",
        "POSTGRES_PASSWORD",
        "LIVEKIT_API_SECRET",
        "SUBTITLE_TOKEN_SIGNING_KEY",
        "ADMISSION_TOKEN_SIGNING_KEY",
        "SESSION_TOKEN_SIGNING_KEY",
    )
    for name in required_names:
        assert f"{name}=" in env_template

    assert "devsecret" not in env_template
    assert "POSTGRES_PASSWORD=postgres" not in env_template
    assert ".env.production" in gitignore


def test_ci_and_cd_keep_quality_and_release_gates() -> None:
    ci = _read(".github/workflows/ci.yml")
    deploy = _read(".github/workflows/deploy-production.yml")

    assert "npm audit --audit-level=low" in ci
    assert "--vulnerable --include-transitive" in ci
    assert "docker compose --env-file .env.production.example" in ci
    assert "workflow_dispatch:" in deploy
    assert "environment: production" in deploy
    assert "docker/build-push-action@v7" in deploy
    assert "VPS_KNOWN_HOSTS" in deploy
    assert "StrictHostKeyChecking=no" not in deploy
    assert "deploy-production.sh" in deploy


def test_deploy_script_has_health_gate_and_automatic_rollback() -> None:
    deploy = _read("scripts/deploy-production.sh")
    rollback = _read("scripts/rollback-production.sh")

    assert "docker compose" in deploy
    assert "config -q" in deploy
    assert "--profile tools run --rm migrate" in deploy
    assert "rollback-production.sh" in deploy
    assert "/health/ready" in deploy
    assert "previous" in rollback
    assert "IMAGE_TAG" in rollback


def test_linux_database_backup_and_restore_scripts_exist_and_conform_to_contract() -> None:
    backup_sh = _read("scripts/backup-database.sh")
    restore_sh = _read("scripts/restore-database.sh")

    assert "#!/usr/bin/env bash" in backup_sh or "#!/bin/bash" in backup_sh
    assert "set -Eeuo pipefail" in backup_sh
    assert "pg_dump" in backup_sh
    assert "gzip" in backup_sh
    assert "chmod 600" in backup_sh
    assert "POSTGRES_PASSWORD" not in backup_sh or "$POSTGRES_PASSWORD" in backup_sh  # Variable only, no hardcoded secret

    assert "#!/usr/bin/env bash" in restore_sh or "#!/bin/bash" in restore_sh
    assert "set -Eeuo pipefail" in restore_sh
    assert "psql" in restore_sh
    assert "_restore_test" in restore_sh
    assert "--allow-existing" in restore_sh


def test_self_hosted_all_in_one_setup_script_exists_and_conforms_to_contract() -> None:
    setup_sh = _read("scripts/setup-self-hosted.sh")

    assert "#!/usr/bin/env bash" in setup_sh or "#!/bin/bash" in setup_sh
    assert "set -Eeuo pipefail" in setup_sh
    assert "preflight.sh" in setup_sh
    assert "generate-config.sh" in setup_sh
    assert "--profile" in setup_sh
    assert "--app-domain" in setup_sh
    assert "--livekit-domain" in setup_sh
    assert "docker compose" in setup_sh
    assert "--migrate-only" in setup_sh or "migrate" in setup_sh
    assert "smoke-test" in setup_sh
    assert "bootstrap-admin" in setup_sh


def test_self_hosted_setup_supports_one_click_domain_and_tls_modes() -> None:
    setup_sh = _read("scripts/setup-self-hosted.sh")

    assert "--domain" in setup_sh
    assert "--ssl-mode" in setup_sh
    assert "letsencrypt" in setup_sh
    assert "acme-v02.api.letsencrypt.org/directory" in setup_sh
    assert "self-signed" in setup_sh
    assert "tls internal" in setup_sh
    assert "validate_domain" in setup_sh
    assert "preflight.sh" in setup_sh


def test_systemd_service_unit_template_exists() -> None:
    service = _read("infra/systemd/ai-translate-meeting.service")

    assert "[Unit]" in service
    assert "[Service]" in service
    assert "[Install]" in service
    assert "docker compose" in service
    assert "docker-compose.production.yml" in service
    assert ".env.production" in service
    assert "Restart=always" in service


def test_smoke_test_bash_supports_hardened_checks_and_domain() -> None:
    smoke_sh = _read("scripts/smoke-test.sh")

    assert "#!/usr/bin/env bash" in smoke_sh or "#!/bin/bash" in smoke_sh
    assert "APP_DOMAIN" in smoke_sh or "BASE_URL" in smoke_sh or "--domain" in smoke_sh
    assert "/health/ready" in smoke_sh
    assert "/api/system/status" in smoke_sh
    assert "meeting" in smoke_sh.lower()


def test_smoke_test_bash_validates_public_tls_livekit_and_subtitle_contract() -> None:
    smoke_sh = _read("scripts/smoke-test.sh")

    for cli_flag in (
        "--domain",
        "--livekit-domain",
        "--livekit-tcp-port",
        "--livekit-udp-port",
        "--insecure",
    ):
        assert cli_flag in smoke_sh

    assert "https://" in smoke_sh
    assert "wss://" in smoke_sh
    assert "Connection: Upgrade" in smoke_sh
    assert "nc -z" in smoke_sh
    assert '"subtitleToken"' in smoke_sh
    assert "/health/ready" in smoke_sh
