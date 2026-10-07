import json
import re
import threading
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from app.config.settings import settings
from app.translation.cache import TranslationCache
from app.translation.dataset_collector import JsonlDatasetStorage


LEARNED_PATTERNS: dict[tuple[str, str, str], dict[str, Any]] = {}

_EMAIL_RE = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+", re.IGNORECASE)
_AMOUNT_RE = re.compile(
    r"(?<!\w)(?:[$¥€£]\s*\d[\d.,]*|\d[\d.,]*\s*(?:k|tr|triệu|tỷ|usd|vnd|jpy|đ|₫|\$|¥|€|£))(?!\w)",
    re.IGNORECASE,
)
_PHONE_RE = re.compile(
    r"(?<!\w)(?:\+\d{1,3}[\s.-]?(?:\d{2,4}[\s.-]?){2,4}\d{3,4}|0(?:[\s.-]?\d){8,10})(?!\w)"
)
_LONG_NUMBER_RE = re.compile(r"(?<!\d)\d{8,}(?!\d)")

_PROVIDER_RELIABILITY = {
    "learned_pattern": 99.0,
    "glossary": 99.0,
    "premium_ai": 97.0,
    "cache": 95.0,
    "google_gtx": 92.0,
    "mymemory": 86.0,
    "offline_pattern": 74.0,
    "tagged_fallback": 25.0,
}


def scrub_pii(text: str) -> tuple[str, bool]:
    """Redacts supported PII without retaining the matched values."""
    scrubbed = str(text or "")
    original = scrubbed
    for pattern, replacement in (
        (_EMAIL_RE, "[EMAIL]"),
        (_AMOUNT_RE, "[AMOUNT]"),
        (_PHONE_RE, "[PHONE]"),
        (_LONG_NUMBER_RE, "[NUMBER]"),
    ):
        scrubbed = pattern.sub(replacement, scrubbed)
    return scrubbed, scrubbed != original


def compute_translation_accuracy(
    *,
    source_text: str,
    translated_text: str,
    source_lang: str,
    target_lang: str,
    stt_confidence: Optional[float] = None,
    provider: str = "offline_pattern",
) -> dict[str, Any]:
    """Produces a bounded heuristic score without persisting customer text."""
    confidence = stt_confidence
    if confidence is None or not 0.0 <= confidence <= 1.0:
        confidence = 0.88 if str(source_text or "").strip() else 0.0
    stt_score = confidence * 100.0

    provider_key = str(provider or "offline_pattern").strip().lower()
    reliability_score = _PROVIDER_RELIABILITY.get(provider_key, 74.0)

    source = str(source_text or "").strip()
    translated = str(translated_text or "").strip()
    sanity_score = 100.0
    issues: list[str] = []
    if not translated:
        sanity_score = 0.0
        issues.append("empty_output")
    elif re.match(r"^\[[A-Z_-]{2,16}\]\s*", translated):
        sanity_score = 20.0
        issues.append("tagged_fallback")
    elif (
        str(source_lang).strip().lower() != str(target_lang).strip().lower()
        and len(source) > 4
        and source.casefold() == translated.casefold()
    ):
        sanity_score = 30.0
        issues.append("unchanged_output")

    score = (stt_score * 0.35) + (reliability_score * 0.40) + (sanity_score * 0.25)
    return {
        "accuracyScore": round(max(0.0, min(100.0, score)), 2),
        "sttConfidencePct": round(stt_score, 2),
        "providerReliabilityPct": reliability_score,
        "outputSanityPct": sanity_score,
        "issues": issues,
    }


class TranslationQaManager:
    """Owns zero-text telemetry and explicitly opted-in training records."""

    def __init__(
        self,
        *,
        storage: Optional[JsonlDatasetStorage] = None,
        cache: Optional[TranslationCache] = None,
        learned_patterns_path: Optional[Path] = None,
        qa_training_mode_enabled: Optional[bool] = None,
    ) -> None:
        self._lock = threading.RLock()
        self._meeting_stats: dict[str, dict[str, Any]] = {}
        self._samples: list[dict[str, Any]] = []
        self.qa_training_mode_enabled = (
            settings.TRANSLATION_DATASET_COLLECTION_ENABLED
            if qa_training_mode_enabled is None
            else qa_training_mode_enabled
        )
        self.storage = storage or JsonlDatasetStorage()
        self.cache = cache or TranslationCache()
        self.learned_patterns_path = learned_patterns_path or (
            Path(settings.TRANSLATION_DATASET_STORAGE_DIR) / "learned_patterns.json"
        )
        self._load_learned_patterns()

    @staticmethod
    def _key(source_lang: str, target_lang: str, source_text: str) -> tuple[str, str, str]:
        scrubbed_source, _ = scrub_pii(source_text)
        return (
            str(source_lang or "").strip().lower(),
            str(target_lang or "").strip().lower(),
            scrubbed_source.strip().casefold(),
        )

    def _load_learned_patterns(self) -> None:
        if not self.learned_patterns_path.exists():
            return
        try:
            payload = json.loads(self.learned_patterns_path.read_text(encoding="utf-8"))
            records = payload if isinstance(payload, list) else payload.get("patterns", [])
            with self._lock:
                for record in records:
                    if not isinstance(record, dict):
                        continue
                    key = self._key(
                        record.get("sourceLanguage", ""),
                        record.get("targetLanguage", ""),
                        record.get("sourceText", ""),
                    )
                    if all(key) and str(record.get("translation", "")).strip():
                        LEARNED_PATTERNS[key] = record
        except (OSError, ValueError, TypeError):
            # A damaged optional training file must never interrupt subtitles.
            return

    def _persist_learned_patterns(self) -> None:
        self.learned_patterns_path.parent.mkdir(parents=True, exist_ok=True)
        records = self.get_learned_patterns()
        temp_path = self.learned_patterns_path.with_suffix(".tmp")
        temp_path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temp_path.replace(self.learned_patterns_path)

    async def record_segment(
        self,
        *,
        meeting_code: str,
        source_lang: str,
        target_lang: str,
        source_text: str,
        translated_text: str,
        stt_confidence: Optional[float] = None,
        provider: str = "offline_pattern",
        latency_ms: float = 0.0,
        cache_hit: bool = False,
        domain: str = "general",
        force_sample: bool = False,
    ) -> dict[str, Any]:
        evaluation = compute_translation_accuracy(
            source_text=source_text,
            translated_text=translated_text,
            source_lang=source_lang,
            target_lang=target_lang,
            stt_confidence=stt_confidence,
            provider=provider,
        )
        meeting = str(meeting_code or "default").strip() or "default"
        language_pair = f"{source_lang.strip().lower()}→{target_lang.strip().lower()}"
        provider_key = str(provider or "offline_pattern").strip().lower()

        with self._lock:
            stats = self._meeting_stats.setdefault(
                meeting,
                {
                    "meetingCode": meeting,
                    "totalSegments": 0,
                    "accuracyTotal": 0.0,
                    "sttConfidenceTotal": 0.0,
                    "latencyTotal": 0.0,
                    "cacheHits": 0,
                    "flaggedLowConfidenceCount": 0,
                    "languagePairs": set(),
                    "engineBreakdown": Counter(),
                },
            )
            stats["totalSegments"] += 1
            stats["accuracyTotal"] += evaluation["accuracyScore"]
            stats["sttConfidenceTotal"] += evaluation["sttConfidencePct"]
            stats["latencyTotal"] += max(0.0, float(latency_ms or 0.0))
            stats["cacheHits"] += int(bool(cache_hit or provider_key == "cache"))
            stats["flaggedLowConfidenceCount"] += int(
                evaluation["accuracyScore"] < 70.0 or evaluation["sttConfidencePct"] < 60.0
            )
            stats["languagePairs"].add(language_pair)
            stats["engineBreakdown"][provider_key] += 1

        if self.qa_training_mode_enabled or force_sample:
            scrubbed_source, source_scrubbed = scrub_pii(source_text)
            scrubbed_translation, translation_scrubbed = scrub_pii(translated_text)
            sample = {
                "id": str(uuid4()),
                "meetingId": meeting,
                "source": scrubbed_source,
                "machineTranslation": scrubbed_translation,
                "correctedTranslation": None,
                "sourceLanguage": source_lang.strip().lower(),
                "targetLanguage": target_lang.strip().lower(),
                "domain": domain or "general",
                "provider": provider_key,
                "latencyMs": round(max(0.0, float(latency_ms or 0.0)), 2),
                "accuracyScore": evaluation["accuracyScore"],
                "piiScrubbed": source_scrubbed or translation_scrubbed,
                "status": "pending",
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            with self._lock:
                self._samples.append(sample)
            await self.storage.save_pair(dict(sample))

        return evaluation

    @staticmethod
    def _public_stats(stats: dict[str, Any]) -> dict[str, Any]:
        count = stats["totalSegments"]
        return {
            "meetingCode": stats["meetingCode"],
            "avgAccuracyPct": round(stats["accuracyTotal"] / count, 2) if count else 0.0,
            "avgSttConfidencePct": round(stats["sttConfidenceTotal"] / count, 2) if count else 0.0,
            "totalSegments": count,
            "avgLatencyMs": round(stats["latencyTotal"] / count, 2) if count else 0.0,
            "cacheHitRatePct": round((stats["cacheHits"] / count) * 100.0, 2) if count else 0.0,
            "flaggedLowConfidenceCount": stats["flaggedLowConfidenceCount"],
            "languagePairs": sorted(stats["languagePairs"]),
            "engineBreakdown": dict(stats["engineBreakdown"]),
        }

    def get_summary(self) -> dict[str, Any]:
        with self._lock:
            meetings = [self._public_stats(stats) for stats in self._meeting_stats.values()]
        total = sum(item["totalSegments"] for item in meetings)
        if total:
            weighted_accuracy = sum(item["avgAccuracyPct"] * item["totalSegments"] for item in meetings) / total
            weighted_confidence = sum(item["avgSttConfidencePct"] * item["totalSegments"] for item in meetings) / total
            weighted_latency = sum(item["avgLatencyMs"] * item["totalSegments"] for item in meetings) / total
            weighted_cache = sum(item["cacheHitRatePct"] * item["totalSegments"] for item in meetings) / total
        else:
            weighted_accuracy = weighted_confidence = weighted_latency = weighted_cache = 0.0
        return {
            "avgAccuracyPct": round(weighted_accuracy, 2),
            "avgSttConfidencePct": round(weighted_confidence, 2),
            "totalSegments": total,
            "avgLatencyMs": round(weighted_latency, 2),
            "cacheHitRatePct": round(weighted_cache, 2),
            "flaggedLowConfidenceCount": sum(item["flaggedLowConfidenceCount"] for item in meetings),
            "qaTrainingModeEnabled": self.qa_training_mode_enabled,
            "learnedPatternsCount": len(self.get_learned_patterns()),
            "meetings": sorted(meetings, key=lambda item: item["meetingCode"]),
        }

    def get_samples(self, meeting_id: Optional[str] = None) -> list[dict[str, Any]]:
        with self._lock:
            samples = [dict(sample) for sample in self._samples]
        if meeting_id:
            samples = [sample for sample in samples if sample["meetingId"] == meeting_id]
        return samples

    def get_learned_patterns(self) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(record) for _, record in sorted(LEARNED_PATTERNS.items())]

    def get_learned_translation(
        self,
        source_lang: str,
        target_lang: str,
        source_text: str,
    ) -> Optional[str]:
        with self._lock:
            record = LEARNED_PATTERNS.get(self._key(source_lang, target_lang, source_text))
            return str(record["translation"]) if record else None

    async def train_pattern(
        self,
        source_lang: str,
        target_lang: str,
        source_text: str,
        corrected_translation: str,
        domain: str = "general",
        sample_id: Optional[str] = None,
    ) -> dict[str, Any]:
        scrubbed_source, _ = scrub_pii(source_text)
        scrubbed_translation, _ = scrub_pii(corrected_translation)
        key = self._key(source_lang, target_lang, scrubbed_source)
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "id": sample_id or str(uuid4()),
            "sourceLanguage": key[0],
            "targetLanguage": key[1],
            "sourceText": scrubbed_source.strip(),
            "normalizedSourceText": key[2],
            "translation": scrubbed_translation.strip(),
            "domain": (domain or "general").strip() or "general",
            "status": "trained",
            "trainedAt": now,
        }
        with self._lock:
            LEARNED_PATTERNS[key] = record
            for sample in self._samples:
                if sample_id and sample["id"] == sample_id:
                    sample["status"] = "trained"
                    sample["correctedTranslation"] = scrubbed_translation.strip()
        self._persist_learned_patterns()

        for provider_version in ("default", settings.TRANSLATION_MODEL):
            cache_key = self.cache.build_general_key(
                key[0], key[1], key[2], provider_version=provider_version
            )
            await self.cache.set(cache_key, record["translation"])

        dataset_record = {
            "id": record["id"],
            "meetingId": "admin",
            "source": record["sourceText"],
            "machineTranslation": record["translation"],
            "correctedTranslation": record["translation"],
            "sourceLanguage": key[0],
            "targetLanguage": key[1],
            "domain": record["domain"],
            "provider": "learned_pattern",
            "status": "trained",
            "createdAt": now,
        }
        await self.storage.save_pair(dataset_record)
        return dict(record)

    def remove_pattern(self, source_lang: str, target_lang: str, source_text: str) -> bool:
        with self._lock:
            removed = LEARNED_PATTERNS.pop(
                self._key(source_lang, target_lang, source_text), None
            )
        if removed is not None:
            self._persist_learned_patterns()
        return removed is not None

    async def export_jsonl(self) -> str:
        records: list[dict[str, Any]] = self.get_learned_patterns()
        persisted = await self.storage.get_pairs(limit=100_000)
        seen = {str(record.get("id")) for record in records}
        records.extend(record for record in persisted if str(record.get("id")) not in seen)
        return "".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records)


qa_manager = TranslationQaManager()
