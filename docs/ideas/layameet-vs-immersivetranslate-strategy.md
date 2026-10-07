# LayaMeet — Strategic Direction vs. Immersive Translate
> Generated: 2026-10-05 | Status: DRAFT | Owner: Chủ Dự Án

---

## Problem Statement

LayaMeet giải quyết bài toán **dịch thuật real-time trong cuộc họp doanh nghiệp đa ngôn ngữ** (Vi↔Ja↔En), khác hoàn toàn với Immersive Translate (dịch tài liệu tĩnh trên web/PDF).

**Khoảng trống thị trường** Immersive Translate bỏ lại:
- Không có sản phẩm nào xử lý dịch real-time STT→Translation pipeline với latency <800ms trong context cuộc họp
- Không có sản phẩm nào duy trì **meeting context window** để dịch nhất quán xuyên suốt cuộc họp
- Không có sản phẩm nào cung cấp **Admin QA Dashboard** với Active Learning feedback loop

---

## Competitive Intelligence — Immersive Translate

| Dimension | Immersive Translate | LayaMeet |
|-----------|---------------------|----------|
| **Use case** | Tài liệu tĩnh (web/PDF/ebook) | Real-time meeting audio |
| **Latency target** | Không giới hạn (offline OK) | <800ms TTFS |
| **Translation engines** | 20+ (DeepL, OpenAI, Gemini, Groq, Qwen, Ollama…) | 5 (GTX, MyMemory, OpenAI, Gemini, DeepL) |
| **Context handling** | Batch YAML-JSONL (nhiều câu/call) | 1 sentence/call |
| **PII protection** | Encode→translate→decode (2-chiều) | Scrub khi lưu dataset (1-chiều) |
| **Pricing** | Free / BYOK / Pro $9.99/tháng / $69.99/năm | TBD |
| **Open source** | Partial (GitHub public) | Internal |

**Key tech learnings từ Immersive Translate:**
- YAML batch prompt: `id + text` fields → dịch nhiều câu/API call → tiết kiệm 60–70% token cost
- `lingua-server` (Apache-2.0): Microservice language detection tốc độ cao
- 2-way PII desensitization: encode trước khi gửi LLM, decode sau khi nhận
- Gói quota: 50M tokens/tháng Pro, tự downgrade gracefully thay vì ngắt

---

## 3 Hướng Chiến Lược

### 🟢 Hướng B — Context-Aware Prompting + PII Firewall 2-chiều
**"Dịch đúng ngữ cảnh phòng họp, bảo vệ dữ liệu nhạy cảm hoàn toàn"**

**Tóm tắt**: Duy trì rolling context buffer 5 câu gần nhất của cuộc họp, inject vào system prompt trước mỗi lần dịch. PII được encode (thay thế bằng placeholder `__PII_EMAIL_1__`) trước khi gửi LLM và decode sau khi nhận bản dịch.

**User Value**: ⭐⭐⭐⭐⭐
- "Sprint 3" không bị dịch thành "Chạy nước rút 3"
- Email/SĐT trong câu nói được bảo vệ 2 chiều
- Nhất quán về thuật ngữ xuyên suốt buổi họp 90 phút

**Feasibility**: ⭐⭐⭐⭐
- Rolling buffer: `deque(maxlen=5)` trong `transcribe_handler.py`
- System prompt injection: thêm `meeting_context` vào `premium_provider.py`
- PII decode: mở rộng `scrub_pii()` trong `qa_evaluator.py` trả về restore map

**Differentiation (Moat)**: ⭐⭐⭐⭐⭐
- **Không ai trong segment meeting translation làm điều này**
- Immersive Translate làm batch offline → không áp dụng được cho real-time

**Hidden Assumptions**:
- [ ] Context window 5 câu có tăng latency >800ms không? Cần benchmark với Groq
- [ ] Cần test với cuộc họp thực tế: ngữ cảnh có thực sự giúp ích?
- [ ] Glossary hiện tại + Context window có conflict không?

**MVP Scope**:
1. `ContextBuffer` class: `deque(maxlen=5)`, thread-safe, per-room
2. Mở rộng `PII2WayHandler`: `encode()` → gửi LLM → `decode()`
3. System prompt template cho meeting context
4. Unit tests đo latency trước/sau

**Not Doing**: UI hiển thị context buffer, per-user context (too complex)

---

### 🔵 Hướng A — Engine & Model Expansion
**"Chọn engine tốt nhất cho từng ngôn ngữ và ngân sách"**

**Tóm tắt**: Mở rộng `premium_provider.py` hỗ trợ Groq (`llama-3.3-70b`), DeepSeek V3, Qwen-MT (`qwen-mt-turbo`), và Ollama Local. Tất cả dùng chuẩn OpenAI-compatible API.

**User Value**: ⭐⭐⭐⭐
- Qwen-MT tốt hơn cho Vi↔Zh (future-proof)
- DeepSeek V3 rẻ hơn GPT-4 khoảng 10x
- Groq latency ~200ms → phù hợp real-time hơn OpenAI (~600ms)

**Feasibility**: ⭐⭐⭐⭐⭐
- OpenAI-compatible API: chỉ cần thêm `base_url` + `model` vào config
- Estimated: 1–2 ngày implementation, 0 thay đổi kiến trúc

**Differentiation**: ⭐⭐⭐
- Immersive Translate đã có 20+ engine
- LayaMeet advantage: tích hợp vào real-time pipeline (họ không có)

**Hidden Assumptions**:
- [ ] Groq free tier có rate limit đủ cho meeting 60 người không?
- [ ] Ollama Local cần GPU → không khả thi cho SaaS, chỉ on-premise

**MVP Scope**:
1. Thêm `groq`, `deepseek`, `qwen` vào `PremiumTranslationConfig`
2. `EngineSelector`: auto-select dựa trên source/target lang pair
3. Frontend: dropdown chọn engine trong `MeetingSettingsDialog`

**Not Doing**: Ollama Local (defer đến enterprise on-premise tier)

---

### 🟡 Hướng C — Token Quota + Graceful Downgrade *(Defer)*
**"Không bao giờ ngắt dịch giữa chừng"**

> **DEFERRED** — Phụ thuộc vào quyết định business model (B2B per-seat vs B2C subscription). Implement sau khi có pricing strategy rõ ràng.

**Điều kiện để kích hoạt hướng này**:
- Có pricing page với 3 tier rõ ràng
- Có payment integration (Stripe)
- Có >50 paying users để justify engineering cost

---

## Recommended Implementation Sequence

```
Phase 1 (Tuần 1–2): Hướng A — Engine Expansion
  → Thêm Groq + DeepSeek vào premium_provider.py
  → Benchmark latency so với OpenAI trong real-time pipeline
  → Update MeetingSettingsDialog UI

Phase 2 (Tuần 3–5): Hướng B — Context-Aware Prompting
  → Implement ContextBuffer per-room
  → PII 2-way handler
  → Benchmark latency delta
  → Integration tests

Phase 3 (Tuần 8+): Hướng C — Quota System
  → Chỉ khi có business model rõ ràng
```

---

## Open Questions

| # | Câu hỏi | Ai trả lời | Deadline |
|---|---------|-----------|---------|
| 1 | Latency benchmark Groq vs OpenAI trong `premium_provider.py`? | Engineering | Trước khi merge A |
| 2 | Business model: B2B per-seat hay B2C subscription? | Chủ Dự Án | Trước Phase 3 |
| 3 | Context buffer 5 câu có đủ hay cần 10 câu? | Testing với real meeting | Trước khi merge B |
| 4 | Groq free tier rate limit có đủ cho beta? | DevOps | Trước launch |
| 5 | Qwen-MT có hỗ trợ Vietnamese không? | Engineering | Research |

---

## Decision Log

| Ngày | Quyết định | Lý do |
|------|------------|-------|
| 2026-10-05 | Defer Hướng C (Quota) | Chưa có business model rõ ràng |
| 2026-10-05 | Sequence: A → B → C | A quick win, B là moat thực sự |
| 2026-10-05 | Không adopt `lingua-server` ngay | `LanguageDetector` hiện tại đủ cho Vi/Ja/En |
