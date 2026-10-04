# Quyết Định Kiến Trúc: Đăng Nhập Google (Google OAuth) Trong ViMeet

**Trạng thái:** Chốt hướng đi sản phẩm (Converged)  
**Ngày thực hiện:** 2026-10-04  
**Quyết định:** **KHÔNG BẮT BUỘC ĐĂNG NHẬP Ở HIỆN TẠI (Zero-Friction First) — Thiết kế theo mô hình Hybrid Tùy Chọn (Progressive Authentication).**

---

## 1. Problem Statement & Context

Làm thế nào để ViMeet vừa đạt được **tỷ lệ dùng thử và chuyển đổi tối đa (Zero-Friction Viral Adoption)** cho cả khách trong nước lẫn đối tác nước ngoài (Nhật, Mỹ, Trung...), vừa cho phép người dùng **lưu trữ lịch sử cuộc họp & biên bản recap cá nhân** khi có nhu cầu mà không làm phức tạp hóa kiến trúc On-Premise/Private Cloud?

---

## 2. Phân Tích Đa Chiều: Nên hay Không Nên?

### A. Mặt Trái Nếu Ép Bắt Buộc Google Login Ngay Bây Giờ (Anti-Patterns)
1. **Rào cản khách hàng doanh nghiệp & Khách quốc tế (High Friction)**:
   * Khi một công ty Việt Nam gửi link họp cho đối tác Nhật Bản hoặc đối tác Trung Quốc: Nếu màn hình hiện popup bắt đăng nhập Google, 40-60% khách sẽ ngần ngại hoặc từ chối do chính sách bảo mật thiết bị của đối tác (nhiều công ty Nhật cấm đăng nhập tài khoản cá nhân trên máy công ty, hoặc phía Trung Quốc bị chặn dịch vụ Google).
2. **Xung đột triết lý "On-Premise / Air-gapped / Zero Data Retention"**:
   * ViMeet đang tạo điểm nhấn cạnh tranh cực lớn nhờ cam kết: *Không lưu audio, không cần tài khoản, dữ liệu không rời khỏi hạ tầng nội bộ*. Nếu gắn chặt backend với Google OAuth API, việc triển khai mạng nội bộ cô lập (Air-gapped) sẽ gặp rào cản phụ thuộc dịch vụ bên thứ ba.
3. **Phát sinh chi phí bảo trì & Quản lý User DB**:
   * Khi có User Authentication, hệ thống phải gánh thêm: Bảng quản lý `Users`, chính sách GDPR/Xóa tài khoản, Token Refresh Lifecycle, thu hồi phiên làm việc, quản lý thông tin định danh PII.

### B. Giá Trị Thực Sự Của Google Login (Nếu Làm)
1. **Lưu trữ Dashboard cá nhân**: Xem lại lịch sử các phòng họp đã chủ trì.
2. **Lưu biên bản họp & Action Items**: Đồng bộ tóm tắt AI Recap vào Google Docs hoặc Google Calendar.
3. **Chống spam phòng họp**: Hạn chế người dùng ẩn danh tạo hàng loạt phòng ảo làm quá tải AI Engine.

---

## 3. Recommended Direction: "Progressive Authentication" (Xác Thực Tăng Tiến)

Thay vì "Bắt buộc đăng nhập", áp dụng chiến lược sản phẩm **Tự do trải nghiệm -> Đăng nhập để nhận giá trị gia tăng**:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Giai đoạn 1 (Hiện tại - Launch & Viral PoC):                            │
│ 100% Zero-Friction: Bấm "Tạo cuộc họp" hoặc "Vào phòng" ngay tức thì.    │
│ Lưu trữ phiên qua LocalStorage & Capability Token (HostToken/Session).   │
├─────────────────────────────────────────────────────────────────────────┤
│ Giai đoạn 2 (Sau khi có tệp người dùng thường xuyên - Hybrid Opt-in):    │
│ [Tùy chọn] Nút "Đăng nhập Google" chỉ xuất hiện ở góc trên hoặc sau khi  │
│ kết thúc cuộc họp: "Đăng nhập để tự động lưu biên bản vào Google Drive".│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. MVP Scope & Kiến Trúc Kỹ Thuật Khi Triển Khai (Phase 2 Roadmap)

Khi bước sang giai đoạn bổ sung Google Login, kiến trúc sẽ được thiết kế theo dạng **Plug-and-Play Module**:

1. **Frontend (`apps/web`)**:
   * Sử dụng `@react-oauth/google` hoặc chuẩn OAuth2 Authorization Code Flow with PKCE.
   * Giao diện: Nút "Sign in with Google" ở Navbar (Không chặn luồng vào phòng họp).
   * Màn hình kết thúc cuộc họp: Banner gợi ý *"Lưu trữ biên bản họp này vào tài khoản của bạn? [Tiếp tục với Google]"*.

2. **Backend API (`apps/api`)**:
   * Tích hợp `Microsoft.AspNetCore.Authentication.Google` / JWT Bearer Validation.
   * Tạo bảng quan hệ `user_meetings` nhẹ nhàng: liên kết `MeetingId` với `GoogleSubjectId` mà không lưu trữ dữ liệu âm thanh nhạy cảm.
   * Cơ chế Fallback: Nếu không đăng nhập, phòng họp vẫn hoạt động bình thường với quyền Host tạm thời.

---

## 5. Danh Sách "Not Doing" (Những Việc Tuyệt Đối Không Làm)

- ❌ **KHÔNG** bắt buộc khách tham dự (Participants/Guests) phải đăng nhập tài khoản. Khách chỉ cần nhập Tên hiển thị + Chọn ngôn ngữ là vào phòng họp.
- ❌ **KHÔNG** khóa tính năng dịch thời gian thực hay tính năng phụ đề đằng sau paywall đăng nhập.
- ❌ **KHÔNG** lưu token OAuth của Google hay dữ liệu cá nhân vào log máy chủ.
- ❌ **KHÔNG** làm phụ thuộc cứng (hard dependency) khiến bản Docker On-Premise không khởi động được nếu không cấu hình Google Client ID.

---

## 6. Kết Luận & Hành Động Tiếp Theo

* **Chốt**: Giữ nguyên trạng thái **Zero-Friction** ở giai đoạn hiện tại để tối ưu trải nghiệm, chứng minh năng lực AI và đẩy mạnh public GitHub / PoC.
* Đưa tính năng **Google Login & Lưu trữ Dashboard Cloud** vào Sprint kế tiếp (P3 Backlog) dưới dạng tính năng tùy chọn (Opt-in Addon).
