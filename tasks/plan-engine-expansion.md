# Task: Engine Expansion — Groq, DeepSeek, Qwen-MT

## Objective
Mở rộng `premium_provider.py` hỗ trợ thêm 3 engine mới dùng chuẩn OpenAI-compatible API:
- **Groq** (`llama-3.3-70b-versatile`) — latency ~200ms, phù hợp real-time
- **DeepSeek V3** (`deepseek-chat`) — rẻ hơn GPT-4 ~10x
- **Qwen-MT** (`qwen-mt-turbo`) — tốt cho ngôn ngữ châu Á (Vi/Zh/Ja)

Tất cả provider đều dùng chuẩn OpenAI SDK (`openai.AsyncOpenAI` với `base_url` tùy chỉnh).

---

## Context Files (đọc trước khi code)

1. `apps/ai-service/app/translation/premium_provider.py` — File chính cần mở rộng
2. `apps/ai-service/app/config/settings.py` — Thêm các env var mới
3. `apps/web/src/components/MeetingSettingsDialog.tsx` — Thêm engine dropdown UI
4. `apps/web/src/hooks/useSubtitle.ts` — Xem cách `byokProvider` được forward
5. `apps/ai-service/tests/test_multi_engine_and_pro_translation.py` — Tests hiện tại cần update

---

## Implementation Steps

### Step 1: Cập nhật `apps/ai-service/app/config/settings.py`

Thêm các env var cho engine mới (sau các `PRO_*` keys hiện tại):

```python
# Groq
PRO_GROQ_API_KEY: Optional[str] = None
PRO_GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
PRO_GROQ_MODEL: str = "llama-3.3-70b-versatile"

# DeepSeek
PRO_DEEPSEEK_API_KEY: Optional[str] = None
PRO_DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"
PRO_DEEPSEEK_MODEL: str = "deepseek-chat"

# Qwen-MT (via DashScope OpenAI-compatible endpoint)
PRO_QWEN_API_KEY: Optional[str] = None
PRO_QWEN_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
PRO_QWEN_MODEL: str = "qwen-mt-turbo"
```

### Step 2: Cập nhật `apps/ai-service/app/translation/premium_provider.py`

**2a. Mở rộng `PremiumTranslationConfig`** — thêm provider mới:
```python
SUPPORTED_PROVIDERS = ["openai", "gemini", "deepl", "groq", "deepseek", "qwen"]
```

**2b. Thêm `_get_openai_compatible_client(provider)`** — factory method trả về `AsyncOpenAI` với `base_url` và `api_key` tương ứng:
```python
async def _get_openai_compatible_client(self, provider: str) -> AsyncOpenAI:
    if provider == "groq":
        return AsyncOpenAI(api_key=settings.PRO_GROQ_API_KEY, base_url=settings.PRO_GROQ_BASE_URL)
    elif provider == "deepseek":
        return AsyncOpenAI(api_key=settings.PRO_DEEPSEEK_API_KEY, base_url=settings.PRO_DEEPSEEK_BASE_URL)
    elif provider == "qwen":
        return AsyncOpenAI(api_key=settings.PRO_QWEN_API_KEY, base_url=settings.PRO_QWEN_BASE_URL)
    else:  # openai
        return AsyncOpenAI(api_key=settings.PRO_OPENAI_API_KEY)
```

**2c. Refactor `_translate_with_openai()`** thành `_translate_with_openai_compatible()` nhận thêm tham số `provider`:
- Nếu `provider in ["groq", "deepseek", "qwen"]` → dùng `_get_openai_compatible_client(provider)`
- Nếu `provider == "gemini"` → vẫn dùng `genai` SDK như hiện tại (không thay đổi)
- Nếu `provider == "deepl"` → vẫn dùng DeepL API như hiện tại

**2d. `EngineSelector` — auto-select engine tốt nhất cho language pair**:
```python
def auto_select_engine(source_lang: str, target_lang: str, available_providers: list[str]) -> str:
    """
    Chọn engine tốt nhất cho language pair.
    - Vi/Zh/Ja pair → prefer 'qwen' nếu available
    - Mọi pair → prefer 'groq' (latency thấp nhất) nếu available
    - Fallback → 'openai'
    """
    asian_langs = {"vi", "zh", "ja", "ko"}
    if source_lang in asian_langs or target_lang in asian_langs:
        if "qwen" in available_providers:
            return "qwen"
    if "groq" in available_providers:
        return "groq"
    for p in ["openai", "deepseek", "deepl"]:
        if p in available_providers:
            return p
    return "openai"
```

**2e. `get_available_providers()` method** — trả về list provider nào có API key được cấu hình:
```python
def get_available_providers(self) -> list[str]:
    providers = []
    if settings.PRO_OPENAI_API_KEY: providers.append("openai")
    if settings.PRO_GEMINI_API_KEY: providers.append("gemini")
    if settings.PRO_DEEPL_API_KEY: providers.append("deepl")
    if settings.PRO_GROQ_API_KEY: providers.append("groq")
    if settings.PRO_DEEPSEEK_API_KEY: providers.append("deepseek")
    if settings.PRO_QWEN_API_KEY: providers.append("qwen")
    return providers
```

### Step 3: Thêm API endpoint để list available providers

Thêm route mới trong `apps/ai-service/app/api/translation_qa.py` (hoặc tạo file mới `apps/ai-service/app/api/providers.py`):

```
GET /api/translation/providers
Response: {"available": ["openai", "groq"], "recommended": "groq"}
```

### Step 4: Frontend — Cập nhật `MeetingSettingsDialog.tsx`

Thêm dropdown "Engine dịch" trong phần Pro Settings:
- Fetch `/api/translation/providers` khi dialog mở
- Hiển thị list engine available (chỉ show engine có API key)
- Thêm badge `⚡ Nhanh nhất` cho Groq, `💰 Rẻ nhất` cho DeepSeek, `🌏 Tốt nhất Vi/Ja` cho Qwen
- Thêm option "Tự động" (auto_select) là mặc định
- Persist lựa chọn vào `userSettings` (localStorage)

### Step 5: Cập nhật `useSubtitle.ts` và `subtitleService.ts`

Forward `byokProvider` setting mới (groq/deepseek/qwen) qua WebSocket message khi auto_select=false.

### Step 6: Viết tests

Cập nhật `apps/ai-service/tests/test_multi_engine_and_pro_translation.py`:

```python
# Test 1: PremiumTranslationProvider.get_available_providers() 
#   → chỉ return provider có API key

# Test 2: auto_select_engine("vi", "ja", ["groq", "openai"]) → "groq"
# Test 3: auto_select_engine("vi", "zh", ["qwen", "groq"]) → "qwen"  
# Test 4: auto_select_engine("en", "fr", ["deepseek"]) → "deepseek"

# Test 5: Mock Groq API call → translate("Hello", "en", "vi") returns dict với "translated_text"
# Test 6: Mock DeepSeek API call → same contract
# Test 7: Mock Qwen-MT API call → same contract

# Test 8: Contract test GET /api/translation/providers → 200, has "available" list
```

---

## Quality Gates
- [ ] `python -m pytest apps/ai-service/tests/test_multi_engine_and_pro_translation.py -v` — tất cả pass
- [ ] `python -m pytest tests/ apps/ai-service/tests/ -v` — không có regression
- [ ] `cd apps/web && npm run lint && npm run build` — pass
- [ ] Không có API key nào được log vào console

## Constraints
- Không thay đổi giao diện WebSocket message (`SubtitleBroadcastMessage` contract)
- Không block luồng phụ đề khi gọi engine — phải async/await hoàn toàn
- Gemini và DeepL hiện tại không thay đổi logic (chỉ refactor tên function)
- Mọi API key phải đọc từ `settings.py` (env var), không hardcode
