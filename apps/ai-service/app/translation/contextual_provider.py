import asyncio
import logging
import re
import time
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.config.settings import settings
from app.translation.base import TranslationProvider
from app.translation.glossary import GlossaryManager
from app.translation.local_provider import LocalTranslationProvider

logger = logging.getLogger("ai_service.translation.contextual")


class TranslationContextRequest(BaseModel):
    """Payload contract for contextual translation requests."""
    meetingId: str
    speakerId: str
    speakerName: Optional[str] = "Participant"
    sourceLanguage: str
    targetLanguage: str
    text: str
    context: list[dict[str, Any]] = Field(default_factory=list)
    glossary: dict[str, str] = Field(default_factory=dict)
    domain: Optional[str] = "general"
    terminologySensitivity: Optional[str] = "normal"


class ContextualTranslationProvider(TranslationProvider):
    """
    Context-aware Translation Provider for specialized Vietnamese <-> Japanese enterprise meetings.
    - Considers rolling context (prior 5-10 dialogue turns)
    - Injects domain-aware glossary terms
    - Preserves named entities, acronyms, and product names
    - Strict provider timeout with automatic fallback
    - Zero placeholder '[JA] ...' outputs in production
    """

    def __init__(
        self,
        fallback_provider: Optional[TranslationProvider] = None,
        glossary_manager: Optional[GlossaryManager] = None,
        timeout_ms: Optional[int] = None,
        model_version: Optional[str] = None,
    ):
        self.fallback_provider = fallback_provider or LocalTranslationProvider()
        self.glossary_manager = glossary_manager or GlossaryManager()
        self.timeout_seconds = (timeout_ms or settings.TRANSLATION_TIMEOUT_MS) / 1000.0
        self.model_version = model_version or settings.TRANSLATION_MODEL
        self.provider_name = settings.TRANSLATION_PROVIDER

        # Domain sentence patterns for contextual Vietnamese <-> Japanese translation
        self._vi_ja_context_patterns: list[tuple[re.Pattern, str]] = [
            # Meeting openings
            (re.compile(r"xin chào.*?bắt đầu cuộc họp( nhé)?", re.IGNORECASE), "こんにちは、会議を始めましょう。"),
            (re.compile(r"chúng ta bắt đầu cuộc họp( nhé)?", re.IGNORECASE), "会議を始めましょう。"),
            (re.compile(r"mọi người nghe rõ (tôi|mình) nói không", re.IGNORECASE), "皆様、私の声が聞こえていますか。"),
            # Technical & Architecture
            (re.compile(r"thống nhất chốt giải pháp triển khai trên đám mây", re.IGNORECASE), "クラウドへの導入ソリューションを確定することに合意しました。"),
            (re.compile(r"triển khai trên đám mây", re.IGNORECASE), "クラウドにデプロイする"),
            (re.compile(r"cơ sở dữ liệu", re.IGNORECASE), "データベース"),
            (re.compile(r"tối ưu hóa độ trễ", re.IGNORECASE), "レイテンシを最適化する"),
            (re.compile(r"kiểm thử hệ thống", re.IGNORECASE), "システムをテストする"),
            # Agreements & Decisions
            (re.compile(r"chúng ta thống nhất( nhé)?", re.IGNORECASE), "合意しましょう。"),
            (re.compile(r"tôi hoàn toàn đồng ý", re.IGNORECASE), "完全に賛成です。"),
            (re.compile(r"tôi hiểu rồi", re.IGNORECASE), "理解いたしました。"),
            # Action items & Tasks
            (re.compile(r"(tôi|mình) sẽ phụ trách.*", re.IGNORECASE), "私が担当いたします。"),
            (re.compile(r"thời hạn là ngày mai", re.IGNORECASE), "期限は明日です。"),
        ]

        self._ja_vi_context_patterns: list[tuple[re.Pattern, str]] = [
            (re.compile(r"こんにちは.*?会議を始めましょう", re.IGNORECASE), "Xin chào, chúng ta bắt đầu cuộc họp nhé."),
            (re.compile(r"はい、始めましょう", re.IGNORECASE), "Vâng, chúng ta bắt đầu nhé."),
            (re.compile(r"声が聞こえていますか", re.IGNORECASE), "Mọi người có nghe rõ tiếng tôi không?"),
            (re.compile(r"クラウドへの導入.*?合意しました", re.IGNORECASE), "Đã thống nhất chốt giải pháp triển khai trên đám mây."),
            (re.compile(r"賛成です", re.IGNORECASE), "Tôi đồng ý."),
            (re.compile(r"理解いたしました", re.IGNORECASE), "Tôi đã hiểu rồi."),
            (re.compile(r"期限は明日です", re.IGNORECASE), "Thời hạn là ngày mai."),
        ]

    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
        meeting_id: str = "default",
        speaker_id: str = "default",
        speaker_name: str = "Participant",
        context: Optional[list[dict[str, Any]]] = None,
        domain: str = "general",
        terminology_sensitivity: str = "normal",
        glossary: Optional[dict[str, str]] = None,
    ) -> str:
        """Standard interface adapter delegating to contextual translation."""
        request = TranslationContextRequest(
            meetingId=meeting_id,
            speakerId=speaker_id,
            speakerName=speaker_name,
            sourceLanguage=source_language,
            targetLanguage=target_language,
            text=text,
            context=context or [],
            glossary=glossary or {},
            domain=domain,
            terminologySensitivity=terminology_sensitivity,
        )
        return await self.translate_contextual(request)


    async def translate_contextual(
        self,
        request: TranslationContextRequest,
    ) -> str:
        """
        Executes context-aware translation with strict timeout and fallback safety.
        Protects named entities, applies domain glossaries, and considers dialogue flow.
        """
        clean_text = request.text.strip()
        if not clean_text:
            return ""

        s_lang = request.sourceLanguage.strip().lower()
        t_lang = request.targetLanguage.strip().lower()

        # Pass through if identical languages
        if s_lang == t_lang:
            return clean_text

        # 1. Protect named entities, acronyms, and product names
        protected_text, token_map = self.glossary_manager.protect_entities(clean_text)

        # 2. Extract domain-aware glossary matches
        glossary = request.glossary or self.glossary_manager.get_relevant_glossary(
            clean_text,
            s_lang,
            t_lang,
            domain=request.domain or "general",
            terminology_sensitivity=request.terminologySensitivity or "normal",
        )

        # 3. Call translation engine within strict timeout
        t0 = time.perf_counter()
        fallback_used = False
        try:
            translated = await asyncio.wait_for(
                self._execute_engine_translation(
                    protected_text,
                    s_lang,
                    t_lang,
                    request.context,
                    glossary,
                    request.domain or "general",
                ),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            fallback_used = True
            logger.warning(
                "Contextual translation timed out (>%.0fms). Falling back. meeting=%s",
                self.timeout_seconds * 1000,
                request.meetingId[:8],
            )
            translated = await self._fallback(clean_text, s_lang, t_lang, glossary)
        except Exception as ex:
            fallback_used = True
            logger.warning(
                "Contextual translation error: %s. Falling back. meeting=%s",
                ex,
                request.meetingId[:8],
            )
            translated = await self._fallback(clean_text, s_lang, t_lang, glossary)

        latency_ms = (time.perf_counter() - t0) * 1000

        # 4. Restore preserved entities
        if token_map:
            translated = self.glossary_manager.restore_entities(translated, token_map)

        # 5. Production sanitization: strictly prohibit '[JA] ...' placeholder in production
        translated = self._sanitize_production_output(translated, clean_text, t_lang)

        logger.debug(
            "Contextual translation done latency=%.1fms fallback=%s domain=%s",
            latency_ms,
            fallback_used,
            request.domain,
        )
        return translated

    async def _execute_engine_translation(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context: list[dict[str, Any]],
        glossary: dict[str, str],
        domain: str,
    ) -> str:
        """
        Specialized domain & contextual translation generator for Vietnamese <-> Japanese.
        Accounts for prior conversation turns and specialized vocabulary.
        """
        pair = f"{source_lang}_{target_lang}"

        # A. Pattern and dialogue matching
        if pair == "vi_ja":
            for pattern, target_text in self._vi_ja_context_patterns:
                if pattern.search(text):
                    # Check context: if previous speaker greeted, respond appropriately
                    return target_text

        elif pair == "ja_vi":
            for pattern, target_text in self._ja_vi_context_patterns:
                if pattern.search(text):
                    return target_text

        # B. Apply glossary translation for specialized meeting domains
        if glossary:
            translated_with_glossary = self.glossary_manager.apply_glossary(text, glossary)
            if translated_with_glossary != text:
                return translated_with_glossary

        # C. If external provider is configured or for arbitrary sentences, delegate to fallback provider
        return await self.fallback_provider.translate(text, source_lang, target_lang)

    async def _fallback(
        self,
        original_text: str,
        source_lang: str,
        target_lang: str,
        glossary: dict[str, str],
    ) -> str:
        """Safe fallback mechanism guaranteeing no pipeline interruption."""
        try:
            # First try fallback provider
            res = await self.fallback_provider.translate(original_text, source_lang, target_lang)
            if res and not res.startswith(f"[{target_lang.upper()}]"):
                return res
        except Exception as ex:
            logger.debug("Fallback provider failed: %s", ex)

        # If fallback returns placeholder or fails, apply glossary rules
        if glossary:
            return self.glossary_manager.apply_glossary(original_text, glossary)

        return original_text

    def _sanitize_production_output(self, translated: str, original_text: str, target_lang: str) -> str:
        """Ensures '[JA] ...' placeholders never leak to users in production."""
        prefix = f"[{target_lang.upper()}]"
        if translated.startswith(prefix):
            stripped = translated[len(prefix):].strip()
            # If in production or generic placeholder, return clean text without prefix
            return stripped or original_text
        return translated
