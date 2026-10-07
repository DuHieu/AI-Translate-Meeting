from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_ai_service_mounts_translation_qa_api_contract() -> None:
    api_source = read("apps/ai-service/app/api/translation_qa.py")
    main_source = read("apps/ai-service/app/main.py")

    for route in ("/summary", "/settings", "/samples", "/train", "/patterns", "/export"):
        assert route in api_source
    assert "application/problem+json" in api_source
    assert "X-Admin-Key" in api_source
    assert "translation_qa_router" in main_source
    assert "include_router(translation_qa_router)" in main_source


def test_web_admin_translation_qa_contract() -> None:
    api_source = read("apps/web/src/api/meetingApi.ts")
    admin_source = read("apps/web/src/pages/AdminDashboardPage.tsx")
    panel_source = read("apps/web/src/components/admin/TranslationQaPanel.tsx")

    for method in (
        "getAdminTranslationQaSummary",
        "getAdminTranslationQaSamples",
        "updateAdminTranslationQaSettings",
        "trainAdminTranslationPattern",
        "deleteAdminTranslationPattern",
        "exportAdminTranslationDataset",
    ):
        assert method in api_source

    assert "translation-qa" in admin_source
    assert "Độ Chính Xác Dịch" in admin_source
    assert "Đánh Giá Dịch & Train AI" in admin_source
    assert "QA Training Mode" in panel_source
    assert "Tự động che PII" in panel_source
    assert "Duyệt & Train (<1ms)" in panel_source
    assert "Xuất Dataset JSONL" in panel_source


def test_translation_qa_proxy_contract() -> None:
    nginx_source = read("apps/web/nginx.conf")
    vite_source = read("apps/web/vite.config.ts")

    assert "location ^~ /api/translation-qa" in nginx_source
    assert "proxy_pass http://ai-service:8000" in nginx_source
    assert "'/api/translation-qa'" in vite_source
    assert "http://localhost:8000" in vite_source
