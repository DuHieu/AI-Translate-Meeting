import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Optional

from app.config.settings import settings

logger = logging.getLogger("ai_service.translation.glossary")

DEFAULT_GLOSSARY_PATH = Path(__file__).parent / "glossaries" / "default_glossary.json"

# Regex patterns for identifying acronyms and technical identifiers
ACRONYM_REGEX = re.compile(r"\b[A-Z0-9]{2,}\b")
CAMEL_CASE_REGEX = re.compile(r"\b[a-z]+(?:[A-Z][a-z0-9]+)+\b|\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b")
SNAKE_CASE_REGEX = re.compile(r"\b[a-zA-Z0-9]+_[a-zA-Z0-9_]+\b")


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
        return f"{source_lang.strip().lower()}_{target_lang.strip().lower()}"

    def get_relevant_glossary(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        domain: str = "general",
        terminology_sensitivity: str = "normal",
    ) -> dict[str, str]:
        """
        Extracts only relevant glossary terms present in the input text.
        Searches matching language pair and requested domain (plus 'general' fallback).
        """
        pair_key = self.get_pair_key(source_lang, target_lang)
        pair_dict = self._glossaries.get(pair_key, {})
        if not pair_dict:
            return {}

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

        return matched

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
        return restored

    def apply_glossary(self, text: str, glossary: dict[str, str]) -> str:
        """
        Directly applies glossary replacements on text.
        Longer source keys are replaced first.
        """
        if not glossary:
            return text

        sorted_terms = sorted(glossary.items(), key=lambda kv: len(kv[0]), reverse=True)
        result = text
        for src_term, tgt_term in sorted_terms:
            pattern = re.compile(re.escape(src_term), re.IGNORECASE)
            result = pattern.sub(tgt_term, result)
        return result
