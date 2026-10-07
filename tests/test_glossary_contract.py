import pytest
from app.translation.glossary import GlossaryManager


def test_restore_entities_recovers_translated_entity_markers():
    glossary = GlossaryManager()

    test_markers = [
        "__ENTITY_0__",
        "__entity_0__",
        "__THỰC THỂ_0__",
        "__ THỰC THỂ _ 0 __",
        "__THỰC_THỂ_0__",
        "__エンティティ_0__",
        "__실체_0__",
        "__实体_0__",
        "__實體_0__",
        "__THỰC THỂ 0__",
        "__ENTITÉ_0__",
        "__ENTITÄT_0__",
        "__ENTIDAD_0__",
        "＿＿THỰC THỂ＿0＿＿",
    ]

    token_map = {"__ENTITY_0__": "LiveKit"}

    for marker in test_markers:
        raw_translated = f"Hãy kiểm tra {marker} trước khi deploy."
        restored = glossary.restore_entities(raw_translated, token_map)
        assert restored == "Hãy kiểm tra LiveKit trước khi deploy.", f"Failed on marker: {marker}"


def test_protect_and_restore_entities_roundtrip():
    glossary = GlossaryManager()
    original_text = "Hệ thống sử dụng LiveKit và PostgreSQL để truyền tín hiệu."

    protected, token_map = glossary.protect_entities(original_text)
    assert len(token_map) > 0

    # Simulate translation where tokens might get partially translated or preserved
    translated = protected.replace("__ENTITY_0__", "__THỰC THỂ_0__")

    restored = glossary.restore_entities(translated, token_map)
    assert "LiveKit" in restored
