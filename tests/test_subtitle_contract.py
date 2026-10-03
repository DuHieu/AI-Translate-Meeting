from pathlib import Path
import sys


AI_SERVICE_ROOT = Path(__file__).resolve().parents[1] / "apps" / "ai-service"
WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"
sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.schemas.subtitle import (  # noqa: E402
    PipelineStatusBroadcastMessage,
    PipelineStatusData,
    SubtitleBroadcastMessage,
    SubtitleData,
)


def test_subtitle_broadcast_matches_frontend_contract():
    message = SubtitleBroadcastMessage(
        data=SubtitleData(
            meetingId="meeting-1",
            participantId="participant-1",
            participantName="Hieu",
            sourceLanguage="vi",
            targetLanguage="en",
            originalText="Xin chào cả nhà",
            translatedText="Hello everyone",
            tags=["greeting"],
            confidence=0.92,
        )
    )

    payload = message.model_dump()

    assert payload["type"] == "subtitle"
    assert payload["data"]["meetingId"] == "meeting-1"
    assert payload["data"]["participantId"] == "participant-1"
    assert payload["data"]["participantName"] == "Hieu"
    assert payload["data"]["sourceLanguage"] == "vi"
    assert payload["data"]["targetLanguage"] == "en"
    assert payload["data"]["originalText"] == "Xin chào cả nhà"
    assert payload["data"]["translatedText"] == "Hello everyone"
    assert payload["data"]["isFinal"] is True
    assert payload["data"]["tags"] == ["greeting"]
    assert payload["data"]["confidence"] == 0.92


def test_pipeline_status_broadcast_matches_frontend_contract():
    message = PipelineStatusBroadcastMessage(
        data=PipelineStatusData(
            meetingId="meeting-1",
            utteranceId="utterance-1",
            participantId="participant-1",
            liveKitIdentity="p_0123456789abcdef",
            phase="translating",
            sequence=2,
            timestamp="2026-10-03T10:00:00+00:00",
            expiresAt="2026-10-03T10:00:03+00:00",
        )
    )

    payload = message.model_dump()

    assert payload == {
        "type": "pipeline_status",
        "data": {
            "meetingId": "meeting-1",
            "utteranceId": "utterance-1",
            "participantId": "participant-1",
            "liveKitIdentity": "p_0123456789abcdef",
            "phase": "translating",
            "sequence": 2,
            "timestamp": "2026-10-03T10:00:00+00:00",
            "expiresAt": "2026-10-03T10:00:03+00:00",
            "reasonCode": None,
        },
    }


def test_frontend_exposes_separate_pipeline_status_contract_and_subscription():
    types_source = (WEB_SRC / "types" / "subtitle.ts").read_text(encoding="utf-8")
    service_source = (WEB_SRC / "services" / "subtitleService.ts").read_text(encoding="utf-8")

    assert "export type PipelinePhase" in types_source
    assert "export interface PipelineStatusMessage" in types_source
    assert 'type: "pipeline_status"' in types_source
    assert "normalizePipelineStatusMessage" in service_source
    assert "subscribeToPipelineStatus" in service_source


def test_frontend_authenticates_websocket_without_putting_token_or_metadata_in_url():
    service_source = (WEB_SRC / "services" / "subtitleService.ts").read_text(encoding="utf-8")
    meeting_types = (WEB_SRC / "types" / "meeting.ts").read_text(encoding="utf-8")
    prejoin_source = (WEB_SRC / "pages" / "PreJoinPage.tsx").read_text(encoding="utf-8")
    join_source = (WEB_SRC / "pages" / "JoinMeetingPage.tsx").read_text(encoding="utf-8")
    hook_source = (WEB_SRC / "hooks" / "useSubtitle.ts").read_text(encoding="utf-8")
    shell_source = (WEB_SRC / "components" / "meeting" / "MeetingShell.tsx").read_text(
        encoding="utf-8"
    )

    assert "subtitleToken: string;" in meeting_types
    assert "subtitleToken: joinRes.subtitleToken" in prejoin_source
    assert "subtitleToken: joinRes.subtitleToken" in join_source
    assert "subtitleToken," in hook_source
    assert "subtitleToken: session.subtitleToken" in shell_source
    assert "this.isAuthenticated" in service_source

    # WebSocket URL must exclude token and participant metadata
    assert "url.searchParams.set('token'" not in service_source
    assert "url.searchParams.set('participantName'" not in service_source
    assert "url.searchParams.set('sourceLanguage'" not in service_source
    assert "url.searchParams.set('targetLanguage'" not in service_source

    # Authentication frame must include token and metadata fields
    assert "token: options.subtitleToken" in service_source
    assert "participantName:" in service_source
    assert "sourceLanguage: options.sourceLanguage" in service_source
    assert "targetLanguage: options.targetLanguage" in service_source


def test_smoke_test_script_uses_hardened_websocket_handshake():
    smoke_test_path = Path(__file__).resolve().parents[1] / "scripts" / "smoke-test.ps1"
    smoke_source = smoke_test_path.read_text(encoding="utf-8")

    assert "participantName=SmokeTester" not in smoke_source
    assert "sourceLanguage=" not in smoke_source
    assert "targetLanguage=" not in smoke_source
    assert "participantName" in smoke_source
    assert "token = $script:SubtitleToken" in smoke_source


def test_frontend_reconnect_and_auth_gating_contract():
    service_source = (WEB_SRC / "services" / "subtitleService.ts").read_text(encoding="utf-8")

    # Reconnect uses saved options
    assert "this.connect(this.currentOptions);" in service_source
    # Auth state gating on sending data
    assert "this.ws.readyState === WebSocket.OPEN && this.isAuthenticated" in service_source
    # Disconnect clears auth state
    assert "this.isAuthenticated = false;" in service_source
    # Specific terminal auth error codes do not trigger retry
    assert "event.code === 4400 || event.code === 4401 || event.code === 4403" in service_source


def test_backend_handshake_contract_specifies_secure_metadata_exchange():
    main_source = (AI_SERVICE_ROOT / "app" / "main.py").read_text(encoding="utf-8")

    assert 'SUPPORTED_LANGUAGES = frozenset({"vi", "en", "ja", "ko", "zh", "fr", "de", "es"})' in main_source
    assert 'DEFAULT_PARTICIPANT_NAME = "Participant"' in main_source
    assert "MAX_PARTICIPANT_NAME_LENGTH = 100" in main_source
    assert "code=4400" in main_source
    assert "code=4401" in main_source
    assert "code=4403" in main_source
    token_val_idx = main_source.index("validator.validate(")
    metadata_norm_idx = main_source.index("participant_name, source_language, target_language = _normalize_metadata(")
    assert token_val_idx < metadata_norm_idx


def test_translation_dispatch_does_not_branch_on_test_mock_apis():
    handler_source = (
        AI_SERVICE_ROOT / "app" / "websocket" / "transcribe_handler.py"
    ).read_text(encoding="utf-8")

    assert 'hasattr(tr.translate, "assert_called")' not in handler_source
    assert 'hasattr(tr.translate, "call_args_list")' not in handler_source


def test_laya_domain_network_call_is_not_awaited_in_subtitle_critical_path():
    handler_source = (
        AI_SERVICE_ROOT / "app" / "websocket" / "transcribe_handler.py"
    ).read_text(encoding="utf-8")

    assert "await self.laya.classify_domain_and_terminology" not in handler_source


def test_websocket_connection_logs_do_not_include_participant_identifier():
    handler_source = (
        AI_SERVICE_ROOT / "app" / "websocket" / "transcribe_handler.py"
    ).read_text(encoding="utf-8")
    main_source = (AI_SERVICE_ROOT / "app" / "main.py").read_text(encoding="utf-8")

    assert 'logger.info("WebSocket connected meeting=%s participant=%s"' not in handler_source
    assert 'logger.info("WebSocket disconnected meeting=%s participant=%s"' not in handler_source
    assert "participant=%s" not in handler_source
    assert "participant=%s" not in main_source
    assert "Failed sending to participant" not in handler_source


def test_ai_service_runtime_bounds_websocket_memory_and_redacts_access_logs():
    dockerfile_source = (AI_SERVICE_ROOT / "Dockerfile").read_text(encoding="utf-8")

    assert '"--ws-max-size", "131072"' in dockerfile_source
    assert '"--ws-max-queue", "8"' in dockerfile_source
    assert '"--no-access-log"' in dockerfile_source
    assert '"--log-level", "warning"' in dockerfile_source


