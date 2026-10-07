import json
import logging
import os
import re
from pathlib import Path
from threading import RLock
from typing import Any, Optional

from app.config.settings import settings

logger = logging.getLogger("ai_service.translation.glossary")

DEFAULT_GLOSSARY_PATH = Path(__file__).parent / "glossaries" / "default_glossary.json"
SUPPORTED_LANGUAGE_CODES = frozenset({"vi", "en", "ja", "ko", "zh", "fr", "de", "es"})
MAX_ROOM_GLOSSARY_TERMS = 500
MAX_GLOSSARY_TERM_LENGTH = 200
MAX_GLOSSARY_TRANSLATION_LENGTH = 500

_room_glossaries: dict[str, dict[str, str]] = {}
_room_glossaries_lock = RLock()

# Regex patterns for identifying acronyms and technical identifiers
ACRONYM_REGEX = re.compile(r"\b[A-Z0-9]{2,}\b")
CAMEL_CASE_REGEX = re.compile(r"\b[a-z]+(?:[A-Z][a-z0-9]+)+\b|\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b")
SNAKE_CASE_REGEX = re.compile(r"\b[a-zA-Z0-9]+_[a-zA-Z0-9_]+\b")


def _normalize_room_id(room_id: str) -> str:
    if not isinstance(room_id, str) or not room_id.strip():
        raise ValueError("room_id must be a non-empty string")
    return room_id.strip().casefold()


def normalize_language_code(language_code: str) -> str:
    """Normalizes supported language and regional codes to their base code."""
    if not isinstance(language_code, str) or not language_code.strip():
        raise ValueError("language_code must be a non-empty string")

    normalized = language_code.strip().lower().replace("_", "-")
    base_code = normalized.split("-", 1)[0]
    return base_code if base_code in SUPPORTED_LANGUAGE_CODES else normalized


def set_room_glossary(room_id: str, glossary: dict[str, str]) -> None:
    """Creates or replaces the in-memory glossary for one meeting room."""
    normalized_room_id = _normalize_room_id(room_id)
    if not isinstance(glossary, dict):
        raise TypeError("glossary must be a dictionary")
    if len(glossary) > MAX_ROOM_GLOSSARY_TERMS:
        raise ValueError(f"glossary cannot contain more than {MAX_ROOM_GLOSSARY_TERMS} terms")

    normalized_glossary: dict[str, str] = {}
    for source_term, target_term in glossary.items():
        if not isinstance(source_term, str) or not isinstance(target_term, str):
            raise ValueError("glossary terms and translations must be strings")

        clean_source = source_term.strip()
        clean_target = target_term.strip()
        if not clean_source or not clean_target:
            raise ValueError("glossary terms and translations cannot be empty")
        if len(clean_source) > MAX_GLOSSARY_TERM_LENGTH:
            raise ValueError(
                f"glossary terms cannot exceed {MAX_GLOSSARY_TERM_LENGTH} characters"
            )
        if len(clean_target) > MAX_GLOSSARY_TRANSLATION_LENGTH:
            raise ValueError(
                "glossary translations cannot exceed "
                f"{MAX_GLOSSARY_TRANSLATION_LENGTH} characters"
            )
        normalized_glossary[clean_source] = clean_target

    with _room_glossaries_lock:
        _room_glossaries[normalized_room_id] = normalized_glossary


def get_room_glossary(room_id: str) -> dict[str, str]:
    """Returns a defensive copy of a room glossary."""
    normalized_room_id = _normalize_room_id(room_id)
    with _room_glossaries_lock:
        return dict(_room_glossaries.get(normalized_room_id, {}))


def clear_room_glossary(room_id: str) -> None:
    """Removes the in-memory glossary for one meeting room."""
    normalized_room_id = _normalize_room_id(room_id)
    with _room_glossaries_lock:
        _room_glossaries.pop(normalized_room_id, None)


def _merge_glossaries(
    default_glossary: dict[str, str],
    room_glossary: dict[str, str],
) -> dict[str, str]:
    """Merges terms case-insensitively, with room mappings taking priority."""
    room_keys = {term.casefold() for term in room_glossary}
    merged = {
        term: translation
        for term, translation in default_glossary.items()
        if term.casefold() not in room_keys
    }
    merged.update(room_glossary)
    return merged


class GlossaryManager:
    """
    Meeting- and domain-aware glossary system supporting:
    - Vietnamese <-> Japanese (vi -> ja, ja -> vi)
    - Domain filtering (engineering, business, general)
    - Named entity, acronym, and technical identifier preservation
    - Configurable glossary overrides and versioning
    """

    def __init__(self, glossary_path: Optional[str] = None, version: Optional[str] = None):
        self.glossary_path = Path(glossary_path or settings.TRANSLATION_GLOSSARY_PATH) if (glossary_path or settings.TRANSLATION_GLOSSARY_PATH) else DEFAULT_GLOSSARY_PATH
        self.version = version or settings.TRANSLATION_GLOSSARY_VERSION
        self._data: dict[str, Any] = {}
        self._preserved_terms: set[str] = set()
        self._glossaries: dict[str, dict[str, dict[str, str]]] = {}
        self.load()

    def load(self):
        """Loads or reloads glossary from disk."""
        if not self.glossary_path.exists():
            logger.warning("Glossary file %s not found. Falling back to default glossary.", self.glossary_path)
            self.glossary_path = DEFAULT_GLOSSARY_PATH

        try:
            with open(self.glossary_path, "r", encoding="utf-8") as f:
                self._data = json.load(f)
                self.version = self._data.get("version", self.version)
                self._preserved_terms = set(self._data.get("preserved_terms", []))
                self._glossaries = self._data.get("glossaries", {})
            logger.info("Loaded glossary v%s from %s (%d preserved terms)", self.version, self.glossary_path.name, len(self._preserved_terms))
        except Exception as ex:
            logger.error("Failed to load glossary from %s: %s", self.glossary_path, ex)
            self._data = {}
            self._preserved_terms = set()
            self._glossaries = {}

    def get_version(self) -> str:
        return self.version

    def get_stats(self) -> dict[str, Any]:
        """Returns metadata and statistics about the active glossary."""
        pair_stats = {}
        for pair_key, domains in self._glossaries.items():
            pair_stats[pair_key] = {
                domain: len(terms) for domain, terms in domains.items()
            }
        return {
            "version": self.version,
            "filename": self.glossary_path.name,
            "preserved_terms_count": len(self._preserved_terms),
            "language_pairs": list(self._glossaries.keys()),
            "domain_term_counts": pair_stats,
        }

    def get_pair_key(self, source_lang: str, target_lang: str) -> str:
        source_code = normalize_language_code(source_lang)
        target_code = normalize_language_code(target_lang)
        return f"{source_code}_{target_code}"

    def get_relevant_glossary(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        domain: str = "general",
        terminology_sensitivity: str = "normal",
        room_id: Optional[str] = None,
    ) -> dict[str, str]:
        """
        Extracts only relevant glossary terms present in the input text.
        Searches matching language pair and requested domain (plus 'general' fallback).
        """
        pair_key = self.get_pair_key(source_lang, target_lang)
        pair_dict = self._glossaries.get(pair_key, {})

        text_lower = text.lower()
        matched: dict[str, str] = {}

        # 1. Search domain-specific terms
        domain_clean = (domain or "general").lower()
        candidate_domains = [domain_clean]
        if domain_clean != "general":
            candidate_domains.append("general")
        # If high sensitivity, also check engineering
        if terminology_sensitivity == "high" and "engineering" not in candidate_domains:
            candidate_domains.insert(0, "engineering")

        for d in candidate_domains:
            terms = pair_dict.get(d, {})
            for src_term, tgt_term in terms.items():
                if src_term.lower() in text_lower:
                    matched[src_term] = tgt_term

        room_glossary = get_room_glossary(room_id) if room_id else {}
        relevant_room_glossary = {
            source_term: target_term
            for source_term, target_term in room_glossary.items()
            if source_term.lower() in text_lower
        }
        return _merge_glossaries(matched, relevant_room_glossary)

    def get_preserved_entities(self, text: str) -> list[str]:
        """
        Identifies entities that must NOT be altered or mistranslated:
        - Registered product / tech names (e.g. LiveKit, PostgreSQL)
        - Uppercase acronyms (e.g. API, JWT, VAD, PR)
        - CamelCase or snake_case identifiers
        """
        preserved = []

        # 1. Predefined preserved terms
        for term in self._preserved_terms:
            if re.search(r"\b" + re.escape(term) + r"\b", text, re.IGNORECASE):
                # Preserve original casing in text
                preserved.append(term)

        # 2. Uppercase acronyms
        for match in ACRONYM_REGEX.finditer(text):
            val = match.group()
            if len(val) >= 2 and val not in preserved:
                preserved.append(val)

        # 3. CamelCase identifiers
        for match in CAMEL_CASE_REGEX.finditer(text):
            val = match.group()
            if val not in preserved:
                preserved.append(val)

        # 4. Snake_case identifiers
        for match in SNAKE_CASE_REGEX.finditer(text):
            val = match.group()
            if val not in preserved:
                preserved.append(val)

        return preserved

    def protect_entities(self, text: str) -> tuple[str, dict[str, str]]:
        """
        Replaces preserved entities with unique tokens to protect them during translation.
        Returns (protected_text, token_mapping).
        """
        entities = self.get_preserved_entities(text)
        if not entities:
            return text, {}

        # Sort longer entities first to prevent substring collision
        entities.sort(key=len, reverse=True)
        token_map: dict[str, str] = {}
        protected_text = text

        for idx, entity in enumerate(entities):
            token = f"__ENTITY_{idx}__"
            # Word boundary regex replacement
            pattern = re.compile(r"\b" + re.escape(entity) + r"\b")
            if pattern.search(protected_text):
                protected_text = pattern.sub(token, protected_text)
                token_map[token] = entity

        return protected_text, token_map

    def restore_entities(self, text: str, token_map: dict[str, str]) -> str:
        """Restores protected entity placeholders back to their original values."""
        if not token_map:
            return text
        restored = text
        for token, original in token_map.items():
            restored = restored.replace(token, original)
            # Handle potential lowercase or spaced variants from translation providers
            restored = re.sub(re.escape(token), original, restored, flags=re.IGNORECASE)
            token_index = re.search(r"(\d+)", token)
            if token_index:
                translated_token_pattern = re.compile(
                    r"[_＿]{1,2}\s*"
                    r"(?:ENTITY|THỰC[\s_]*THỂ|エンティティ|실체|实体|實體|ENTITÉ|ENTITÄT|ENTIDAD|"
                    r"[A-ZÀ-Ỹa-zà-ỹ\u3040-\u30ff\u4e00-\u9fff]+)"
                    r"(?:\s*[_＿]\s*|\s+)"
                    + re.escape(token_index.group(1))
                    + r"\s*[_＿]{1,2}",
                    flags=re.IGNORECASE,
                )
                restored = translated_token_pattern.sub(original, restored)
        return restored

    def apply_glossary(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        domain: str = "general",
        room_id: Optional[str] = None,
    ) -> str:
        """
        Applies default and room-specific glossary replacements on text.
        Longer source keys are replaced first.
        """
        glossary = self.get_relevant_glossary(
            text,
            source_lang,
            target_lang,
            domain=domain,
            room_id=room_id,
        )
        if not glossary:
            return text

        sorted_terms = sorted(glossary.items(), key=lambda kv: len(kv[0]), reverse=True)
        result = text
        for src_term, tgt_term in sorted_terms:
            pattern = re.compile(re.escape(src_term), re.IGNORECASE)
            result = pattern.sub(tgt_term, result)
        return result

    def enforce_target_terms(
        self,
        translated_text: str,
        glossary: dict[str, str],
        target_lang: str = "ja",
    ) -> str:
        """
        Normalizes translated text to ensure standard IT/business terminology.
        For example in Japanese: transforms literal machine-translation variants
        (e.g., 展開 -> デプロイ, 試験/検査 -> テスト) into the preferred glossary term.
        """
        if not translated_text or not glossary:
            return translated_text

        JA_LITERAL_NORMALIZATION = {
            "デプロイ": ["展開する", "展開"],
            "テスト": ["試験", "検査"],
            "レイテンシ": ["遅延時間", "待ち時間"],
            "マイクロサービス": ["微小サービス"],
            "キャッシュ": ["隠し場所", "一時記憶"],
        }

        result = translated_text
        if target_lang.lower() == "ja":
            for preferred_term in glossary.values():
                literal_variants = JA_LITERAL_NORMALIZATION.get(preferred_term, [])
                for variant in literal_variants:
                    if variant in result:
                        result = result.replace(variant, preferred_term)

        return result


_default_glossary_manager = GlossaryManager()


def apply_glossary(
    text: str,
    source_lang: str,
    target_lang: str,
    domain: str = "general",
    room_id: Optional[str] = None,
) -> str:
    """Applies the shared default glossary plus an optional room override."""
    return _default_glossary_manager.apply_glossary(
        text,
        source_lang,
        target_lang,
        domain=domain,
        room_id=room_id,
    )
