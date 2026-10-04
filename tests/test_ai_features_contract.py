from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def test_ai_recap_engine_contract():
    recap_engine_source = (WEB_SRC / "utils" / "aiRecapEngine.ts").read_text(encoding="utf-8")

    assert "export function generateMeetingRecap" in recap_engine_source
    assert "executiveHighlights" in recap_engine_source
    assert "speakerStats" in recap_engine_source
    assert "topics" in recap_engine_source
    assert "TopicCluster" in recap_engine_source
    assert "SpeakerParticipation" in recap_engine_source
    assert "ActionItemDetail" in recap_engine_source
    assert "decisions" in recap_engine_source
    assert "actionItems" in recap_engine_source
    assert "blockersAndRisks" in recap_engine_source


def test_speech_and_audio_utilities_contract():
    speech_source = (WEB_SRC / "utils" / "speechAndAudio.ts").read_text(encoding="utf-8")

    assert "export function detectSpokenLanguage" in speech_source
    assert "export function speakText" in speech_source
    assert "export function stopSpeech" in speech_source
    assert "export function playActionNotificationChime" in speech_source
    assert "SpeechSynthesisUtterance" in speech_source
    assert "AudioContext" in speech_source


def test_subtitle_panel_integrates_ai_recap_without_live_replay_controls():
    panel_source = (WEB_SRC / "components" / "subtitle" / "SubtitlePanel.tsx").read_text(
        encoding="utf-8"
    )

    assert "handlePlayAudio" not in panel_source
    assert "stopSpeech" not in panel_source

    # AI Meeting Intelligence and Chime toggle integrated
    assert "generateMeetingRecap" in panel_source
    assert "handleGenerateRecap" in panel_source
    assert "isGeneratingRecap" in panel_source
    assert "toggleChime" in panel_source
    assert "ai-action-chime-enabled" in panel_source

    # AI Recap stays available as an optional module.
    assert "recapResult.executiveHighlights" in panel_source
    assert "recapResult.topics" in panel_source
    assert "recapResult.speakerStats" in panel_source
    assert "recapResult.decisions" in panel_source
    assert "recapResult.actionItems" in panel_source
    assert "recapResult.blockersAndRisks" in panel_source
    assert "handleDownloadMinutesMarkdown" in panel_source


def test_subtitle_overlay_stays_lightweight_without_audio_replay():
    overlay_source = (WEB_SRC / "components" / "subtitle" / "SubtitleOverlay.tsx").read_text(
        encoding="utf-8"
    )

    assert "Volume2" not in overlay_source
    assert "speakText" not in overlay_source
    assert "handleReplay" not in overlay_source


def test_recap_skill_manager_hides_standard_skill_and_supports_custom_skills():
    skill_manager_source = (WEB_SRC / "utils" / "recapSkillManager.ts").read_text(encoding="utf-8")

    # Standard built-in skill is defined with isBuiltin = true
    assert "export const SYSTEM_DEFAULT_RECAP_SKILL" in skill_manager_source
    assert "isBuiltin: true" in skill_manager_source

    # Strictly filters out built-in skills from custom list
    assert "!item.isBuiltin" in skill_manager_source or "!s.isBuiltin" in skill_manager_source
    assert "export function getCustomSkills" in skill_manager_source
    assert "export function saveCustomSkill" in skill_manager_source
    assert "export function deleteCustomSkill" in skill_manager_source
    assert "export function getActiveSkill" in skill_manager_source
    assert "export function importCustomSkillsFromJson" in skill_manager_source
    assert "export function exportCustomSkillsToJson" in skill_manager_source


def test_meeting_settings_manages_custom_company_skills():
    settings_source = (WEB_SRC / "components" / "meeting" / "MeetingSettingsDialog.tsx").read_text(
        encoding="utf-8"
    )

    assert "getCustomSkills" in settings_source
    assert "saveCustomSkill" in settings_source
    assert "deleteCustomSkill" in settings_source
    assert "Kỹ năng AI" in settings_source
    assert "Thêm kỹ năng" in settings_source
