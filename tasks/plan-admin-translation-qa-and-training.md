# Plan: Privacy-Preserving Admin Translation QA (% Accuracy) & Active Learning for Local/Pattern Engine

## 1. Goal & Security Architecture
Build an end-to-end **Translation Quality Evaluation (`% Accuracy`) & Active Learning Training Pipeline** integrated into `/admin` (`AdminDashboardPage.tsx`) and `apps/ai-service`, strictly honoring LayaMeet's **RAM-Only / Zero-Persistence Privacy Commitment**:

1. **Zero-Text Telemetry for Every Meeting (`MeetingTranslationStats`)**:
   - Every final translated utterance in a meeting is scored in-memory (`0–100%`) without storing raw customer transcripts by default.
   - Only aggregated numerical telemetry per `meetingCode` (`avgAccuracyPct`, `avgSttConfidencePct`, `totalSegments`, `avgLatencyMs`, `cacheHitRatePct`, `flaggedLowConfidenceCount`, `languagePairs`, `engineBreakdown`) is retained for the Admin Dashboard.
2. **Automatic PII Scrubbing (`scrub_pii`)**:
   - Any text entering the Opt-In QA Training Queue has emails, phone numbers, bank/account digits, and currency amounts automatically redacted (`[EMAIL]`, `[PHONE]`, `[NUMBER]`, `[AMOUNT]`).
3. **1-Click Active Learning into Local Cache & Pattern Engine**:
   - Admin can review/edit candidate translation pairs or add new custom phrase patterns directly in `/admin`.
   - Clicking **"Duyệt & Nạp Engine"** hot-loads the verified pair `(source_lang, target_lang, normalized_source_text) -> verified_translation` into:
     - `ContextualTranslationProvider` learned patterns (persisted in `output/datasets/learned_patterns.json` and executed in `< 1ms` before external API calls),
     - `TranslationCache` (L1 in-memory + Redis cache),
     - `JsonlDatasetStorage` for exporting fine-tuning JSONL datasets.

---

## 2. Backend Changes (`apps/ai-service`)

### 2.1 Create `apps/ai-service/app/translation/qa_evaluator.py`
Implement:
- `scrub_pii(text: str) -> tuple[str, bool]`:
  - Redacts email addresses (`[EMAIL]`), phone numbers (`[PHONE]`), currency amounts like `500 triệu`, `100k`, `$500`, `¥10000`, `200.000đ` (`[AMOUNT]`), and long digit sequences >= 8 digits (`[NUMBER]`).
  - Returns `(scrubbed_text, was_scrubbed)`.
- `compute_translation_accuracy(...) -> dict[str, Any]`:
  - Computes `accuracyScore` (`0.0` to `100.0`) using:
    - STT confidence (`0.0–1.0`, default `0.88` if valid text): weight `35%`.
    - Provider/Engine reliability tier (`learned_pattern` / `glossary`: `99.0`, `premium_ai`: `97.0`, `cache`: `95.0`, `google_gtx`: `92.0`, `mymemory`: `86.0`, `offline_pattern`: `74.0`, `tagged_fallback`: `25.0`): weight `40%`.
    - Output sanity & script check (penalizes empty output, `[TARGET_LANG]` prefix, or unchanged text when `source_lang != target_lang` and text length > 4): weight `25%`.
- `TranslationQaManager` (singleton):
  - Holds per-meeting zero-text stats (`_meeting_stats: dict[str, dict[str, Any]]`).
  - Holds `qa_training_mode_enabled: bool` (defaults to `settings.TRANSLATION_DATASET_COLLECTION_ENABLED`).
  - Persists learned patterns in `Path(settings.TRANSLATION_DATASET_STORAGE_DIR) / "learned_patterns.json"` and syncs them into a shared dictionary `LEARNED_PATTERNS: dict[tuple[str, str, str], dict[str, Any]]`.
  - Records anonymized meeting telemetry on every final subtitle segment via `record_segment(...)`.
  - When `qa_training_mode_enabled` is `True` (or when a sample is explicitly submitted), stores PII-scrubbed samples in memory + `JsonlDatasetStorage`.
  - Provides `train_pattern(source_lang, target_lang, source_text, corrected_translation, domain="general", sample_id=None)` which:
    1. Normalizes key `(source_lang.lower(), target_lang.lower(), source_text.strip().casefold())`.
    2. Saves to `LEARNED_PATTERNS` and `learned_patterns.json`.
    3. Populates `TranslationCache` so both Local and Contextual providers serve it immediately.
    4. Updates sample status to `"trained"`.

### 2.2 Integrate Learned Patterns & QA Telemetry in `ContextualTranslationProvider` and `TranscribeWebSocketHandler`
- In `apps/ai-service/app/translation/contextual_provider.py`:
  - Check `qa_manager.get_learned_translation(source_lang, target_lang, text)` right at Step A (alongside exact glossary match) so Admin-trained phrases return in `< 1ms` with high accuracy!
  - Track the engine/provider name used (`learned_pattern`, `glossary`, `premium_ai`, `google_gtx`, `mymemory`, `offline_pattern`, `cache`) via a helper or attribute so `TranscribeWebSocketHandler` can pass accurate provider info to `qa_manager.record_segment(...)`.
- In `apps/ai-service/app/websocket/transcribe_handler.py`:
  - Whenever a final subtitle segment is translated (`is_final=True`), call `qa_manager.record_segment(...)` non-blockingly so every meeting automatically gets real-time `% Accuracy` telemetry.

### 2.3 Create `apps/ai-service/app/api/translation_qa.py` & Mount in `apps/ai-service/app/main.py`
- Admin authentication helper checking `X-Admin-Key` header or `key` query param against `os.getenv("ADMIN_SECRET_KEY", "vimeet-admin-secret-2026")` and `"layameet-admin-secret-2026"` (accept both default keys used in the repo so dev/docker admin login always works seamlessly). Return RFC 7807 `application/problem+json` on `401`.
- Endpoints under `/api/translation-qa`:
  - `GET /api/translation-qa/summary`: Returns overall metrics + per-meeting stats list + `qaTrainingModeEnabled` + `learnedPatternsCount`.
  - `POST /api/translation-qa/settings`: `{ "qaTrainingModeEnabled": bool }` -> toggles Opt-In sample collection.
  - `GET /api/translation-qa/samples`: Returns `{ "samples": [...], "learnedPatterns": [...] }`.
  - `POST /api/translation-qa/train`: `{ "sampleId"?: str, "sourceLanguage": str, "targetLanguage": str, "sourceText": str, "correctedTranslation": str, "domain"?: str }` -> trains pattern + updates cache + returns trained entry.
  - `DELETE /api/translation-qa/patterns`: `{ "sourceLanguage": str, "targetLanguage": str, "sourceText": str }` -> removes a learned pattern.
  - `GET /api/translation-qa/export`: Returns JSONL text (`PlainTextResponse` with `application/x-ndjson`) of all trained patterns and verified dataset pairs.

---

## 3. Proxy & Frontend Changes (`apps/web`)

### 3.1 Proxy `/api/translation-qa` in `apps/web/nginx.conf` and `apps/web/vite.config.ts`
- Add `location ^~ /api/translation-qa` in `apps/web/nginx.conf` proxying to `http://ai-service:8000`.
- Add `'/api/translation-qa'` in `apps/web/vite.config.ts` proxying to `http://localhost:8000`.

### 3.2 Update `apps/web/src/api/meetingApi.ts`
Add TypeScript interfaces and methods:
- `TranslationQaMeetingStats`, `TranslationQaSummaryResponse`, `TranslationQaSample`, `LearnedPatternRecord`, `TranslationQaSamplesResponse`.
- `getAdminTranslationQaSummary(adminKey: string)`
- `getAdminTranslationQaSamples(adminKey: string, meetingId?: string)`
- `updateAdminTranslationQaSettings(adminKey: string, qaTrainingModeEnabled: boolean)`
- `trainAdminTranslationPattern(adminKey: string, payload: { sampleId?: string; sourceLanguage: string; targetLanguage: string; sourceText: string; correctedTranslation: string; domain?: string })`
- `deleteAdminTranslationPattern(adminKey: string, payload: { sourceLanguage: string; targetLanguage: string; sourceText: string })`
- `exportAdminTranslationDataset(adminKey: string): Promise<string>`

### 3.3 Update `apps/web/src/pages/AdminDashboardPage.tsx`
- Add `'translation-qa'` to `activeTab` union (`'meetings' | 'translation-qa' | 'orders' | 'leads' | 'notifications' | 'infra'`).
- In the **Meetings Table (`activeTab === 'meetings'`)**:
  - Add a column **"Độ Chính Xác Dịch"** showing the meeting's `avgAccuracyPct` badge (e.g., `94.2% · N câu` in emerald/amber, or `Chưa có dữ liệu` if 0 utterances) and a quick action link to open `'translation-qa'` filtered to that room.
- In the new **"Đánh Giá Dịch & Train AI" Tab (`activeTab === 'translation-qa'`)**:
  - **Privacy & PII Guard Banner** with a toggle switch for `QA Training Mode (Opt-In, Tự động che PII: [SĐT], [EMAIL], [SỐ_TIỀN])`.
  - **KPI Summary Row**: Overall Accuracy `%`, Total Evaluated Utterances, Learned Patterns Active (`<1ms`), Cache Hit Rate `%` & Avg Latency `ms`.
  - **Per-Meeting Accuracy Table**: Room Code, Utterances, Accuracy `%` progress bar, STT Confidence `%`, Avg Latency `ms`, Engine Breakdown badges (`GTX`, `MyMemory`, `Pro AI`, `Cache`, `Pattern`).
  - **Active Learning Trainer Form & Queue**:
    - Quick form to add/train any `(sourceLanguage, targetLanguage, sourceText -> correctedTranslation)` directly into `Pattern Engine & Local Cache`.
    - Table of collected PII-scrubbed samples where Admin can edit the translation inline and click **"Duyệt & Train (<1ms)"**.
    - List of active **Learned Patterns** with ability to delete any outdated pattern and a button **"Xuất Dataset JSONL"** to download fine-tuning data.

---

## 4. Verification
1. Write unit & integration tests in `apps/ai-service/tests/test_translation_qa_and_training.py` and contract tests in `tests/test_admin_translation_qa_contract.py` covering:
   - Zero-text meeting accuracy scoring (`record_segment` stores no raw text when `qa_training_mode_enabled=False`).
   - PII scrubbing (`scrub_pii` masks emails, phone numbers, money amounts, long numbers).
   - 1-Click Train (`POST /api/translation-qa/train`) immediately makes `ContextualTranslationProvider.translate()` return the Admin-trained translation.
   - RFC 7807 `401` when `X-Admin-Key` is missing/invalid.
2. Run:
   - `python -m pytest tests/ apps/ai-service/tests/ -q`
   - `dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj`
   - `cd apps/web && npm run lint && npm run build`
