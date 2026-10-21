from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_frontend_ai_readiness_client_maps_ready_starting_and_failed_states() -> None:
    service = _read("apps/web/src/services/aiHealthService.ts")

    assert "export type AiReadinessState" in service
    assert "'starting' | 'ready' | 'failed' | 'unavailable'" in service
    assert "'/ai-health/ready'" in service
    assert "response.status === 503" in service
    assert "model_load_failed" in service
    assert "cache: 'no-store'" in service


def test_ai_readiness_hook_retries_and_cleans_up_polling() -> None:
    hook = _read("apps/web/src/hooks/useAiReadiness.ts")

    assert "AbortController" in hook
    assert "window.setTimeout" in hook
    assert "window.clearTimeout" in hook
    assert "controller.abort()" in hook
    assert "if (next.state !== 'ready')" in hook


def test_dev_and_docker_proxy_ai_health_on_the_same_origin() -> None:
    vite = _read("apps/web/vite.config.ts")
    nginx = _read("apps/web/nginx.conf")

    assert "'/ai-health'" in vite
    assert "path.replace(/^\\/ai-health/, '/health')" in vite
    assert "location /ai-health/" in nginx
    assert "proxy_pass http://ai-service:8000/health/;" in nginx


def test_ai_readiness_banner_is_accessible_and_actionable() -> None:
    banner = _read("apps/web/src/components/meeting/AiReadinessBanner.tsx")

    assert 'role="status"' in banner
    assert 'aria-live="polite"' in banner
    assert "AI đang khởi động, phụ đề sẽ tự bật khi sẵn sàng." in banner
    assert "Thử lại" in banner
    assert "onRetry" in banner


def test_meeting_shell_wires_readiness_without_blocking_livekit() -> None:
    shell = _read("apps/web/src/components/meeting/MeetingShell.tsx")

    assert "useAiReadiness" in shell
    assert "<AiReadinessBanner" in shell
    assert "isAiReady: aiReadiness.state === 'ready'" in shell


def test_audio_stream_waits_for_ai_readiness() -> None:
    hook = _read("apps/web/src/hooks/useSubtitle.ts")

    assert "isAiReady?: boolean" in hook
    assert "if (!isMicOn || !isAiReady)" in hook
    assert "[isMicOn, isAiReady, audioTrack" in hook
    assert "startSubtitleAudioCapture" in hook
