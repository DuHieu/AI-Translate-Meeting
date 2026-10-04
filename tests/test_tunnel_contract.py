from pathlib import Path
import re
import shutil
import subprocess

import pytest


ROOT = Path(__file__).resolve().parents[1]
POWERSHELL_SCRIPT = ROOT / "scripts" / "start-tunnel.ps1"
BASH_SCRIPT = ROOT / "scripts" / "start-tunnel.sh"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _find_bash() -> str | None:
    git_bash = Path(r"C:\Program Files\Git\bin\bash.exe")
    if git_bash.exists():
        return str(git_bash)

    candidate = shutil.which("bash")
    if candidate and "system32" not in candidate.lower():
        return candidate
    return None


def test_tunnel_launchers_exist_and_declare_safe_shell_modes() -> None:
    assert POWERSHELL_SCRIPT.is_file(), "scripts/start-tunnel.ps1 must exist"
    assert BASH_SCRIPT.is_file(), "scripts/start-tunnel.sh must exist"

    powershell = _read(POWERSHELL_SCRIPT)
    bash = _read(BASH_SCRIPT)

    assert '$ErrorActionPreference = "Stop"' in powershell
    assert bash.startswith("#!/usr/bin/env bash") or bash.startswith("#!/bin/bash")
    assert "set -Eeuo pipefail" in bash

def test_tunnel_launchers_default_to_port_3000_and_check_local_service() -> None:
    powershell = _read(POWERSHELL_SCRIPT)
    bash = _read(BASH_SCRIPT)

    assert re.search(r"\$Port\s*=\s*3000", powershell)
    assert "--Port" in powershell
    assert "http://localhost:$Port" in powershell
    assert "TcpClient" in powershell or "Test-NetConnection" in powershell

    assert 'PORT="${PORT:-3000}"' in bash
    assert 'http://localhost:${PORT}' in bash
    assert "curl" in bash


def test_tunnel_launchers_provision_cloudflared_when_missing() -> None:
    powershell = _read(POWERSHELL_SCRIPT)
    bash = _read(BASH_SCRIPT)

    assert "Get-Command cloudflared" in powershell
    assert "Invoke-WebRequest" in powershell
    assert "cloudflared-windows-" in powershell

    assert "command -v cloudflared" in bash
    assert "github.com/cloudflare/cloudflared/releases/latest/download" in bash
    assert "chmod +x" in bash


def test_tunnel_launchers_explain_the_temporary_public_url() -> None:
    for script in (POWERSHELL_SCRIPT, BASH_SCRIPT):
        content = _read(script).lower()
        assert "trycloudflare.com" in content
        assert "ctrl+c" in content
        assert "public" in content


def test_powershell_launcher_has_valid_syntax_and_accepts_double_dash_port() -> None:
    powershell = shutil.which("pwsh") or shutil.which("powershell")
    if not powershell:
        pytest.skip("PowerShell is not available on this host")

    parse_command = (
        "$tokens = $null; $errors = $null; "
        f"[System.Management.Automation.Language.Parser]::ParseFile('{POWERSHELL_SCRIPT}', "
        "[ref]$tokens, [ref]$errors) | Out-Null; "
        "if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }"
    )
    syntax_result = subprocess.run(
        [powershell, "-NoProfile", "-Command", parse_command],
        cwd=ROOT,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        timeout=10,
    )
    assert syntax_result.returncode == 0, syntax_result.stderr

    invalid_port_result = subprocess.run(
        [powershell, "-NoProfile", "-File", str(POWERSHELL_SCRIPT), "--Port", "0"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        timeout=10,
    )
    output = invalid_port_result.stdout + invalid_port_result.stderr
    assert invalid_port_result.returncode != 0
    assert "between 1 and 65535" in output


def test_bash_launcher_has_valid_syntax() -> None:
    bash = _find_bash()
    if not bash:
        pytest.skip("Bash is not available on this host")

    result = subprocess.run(
        [bash, "-n", str(BASH_SCRIPT)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        timeout=10,
    )
    assert result.returncode == 0, result.stderr

    help_result = subprocess.run(
        [bash, str(BASH_SCRIPT), "--help"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        timeout=10,
    )
    assert help_result.returncode == 0, help_result.stderr
    assert "Usage:" in help_result.stdout
