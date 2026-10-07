# Task: Hướng B — Context-Aware Prompting + 2-Way PII Firewall

## Objective
Nâng cấp đường ống dịch thuật theo chuẩn bảo mật và chất lượng doanh nghiệp (tham khảo từ Immersive Translate & OneAIFW):
1. **2-Way PII Firewall (Mask & Restore)**:
   - Trước khi gửi qua bất kỳ Cloud LLM / External API (OpenAI, Groq, DeepSeek, Qwen, Gemini, DeepL), tự động nhận diện và thay thế dữ liệu nhạy cảm (Email, Phone, Amount, Long Numbers/Credit card) bằng token bảo vệ ngữ cảnh: `__PII_EMAIL_1__`, `__PII_PHONE_1__`, `__PII_AMOUNT_1__`, `__PII_NUMBER_1__`.
   - Sau khi nhận bản dịch từ engine, giải mã phục hồi chính xác (restore) các giá trị PII nguyên bản vào đúng vị trí trong câu dịch.
   - Không để rò rỉ PII người dùng ra bên ngoài các dịch vụ AI thứ ba.
2. **Context-Aware Dynamic Meeting Buffer**:
   - Tối ưu hóa Meeting Context Injection cho prompt: trích xuất rolling context 5 câu gần nhất kèm speaker, domain và glossary.
   - Thêm hướng dẫn context-aware meeting translation vào system prompt của `PremiumTranslationProvider` để tránh dịch sai các cụm từ đa nghĩa trong cuộc họp (như "Sprint 3", "Deploy", "Bug", "PR").
   - Thống kê telemetry PII (đếm số PII entities đã bảo vệ).

---

## File cần chỉnh sửa & tạo mới

1. `apps/ai-service/app/translation/pii_firewall.py` (MỚI)
   - Lớp `TwoWayPiiFirewall`:
     - `mask(text: str) -> tuple[str, dict[str, str]]`: Mask các PII nhạy cảm và trả về `masked_text` cùng `restore_map`.
     - `restore(translated_text: str, restore_map: dict[str, str]) -> str`: Khôi phục chính xác các token `__PII_*__` về giá trị gốc.
     - Hàm kiểm tra `has_pii(text: str) -> bool`.

2. `apps/ai-service/app/translation/premium_provider.py`
   - Tích hợp `TwoWayPiiFirewall` vào luồng `translate()`:
     - Mask trước khi gửi qua `_translate_openai_compatible`, `_translate_gemini`, `_translate_deepl`.
     - Restore ngay khi nhận được kết quả text từ response trước khi trả về.
   - Tối ưu `_prompt`:
     - Bổ sung chỉ dẫn rõ ràng cho LLM:
       - "Enterprise real-time meeting transcription context."
       - "Keep placeholder tokens like `__PII_EMAIL_1__`, `__PII_PHONE_1__`, `__PII_AMOUNT_1__` intact without translating or altering them."
       - Nhận biết ngữ cảnh đối thoại phòng họp gần nhất.

3. `apps/ai-service/app/translation/contextual_provider.py`
   - Đảm bảo `TwoWayPiiFirewall` cũng bảo vệ luồng `fallback_provider` (Google GTX / MyMemory) nếu cần.
   - Truyền tải context và domain vào premium provider chuẩn xác.

4. `apps/ai-service/tests/test_pii_firewall_and_context.py` (MỚI)
   - Unit tests cho `TwoWayPiiFirewall`:
     - Test mask & restore email (`alice@company.com`)
     - Test mask & restore phone (`+84 912 345 678`, `0901234567`)
     - Test mask & restore amount (`$5,000`, `10 triệu VND`)
     - Test mask nhiều PII cùng lúc trong 1 câu hội thoại
     - Test LLM prompt preservation khi có PII token
     - Test fallback an toàn nếu LLM vô tình viết hoa/thay đổi token

---

## Quality Gates
- [ ] `python -m pytest apps/ai-service/tests/test_pii_firewall_and_context.py -v` -> Pass 100%
- [ ] `python -m pytest tests/ apps/ai-service/tests/ -v` -> Toàn bộ test suite pass, không regression
- [ ] `dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj` -> Pass
- [ ] `cd apps/web && npm run lint && npm run build` -> Pass
