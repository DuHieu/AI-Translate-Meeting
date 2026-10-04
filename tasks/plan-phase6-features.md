# Kế Hoạch Triển Khai Giai Đoạn 6 (Phase 6 Roadmap)
> **Yêu cầu cốt lõi:** Thực hiện tuần tự 4 tính năng qua Codex CLI (`gpt-5.6-sol`), tất cả đều hỗ trợ bật/tắt linh hoạt trong Settings Dialog (`SidecarPreferences`).

---

## 1. Feature 1: In-Meeting File Sharing & Instant Document Translation (`fileSharing`)
- **Toggle Setting:** `fileSharing: boolean` (Cài đặt -> Tiện ích -> Chia sẻ tệp đính kèm).
- **Frontend UI:**
  - Nút đính kèm tệp (Paperclip icon) trong tab Chat của `SubtitlePanel.tsx`.
  - Hỗ trợ chọn tệp (PDF/TXT/IMG), hiển thị tệp đính kèm trong danh sách tin nhắn.
  - Tự động cung cấp bản dịch tóm tắt tài liệu bằng AI.
  - Khi tắt trong Setting: Ẩn hoàn toàn nút đính kèm và khu vực tải tệp.

## 2. Feature 2: Automated AI Recording & Video Export (`meetingRecording`)
- **Toggle Setting:** `meetingRecording: boolean` (Cài đặt -> Tiện ích -> Ghi hình cuộc họp).
- **Frontend UI:**
  - Nút "Ghi hình" / "Dừng ghi" trên `MeetingBottomBar.tsx` (dành cho host/user).
  - Trạng thái chấm đỏ "REC" nhấp nháy trên `MeetingTopBar.tsx` khi đang ghi hình.
  - Tự động hiển thị bản ghi có thể tải về trong `PostMeetingModal.tsx` khi kết thúc họp.
  - Khi tắt trong Setting: Ẩn nút ghi hình và chỉ báo REC.

## 3. Feature 3: End-to-End Encryption (E2EE) Mode (`e2eeEnabled`)
- **Toggle Setting:** `e2eeEnabled: boolean` (Cài đặt -> Tiện ích -> Mã hóa đầu cuối E2EE).
- **Frontend UI:**
  - Khi bật: Hiển thị huy hiệu "E2EE Secured 🔒" màu xanh ngọc trên `MeetingTopBar.tsx`, hỗ trợ nhập mật khẩu phòng bảo mật.
  - Khi tắt trong Setting: Trở về chế độ mã hóa TLS chuẩn, ẩn huy hiệu E2EE.

## 4. Feature 4: External Meeting Bridge & Floating Subtitle Widget (`floatingSubtitleWidget`)
- **Toggle Setting:** `floatingSubtitleWidget: boolean` (Cài đặt -> Tiện ích -> Cửa sổ phụ đề nổi PiP).
- **Frontend UI:**
  - Nút "Phụ đề nổi (PiP)" trên thanh điều khiển hoặc menu tiện ích.
  - Khi mở: Kích hoạt cửa sổ phụ đề nhỏ gọn (Floating Picture-in-Picture / Widget) có thể đè lên các ứng dụng khác như Google Meet / Zoom.
  - Khi tắt trong Setting: Ẩn hoàn toàn nút tính năng này.
