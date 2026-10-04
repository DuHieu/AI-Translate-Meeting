# Enterprise Live Audio Booth & Turnkey Appliance

## Problem Statement
Làm sao để người tham gia cuộc họp doanh nghiệp on-premise nghe được tiếng phiên dịch song ngữ trực tiếp qua tai nghe (với âm thanh gốc tự động giảm nhỏ -18dB) và theo dõi tối đa 8–12 câu phụ đề tinh gọn, trong khi quản trị viên IT có thể triển khai toàn bộ hệ thống lên VPS chỉ bằng 1 dòng lệnh duy nhất mà không tốn thêm tài nguyên máy chủ?

## Recommended Direction: "Zero-Server-Cost Client Audio Booth"
1. **Live-First Sidecar UI (Tối giản & Trọng tâm)**:
   - Header Sidecar gồm: Chọn ngôn ngữ đích, nút bật/tắt hiển thị câu gốc, nút Export (SRT/TXT), và nút đóng.
   - Vùng phụ đề chỉ giữ lại 8–12 câu `isFinal` gần nhất, tự động trượt mượt mà (smooth auto-scroll).
   - Trên màn hình nhỏ/mobile: Chuyển đổi thành bottom-sheet gọn gàng, không che khuất mặt người nói.
2. **Simultaneous Audio Booth (Cabin phiên dịch không tốn server)**:
   - Tích hợp nút Cabin Tai nghe trên thanh điều khiển.
   - Khi câu dịch hoàn thành, Web Speech API đọc bản dịch vào tai nghe người dùng, đồng thời hạ volume của remote participant xuống -18dB (180ms ramp). Khi đọc xong, trả volume về 100%.
   - Queue thông minh: Tự động drop câu cũ nếu bị trễ > 2.5s, không tự đọc lại giọng của chính mình.
3. **Turnkey VPS Deployment Package**:
   - Chuẩn hóa script `setup-self-hosted.sh` và `smoke-test.sh` với cờ kiểm tra domain, SSL Let's Encrypt tự động, và pass toàn bộ 20 điểm kiểm thử khói.

## Key Assumptions to Validate
- [ ] User gesture kích hoạt Audio Booth vượt qua hoàn toàn chính sách autoplay audio của Chrome/Edge/Safari.
- [ ] GainNode ducking hoạt động ổn định trên cả kênh chia sẻ màn hình (screen share audio) lẫn micro thông thường.
- [ ] Script cài đặt VPS chạy mượt mà trên Ubuntu 22.04 / Debian 12 mới tinh mà không cần cài đặt thủ công thêm công cụ nào khác ngoài Docker.

## MVP Scope (Những việc SẼ LÀM)
- [x] Tích hợp `LiveSubtitleView.tsx` vào `MeetingShell.tsx`, giới hạn 8–12 câu và hỗ trợ nút tải SRT/TXT.
- [x] Hoàn thiện `useAudioBooth.ts` kết nối với `audioDuckingRegistry.ts` và thanh điều chỉnh âm lượng Ducking.
- [x] Rà soát và cập nhật `setup-self-hosted.sh`, `docs/self-hosted-product.md` đảm bảo 1-click bootstrap hoàn chỉnh.
- [x] Chạy bộ kiểm thử tự động toàn diện (.NET tests, Python tests, Frontend build & lint).

## Not Doing (Những việc DỨT KHOÁT KHÔNG LÀM ở bản này)
- **Không dựng Server Neural TTS (Piper/Coqui/ElevenLabs)**: Để giữ VPS nhẹ và không tốn chi phí GPU.
- **Không nhái giọng (Voice Cloning)**: Phức tạp, độ trễ cao, không khả thi cho real-time họp.
- **Không hỗ trợ dịch dở dang (Interim Audio)**: Chỉ đọc câu `isFinal` để tránh hiện tượng nói ngắc ngứ đè tiếng.
- **Không lưu audio riêng tư của user trên server**: Tuân thủ bảo mật On-premise, client tự xử lý TTS tại máy cục bộ.

## Open Questions
- Với ngôn ngữ tiếng Nhật (`ja-JP`), tốc độ đọc mặc định của trình duyệt có cần đẩy nhanh lên 1.1x để kịp nhịp tiếng Việt không?
