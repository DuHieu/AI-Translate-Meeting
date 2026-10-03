# PRD: Nền Tảng Họp Trực Tuyến & Dịch Song Ngữ Thời Gian Thực (AI-Translate-Meeting)

> **Tác giả:** AI Business Analyst (Bella) & Senior Product Architect  
> **Dự án:** AI-Translate-Meeting  
> **Phiên bản:** 1.2.0 (Self-Hosted Private Edition)  
> **Trạng thái:** Approved / Active Development  
> **Định vị sản phẩm:** Private bilingual AI meeting workspace dành cho đội dự án Việt–Nhật, có thể triển khai trong VPS/on-premise của khách hàng, tối ưu thuật ngữ dự án, phụ đề thời gian thực và biên bản hành động song ngữ.  
> **Nguyên tắc định vị:** Không cạnh tranh thay thế toàn diện Zoom, Microsoft Teams hay Google Meet (không xây dựng calendar/email suite hay voice cloning). Lợi thế cốt lõi là quyền tự chủ dữ liệu (Data Ownership), triển khai on-premise/VPS nội bộ, tối ưu sâu cặp ngôn ngữ Việt – Nhật – Anh, và biên bản hành động tức thì.

---

## 1. Bối cảnh & Vấn đề Cần Giải Quyết (Problem Statement)

### 1.1. Vấn đề thực tế
- Các buổi họp trực tuyến giữa đội ngũ kỹ sư Việt Nam và đối tác/khách hàng Nhật Bản thường gặp khó khăn nghiêm trọng về ngôn ngữ kỹ thuật và ngữ cảnh dự án.
- Doanh nghiệp không muốn gửi âm thanh, transcript hoặc tài liệu kỹ thuật bảo mật sang các dịch vụ SaaS ngoại vi đại trà do ràng buộc NDA và an toàn thông tin.
- Thông dịch viên con người làm tăng chi phí và kéo dài thời gian cuộc họp (dịch đuổi mất gấp đôi thời gian), không khả thi cho họp kỹ thuật hàng ngày (Standup, Sprint Review).
- Các nền tảng hội nghị phổ biến thiếu từ điển thuật ngữ kỹ thuật riêng (Domain Glossary) cho tên module, tên biến, bảng dữ liệu và thuật ngữ nghiệp vụ đặc thù của dự án.
- Sau cuộc họp, việc tổng hợp biên bản, trích xuất nhiệm vụ (Action Items) và các quyết định kỹ thuật (Decisions) thường tốn nhiều giờ và dễ thất lạc.

### 1.2. Giải pháp Cốt lõi của AI-Translate-Meeting
- **Private Self-Hosted Workspace**: Toàn bộ hệ thống triển khai trên VPS hoặc máy chủ On-Premise của khách hàng bằng Docker Compose.
- **Data Ownership Tuyệt Đối & Không Lưu Audio Thô**: Âm thanh chỉ xử lý tức thời trong RAM rồi hủy ngay lập tức; khách hàng toàn quyền kiểm soát retention và sao lưu.
- **Pipeline nhận dạng giọng nói (STT) & Dịch thuật chuyên biệt**: Chunk âm thanh 350ms, lọc khoảng lặng VAD, nhận dạng giọng nói Faster-Whisper int8 tối ưu trên CPU, kết hợp bộ nhớ đệm phân tán Redis (TTL 24h).
- **Domain Glossary theo dự án**: Hỗ trợ tập thuật ngữ kỹ thuật IT và kinh doanh Việt – Nhật – Anh, giảm thiểu dịch sai từ chuyên ngành.
- **Trợ lý thông minh Laya (Sidecar Non-blocking)**: Nhận diện tức thời các câu nói mang tính *Quyết định (Decision)* hoặc *Nhiệm vụ (Action Item)* mà không làm chậm dòng phụ đề.
- **Biên bản cuộc họp song ngữ đa định dạng**: Xuất biên bản họp (Markdown, Word .doc, Phụ đề .srt, Transcript .txt) chỉ với 1 cú click.

---

## 2. Đối tượng Người Dùng & Chân dung (User Personas)

### Persona 1: Nguyễn Văn An (Software Engineer / Tech Lead tại Việt Nam)
- **Nhu cầu:** Báo cáo tiến độ và thảo luận kỹ thuật với PM/Tech Lead người Nhật.
- **Khó khăn:** Tiếng Nhật giao tiếp chưa thành thạo, phát âm tiếng Anh có thể bị ảnh hưởng bởi ngữ điệu, dễ hiểu nhầm yêu cầu kỹ thuật phức tạp.
- **Kỳ vọng:** Khi mình nói tiếng Việt, đối tác lập tức nhìn thấy phụ đề tiếng Nhật; khi đối tác nói tiếng Nhật, mình nhìn thấy phụ đề tiếng Việt ngay dưới video stream.

### Persona 2: Kenji Sato (Project Manager tại Tokyo, Nhật Bản)
- **Nhu cầu:** Quản lý dự án offshore tại Việt Nam, theo dõi tiến độ, chốt phương án kiến trúc và phân công việc.
- **Khó khăn:** Không nói được tiếng Việt, các buổi họp kéo dài nếu phải dịch từng câu.
- **Kỳ vọng:** Cuộc họp diễn ra tự nhiên, sau cuộc họp nhận được danh sách việc cần làm (Action Items) và các quyết định đã thống nhất mà không cần tự ngồi gõ lại.

---

## 3. Phạm vi Tính năng (Scope of Features)

### 3.1. Quản lý Phòng Họp (Meeting Lifecycle)
- **Tạo phòng họp (Create Meeting):** Người dùng có thể tạo phòng họp mới với tên tùy chọn, hệ thống sinh mã phòng ngẫu nhiên 6 ký tự viết hoa (ví dụ: `Z8YGZL`).
- **Phòng chờ & Chuẩn bị (Pre-join Room):**
  - Xem trước camera và kiểm tra microphone (Audio level meter).
  - Chọn thiết bị Microphone và Camera cụ thể.
  - Thiết lập ngôn ngữ nói (`spokenLanguage`) và ngôn ngữ dịch mong muốn (`targetLanguage`) (hỗ trợ `vi`, `ja`, `en`).
  - Lưu cấu hình vào LocalStorage cho các lần truy cập tiếp theo.
- **Rời phòng & Kết thúc:** Thông báo cho backend cập nhật trạng thái người tham gia (`LeftAt`), dọn dẹp các track WebRTC an toàn.

### 3.2. Truyền thông Thời gian thực (Real-time WebRTC)
- Tích hợp **LiveKit Media Server** đảm bảo luồng video/audio mượt mà với adaptive bitrate và dynacast.
- Khởi tạo track tuần tự (Sequential Media Publishing) theo hợp đồng thiết bị để tránh xung đột đàm phán PeerConnection (`NegotiationError`).
- Bật/tắt Mic, Camera, Chia sẻ màn hình (Screen Share) với visual feedback rõ ràng.

### 3.3. Xử lý Âm thanh & Nhận dạng Giọng nói (STT Pipeline)
- **Audio Capture Chunks**: Thu âm từ microphone theo từng đoạn 350ms định dạng PCM 16kHz mono.
- **Voice Activity Detection (VAD)**:
  - Tính toán mức năng lượng và RMS của chunk âm thanh.
  - Bỏ qua các đoạn im lặng/tiếng ồn nền (< ngưỡng VAD), tiết kiệm 60–80% tài nguyên tính toán của mô hình STT.
- **Faster-Whisper STT**:
  - Mô hình `tiny` lượng tử hóa `int8`, tối ưu hóa đa luồng CPU local.
  - Hỗ trợ Interim/Partial Transcript: Phát hiện câu tạm thời mỗi ~700ms và chốt câu chính thức khi người dùng ngừng nói.

### 3.4. Dịch thuật Song ngữ Thời gian thực (Live Translation)
- Tự động dịch từ `sourceLanguage` sang `targetLanguage`.
- Tích hợp bộ nhớ đệm phân tán Redis (TTL 24 giờ) dựa trên hash `source:target:text`, loại bỏ chi phí dịch lặp lại cho các cụm từ phổ biến.
- Cơ chế Fallback dự phòng: Nếu dịch vụ dịch trực tuyến gặp sự cố, hệ thống chuyển sang local dictionary mà không làm gián đoạn cuộc họp.

### 3.5. Trợ lý Thông minh Laya (Meeting Intelligence)
- Kiến trúc **Sidecar Bất đồng bộ**: Ngay khi có phụ đề đã dịch, tin nhắn phụ đề được gửi ngay lập tức tới UI. Laya Service được gọi song song qua background task (`asyncio.create_task`).
- Tự động phát hiện ý định câu:
  - `action_item`: Giao việc, cam kết thời hạn, nhiệm vụ cần làm.
  - `decision`: Quyết định đã chốt, phương án thống nhất.
- Khi Laya trả về kết quả, gửi tin nhắn cập nhật tag badge (`decision`, `action_item`) vào phụ đề tương ứng mà không làm giật lag giao diện.

### 3.6. Giao diện Phụ đề & Xuất Biên bản Họp (Subtitle UI & Export)
- **Subtitle Overlay**: Thanh phụ đề nổi đặt trên khung hình video, hiển thị song song câu gốc và câu dịch.
- **Subtitle Panel (Transcript History)**:
  - Tab "Tất cả": Xem lại toàn bộ hội thoại cuộc họp theo thứ tự thời gian.
  - Tab "Hành động & Quyết định": Lọc riêng các câu được Laya gắn nhãn.
  - Thanh trượt điều chỉnh ngưỡng tin cậy (Confidence Threshold: 0.50 – 0.95).
  - Nút **"Sao chép biên bản họp"**: Xuất nhanh toàn bộ Action Items & Decisions định dạng Markdown để gửi qua Slack/Teams/Email.

---

## 4. Yêu cầu Phi Chức năng (Non-Functional Requirements)

| Tiêu chí | Mục tiêu cam kết | Kết quả kiểm chứng thực tế (Local Benchmark) |
| :--- | :--- | :--- |
| **Độ trễ phụ đề (TTFS)** | < 1500 ms | **p50: 964.8 ms** (Đo đạc thực tế trên luồng 1 speaker) |
| **Độ trễ phân loại Laya** | < 1000 ms (Async) | **657.9 ms** (Chạy nền song song, không block phụ đề) |
| **Tài nguyên AI Service** | < 4 vCPU, < 2 GB RAM (Pilot) | **CPU ~0.50%, RAM ~517 MB** (Trạng thái warm, 1 room) |
| **Tính khả dụng (Availability)** | Hoạt động ổn định trên Docker Compose | Web, API, AI-Service, LiveKit, Laya, Redis, Postgres |
| **Bảo mật & Riêng tư** | **Không lưu trữ audio thô mặc định**; Tokens ngắn hạn (JWT Subtitle 10m, Session 60m, LiveKit 60m); Bí mật cô lập tối thiểu 32 ký tự. |
| **Giới hạn cam kết tải** | *Không đưa ra tuyên bố SLA tải tùy tiện khi chưa qua load test môi trường thực tế.* |

---

## 5. Trạng Thái Tính Năng: Hiện Có (Operational) vs Kế Hoạch (Roadmap)

### 5.1. Tính năng Đã Hoàn Thành (Operational Baseline)
- [x] **WebRTC Media Stream**: LiveKit Media Server với xuất track tuần tự chống race condition.
- [x] **Real-time STT Pipeline**: Chunk 350ms, bộ lọc VAD (RMS/Energy), Faster-Whisper int8 trên CPU với preload background.
- [x] **Bilingual Subtitles & Translation**: Cặp ngôn ngữ `vi` <-> `ja` <-> `en`, Redis cache phân tán 24h, fallback linh hoạt.
- [x] **Laya Meeting Intelligence**: Async non-blocking sidecar trích xuất Action Items & Decisions.
- [x] **Domain Glossary cơ bản**: Tích hợp thuật ngữ kỹ thuật IT và kinh doanh.
- [x] **Biên bản cuộc họp song ngữ**: Export Markdown, Word (.doc), Subtitle (.srt), Transcript (.txt).
- [x] **Bảo mật truy cập & Quản lý phiên**: Waiting room approval flow, Host capability token, Scoped Participant Session với database revocation.
- [x] **Preflight & Cấu hình an toàn**: Scripts kiểm tra tiền kiểm (`preflight.sh`), sinh cấu hình bảo mật (`generate-config.sh`), chmod 600.
- [x] **Sanitized Diagnostics Bundle**: Công cụ đóng gói chẩn đoán hệ thống đã gỡ bỏ hoàn toàn tokens, secrets và transcripts (`diagnostics.sh`).

### 5.2. Kế hoạch Phát triển Tiếp theo (Roadmap)
- [ ] **Admin Web Portal**: Giao diện trực quan cho quản trị viên cấu hình tổ chức, thời gian retention và domain glossary.
- [ ] **Enterprise Identity Provider (IdP)**: Tích hợp Single Sign-On (SSO) qua OIDC / SAML (Google Workspace, Microsoft Entra ID).
- [ ] **Automated Load Testing Suite**: Kịch bản kiểm thử tải tự động 10–20 phòng đồng thời với audio stream nhân tạo.
- [ ] **Pure Offline Translation Engine**: Tùy chọn model dịch thuật cục bộ (MarianMT / NLLB-200) cho môi trường hoàn toàn cô lập mạng (air-gapped).

---
*Tài liệu này là căn cứ đặc tả chính thức cho Senior Product Architect, DevOps Engineer và SecOps.*
