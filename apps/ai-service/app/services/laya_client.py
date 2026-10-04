import asyncio
import logging
import re
from typing import Any, Optional
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
    "critical_risk": {
        "type": "noul",
        "instructions": "Does this statement announce a severe technical outage, security vulnerability, critical blocker, or major project failure?",
        "criteria": {
            "false": "normal operational discussions, minor issues, routine questions",
            "true": "production outage, critical blocker, security vulnerability, severe risk",
        },
    },
    "unanswered_question": {
        "type": "noul",
        "instructions": "Does this statement ask an open or direct question requiring clarification or response from another participant?",
        "criteria": {
            "false": "statements, answers, rhetorical remarks, polite greetings",
            "true": "direct question, clarification inquiry, request for status or explanation",
        },
    },
}

DOMAIN_QUESTIONS: dict[str, Any] = {
    "is_engineering": {
        "type": "noul",
        "instructions": "Does this statement discuss software development, system architecture, database, servers, deployment, or code?",
        "criteria": {
            "false": "business terms, casual chat, greetings",
            "true": "software, hardware, cloud, coding, database, API, deployment, bug fix",
        },
    },
    "is_business": {
        "type": "noul",
        "instructions": "Does this statement discuss contracts, budgets, deadlines, deliverables, or business agreements?",
        "criteria": {
            "false": "technical architecture or casual chit-chat",
            "true": "budget, contracts, deadlines, deliverables, milestones, business planning",
        },
    },
    "terminology_sensitive": {
        "type": "noul",
        "instructions": "Does this statement contain strict acronyms, exact product names, or technical jargon?",
        "criteria": {
            "false": "common everyday conversation",
            "true": "specific acronyms, system names, product names, or technical parameters",
        },
    },
}


class LayaDecisionClient:
    """
    Sub-35ms System 1 Decision Client connecting to laya-serve.
    Enriches real-time meeting subtitles with Action Items, Decisions, Critical Risks, and Questions.
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
        Evaluate a completed subtitle sentence against Action Item, Decision, Risk, and Question rubrics.
        Returns:
            (tags, highest_probability)
            e.g. (["action_item"], 0.91) or (["critical_risk", "decision"], 0.88)
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
                    "Laya server returned status %s",
                    response.status_code,
                )
                return [], 0.0

            data = response.json()
            answers = data.get("answers", {})

            tags: list[str] = []
            max_prob = 0.0

            # 1. Action Item check
            action_ans = answers.get("action_item", {})
            action_prob = float(action_ans.get("noul", action_ans.get("confidence", action_ans.get("answer_confidence", 0.0))))
            if action_prob >= threshold:
                tags.append("action_item")
                max_prob = max(max_prob, action_prob)

            # 2. Decision check
            decision_ans = answers.get("decision_made", {})
            decision_prob = float(decision_ans.get("noul", decision_ans.get("confidence", decision_ans.get("answer_confidence", 0.0))))
            if decision_prob >= threshold:
                tags.append("decision")
                max_prob = max(max_prob, decision_prob)

            # 3. Critical Risk check
            risk_ans = answers.get("critical_risk", {})
            risk_prob = float(risk_ans.get("noul", risk_ans.get("confidence", risk_ans.get("answer_confidence", 0.0))))
            if risk_prob >= threshold:
                tags.append("critical_risk")
                max_prob = max(max_prob, risk_prob)

            # 4. Question check
            q_ans = answers.get("unanswered_question", {})
            q_prob = float(q_ans.get("noul", q_ans.get("confidence", q_ans.get("answer_confidence", 0.0))))
            if q_prob >= threshold:
                tags.append("question")
                max_prob = max(max_prob, q_prob)

            if tags:
                logger.info(
                    "Laya tagged sentence tags=%s prob=%.2f",
                    tags,
                    max_prob,
                )

            return tags, round(max_prob, 3)

        except Exception:
            # Fallback gracefully so meeting subtitles never stutter or freeze
            logger.debug("Laya service unavailable or timed out")
            return [], 0.0

    def classify_sentence_locally(
        self,
        text: str,
        threshold: float = 0.80,
    ) -> tuple[list[str], float]:
        """
        Fast zero-latency heuristic evaluation when Laya container is offline or in fast-path.
        """
        if not text or len(text.strip()) < 5:
            return [], 0.0

        clean = text.strip()
        lower = clean.lower()
        tags: list[str] = []

        # Action Item heuristic
        if any(kw in lower for kw in ["sẽ làm", "cần làm", "giao cho", "nhớ gửi", "deadline", "trước 5h", "hôm nay", "ngày mai", "by eod", "明日まで"]):
            tags.append("action_item")

        # Decision heuristic
        if any(kw in lower for kw in ["thống nhất", "chốt phương án", "đồng ý", "quyết định", "phê duyệt", "agreed", "approved", "合意", "決定"]):
            tags.append("decision")

        # Critical Risk heuristic
        if any(kw in lower for kw in ["sập server", "outage", "lỗ hổng", "rủi ro nghiêm trọng", "down time", "blocker", "security breach", "障害"]):
            tags.append("critical_risk")

        # Question heuristic
        if clean.endswith("?") or any(kw in lower for kw in ["tại sao", "như thế nào", "khi nào", "ai phụ trách", "có thể... không", "how", "why", "what", "どうして"]):
            tags.append("question")

        prob = 0.85 if tags else 0.0
        return tags, prob

    async def classify_domain_and_terminology(
        self,
        text: str,
        timeout_ms: Optional[int] = None,
        default_domain: str = "general",
    ) -> tuple[str, str]:
        """
        Fast-path Laya classification for meeting domain and terminology sensitivity.
        Enforces a strict short timeout (default: settings.LAYA_CLASSIFICATION_TIMEOUT_MS).
        Guaranteed to return quickly without blocking translation or failing.

        Returns:
            (domain, terminology_sensitivity)
            e.g. ("engineering", "high") or ("business", "normal") or ("general", "normal")
        """
        heuristic_domain, sensitivity = self.classify_domain_locally(
            text,
            default_domain=default_domain,
        )
        if not text or not text.strip():
            return heuristic_domain, sensitivity

        clean_text = text.strip()

        classification_enabled = (
            self.enabled
            and getattr(settings, "LAYA_TRANSLATION_CLASSIFICATION_ENABLED", True)
        )
        if not classification_enabled:
            return heuristic_domain, sensitivity

        timeout_sec = (timeout_ms or getattr(settings, "LAYA_CLASSIFICATION_TIMEOUT_MS", 100)) / 1000.0

        async def _call_laya() -> tuple[str, str]:
            client = await self._get_client()
            payload = {
                "state": {"body": clean_text},
                "questions": DOMAIN_QUESTIONS,
                "model": "multilingual",
            }
            resp = await client.post("/v1/systemone", json=payload)
            if resp.status_code != 200:
                return heuristic_domain, sensitivity

            answers = resp.json().get("answers", {})
            eng_prob = float(answers.get("is_engineering", {}).get("noul", 0.0))
            biz_prob = float(answers.get("is_business", {}).get("noul", 0.0))
            term_prob = float(answers.get("terminology_sensitive", {}).get("noul", 0.0))

            detected_domain = heuristic_domain
            if eng_prob >= 0.70 and eng_prob > biz_prob:
                detected_domain = "engineering"
            elif biz_prob >= 0.70:
                detected_domain = "business"

            detected_sensitivity = "high" if (term_prob >= 0.70 or detected_domain == "engineering") else sensitivity
            return detected_domain, detected_sensitivity

        try:
            domain, sens = await asyncio.wait_for(_call_laya(), timeout=timeout_sec)
            return domain, sens
        except asyncio.TimeoutError:
            logger.debug("Laya domain classification timed out (>%dms). Using heuristic.", int(timeout_sec * 1000))
            return heuristic_domain, sensitivity
        except Exception:
            logger.debug("Laya domain classification failed; using heuristic")
            return heuristic_domain, sensitivity

    def classify_domain_locally(
        self,
        text: str,
        default_domain: str = "general",
    ) -> tuple[str, str]:
        """Classify domain without network I/O for the subtitle critical path."""
        if not text or not text.strip():
            return default_domain, "normal"

        clean_text = text.strip()
        lower_text = clean_text.lower()
        heuristic_domain = default_domain
        engineering_keywords = {
            "triển khai", "mã nguồn", "cơ sở dữ liệu", "kiểm thử", "độ trễ",
            "bộ nhớ đệm", "api", "database", "docker", "redis", "webrtc",
            "server", "websocket", "bug", "deploy", "code", "k8s", "git",
            "マイクロサービス", "デプロイ", "データベース", "キャッシュ"
        }
        business_keywords = {
            "hợp đồng", "thống nhất", "ngân sách", "thời hạn", "hạn chót",
            "tiến độ", "kế hoạch", "biên bản", "bàn giao", "quyết định",
            "contract", "deadline", "budget", "client", "milestone",
            "会議", "合意", "進捗", "締め切り", "予算"
        }

        if any(kw in lower_text for kw in engineering_keywords):
            heuristic_domain = "engineering"
        elif any(kw in lower_text for kw in business_keywords):
            heuristic_domain = "business"

        # Check terminology sensitivity
        has_acronym = bool(re.search(r"\b[A-Z0-9]{2,}\b", clean_text))
        sensitivity = "high" if (has_acronym or heuristic_domain == "engineering") else "normal"
        return heuristic_domain, sensitivity
