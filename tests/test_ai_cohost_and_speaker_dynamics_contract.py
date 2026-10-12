from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_SRC = ROOT / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_chat_message_type_contract() -> None:
    types = read("types/meeting.ts")
    assert "isAiBot?: boolean;" in types
    assert "citationHighlights?: string[];" in types
    assert "export interface SpeakerDynamicItem" in types
    assert "export interface SpeakerDynamicsStats" in types


def test_ask_meeting_minutes_multilingual_and_speaker_search() -> None:
    minutes_qa = read("utils/minutesQa.ts")
    assert "isDecisionQuestion" in minutes_qa
    assert "isActionQuestion" in minutes_qa
    assert "isRiskQuestion" in minutes_qa
    assert "isSummaryQuestion" in minutes_qa
    assert "suffixMatch" in minutes_qa
    assert "prefixMatch" in minutes_qa


def test_chat_panel_renders_ai_cohost_and_prompts() -> None:
    chat_panel = read("components/meeting/ChatPanel.tsx")
    assert "isAiBot" in chat_panel
    assert "Laya AI Co-Host" in chat_panel
    assert "AI BOT" in chat_panel
    assert "Dẫn chứng trích xuất từ cuộc họp" in chat_panel
    assert "Hỏi @Laya:" in chat_panel
    assert "@Laya Tóm tắt 5 phút qua" in chat_panel


def test_meeting_shell_handles_at_laya_cohost_and_speaker_dynamics() -> None:
    shell = read("components/meeting/MeetingShell.tsx")
    assert "trimmedText.toLowerCase().startsWith('@laya')" in shell
    assert "askMeetingMinutes(query" in shell
    assert "laya-ai-cohost" in shell
    assert "Laya AI Co-Host" in shell
    assert "speakerDynamicsStats" in shell
    assert "isMonopolizing" in shell
    assert "speakerDynamics={speakerDynamicsStats}" in shell


def test_participants_panel_renders_speaker_dynamics() -> None:
    panel = read("components/meeting/ParticipantsPanel.tsx")
    assert "speakerDynamics?: SpeakerDynamicsStats" in panel
    assert "speaker-dynamics-group" in panel
    assert "Phân bổ phát biểu" in panel
    assert "monologueWarning" in panel


def test_ask_meeting_minutes_runtime_execution() -> None:
    import subprocess
    cmd = ["node", "--experimental-strip-types", "scripts/test-minutes-qa.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT / "apps" / "web"),
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        shell=True,
    )
    assert proc.returncode == 0, f"Runtime tests failed: {proc.stderr}\n{proc.stdout}"
    assert "ALL 13 runtime behavioral checks for askMeetingMinutes PASSED!" in proc.stdout

