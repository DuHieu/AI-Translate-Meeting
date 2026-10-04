import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.translation.contextual_provider import ContextualTranslationProvider
from app.translation.glossary import (
    GlossaryManager,
    apply_glossary,
    clear_room_glossary,
    get_room_glossary,
    normalize_language_code,
    set_room_glossary,
)


class StubTranslationProvider:
    async def translate(self, text, source_language, target_language):
        return "fallback translation"


@pytest.fixture(autouse=True)
def clear_test_glossaries():
    room_ids = ("room-alpha", "room-beta", "room-multilingual", "api-room")
    for room_id in room_ids:
        clear_room_glossary(room_id)
    yield
    for room_id in room_ids:
        clear_room_glossary(room_id)


def test_room_glossary_is_isolated_and_returns_a_copy():
    set_room_glossary("room-alpha", {"Roadmap": "Lộ trình nội bộ"})

    room_glossary = get_room_glossary("room-alpha")
    room_glossary["Roadmap"] = "Đã bị sửa bên ngoài"

    assert get_room_glossary("room-alpha") == {"Roadmap": "Lộ trình nội bộ"}
    assert get_room_glossary("room-beta") == {}


def test_room_glossary_has_priority_over_default_dictionary():
    set_room_glossary("room-alpha", {"DEPLOY": "phát hành nội bộ"})

    translated = apply_glossary(
        "Deploy database",
        source_lang="EN",
        target_lang="vi",
        domain="engineering",
        room_id="ROOM-ALPHA",
    )

    assert translated == "phát hành nội bộ cơ sở dữ liệu"


@pytest.mark.parametrize(
    ("language_code", "expected"),
    [
        ("KO", "ko"),
        ("zh-CN", "zh"),
        ("fr_FR", "fr"),
    ],
)
def test_normalize_language_code_handles_extended_languages(language_code, expected):
    assert normalize_language_code(language_code) == expected


@pytest.mark.parametrize(
    ("source_lang", "text", "term", "translation"),
    [
        ("ko", "회의 일정을 확인합니다", "회의", "cuộc họp"),
        ("zh", "确认项目进度", "项目", "dự án"),
        ("fr", "Valider le budget", "budget", "ngân sách nội bộ"),
    ],
)
def test_room_glossary_applies_to_extended_languages(
    source_lang,
    text,
    term,
    translation,
):
    set_room_glossary("room-multilingual", {term: translation})

    result = apply_glossary(
        text,
        source_lang=source_lang,
        target_lang="vi",
        room_id="room-multilingual",
    )

    assert translation in result


@pytest.mark.asyncio
async def test_contextual_translation_uses_the_meeting_glossary():
    set_room_glossary("room-alpha", {"roadmap": "lộ trình nội bộ"})
    provider = ContextualTranslationProvider(
        fallback_provider=StubTranslationProvider(),
        glossary_manager=GlossaryManager(),
    )

    result = await provider.translate(
        "roadmap",
        source_language="en",
        target_language="vi",
        meeting_id="room-alpha",
    )

    assert result == "lộ trình nội bộ"


def test_glossary_api_sets_and_gets_meeting_terms():
    client = TestClient(app)
    payload = {"terms": {"SLA": "cam kết mức dịch vụ"}}

    post_response = client.post("/api/glossary/api-room", json=payload)
    get_response = client.get("/api/glossary/API-ROOM")

    assert post_response.status_code == 200
    assert post_response.json()["terms"] == payload["terms"]
    assert get_response.status_code == 200
    assert get_response.json()["terms"] == payload["terms"]


def test_glossary_api_rejects_too_many_terms():
    client = TestClient(app)
    terms = {f"term-{index}": "translation" for index in range(501)}

    response = client.post("/api/glossary/api-room", json={"terms": terms})

    assert response.status_code == 422
