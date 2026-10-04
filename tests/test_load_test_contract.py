import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_load_test_script_exists_and_compiles() -> None:
    path = ROOT / "scripts" / "load-test.py"
    assert path.is_file(), "scripts/load-test.py must exist"

    result = subprocess.run(
        [sys.executable, "-m", "compileall", "-q", str(path)],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0, f"Compilation failed: {result.stderr}"


def test_load_test_script_help_flag_supports_multi_room() -> None:
    path = ROOT / "scripts" / "load-test.py"
    result = subprocess.run(
        [sys.executable, str(path), "--help"],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0
    assert "Synthetic Audio Load-Testing" in result.stdout
    assert "--concurrency" in result.stdout
    assert "--rooms" in result.stdout
    assert "--participants-per-room" in result.stdout
    assert "--speakers-per-room" in result.stdout
    assert "--sample-file" in result.stdout
    assert "--output-json" in result.stdout


def test_load_test_fails_fast_on_missing_sample_file() -> None:
    path = ROOT / "scripts" / "load-test.py"
    result = subprocess.run(
        [sys.executable, str(path), "--sample-file", "nonexistent.pcm"],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 1
    assert "not found" in (result.stderr + result.stdout)


def test_generate_license_script_exists_and_compiles() -> None:
    path = ROOT / "scripts" / "generate-license.py"
    assert path.is_file(), "scripts/generate-license.py must exist"

    result = subprocess.run(
        [sys.executable, "-m", "compileall", "-q", str(path)],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0, f"Compilation failed: {result.stderr}"


def test_generate_license_script_generates_valid_hmac_token() -> None:
    path = ROOT / "scripts" / "generate-license.py"
    result = subprocess.run(
        [
            sys.executable,
            str(path),
            "--org", "Contract Test Lab",
            "--tier", "business",
            "--rooms", "25",
            "--participants", "80",
            "--signing-key", "secret-test-key-32-chars-at-least!",
        ],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0
    token = result.stdout.strip()
    assert "." in token
    parts = token.split(".")
    assert len(parts) == 2
    assert len(parts[0]) > 10
    assert len(parts[1]) > 10


def test_collect_metrics_script_exists_and_compiles() -> None:
    path = ROOT / "scripts" / "collect-metrics.py"
    assert path.is_file(), "scripts/collect-metrics.py must exist"

    result = subprocess.run(
        [sys.executable, "-m", "compileall", "-q", str(path)],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0, f"Compilation failed: {result.stderr}"


def test_collect_metrics_script_help_flag() -> None:
    path = ROOT / "scripts" / "collect-metrics.py"
    result = subprocess.run(
        [sys.executable, str(path), "--help"],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0
    assert "--interval" in result.stdout
    assert "--duration" in result.stdout
    assert "--output" in result.stdout


def test_runner_scripts_exist_and_contain_required_flags() -> None:
    ps1_path = ROOT / "scripts" / "run-concurrency-test.ps1"
    sh_path = ROOT / "scripts" / "run-concurrency-test.sh"
    assert ps1_path.is_file(), "scripts/run-concurrency-test.ps1 must exist"
    assert sh_path.is_file(), "scripts/run-concurrency-test.sh must exist"

    ps1_content = ps1_path.read_text(encoding="utf-8")
    assert "DryRun" in ps1_content
    assert "load-test.py" in ps1_content
    assert "collect-metrics.py" in ps1_content

    sh_content = sh_path.read_text(encoding="utf-8")
    assert "set -euo pipefail" in sh_content
    assert "load-test.py" in sh_content

