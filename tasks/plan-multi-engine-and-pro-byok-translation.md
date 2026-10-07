# Kế Hoạch Triển Khai: Multi-Engine Fast Translation Failover & Gói Pro / BYOK Premium AI Translation

> **Mục tiêu:**
> 1. **Multi-Engine Fast Translation (`LocalTranslationProvider`)**: Tích hợp cơ chế dịch phản hồi nhanh đa nguồn (Google GTX Neural + MyMemory REST Failover) để đảm bảo tốc độ thấp và không bao giờ bị nghẽn khi 1 cổng bị giới hạn rate-limit (HTTP 429) hoặc mạng chập chờn.
> 2. **Gói Pro & BYOK Premium AI Translation (`PremiumTranslationProvider` + WebSocket Config Sync)**:
>    - Khi người dùng ở **Gói Pro (`translationTier: "pro"` / `isProPlan`)**, hệ thống tự động ưu tiên dùng **API cao cấp của chủ hệ thống (Server-side Pro API Key: OpenAI / Gemini / DeepL)** được cấu hình trong `.env` / `settings.py` nếu có.
>    - Khi người dùng bật **BYOK (`byokEnabled: true`)** trên giao diện cài đặt và nhập API Key cá nhân (`openai`, `gemini`, `deepl`), hệ thống ưu tiên dùng Key đó để dịch ngữ cảnh chuyên sâu.
>    - Nếu chưa cấu hình Pro API Key hoặc API trả phí hết hạn mức/timeout, tự động fallback mượt mà trong `<100ms` về **Multi-Engine Fast Translation (Google GTX + MyMemory)** mà không làm gián đoạn phụ đề.

---

## 1. Chi Tiết Thay Đổi Backend (`apps/ai-service`)

### 1.1. Cấu hình Server-Side Pro API Keys (`apps/ai-service/app/config/settings.py`, `docker-compose.yml`, `.env.example`)
Bổ sung các biến cấu hình cho Gói Pro vào `Settings` trong `apps/ai-service/app/config/settings.py`:
- `TRANSLATION_SECONDARY_BACKEND: str = os.getenv("TRANSLATION_SECONDARY_BACKEND", "mymemory")`
- `PRO_TRANSLATION_PROVIDER: str = os.getenv("PRO_TRANSLATION_PROVIDER", "openai")` (`openai`, `gemini`, `deepl`)
- `PRO_OPENAI_API_KEY: str = os.getenv("PRO_OPENAI_API_KEY", "")`
- `PRO_OPENAI_MODEL: str = os.getenv("PRO_OPENAI_MODEL", "gpt-4o-mini")`
- `PRO_GEMINI_API_KEY: str = os.getenv("PRO_GEMINI_API_KEY", "")`
- `PRO_GEMINI_MODEL: str = os.getenv("PRO_GEMINI_MODEL", "gemini-2.0-flash")`
- `PRO_DEEPL_API_KEY: str = os.getenv("PRO_DEEPL_API_KEY", "")`

Cập nhật `docker-compose.yml` và `.env.example` để truyền các biến môi trường `PRO_TRANSLATION_PROVIDER`, `PRO_OPENAI_API_KEY`, `PRO_OPENAI_MODEL`, `PRO_GEMINI_API_KEY`, `PRO_GEMINI_MODEL`, `PRO_DEEPL_API_KEY` vào container `ai-service`.
*(Tuyệt đối không log bất kỳ API key nào ra console/log theo quy chuẩn bảo mật `AGENTS.md`)*.

### 1.2. Nâng cấp `LocalTranslationProvider` với Multi-Engine Auto-Failover (`apps/ai-service/app/translation/local_provider.py`)
- Giữ nguyên luồng tương thích ngược 100% với các unit test hiện tại:
  1. Kiểm tra `self._sample_dict` và chế độ `self.backend == "local_dictionary"`.
  2. Kiểm tra Redis Cache (`trans:{source_language}:{target_language}:{text_hash}`).
  3. Nếu `self.backend == "offline_http"`, gọi `client.post(self.offline_service_url, ...)`.
  4. Nếu `self.backend in ("gtx_cloud", "multi_cloud")`:
     - Bước 1: Gọi `_translate_gtx(client, clean_text, source_language, target_language)` tới `https://translate.googleapis.com/translate_a/single` với `params={"client": "gtx", "sl": source_language, "tl": target_language, "dt": "t", "q": clean_text}`.
     - Bước 2 (Auto-Failover sang cổng dịch nhanh thứ 2 trên GitHub/Open API): Nếu `_translate_gtx` ném lỗi, timeout, trả về status != 200 (ví dụ HTTP 429), hoặc trả chuỗi rỗng, và `self.secondary_backend == "mymemory"`, tự động gọi `_translate_mymemory(client, clean_text, source_language, target_language)`:
       - Endpoint: `https://api.mymemory.translated.net/get`
       - Params: `{"q": clean_text, "langpair": f"{source_language}|{target_language}"}`
       - Đọc `data.get("responseData", {}).get("translatedText")` (bỏ qua nếu chứa thông báo lỗi `"MYMEMORY WARNING"` hoặc trùng nguyên bản khi có lỗi quota).
     - Lưu kết quả dịch thành công vào Redis Cache (TTL 24h).

### 1.3. Xây dựng `PremiumTranslationProvider` cho Gói Pro & BYOK (`apps/ai-service/app/translation/premium_provider.py`)
Tạo module mới `apps/ai-service/app/translation/premium_provider.py`:
- Class `PremiumTranslationConfig`:
  - `tier: str = "standard"` (`"standard"` | `"pro"`)
  - `byok_enabled: bool = False`
  - `byok_provider: str = "openai"` (`"openai"` | `"gemini"` | `"deepl"`)
  - `byok_api_key: str = ""`
- Class `PremiumTranslationProvider`:
  - Phương thức `resolve_active_credentials(config: Optional[PremiumTranslationConfig]) -> Optional[tuple[str, str]]`:
    1. Nếu `config` có `byok_enabled=True` và `byok_api_key.strip()`: trả về `(config.byok_provider.lower(), config.byok_api_key.strip())`.
    2. Nếu `config` có `tier.lower() == "pro"`:
       - Kiểm tra provider ưu tiên trong `settings.PRO_TRANSLATION_PROVIDER` (`openai` -> `settings.PRO_OPENAI_API_KEY`, `gemini` -> `settings.PRO_GEMINI_API_KEY`, `deepl` -> `settings.PRO_DEEPL_API_KEY`).
       - Nếu provider mặc định chưa đặt key nhưng một trong các biến `PRO_OPENAI_API_KEY`, `PRO_GEMINI_API_KEY`, `PRO_DEEPL_API_KEY` có key, tự động chọn provider có key đó!
    3. Nếu không có key nào: trả về `None` (để `ContextualTranslationProvider` chuyển sang `LocalTranslationProvider` ngay lập tức mà không tốn thời gian chờ).
  - Hỗ trợ dịch thật qua HTTP bất đồng bộ (`httpx.AsyncClient`) cho cả 3 nhà cung cấp:
    - **OpenAI (`openai`)**: `POST https://api.openai.com/v1/chat/completions` với model `settings.PRO_OPENAI_MODEL` (`gpt-4o-mini`), `temperature=0.1`, truyền ngữ cảnh hội thoại (`context`) và từ điển (`glossary`) vào system prompt để dịch chuẩn xác 100% ngữ cảnh họp doanh nghiệp.
    - **Google Gemini (`gemini`)**: `POST https://generativelanguage.googleapis.com/v1beta/models/{settings.PRO_GEMINI_MODEL}:generateContent` với header `x-goog-api-key: {api_key}` (không gắn API key vào URL log).
    - **DeepL (`deepl`)**: Tự động chọn `https://api-free.deepl.com/v2/translate` (nếu key kết thúc bằng `:fx`) hoặc `https://api.deepl.com/v2/translate` với header `Authorization: DeepL-Auth-Key {api_key}`.

### 1.4. Tích hợp vào `ContextualTranslationProvider` & `TranscribeWebSocketHandler`
- Trong `apps/ai-service/app/translation/contextual_provider.py`:
  - Bổ sung các trường tùy chọn vào `TranslationContextRequest`:
    - `translationTier: str = "standard"`
    - `byokEnabled: bool = False`
    - `byokProvider: str = "openai"`
    - `byokApiKey: str = ""`
  - Trong `ContextualTranslationProvider`:
    - Khởi tạo `self.premium_provider = premium_provider or PremiumTranslationProvider()`.
    - Trong `_execute_engine_translation`:
      - Sau khi kiểm tra `_common_meeting_phrases`, `_vi_ja_context_patterns`, `_ja_vi_context_patterns`, và single-term glossary:
      - Nếu `self.premium_provider.resolve_active_credentials(...)` trả về `(provider_name, api_key)` hợp lệ:
        - Gọi `await self.premium_provider.translate(...)`. Nếu trả về bản dịch hợp lệ (không rỗng), áp dụng `enforce_target_terms` và trả về ngay!
        - Nếu gặp lỗi hoặc không có key, tự động fallback xuống `await self.fallback_provider.translate(text, source_lang, target_lang)`.
- Trong `apps/ai-service/app/websocket/transcribe_handler.py`:
  - Lưu trạng thái cấu hình dịch theo phiên/phòng khi nhận bản tin WebSocket `{"type": "config", ...}`:
    - Đọc `translationTier` (`"standard"` | `"pro"`), `byokEnabled` (`bool`), `byokProvider` (`"openai"` | `"gemini"` | `"deepl"`), `byokApiKey` (`str`).
    - Tuyệt đối KHÔNG log `byokApiKey` trong `logger.info`.
    - Truyền các thông số này vào `_dispatch_translate` -> `ContextualTranslationProvider.translate(...)`.
    - Khi tính cache key (`self.cache.build_key` và `self.cache.build_general_key`), phân biệt `provider_version` khi dùng `pro` / `byok` để kết quả dịch tiêu chuẩn không ghi đè lên kết quả dịch AI cao cấp của Gói Pro.

---

## 2. Chi Tiết Thay Đổi Frontend (`apps/web`)

### 2.1. Cập nhật `apps/web/src/utils/userSettings.ts`
- Thêm `export type TranslationTier = 'standard' | 'pro';`
- Thêm `translationTier: TranslationTier;` vào `UserMeetingSettings` (mặc định `'standard'`).

### 2.2. Cập nhật `apps/web/src/services/subtitleService.ts` & `apps/web/src/hooks/useSubtitle.ts`
- Mở rộng `sendConfig` trong `SubtitleWebSocketService` (`apps/web/src/services/subtitleService.ts`) để gửi kèm cấu hình dịch thuật:
  ```ts
  export interface SubtitleConfigPayload {
    domain: string;
    initialPrompt?: string;
    translationTier?: 'standard' | 'pro';
    byokEnabled?: boolean;
    byokProvider?: 'openai' | 'deepl' | 'gemini';
    byokApiKey?: string;
  }
  ```
  *(Vẫn hỗ trợ chữ ký gọi cũ `sendConfig(domain: string, initialPrompt?: string, extra?: ...)` để không phá vỡ bất kỳ nơi nào đang gọi `sendConfig`)*.
- Trong `apps/web/src/hooks/useSubtitle.ts`:
  - Thêm `isProPlan?: boolean;` vào `UseSubtitleOptions` (và truyền `isProPlan` từ `MeetingShell.tsx` vào `subtitleOptions`).
  - Lắng nghe sự kiện `subscribeUserSettings` (từ `userSettings.ts`) và trạng thái `isProPlan`: mỗi khi người dùng bật Gói Pro hoặc thay đổi cài đặt BYOK / Domain trong `MeetingSettingsDialog`, tự động gọi `subtitleWsService.sendConfig(...)` để đồng bộ tức thì xuống `ai-service` qua WebSocket mà không cần tải lại trang!

### 2.3. Cập nhật Giao diện `apps/web/src/components/meeting/MeetingSettingsDialog.tsx`
- Trong tab `Phụ đề & Dịch AI` (`activeTab === 'subtitles'`), nâng cấp khu vực chọn Engine Dịch Thuật:
  - Hiển thị chọn chế độ Engine Dịch:
    - **Tiêu chuẩn (Multi-Engine Fast: Google GTX + Auto-Failover)**
    - **Cao cấp - Gói Pro (Sử dụng API AI Cao Cấp của Hệ Thống / BYOK)**
  - Giữ nguyên khu vực **Tùy chọn API cá nhân (BYOK)** (`openai`, `deepl`, `gemini`) bên dưới và giải thích rõ: *"Nếu bạn dùng Gói Pro mà không nhập Key riêng, hệ thống sẽ tự động sử dụng API AI cao cấp của LayaMeet Pro."*

---

## 3. Kiểm Thử & Nghiệm Thu (Verification)
1. Viết bộ test mới trong `apps/ai-service/tests/test_multi_engine_and_pro_translation.py` và `tests/test_pro_byok_translation_contract.py` kiểm tra:
   - `LocalTranslationProvider` tự động failover từ Google GTX sang MyMemory khi GTX trả lỗi HTTP 429 hoặc timeout.
   - `PremiumTranslationProvider` ưu tiên BYOK key nếu `byok_enabled=True`, và tự động dùng `PRO_OPENAI_API_KEY` / `PRO_GEMINI_API_KEY` / `PRO_DEEPL_API_KEY` của hệ thống khi `tier="pro"`.
   - Khi `tier="pro"` nhưng hệ thống chưa điền `PRO_*_API_KEY` (hoặc API trả lỗi), `ContextualTranslationProvider` tự động fallback mượt mà về `LocalTranslationProvider` mà không làm lỗi câu dịch.
   - `TranscribeWebSocketHandler` nhận message `type: "config"` với `translationTier: "pro"` và `byokApiKey`, truyền xuống `translator` và tuyệt đối không ghi `byokApiKey` vào log.
2. Chạy toàn bộ test suite:
   - `python -m pytest tests/ apps/ai-service/tests/ -q`
   - `cd apps/web && npm run lint && npm run build`
