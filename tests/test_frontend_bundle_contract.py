import json
import os
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
WEB_DIR = ROOT / "apps" / "web"
VITE_CONFIG = WEB_DIR / "vite.config.ts"
APP_TSX = WEB_DIR / "src" / "App.tsx"
BUNDLE_VERIFIER = WEB_DIR / "scripts" / "verify-bundle.mjs"
BUNDLE_BUDGET_BYTES = 500_000


def test_vite_config_defines_isolated_chunk_groups() -> None:
    config_source = VITE_CONFIG.read_text(encoding="utf-8")

    # Ensure codeSplitting or manualChunks isolates heavy LiveKit and vendor libraries
    assert "livekit-client" in config_source
    assert "livekit-components" in config_source or "@livekit" in config_source
    assert "vendor-react" in config_source or "react" in config_source

    # Enforce quality ratchet: must not silence warning by raising chunkSizeWarningLimit
    assert "chunkSizeWarningLimit" not in config_source


def test_meeting_page_remains_lazy_loaded() -> None:
    app_source = APP_TSX.read_text(encoding="utf-8")

    assert "lazy(() => import('./pages/MeetingPage')" in app_source
    assert "lazy(() => import('./pages/HomePage')" in app_source
    assert "lazy(() => import('./pages/PreJoinPage')" in app_source


def run_bundle_verifier(dist_dir: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["BUNDLE_DIST_DIR"] = str(dist_dir)
    return subprocess.run(
        ["node", str(BUNDLE_VERIFIER)],
        cwd=WEB_DIR,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        check=False,
    )


def test_frontend_build_runs_bundle_verifier() -> None:
    package_json = json.loads((WEB_DIR / "package.json").read_text(encoding="utf-8"))

    assert BUNDLE_VERIFIER.exists()
    assert package_json["scripts"]["build"].endswith("&& node scripts/verify-bundle.mjs")


def test_bundle_verifier_fails_when_required_artifact_is_missing(tmp_path: Path) -> None:
    result = run_bundle_verifier(tmp_path / "missing-dist")

    assert result.returncode != 0
    assert "Missing required bundle artifact" in result.stderr


def test_bundle_verifier_enforces_exact_budget_and_initial_load_contract(tmp_path: Path) -> None:
    dist_dir = tmp_path / "dist"
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir(parents=True)
    (dist_dir / "index.html").write_text(
        '<script type="module" src="/assets/index.js"></script>',
        encoding="utf-8",
    )
    (assets_dir / "index.js").write_bytes(b"x" * BUNDLE_BUDGET_BYTES)

    passing_result = run_bundle_verifier(dist_dir)
    assert passing_result.returncode == 0, passing_result.stderr

    (assets_dir / "index.js").write_bytes(b"x" * (BUNDLE_BUDGET_BYTES + 1))
    oversized_result = run_bundle_verifier(dist_dir)
    assert oversized_result.returncode != 0
    assert "500001 bytes" in oversized_result.stderr
    assert "500000-byte budget" in oversized_result.stderr

    (assets_dir / "index.js").write_bytes(b"x")
    (dist_dir / "index.html").write_text(
        '<link rel="modulepreload" href="/assets/livekit-client.js">',
        encoding="utf-8",
    )
    livekit_result = run_bundle_verifier(dist_dir)
    assert livekit_result.returncode != 0
    assert "must not load or preload LiveKit" in livekit_result.stderr
