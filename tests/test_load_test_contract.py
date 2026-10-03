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


def test_load_test_script_help_flag() -> None:
    path = ROOT / "scripts" / "load-test.py"
    result = subprocess.run(
        [sys.executable, str(path), "--help"],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0
    assert "Synthetic Audio Load-Testing Tool" in result.stdout
    assert "--concurrency" in result.stdout
    assert "--sample-file" in result.stdout


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
