# Task: Direction C — Token Quota, Usage Metering & Graceful Downgrade

## Objective
Xây dựng hệ thống quản lý Token Quota và cơ chế Graceful Downgrade cho gói dịch thuật Pro/BYOK của LayaMeet (tham khảo từ kiến trúc Immersive Translate):
1. **Quota & Usage Tracker (Redis + In-Memory Fallback)**:
   - Theo dõi số lượng ký tự/token dịch AI cao cấp theo từng `meetingId` và `tier`.
   - Cấu hình ngưỡng quota mặc định cho gói Pro (ví dụ: `PRO_MEETING_TOKEN_QUOTA = 100000` tokens/ký tự per meeting hoặc cấu hình qua env).
   - Tự động thống kê: `total_tokens_used`, `remaining_quota`, `is_quota_exceeded`.
2. **Graceful Downgrade Engine**:
   - Khi meeting hết hạn mức token Pro (hoặc khi Cloud LLM bị rate limit/hết credit), hệ thống KHÔNG báo lỗi ngắt phụ đề.
   - Thay vào đó, tự động chuyển đổi mượt mà (downgrade) sang engine dịch siêu tốc miễn phí (`google_gtx` -> `mymemory`) và đánh dấu trạng thái `downgraded: True`.
   - Phụ đề vẫn tiếp tục hiển thị liên tục không gián đoạn cuộc họp.
3. **API & Contract**:
   - Endpoint `GET /api/translation/usage/{meeting_id}`: trả về thống kê token đã dùng, quota còn lại, và trạng thái tier.
4. **UI Usage Status**:
   - Cập nhật hiển thị mức sử dụng token trong `MeetingSettingsDialog.tsx` hoặc thanh trạng thái cuộc họp.

---

## File cần chỉnh sửa & tạo mới

1. `apps/ai-service/app/config/settings.py`:
   - Thêm `PRO_MEETING_TOKEN_QUOTA: int = 100000`
   - Thêm `PRO_GRACEFUL_DOWNGRADE_ENABLED: bool = True`

2. `apps/ai-service/app/translation/quota_manager.py` (MỚI):
   - Lớp `TokenQuotaManager`:
     - `record_usage(meeting_id: str, text: str, translated: str, tier: str) -> int` (ước lượng token ~ 1 token / 4 ký tự hoặc character count).
     - `is_quota_exceeded(meeting_id: str) -> bool`
     - `get_usage(meeting_id: str) -> dict[str, Any]`
     - `reset_usage(meeting_id: str) -> None`

3. `apps/ai-service/app/translation/contextual_provider.py`:
   - Trước khi gọi `premium_provider.translate()`:
     - Kiểm tra `quota_manager.is_quota_exceeded(meetingId)`.
     - Nếu đã vượt quá quota -> ghi log thông báo graceful downgrade, đặt `self.last_provider_name = "downgraded_gtx"`, tự động dùng `fallback_provider`.
   - Sau khi dịch thành công -> ghi nhận usage qua `quota_manager.record_usage()`.

4. `apps/ai-service/app/api/providers.py`:
   - Thêm route `GET /usage/{meeting_id}`.

5. `apps/ai-service/tests/test_token_quota_and_downgrade.py` (MỚI):
   - Test đếm token/usage khi dịch qua Premium AI.
   - Test tự động hạ cấp về fallback khi chạm ngưỡng quota mà không ném lỗi.
   - Test API `GET /api/translation/usage/{meeting_id}`.

---

## Quality Gates
- [ ] `python -m pytest apps/ai-service/tests/test_token_quota_and_downgrade.py -v` -> Pass 100%
- [ ] `python -m pytest tests/ apps/ai-service/tests/ -v` -> Pass toàn bộ
- [ ] `cd apps/web && npm run lint && npm run build` -> Pass
