import asyncio
import logging
import re
import time
from contextvars import ContextVar
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.config.settings import settings
from app.translation.base import TranslationProvider
from app.translation.glossary import GlossaryManager, normalize_language_code
from app.translation.local_provider import LocalTranslationProvider
from app.translation.pii_firewall import TwoWayPiiFirewall
from app.translation.premium_provider import (
    PremiumTranslationConfig,
    PremiumTranslationProvider,
)
from app.translation.quota_manager import (
    TokenQuotaManager,
    quota_manager as default_quota_manager,
)
from app.translation import qa_evaluator

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
    translationTier: str = "standard"
    byokEnabled: bool = False
    byokProvider: str = "openai"
    byokApiKey: str = ""


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
        premium_provider: Optional[PremiumTranslationProvider] = None,
        quota_manager: Optional[TokenQuotaManager] = None,
    ):
        self.fallback_provider = fallback_provider or LocalTranslationProvider()
        self.glossary_manager = glossary_manager or GlossaryManager()
        self.timeout_seconds = (timeout_ms or settings.TRANSLATION_TIMEOUT_MS) / 1000.0
        self.model_version = model_version or settings.TRANSLATION_MODEL
        self.provider_name = settings.TRANSLATION_PROVIDER
        self._last_provider_name: ContextVar[str] = ContextVar(
            f"contextual_translation_provider_{id(self)}",
            default="offline_pattern",
        )
        self._last_provider_name_val: str = "offline_pattern"
        self.premium_provider = premium_provider or PremiumTranslationProvider()
        self.quota_manager = quota_manager or default_quota_manager

        # Domain sentence patterns for contextual Vietnamese <-> Japanese translation
        # Anchored to full-utterance matches so multi-clause sentences are never truncated to a single term
        self._vi_ja_context_patterns: list[tuple[re.Pattern, str]] = [
            # Meeting openings
            (re.compile(r"^\s*xin chào[,.\s]+(?:chúng ta\s+)?bắt đầu cuộc họp(?:\s+nhé)?[.!?。！？]*\s*$", re.IGNORECASE), "こんにちは、会議を始めましょう。"),
            (re.compile(r"^\s*chúng ta bắt đầu cuộc họp(?:\s+nhé)?[.!?。！？]*\s*$", re.IGNORECASE), "会議を始めましょう。"),
            (re.compile(r"^\s*mọi người (?:có\s+)?nghe rõ (?:tôi|mình) nói không[.!?。！？]*\s*$", re.IGNORECASE), "皆様、私の声が聞こえていますか。"),
            # Technical & Architecture (exact full-sentence or standalone-term utterances only)
            (re.compile(r"^\s*(?:chúng ta\s+)?thống nhất chốt giải pháp triển khai trên đám mây[.!?。！？]*\s*$", re.IGNORECASE), "クラウドへの導入ソリューションを確定することに合意しました。"),
            (re.compile(r"^\s*triển khai trên đám mây[.!?。！？]*\s*$", re.IGNORECASE), "クラウドにデプロイする"),
            (re.compile(r"^\s*cơ sở dữ liệu[.!?。！？]*\s*$", re.IGNORECASE), "データベース"),
            (re.compile(r"^\s*tối ưu hóa độ trễ[.!?。！？]*\s*$", re.IGNORECASE), "レイテンシを最適化する"),
            (re.compile(r"^\s*kiểm thử hệ thống[.!?。！？]*\s*$", re.IGNORECASE), "システムをテストする"),
            # Agreements & Decisions
            (re.compile(r"^\s*chúng ta thống nhất(?:\s+nhé)?[.!?。！？]*\s*$", re.IGNORECASE), "合意しましょう。"),
            (re.compile(r"^\s*tôi hoàn toàn đồng ý[.!?。！？]*\s*$", re.IGNORECASE), "完全に賛成です。"),
            (re.compile(r"^\s*tôi hiểu rồi[.!?。！？]*\s*$", re.IGNORECASE), "理解いたしました。"),
            # Action items & Tasks
            (re.compile(r"^\s*(?:tôi|mình) sẽ phụ trách(?:\s+việc này|\s+phần này)?[.!?。！？]*\s*$", re.IGNORECASE), "私が担当いたします。"),
            (re.compile(r"^\s*thời hạn là ngày mai[.!?。！？]*\s*$", re.IGNORECASE), "期限は明日です。"),
        ]

        self._ja_vi_context_patterns: list[tuple[re.Pattern, str]] = [
            (re.compile(r"^\s*こんにちは[、,.\s]*会議を始めましょう[。！？.!?]*\s*$", re.IGNORECASE), "Xin chào, chúng ta bắt đầu cuộc họp nhé."),
            (re.compile(r"^\s*はい[、,.\s]*始めましょう[。！？.!?]*\s*$", re.IGNORECASE), "Vâng, chúng ta bắt đầu nhé."),
            (re.compile(r"^\s*(?:皆様[、,.\s]*)?(?:私の)?声が聞こえていますか[。！？.!?]*\s*$", re.IGNORECASE), "Mọi người có nghe rõ tiếng tôi không?"),
            (re.compile(r"^\s*クラウドへの導入ソリューションを確定することに合意しました[。！？.!?]*\s*$", re.IGNORECASE), "Đã thống nhất chốt giải pháp triển khai trên đám mây."),
            (re.compile(r"^\s*(?:完全に)?賛成です[。！？.!?]*\s*$", re.IGNORECASE), "Tôi đồng ý."),
            (re.compile(r"^\s*理解いたしました[。！？.!?]*\s*$", re.IGNORECASE), "Tôi đã hiểu rồi."),
            (re.compile(r"^\s*期限は明日です[。！？.!?]*\s*$", re.IGNORECASE), "Thời hạn là ngày mai."),
        ]

        self._common_meeting_phrases: dict[tuple[str, str, str], str] = {
            ("vi", "en", "cảm ơn mọi người."): "Thank you, everyone.",
            ("vi", "ja", "cảm ơn mọi người."): "皆様、ありがとうございます。",
            ("en", "vi", "thank you, everyone."): "Cảm ơn mọi người.",
            ("en", "ja", "thank you, everyone."): "皆様、ありがとうございます。",
            ("ja", "vi", "皆様、ありがとうございます。"): "Cảm ơn mọi người.",
            ("ja", "en", "皆様、ありがとうございます。"): "Thank you, everyone.",
            ("vi", "en", "tôi đồng ý."): "I agree.",
            ("vi", "ja", "tôi đồng ý."): "賛成です。",
            ("en", "vi", "i agree."): "Tôi đồng ý.",
            ("en", "ja", "i agree."): "賛成です。",
            ("ja", "vi", "賛成です。"): "Tôi đồng ý.",
            ("ja", "en", "賛成です。"): "I agree.",
        }

    @property
    def last_provider_name(self) -> str:
        var_val = self._last_provider_name.get()
        if var_val != "offline_pattern":
            return var_val
        return self._last_provider_name_val

    @last_provider_name.setter
    def last_provider_name(self, value: str) -> None:
        self._last_provider_name_val = value
        try:
            self._last_provider_name.set(value)
        except Exception:
            pass

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
        translation_tier: str = "standard",
        byok_enabled: bool = False,
        byok_provider: str = "openai",
        byok_api_key: str = "",
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
            translationTier=translation_tier,
            byokEnabled=byok_enabled,
            byokProvider=byok_provider,
            byokApiKey=byok_api_key,
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

        s_lang = normalize_language_code(request.sourceLanguage)
        t_lang = normalize_language_code(request.targetLanguage)

        # Pass through if identical languages
        if s_lang == t_lang:
            self.last_provider_name = "offline_pattern"
            return clean_text

        learned = qa_evaluator.qa_manager.get_learned_translation(s_lang, t_lang, clean_text)
        if learned is not None:
            self.last_provider_name = "learned_pattern"
            return learned

        # 1. Protect named entities, acronyms, and product names
        protected_text, token_map = self.glossary_manager.protect_entities(clean_text)

        # 2. Extract domain-aware glossary matches
        glossary = request.glossary or self.glossary_manager.get_relevant_glossary(
            clean_text,
            s_lang,
            t_lang,
            domain=request.domain or "general",
            terminology_sensitivity=request.terminologySensitivity or "normal",
            room_id=request.meetingId,
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
                    request.meetingId,
                    PremiumTranslationConfig(
                        tier=request.translationTier,
                        byok_enabled=request.byokEnabled,
                        byok_provider=request.byokProvider,
                        byok_api_key=request.byokApiKey,
                    ),
                ),
                timeout=self.timeout_seconds,
            )
            if self._last_provider_name_val != "offline_pattern":
                try:
                    self._last_provider_name.set(self._last_provider_name_val)
                except Exception:
                    pass
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
        meeting_id: str,
        premium_config: Optional[PremiumTranslationConfig] = None,
    ) -> str:
        """
        Specialized domain & contextual translation generator for Vietnamese <-> Japanese.
        Accounts for prior conversation turns and specialized vocabulary.
        """
        pair = f"{source_lang}_{target_lang}"

        # A. Exact glossary match for single-term utterances
        clean_key = text.strip().lower()
        if glossary and clean_key in glossary:
            self.last_provider_name = "glossary"
            return glossary[clean_key]

        # B. Premium contextual translation for Pro/BYOK, if valid credentials exist.
        requested_tier = (premium_config.tier if premium_config else "standard").lower()
        quota_tier = (
            "byok"
            if premium_config and premium_config.byok_enabled
            else requested_tier
        )
        is_premium_request = requested_tier == "pro" or quota_tier == "byok"
        downgrade_reason: Optional[str] = None
        credentials = self.premium_provider.resolve_active_credentials(
            premium_config,
            source_language=source_lang,
            target_language=target_lang,
        )
        if credentials is not None:
            provider_name, api_key = credentials
            quota_exceeded = (
                settings.PRO_GRACEFUL_DOWNGRADE_ENABLED
                and await self.quota_manager.is_quota_exceeded(meeting_id, quota_tier)
            )
            if quota_exceeded:
                downgrade_reason = "quota_exceeded"
                logger.info(
                    "Premium translation quota exhausted; using graceful downgrade meeting=%s tier=%s",
                    meeting_id[:8],
                    quota_tier,
                )
            else:
                try:
                    translated = await self.premium_provider.translate(
                        text,
                        source_lang,
                        target_lang,
                        context=context,
                        glossary=glossary,
                        config=premium_config,
                        provider_name=provider_name,
                        api_key=api_key,
                    )
                    if translated:
                        self.last_provider_name = "premium_ai"
                        if glossary:
                            translated = self.glossary_manager.enforce_target_terms(
                                translated, glossary, target_lang
                            )
                        await self.quota_manager.record_usage(
                            meeting_id,
                            text,
                            translated,
                            quota_tier,
                        )
                        return translated
                    if settings.PRO_GRACEFUL_DOWNGRADE_ENABLED:
                        downgrade_reason = "premium_empty_response"
                except Exception:
                    if settings.PRO_GRACEFUL_DOWNGRADE_ENABLED:
                        downgrade_reason = "premium_provider_error"
                    logger.warning(
                        "Premium translation provider failed; using fast fallback provider=%s",
                        provider_name,
                    )
        elif is_premium_request and settings.PRO_GRACEFUL_DOWNGRADE_ENABLED:
            downgrade_reason = "premium_unavailable"

        if downgrade_reason:
            await self.quota_manager.mark_downgraded(
                meeting_id,
                quota_tier,
                downgrade_reason,
            )
            if downgrade_reason == "premium_unavailable":
                logger.warning(
                    "Premium translation unavailable; using graceful downgrade meeting=%s tier=%s",
                    meeting_id[:8],
                    quota_tier,
                )

        # C. Full sentence translation via fast neural provider (Google GTX -> MyMemory)
        # Protect PII from third-party public web translators
        fallback_mask = TwoWayPiiFirewall.mask(text)
        translated = await self.fallback_provider.translate(
            fallback_mask.masked_text, source_lang, target_lang
        )
        if fallback_mask.restore_map and translated:
            translated = TwoWayPiiFirewall.restore(translated, fallback_mask.restore_map)

        fallback_provider_name = getattr(
            self.fallback_provider, "last_provider_name", "google_gtx"
        )
        if not isinstance(fallback_provider_name, str):
            fallback_provider_name = "google_gtx"
        if downgrade_reason:
            provider_suffix = "gtx" if fallback_provider_name == "google_gtx" else fallback_provider_name
            self.last_provider_name = f"downgraded_{provider_suffix}"
        else:
            self.last_provider_name = fallback_provider_name
        tag_prefix = f"[{target_lang.upper()}]"

        # D. Offline pattern fallback ONLY if online translation engines were unreachable
        if not translated or translated.startswith(tag_prefix):
            common_phrase = self._common_meeting_phrases.get(
                (source_lang, target_lang, text.strip().casefold())
            )
            if common_phrase:
                self.last_provider_name = (
                    "downgraded_offline_pattern" if downgrade_reason else "offline_pattern"
                )
                return common_phrase

            if pair == "vi_ja":
                for pattern, target_text in self._vi_ja_context_patterns:
                    if pattern.search(text):
                        self.last_provider_name = (
                            "downgraded_offline_pattern" if downgrade_reason else "offline_pattern"
                        )
                        return target_text
            elif pair == "ja_vi":
                for pattern, target_text in self._ja_vi_context_patterns:
                    if pattern.search(text):
                        self.last_provider_name = (
                            "downgraded_offline_pattern" if downgrade_reason else "offline_pattern"
                        )
                        return target_text

        # E. Post-process: Apply room glossary term replacements then enforce target terminology.
        # Guard: custom term replacement only runs when text has been ACTUALLY translated.
        # Two false-positive cases to exclude:
        #   1. same-language pass-through (translated == text)
        #   2. tagged fallback "[JA] <source_text>" — all engines failed; applying glossary here
        #      creates hybrid sentences like "Chúng ta cần 最適化 hệ thống này."
        tag_prefix = f"[{target_lang.upper()}]"
        is_real_translation = bool(
            translated
            and translated.strip() != text.strip()
            and not translated.startswith(tag_prefix)
        )
        if glossary and translated:
            if is_real_translation:
                # Apply custom room glossary (user-defined: e.g. 'KH' -> '顧客')
                # Sort by term length descending to prevent shorter terms clobbering longer ones.
                import re as _re
                for src_term, tgt_term in sorted(glossary.items(), key=lambda kv: len(kv[0]), reverse=True):
                    if not src_term or not tgt_term:
                        continue
                    pattern = _re.compile(r'\b' + _re.escape(src_term) + r'\b', _re.IGNORECASE)
                    translated = pattern.sub(tgt_term, translated)
            # Enforce hardcoded IT/business terminology regardless of translation state
            translated = self.glossary_manager.enforce_target_terms(translated, glossary, target_lang)

        return translated

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
                self.last_provider_name = getattr(
                    self.fallback_provider, "last_provider_name", "offline_pattern"
                )
                return res
        except Exception as ex:
            logger.debug("Fallback provider failed: %s", ex)

        # If single term in glossary, return translated term
        clean_key = original_text.strip().lower()
        if glossary and clean_key in glossary:
            self.last_provider_name = "glossary"
            return glossary[clean_key]

        self.last_provider_name = "tagged_fallback"
        return original_text

    def _sanitize_production_output(self, translated: str, original_text: str, target_lang: str) -> str:
        """Ensures '[JA] ...' placeholders never leak to users in production."""
        prefix = f"[{target_lang.upper()}]"
        if translated.startswith(prefix):
            stripped = translated[len(prefix):].strip()
            # If in production or generic placeholder, return clean text without prefix
            return stripped or original_text
        return translated
