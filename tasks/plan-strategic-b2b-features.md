# Kế Hoạch Triển Khai 6 Tính Năng Chiến Lược B2B & Product-Led Growth (LayaMeet)

> **Cơ chế điều phối:** Antigravity (Orchestrator) ↔ Codex CLI (Executor)  
> **Mục tiêu:** Triển khai trọn vẹn 6 tính năng theo bảng ưu tiên chiến lược của LayaMeet, đảm bảo vượt qua 100% các cổng kiểm thử (`pytest`, `dotnet test`, `npm run lint`, `npm run build`).

---

## Ưu tiên 1: Custom Business Glossary (Từ điển thuật ngữ doanh nghiệp)
- **Backend / API Integration:**
  - Kết nối với endpoint sẵn có của AI Service: `GET /api/glossary/{meetingCode}` và `POST /api/glossary/{meetingCode}` (`{ terms: Record<string, string> }`).
  - Bổ sung `getRoomGlossary(meetingCode)` và `updateRoomGlossary(meetingCode, terms)` trong `apps/web/src/api/meetingApi.ts`.
- **Frontend UI (`MeetingSettingsDialog.tsx`):**
  - Trong tab `subtitles` (Phụ đề & Dịch AI), bên dưới chọn lĩnh vực từ điển (`glossaryDomain`), bổ sung khu vực **Từ điển thuật ngữ riêng (Custom Business Glossary)**.
  - Cho phép thêm cặp `Thuật ngữ gốc -> Bản dịch chuẩn` (ví dụ: `EBITDA -> Lợi nhuận trước thuế và lãi vay`, `PRD -> Tài liệu đặc tả sản phẩm`), xóa từng mục, lưu vào `userSettings` và đồng bộ lên phòng họp hiện tại.

## Ưu tiên 2: Viral Public Meeting Recap (`/recap/:meetingCode`)
- **Trang Chia Sẻ Tương Tác (`apps/web/src/pages/PublicRecapPage.tsx` & `apps/web/src/App.tsx`):**
  - Thêm route `/recap/:meetingCode` trong `App.tsx`.
  - Tự động tải biên bản cuộc họp từ `meetingApi.getMeetingMinutes(meetingCode)` (hỗ trợ lưu/đọc cache localStorage theo mã phòng để xem ngay cả khi vừa kết thúc họp).
  - Hiển thị giao diện hiện đại gồm: Tiêu đề phòng họp, Executive Highlights, Decisions, danh sách Action Items (kèm Owner, Deadline, Priority), nội dung chi tiết và nút sao chép link chia sẻ.
  - Gắn khối **CTA Viral (Product-Led Growth)** nổi bật ở cuối trang: *"Tổ chức cuộc họp song ngữ miễn phí với LayaMeet"* dẫn về trang chủ `/`.
  - Cập nhật `PostMeetingModal.tsx` để có thể mở hoặc sao chép nhanh đường dẫn `/recap/:meetingCode`.

## Ưu tiên 3: PiP Subtitle Mode (Phụ đề nổi Picture-in-Picture)
- **Nâng cấp `apps/web/src/components/meeting/FloatingSubtitleWidget.tsx`:**
  - Bổ sung nút **"Mở PiP ngoài màn hình"** sử dụng Web API `documentPictureInPicture` (khi trình duyệt hỗ trợ) để mở cửa sổ phụ đề nổi luôn nằm trên cùng khi chia sẻ màn hình PowerPoint hoặc chuyển sang tab khác, đồng thời tự động đồng bộ nội dung phụ đề song ngữ mới nhất vào cửa sổ PiP.
  - Giữ nguyên chế độ widget nổi kéo thả mượt mà bên trong trang làm fallback an toàn.

## Ưu tiên 4: Branded PDF Export (Xuất biên bản PDF có Logo công ty)
- **Bổ sung tiện ích xuất báo cáo chuẩn B2B (`apps/web/src/utils/brandedPdfExport.ts`):**
  - Tạo trình xuất báo cáo biên bản cuộc họp định dạng chuẩn in/PDF có gắn thương hiệu (`branding.brandName`, `branding.logoUrl`, `branding.primaryColor`, `branding.slogan`, `branding.copyrightText`), mã cuộc họp, thời gian, Executive Highlights, Decisions và bảng Action Items phân công rõ ràng.
  - Tích hợp nút **"Xuất biên bản PDF (.pdf)"** vào `PostMeetingModal.tsx`, `SubtitlePanel.tsx` (menu Export & tab Tóm tắt) và `PublicRecapPage.tsx`.

## Ưu tiên 5: 1-Click Sync Action Items sang Slack / Trello / Jira
- **Tích hợp Đồng bộ Quy trình Làm việc (`SubtitlePanel.tsx` & `PostMeetingModal.tsx`):**
  - Thêm khu vực / nút **"Đồng bộ 1-Click (Slack / Trello / Jira)"** trong phần Action Items / Recap.
  - Cho phép người dùng chọn nền tảng đích (`Slack`, `Trello`, `Jira` hoặc Custom Webhook URL lưu trong cài đặt) và bấm đồng bộ để đẩy danh sách Decisions & Action Items (hỗ trợ gọi Webhook hoặc sao chép/đóng gói payload chuẩn từng nền tảng kèm thông báo trạng thái thành công rõ ràng).

## Ưu tiên 6: AI Chat with Minutes (Hỏi đáp nội dung biên bản cuộc họp)
- **Trợ lý Hỏi Đáp Biên Bản Họp (`SubtitlePanel.tsx` tab `recap` & `PublicRecapPage.tsx`):**
  - Bổ sung khung **"Hỏi đáp AI với Biên bản họp"** ngay trong tab Tóm tắt (`recap`) và trang `PublicRecapPage`.
  - Cung cấp các chip câu hỏi gợi ý nhanh (ví dụ: *"Tóm tắt các quyết định chính?"*, *"Ai phụ trách các công việc cần làm?"*, *"Có rủi ro hay vấn đề gì nổi bật?"*) và ô nhập câu hỏi tự do.
  - Truy vấn thông minh trên dữ liệu `history` (transcript) và `recapResult`, trả lời ngắn gọn kèm trích dẫn thời điểm `[timestamp]` và tên người phát biểu.
