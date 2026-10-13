import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_fact_check_engine_contract_and_knowledge_items() -> None:
    engine_file = ROOT / "apps" / "web" / "src" / "utils" / "factCheckEngine.ts"
    assert engine_file.exists(), "factCheckEngine.ts must exist"
    content = engine_file.read_text(encoding="utf-8")

    # Contract types and exports
    assert "export type FactCheckStatus" in content
    assert "export type KnowledgeCategory" in content
    assert "export interface KnowledgeItem" in content
    assert "export interface FactCheckEvent" in content
    assert "export const BUILT_IN_KNOWLEDGE_BASE" in content
    assert "export function evaluateSubtitleFactCheck" in content
    assert "export function queryKnowledgeBase" in content
    assert "export function getEnterpriseGlossary" in content

    # Key enterprise knowledge items
    assert "kb-sla" in content
    assert "99.99%" in content
    assert "kb-refund" in content
    assert "14 ngày" in content
    assert "kb-duration" in content
    assert "45 phút" in content
    assert "kb-ram-only" in content
    assert "kb-ttfs" in content
    assert "kb-e2ee" in content


def test_fact_check_ui_components_exist_and_conform() -> None:
    toast_file = ROOT / "apps" / "web" / "src" / "components" / "meeting" / "FactCheckToast.tsx"
    panel_file = ROOT / "apps" / "web" / "src" / "components" / "meeting" / "FactCheckPanel.tsx"

    assert toast_file.exists(), "FactCheckToast.tsx must exist"
    assert panel_file.exists(), "FactCheckPanel.tsx must exist"

    toast_content = toast_file.read_text(encoding="utf-8")
    assert "role=\"status\"" in toast_content
    assert "aria-live=\"polite\"" in toast_content
    assert "C\u1ea3nh B\xe1o Sai L\u1ec7ch" in toast_content
    assert "\u0110\xe3 X\xe1c Th\u1ef1c" in toast_content

    panel_content = panel_file.read_text(encoding="utf-8")
    assert "X\xe1c minh AI" in panel_content
    assert "Kho Tri Th\u1ee9c" in panel_content
    assert "timeline" in panel_content
    assert "discrepancies" in panel_content


def test_meeting_shell_integrates_fact_check() -> None:
    shell_file = ROOT / "apps" / "web" / "src" / "components" / "meeting" / "MeetingShell.tsx"
    content = shell_file.read_text(encoding="utf-8")

    assert "FactCheckToast" in content
    assert "FactCheckPanel" in content
    assert "evaluateSubtitleFactCheck" in content
    assert "'fact_check'" in content
    assert "factCheckEvents" in content
    assert "activeToastEvent" in content


def test_chat_panel_and_activities_integrate_fact_check() -> None:
    chat_file = ROOT / "apps" / "web" / "src" / "components" / "meeting" / "ChatPanel.tsx"
    activities_file = ROOT / "apps" / "web" / "src" / "components" / "meeting" / "ActivitiesPanel.tsx"

    chat_content = chat_file.read_text(encoding="utf-8")
    assert "@Laya Fact-check" in chat_content

    activities_content = activities_file.read_text(encoding="utf-8")
    assert "onOpenFactCheck" in activities_content
    assert "Xác minh AI & Tri thức" in activities_content


def test_fact_check_engine_runtime_execution() -> None:
    cmd = ["node", "--experimental-strip-types", "scripts/test-fact-check-engine.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT / "apps" / "web"),
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    assert proc.returncode == 0, f"Runtime tests failed: {proc.stderr}\n{proc.stdout}"
    assert "ALL 13 runtime behavioral tests for factCheckEngine PASSED!" in proc.stdout
