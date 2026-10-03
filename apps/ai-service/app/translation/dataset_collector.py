import asyncio
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from app.config.settings import settings

logger = logging.getLogger("ai_service.translation.dataset")


class DatasetStorage(ABC):
    """Abstract storage backend for collecting translation training pairs."""

    @abstractmethod
    async def save_pair(self, record: dict[str, Any]) -> str:
        """Stores a translation training pair and returns its identifier."""
        pass

    @abstractmethod
    async def get_pairs(
        self,
        meeting_id: Optional[str] = None,
        source_language: Optional[str] = None,
        target_language: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Retrieves collected pairs with optional filtering."""
        pass

    @abstractmethod
    async def update_correction(self, record_id: str, corrected_translation: str) -> bool:
        """Applies a human correction to a machine-translated record."""
        pass


class JsonlDatasetStorage(DatasetStorage):
    """
    JSONL-based storage backend for dataset collection.
    Appends training records to JSONL files partitioned by date/meeting.
    Supports asynchronous thread-safe write, human correction updates, and export.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.TRANSLATION_DATASET_STORAGE_DIR)
        self._lock = asyncio.Lock()
        self._ensure_dir()

    def _ensure_dir(self):
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except Exception as ex:
            logger.warning("Could not create dataset storage directory: %s", ex)

    def _get_file_path(self, date_str: str) -> Path:
        return self.base_dir / f"dataset_{date_str}.jsonl"

    async def save_pair(self, record: dict[str, Any]) -> str:
        record_id = record.get("id") or str(uuid4())
        record["id"] = record_id
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        file_path = self._get_file_path(date_str)

        async with self._lock:
            try:
                line = json.dumps(record, ensure_ascii=False) + "\n"
                with open(file_path, "a", encoding="utf-8") as f:
                    f.write(line)
                logger.debug("Saved translation pair record_id=%s to %s", record_id[:8], file_path.name)
                return record_id
            except Exception as ex:
                logger.error("Failed to write translation dataset record: %s", ex)
                return ""

    async def get_pairs(
        self,
        meeting_id: Optional[str] = None,
        source_language: Optional[str] = None,
        target_language: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        results = []
        async with self._lock:
            for file_path in sorted(self.base_dir.glob("dataset_*.jsonl"), reverse=True):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if not line:
                                continue
                            data = json.loads(line)
                            if meeting_id and data.get("meetingId") != meeting_id:
                                continue
                            if source_language and data.get("sourceLanguage") != source_language:
                                continue
                            if target_language and data.get("targetLanguage") != target_language:
                                continue
                            results.append(data)
                            if len(results) >= limit:
                                return results
                except Exception as ex:
                    logger.warning("Error reading dataset file %s: %s", file_path, ex)
        return results

    async def update_correction(self, record_id: str, corrected_translation: str) -> bool:
        """Locates record by id and writes corrected translation."""
        async with self._lock:
            for file_path in self.base_dir.glob("dataset_*.jsonl"):
                try:
                    updated = False
                    new_lines = []
                    with open(file_path, "r", encoding="utf-8") as f:
                        for line in f:
                            if not line.strip():
                                continue
                            data = json.loads(line)
                            if data.get("id") == record_id:
                                data["correctedTranslation"] = corrected_translation
                                data["correctedAt"] = datetime.now(timezone.utc).isoformat()
                                updated = True
                            new_lines.append(json.dumps(data, ensure_ascii=False) + "\n")
                    if updated:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.writelines(new_lines)
                        logger.info("Updated human correction for record_id=%s", record_id[:8])
                        return True
                except Exception as ex:
                    logger.error("Failed to update correction in %s: %s", file_path, ex)
        return False


class TranslationDatasetCollector:
    """
    Manages non-blocking collection of training examples.
    Audio is never captured or stored.
    Disabled by default when private data should not be persisted.
    """

    def __init__(
        self,
        storage: Optional[DatasetStorage] = None,
        enabled: Optional[bool] = None,
    ):
        self.enabled = (
            enabled if enabled is not None else settings.TRANSLATION_DATASET_COLLECTION_ENABLED
        )
        self.storage = storage or (JsonlDatasetStorage() if self.enabled else None)

    def record_async(
        self,
        meeting_id: str,
        context: list[dict[str, Any]],
        source_text: str,
        machine_translation: str,
        source_language: str,
        target_language: str,
        domain: str = "general",
        glossary_version: str = "1.0.0",
        provider: str = "contextual",
        latency_ms: float = 0.0,
    ) -> None:
        """Asynchronously records a translation example without blocking subtitles."""
        if not self.enabled or self.storage is None:
            return

        payload = {
            "id": str(uuid4()),
            "meetingId": meeting_id,
            "context": context,
            "source": source_text,
            "machineTranslation": machine_translation,
            "correctedTranslation": None,
            "sourceLanguage": source_language,
            "targetLanguage": target_language,
            "domain": domain,
            "glossaryVersion": glossary_version,
            "provider": provider,
            "latencyMs": round(latency_ms, 2),
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        # Fire and forget in event loop
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.storage.save_pair(payload))
        except RuntimeError:
            # Fallback if no loop is running
            asyncio.run(self.storage.save_pair(payload))
