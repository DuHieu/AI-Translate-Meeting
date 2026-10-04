# Kế Hoạch Triển Khai Cỗ Máy Thu Tiền Tự Động (Phase 7 - Monetization Engine)

> **Cơ chế:** Antigravity (Orchestrator) ↔ Codex CLI gpt-5.6-sol (Executor)  
> **Mục tiêu:** Chuyển hóa ViMeet thành nền tảng thu phí tự động 100% qua VietQR, chuyển đổi người dùng miễn phí sang trả phí (Chiến lược Zoom 40 phút) và thu thập khách hàng doanh nghiệp On-Premise.

---

## Task 1: Cổng Thanh Toán VietQR Tự Động (Backend Billing & Webhook)
- **Mục tiêu:** Tạo đơn hàng thanh toán và kích hoạt gói Pro tự động khi tiền về tài khoản ngân hàng.
- **Backend (.NET API):**
  - DTOs: `CreatePaymentOrderRequest`, `PaymentOrderResponse`, `PaymentWebhookPayload`.
  - Service & Controller: `BillingController.cs` (`POST /api/billing/create-order`, `GET /api/billing/order/{orderCode}`, `POST /api/billing/webhook`).
  - Tự động sinh URL VietQR động Napas 247: `https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png?amount={AMOUNT}&addInfo={ORDER_CODE}`.

## Task 2: Giới Hạn Phòng Họp Miễn Phí 40 Phút (Trial Limit Guard & Conversion)
- **Mục tiêu:** Thúc đẩy người dùng chuyển đổi trả phí bằng cơ chế giới hạn thời gian họp.
- **Frontend UI:**
  - Đồng hồ đếm ngược 40 phút trên `MeetingTopBar.tsx` cho phòng Free.
  - Cảnh báo Toast khi còn 5 phút.
  - Khóa cuộc họp và mở `UpgradeModal.tsx` khi hết 40 phút với nút quét mã VietQR mở khóa tức thì mà không cần tạo phòng mới.

## Task 3: Modal Bảng Giá & Thanh Toán VietQR Tức Thì (`CheckoutModal.tsx`)
- **Mục tiêu:** Trải nghiệm thanh toán 1-chạm không ma sát (Frictionless Checkout).
- **Frontend UI:**
  - `CheckoutModal.tsx` hiển thị mã QR ngân hàng VietQR động, số tài khoản, số tiền và mã nội dung chuyển khoản.
  - Polling tự động kiểm tra trạng thái thanh toán mỗi 2.5 giây.
  - Hiệu ứng thành công mở khóa ngay lập tức khi thanh toán hoàn tất.

## Task 4: Thu Thập Khách Hàng Doanh Nghiệp & Báo Về Telegram (`LeadCapture`)
- **Mục tiêu:** Bắt trọn thông tin khách hàng doanh nghiệp muốn mua bản quyền On-premise.
- **Backend & Frontend:**
  - API `POST /api/system/lead`: Nhận thông tin từ `ContactSection.tsx`, lưu database và hỗ trợ bắn Webhook thông báo (Telegram / Slack).
  - Kết nối form `ContactSection.tsx` gọi API thật thay vì mô phỏng `setTimeout`.
