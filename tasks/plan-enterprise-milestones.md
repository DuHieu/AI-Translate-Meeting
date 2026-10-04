# Kế Hoạch Triển Khai Tuần Tự 4 Giai Đoạn (Enterprise Milestones Roadmap)

> **Cơ chế điều phối:** Antigravity (Orchestrator) ↔ Codex CLI gpt-5.6-sol (Executor)  
> **Mục tiêu:** Thực hiện tuần tự 4 Option, đảm bảo các Quality Gates luôn đạt 100% (Green).

---

## Giai đoạn 1 (Option 1): AI Meeting Minutes & Post-Meeting Recap
- **Mục tiêu:** Trích xuất tự động biên bản họp chuyên nghiệp, lưu trữ vào cơ sở dữ liệu và cho phép xem lại/xuất PDF/Markdown.
- **Nhiệm vụ:**
  1. API Backend: Thêm endpoint `POST /api/meetings/{id}/minutes` và `GET /api/meetings/{id}/minutes`, DTOs cho Meeting Minutes.
  2. Frontend UI: Tích hợp Post-Meeting Summary Modal khi rời phòng hoặc kết thúc cuộc họp, hiển thị Decisions, Action Items và nút in/xuất biên bản.
  3. Kiểm thử: Thêm Unit/Integration tests cho API Controller và Service.

---

## Giai đoạn 2 (Option 2): Production Staging Rehearsal & Live VPS Deployment
- **Mục tiêu:** Đóng gói trọn vẹn kịch bản triển khai VPS tự động, SSL Let's Encrypt và kiểm thử khói.
- **Nhiệm vụ:**
  1. Rà soát & nâng cấp `scripts/setup-self-hosted.sh` và `scripts/smoke-test.sh`.
  2. Bổ sung script kiểm thử cấu hình Nginx/SSL giả lập.
  3. Kiểm thử hợp đồng VPS deployment đạt 100%.

---

## Giai đoạn 3 (Option 3): Advanced In-Meeting Collaboration
- **Mục tiêu:** Bổ sung tính năng giơ tay (Raise Hand Queue), chia sẻ màn hình kèm âm thanh và phản ứng cảm xúc thời gian thực.
- **Nhiệm vụ:**
  1. Thêm tính năng Giơ tay phát biểu (Raise Hand) đồng bộ qua LiveKit Data Channel.
  2. Thêm thanh thả biểu cảm nhanh (Emoji Reactions: 👍, 👏, ❤️, 🎉).
  3. Tối ưu chia sẻ màn hình kèm âm thanh hệ thống.

---

## Giai đoạn 4 (Option 4): Business Glossary & Translation Quality Enhancement
- **Mục tiêu:** Tùy biến từ điển thuật ngữ chuyên ngành doanh nghiệp và mở rộng ngôn ngữ.
- **Nhiệm vụ:**
  1. Nâng cấp `glossary.py` trong AI Service hỗ trợ nạp thuật ngữ phòng họp động.
  2. Thêm endpoint API quản lý Custom Glossary.
  3. Mở rộng danh sách ngôn ngữ hỗ trợ (`ko`, `zh`, `fr`) và kiểm thử toàn diện.
