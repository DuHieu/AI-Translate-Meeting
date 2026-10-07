# UI Refinement: Google Meet 2025 Frame + MS Teams AI Copilot & Speaker Country Flags

## Problem Statement
**How Might We:** Thiết kế trải nghiệm họp trực tuyến song ngữ AI từ Trang chủ → PreJoin → Phòng họp đạt độ tối giản, quen thuộc tức thì như **Google Meet 2025**, làm nổi bật sức mạnh Phụ đề/Biên bản AI như **Microsoft Teams Copilot**, đồng thời hiển thị **lá cờ quốc gia của ngôn ngữ người nói** trên mọi điểm chạm mà không bao giờ che khuất khung hình video hay tài liệu thuyết trình?

## Recommended Direction
Kết hợp **Khung xương tối giản của Google Meet 2025** với **Dedicated Caption Band & Speaker Language Flag của Microsoft Teams Interpreter**:

1. **Hệ thống Lá cờ Quốc gia cho Ngôn ngữ Người nói (Speaker Country Flag System)**:
   - Mỗi ngôn ngữ (`vi`, `en`, `ja`, `ko`, `zh`, `fr`, `de`, `es`) được chuẩn hoá với biểu tượng lá cờ quốc gia (`🇻🇳`, `🇺🇸`, `🇯🇵`, `🇰🇷`, `🇨🇳`, `🇫🇷`, `🇩🇪`, `🇪🇸`) và mã ISO ngắn gọn.
   - Hiển thị xuyên suốt tại:
     - **PreJoin Lobby**: Trong bộ chọn *"Ngôn ngữ bạn nói"* / *"Xem phụ đề bằng"* và trên pill trạng thái góc dưới khung Camera Preview (`🇻🇳 VI → 🇯🇵 JA`).
     - **Ô Video Người tham gia (`ParticipantTile`)**: Gắn trực tiếp lá cờ ngôn ngữ người đó đang nói bên cạnh tên hiển thị (`🇻🇳 Hieu (Bạn) · VI`).
     - **Dải Phụ đề Cố định (`SubtitleOverlay` - Dedicated Caption Band)**: Hiển thị rõ người phát biểu kèm lá cờ ngôn ngữ gốc → lá cờ ngôn ngữ dịch (`🇻🇳 VI → 🇯🇵 JA`) và bộ chuyển nhanh ngôn ngữ đích có cờ quốc gia.
     - **Danh sách Người tham gia (`ParticipantsPanel`) & Lịch sử Phụ đề (`LiveSubtitleView`)**: Hiển thị badge lá cờ ngôn ngữ nói của từng thành viên.

2. **Dedicated Bilingual Caption Band (Dải Phụ đề Cố định chuẩn Google Meet / MS Teams)**:
   - Thay vì dùng hộp phụ đề nổi đè lên video/slide, dải phụ đề nằm cố định ở khu vực riêng bên dưới `MeetingStage` và phía trên `MeetingBottomBar`.
   - Khi có phụ đề hoặc trạng thái dịch, khung video tự co chiều cao mượt mà (`flex-1 min-h-0`), đảm bảo **0% nội dung chia sẻ màn hình hay khuôn mặt bị che khuất**.
   - Tích hợp nút bật/tắt song ngữ và đổi nhanh ngôn ngữ đọc phụ đề ngay trên dải phụ đề.

3. **Progressive Disclosure Bottom Bar (Thanh công cụ gom nhóm chuẩn Google Meet)**:
   - Cụm trung tâm chỉ giữ các thao tác cốt lõi (`Mic`, `Camera`, `CC Phụ đề song ngữ`, `Chia sẻ màn hình`, `Giơ tay`, `Biểu cảm`, `⋮ Tùy chọn khác`, `Rời phòng`).
   - Gom các tính năng chuyên sâu (`Audio Booth - Cabin phiên dịch`, `Ghi hình cuộc họp`, `Phụ đề nổi PiP`, `Đổi bố cục Layout`, `Cài đặt`) vào menu nổi **`⋮ Tùy chọn khác`** sạch sẽ, dễ tìm.

## Key Assumptions to Validate
- [x] **Assumption 1**: Dải phụ đề cố định (`Dedicated Caption Band`) bên dưới khung video giúp người dùng đọc phụ đề song ngữ liên tục mà không che mất bảng tính/slide khi thuyết trình.
- [x] **Assumption 2**: Gắn lá cờ quốc gia cạnh tên người nói trên ô video và trong dòng phụ đề giúp các thành viên đa quốc gia nhận biết ngay ai đang nói thứ tiếng nào chỉ trong 0.2 giây.
- [x] **Assumption 3**: Gom các công cụ phụ trợ vào menu `⋮ Tùy chọn khác` giúp thanh điều khiển đáy gọn gàng trên cả màn hình laptop 13 inch lẫn mobile.

## MVP Scope
- Chuẩn hoá metadata lá cờ quốc gia (`flag`, `shortLabel`) trong `types/meeting.ts` cho toàn bộ 8 ngôn ngữ hỗ trợ.
- Nâng cấp `PreJoinPage.tsx` với dropdown ngôn ngữ có cờ quốc gia và pill trạng thái dịch trực tiếp trên góc khung thử camera.
- Nâng cấp `ParticipantTile.tsx`, `MeetingStage.tsx`, `ParticipantsPanel.tsx`, `LiveSubtitleView.tsx` hiển thị lá cờ ngôn ngữ người nói.
- Chuyển `SubtitleOverlay.tsx` thành **Dedicated Caption Band** chuẩn Google Meet / MS Teams kèm bộ chọn nhanh ngôn ngữ đích.
- Tinh gọn `MeetingBottomBar.tsx` với menu `⋮ Tùy chọn khác` (More Options Popover).

## Not Doing (and Why)
- **Không làm thanh điều hướng dọc bên trái như ứng dụng cài đặt của Teams/Zoom** — Giữ tối đa chiều ngang cho khung video và tài liệu chia sẻ màn hình trên trình duyệt.
- **Không mở chồng chéo 2 panel bên phải cùng lúc** — Duy trì cơ chế 1 Side Drawer duy nhất (mở *Người tham gia* sẽ tự đóng *AI Copilot/Phụ đề* và ngược lại).
- **Không đè hộp phụ đề lớn lên giữa khung video** — Đã thay bằng Dải phụ đề cố định bên dưới sân khấu video.
