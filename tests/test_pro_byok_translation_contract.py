from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_server_side_pro_translation_configuration_is_wired() -> None:
    settings = read("apps/ai-service/app/config/settings.py")
    compose = read("docker-compose.yml")
    env_example = read(".env.example")

    for name in (
        "TRANSLATION_SECONDARY_BACKEND",
        "PRO_TRANSLATION_PROVIDER",
        "PRO_OPENAI_API_KEY",
        "PRO_OPENAI_MODEL",
        "PRO_GEMINI_API_KEY",
        "PRO_GEMINI_MODEL",
        "PRO_DEEPL_API_KEY",
    ):
        assert name in settings
        assert name in compose
        assert name in env_example


def test_backend_contains_multi_engine_and_premium_providers() -> None:
    local_provider = read("apps/ai-service/app/translation/local_provider.py")
    premium_provider = read("apps/ai-service/app/translation/premium_provider.py")
    contextual_provider = read("apps/ai-service/app/translation/contextual_provider.py")

    assert "def _translate_gtx(" in local_provider
    assert "def _translate_mymemory(" in local_provider
    assert "api.mymemory.translated.net/get" in local_provider
    assert "class PremiumTranslationConfig" in premium_provider
    assert "class PremiumTranslationProvider" in premium_provider
    assert "api.openai.com/v1/chat/completions" in premium_provider
    assert "generativelanguage.googleapis.com" in premium_provider
    assert "DeepL-Auth-Key" in premium_provider
    assert "premium_provider" in contextual_provider
    assert "translationTier" in contextual_provider


def test_websocket_config_and_cache_are_tier_aware() -> None:
    handler = read("apps/ai-service/app/websocket/transcribe_handler.py")

    for field in ("translationTier", "byokEnabled", "byokProvider", "byokApiKey"):
        assert field in handler
    assert "provider_version" in handler
    assert "byokApiKey=%s" not in handler
    assert "byok_api_key=%s" not in handler


def test_frontend_persists_and_synchronizes_translation_mode() -> None:
    settings = read("apps/web/src/utils/userSettings.ts")
    service = read("apps/web/src/services/subtitleService.ts")
    hook = read("apps/web/src/hooks/useSubtitle.ts")
    shell = read("apps/web/src/components/meeting/MeetingShell.tsx")
    dialog = read("apps/web/src/components/meeting/MeetingSettingsDialog.tsx")

    assert "export type TranslationTier = 'standard' | 'pro'" in settings
    assert "translationTier: TranslationTier" in settings
    assert "export interface SubtitleConfigPayload" in service
    assert "translationTier" in service
    assert "subscribeUserSettings" in hook
    assert "isProPlan?: boolean" in hook
    assert "isProPlan" in shell
    assert "Multi-Engine Fast" in dialog
    assert "LayaMeet Pro" in dialog
