import re
from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def _interface_fields(source: str, interface_name: str) -> set[str]:
    match = re.search(
        rf"export interface {interface_name}\s*\{{(?P<body>.*?)\}}",
        source,
        re.DOTALL,
    )
    assert match is not None, f"Missing {interface_name}"
    return {
        line.strip().removesuffix(";")
        for line in match.group("body").splitlines()
        if line.strip()
    }


def test_collaboration_data_message_payload_shapes():
    source = (WEB_SRC / "types" / "meeting.ts").read_text(encoding="utf-8")

    assert _interface_fields(source, "RaiseHandDataMessage") == {
        "type: 'RAISE_HAND'",
        "participantId: string",
        "raised: boolean",
        "timestamp: number",
    }
    assert _interface_fields(source, "ReactionDataMessage") == {
        "type: 'REACTION'",
        "emoji: string",
        "senderName: string",
    }
    assert "RaiseHandDataMessage | ReactionDataMessage" in source


def test_meeting_shell_publishes_collaboration_contract_messages():
    source = (
        WEB_SRC / "components" / "meeting" / "MeetingShell.tsx"
    ).read_text(encoding="utf-8")

    assert "type: 'RAISE_HAND'" in source
    assert "type: 'REACTION'" in source
    assert "const message: RaiseHandDataMessage" in source
    assert "const message: ReactionDataMessage" in source
    assert "participantId," in source
    assert "raised," in source
    assert "timestamp:" in source
    assert "senderName:" in source


def test_screen_share_requests_shared_audio():
    source = (
        WEB_SRC / "components" / "meeting" / "MeetingShell.tsx"
    ).read_text(encoding="utf-8")

    assert "setScreenShareEnabled(true, SCREEN_SHARE_CAPTURE_OPTIONS)" in source
    assert "audio: true" in source
    assert "systemAudio: 'include'" in source
