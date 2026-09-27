import logging
from typing import Any
import httpx
from app.config.settings import settings

logger = logging.getLogger("ai_service.laya")

# Standardized questions schema for System 1 meeting decision engine
MEETING_QUESTIONS: dict[str, Any] = {
    "action_item": {
        "type": "noul",
        "instructions": "Does this statement assign a task, deliverable, action item, or deadline to someone?",
        "criteria": {
            "false": "casual chat, greeting, status report, or questions without task assignment",
            "true": "explicit or implicit assignment of a task, promise to do something, or setting a deadline",
        },
    },
    "decision_made": {
        "type": "noul",
        "instructions": "Does this statement confirm a final decision, agreement, or consensus?",
        "criteria": {
            "false": "debate, proposal, suggestion, or brainstorming without final consensus",
            "true": "explicit confirmation of a choice, approval, agreement, or closing of a debate",
        },
    },
}


class LayaDecisionClient:
    """
    Sub-35ms System 1 Decision Client connecting to laya-serve.
    Enriches real-time meeting subtitles with Action Items and Decision tags.
    """

    def __init__(
        self,
        base_url: str | None = None,
        confidence_threshold: float | None = None,
        enabled: bool | None = None,
    ):
        self.base_url = (base_url or settings.LAYA_SERVICE_URL).rstrip("/")
        self.threshold = (
            confidence_threshold
            if confidence_threshold is not None
            else settings.LAYA_CONFIDENCE_THRESHOLD
        )
        self.enabled = enabled if enabled is not None else settings.LAYA_ENABLED
        self._http_client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(1.0, connect=0.5),
            )
        return self._http_client

    async def close(self):
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None

    async def classify_sentence(
        self,
        text: str,
        custom_threshold: float | None = None,
    ) -> tuple[list[str], float]:
        """
        Evaluate a completed subtitle sentence against Action Item and Decision rubrics.
        Returns:
            (tags, highest_probability)
            e.g. (["action_item"], 0.91) or ([], 0.23)
        """
        if not self.enabled or not text or len(text.strip()) < 5:
            return [], 0.0

        threshold = custom_threshold if custom_threshold is not None else self.threshold

        payload = {
            "state": {"body": text.strip()},
            "questions": MEETING_QUESTIONS,
            "model": "multilingual",
        }

        try:
            client = await self._get_client()
            # Compatible with laya-serve Jev-compatible /v1/systemone endpoint
            response = await client.post("/v1/systemone", json=payload)
            if response.status_code != 200:
                logger.warning(
                    "Laya server returned status %s for text: %s",
                    response.status_code,
                    text[:40],
                )
                return [], 0.0

            data = response.json()
            answers = data.get("answers", {})

            tags: list[str] = []
            max_prob = 0.0

            # 1. Action Item check
            action_ans = answers.get("action_item", {})
            action_prob = float(action_ans.get("noul", 0.0))
            if action_prob >= threshold:
                tags.append("action_item")
                max_prob = max(max_prob, action_prob)

            # 2. Decision check
            decision_ans = answers.get("decision_made", {})
            decision_prob = float(decision_ans.get("noul", 0.0))
            if decision_prob >= threshold:
                tags.append("decision")
                max_prob = max(max_prob, decision_prob)

            if tags:
                logger.info(
                    "Laya tagged sentence tags=%s prob=%.2f text='%s'",
                    tags,
                    max_prob,
                    text[:50],
                )

            return tags, round(max_prob, 3)

        except Exception as ex:
            # Fallback gracefully so meeting subtitles never stutter or freeze
            logger.debug("Laya service unavailable or timed out: %s", ex)
            return [], 0.0
