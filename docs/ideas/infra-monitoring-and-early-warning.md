# Infrastructure Capacity Monitoring & Early Warning System (Hạ Tầng & Cảnh Báo Sớm)

## Problem Statement
Làm thế nào để người vận hành LayaMeet nắm bắt theo thời gian thực năng lực chịu tải của từng microservice (LiveKit Media Server, Faster-Whisper AI STT, Redis Cache, PostgreSQL), dự báo trước điểm nghẽn để chủ động nâng cấp server, và nhận cảnh báo sớm qua Telegram trước khi hệ thống chạm ngưỡng sập?

## Recommended Direction
Xây dựng giải pháp giám sát hạ tầng & cảnh báo sớm 3 lớp được tích hợp trực tiếp vào kiến trúc hiện hữu mà không cần cài đặt thêm agent bên thứ ba nặng nề (như Prometheus/Grafana full stack):

1. **Lớp Thu Thập & Đo Đạc (Backend Telemetry & Early Warning Engine)**:
   - Mở rộng [`AdminController.cs`](file:///D:/MyProject/AI-Translate-Meeting/apps/api/Controllers/AdminController.cs) với endpoint `GET /api/admin/infra-metrics` tổng hợp:
     - **Tài nguyên máy chủ**: Process Memory (Working Set MB, GC Heap), CPU Load estimate, Thread pool utilization.
     - **Tải phòng họp & Media**: Số phòng đang hoạt động (Active Rooms), Tổng số người đang tham gia (Active Participants), Tỷ lệ sử dụng License capacity (ví dụ: $X/25$ phòng = $Y\%$).
     - **Tải AI STT Pipeline**: Trạng thái Whisper model preload, hàng đợi chunk âm thanh, độ trễ STT trung bình (TTFS ~964ms).
     - **Dữ liệu & Bộ nhớ đệm**: Độ trễ Redis Ping (ms), Số lượng cache keys bản dịch, Trạng thái PostgreSQL pool connection.
   - Cơ chế **Background Alerting Watcher** chạy định kỳ mỗi 30-60 giây:
     - So sánh các chỉ số với ngưỡng cảnh báo (Warning: CCU > 75%, Critical: CCU > 90% hoặc STT latency > 2000ms hoặc Redis ngắt kết nối).
     - Gửi thông báo khẩn cấp tự động qua Telegram (sử dụng [`NotificationDispatcher.cs`](file:///D:/MyProject/AI-Translate-Meeting/apps/api/Services/NotificationDispatcher.cs)) với định dạng Markdown HTML, icon cảnh báo ⚠️ / 🚨, và cơ chế Cooldown (chống spam thông báo liên tục).

2. **Giao diện Quản trị & Dự báo Dung lượng (Admin Dashboard Tab: 'Hạ Tầng & Cảnh Báo')**:
   - Thêm tab thứ 4 vào [`AdminDashboardPage.tsx`](file:///D:/MyProject/AI-Translate-Meeting/apps/web/src/pages/AdminDashboardPage.tsx) hiển thị:
     - **Thanh đo sức khỏe tổng thể (System Health Meter)**: Đèn trạng thái Xanh/Vàng/Đỏ (Normal / Warning / Critical).
     - **Thẻ chỉ số thời gian thực (Live Vitals Grid)**: RAM, CPU, Active Rooms, Active Peers, Redis RTT, DB Ping.
     - **Công cụ Dự báo & Tính toán Scale Hạ Tầng (Interactive Capacity & Scale Calculator)**:
       - Thanh trượt (Slider) chọn số người họp đồng thời mục tiêu (CCU: 10, 50, 100, 500, 1000).
       - Tự động tính toán cấu hình phần cứng khuyến nghị (Số vCPU, Dung lượng RAM, Băng thông mạng Network Bandwidth, GPU T4/A10G khi vượt ngưỡng CPU).
       - Ước tính chi phí thuê VPS hàng tháng (Hetzner, OVH, AWS, DigitalOcean) giúp người vận hành quyết định khi nào cần nâng cấp gói VPS.
     - **Lịch sử Cảnh báo & Nút Test Alert**: Xem các lần cảnh báo gần nhất và nút bắn thử cảnh báo mẫu về Telegram.

## Key Assumptions to Validate
- [ ] **Assumption 1**: API .NET và AI Service có thể lấy được số đo tài nguyên RAM/CPU trong môi trường Docker Linux container một cách an toàn mà không bị permission denied.
  - *Cách kiểm chứng*: Sử dụng `System.Diagnostics.Process.GetCurrentProcess()` và đọc `/sys/fs/cgroup/` (hoặc GC memory stats).
- [ ] **Assumption 2**: Telegram Bot gửi tin nhắn cảnh báo trong vòng < 2 giây khi phát hiện vượt ngưỡng critical và không làm gián đoạn luồng xử lý API.
  - *Cách kiểm chứng*: Kiểm tra `NotificationDispatcher.SendTestNotificationAsync` bất đồng bộ (non-blocking task).
- [ ] **Assumption 3**: Bộ tính toán dung lượng (Capacity Calculator) đưa ra công thức tính toán sát với thực tế kiểm nghiệm Whisper int8 (mỗi phòng chiếm ~15-25% vCPU CPU và ~1.2 MB/s media bandwidth).
  - *Cách kiểm chứng*: Đo đạc thực nghiệm khi có 1 phòng, 3 phòng, 5 phòng đồng thời.

## MVP Scope (Phạm vi triển khai bản đầu tiên)
- **In Scope (Những việc sẽ làm)**:
  1. Thêm DTO `InfraMetricsDto` và endpoint `GET /api/admin/infra-metrics` trong `AdminController.cs`.
  2. Đo đạc: RAM tiến trình, active rooms, active participants, dung lượng license còn lại, trạng thái Redis/DB/AI Service.
  3. Thêm phương thức `DispatchSystemAlertAsync` trong `NotificationDispatcher.cs` hỗ trợ cảnh báo ⚠️ WARNING và 🚨 CRITICAL qua Telegram kèm cooldown 5 phút để tránh spam.
  4. Tạo Background Service `InfraMonitoringBackgroundService` quét định kỳ kiểm tra các ngưỡng nguy hiểm.
  5. Thêm tab **Hạ tầng & Cảnh báo** vào `AdminDashboardPage.tsx` với:
     - Real-time gauge metrics (Cập nhật tự động mỗi 5-10s hoặc nút Làm mới).
     - Thẻ cảnh báo ngưỡng an toàn.
     - Interactive Capacity Planning Calculator (Kéo chọn CCU -> hiển thị cấu hình server & chi phí VPS tối ưu).
     - Nút kiểm tra bắn cảnh báo Telegram mẫu.

- **Not Doing (and Why) - Những việc chủ động KHÔNG làm ở MVP**:
  - *Không cài đặt cụm Prometheus / Grafana / Alertmanager đồ sộ*: Vì tốn thêm 1-2 GB RAM của VPS và tăng độ phức tạp vận hành không cần thiết cho quy mô hiện tại.
  - *Không tự động auto-scale cụm Kubernetes*: Hiện tại hệ thống chạy Docker Compose trên máy chủ độc lập/VPS, việc auto-scale hạ tầng tầng cloud cần quản lý qua API nhà cung cấp cloud (sẽ làm ở giai đoạn Enterprise Cluster).
  - *Không can thiệp ngắt kết nối cưỡng chế phòng đang họp*: Cảnh báo sớm nhằm thông báo cho chủ hệ thống nâng cấp hoặc kiểm soát, tránh tự ý ngắt phiên họp làm hỏng trải nghiệm người dùng.

## Open Questions & Decided Choices
1. *Tần suất quét ngưỡng cảnh báo ngầm?* -> Đề xuất: 30 giây một lần để phát hiện nhanh chóng trước khi server tràn RAM.
2. *Ngưỡng cảnh báo mặc định?* -> Phòng họp >= 80% quota (Warning), >= 95% quota (Critical); Memory tiến trình >= 1.5 GB (Warning), >= 2.5 GB (Critical); DB/Redis unreachable (Critical).
