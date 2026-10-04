# Kế Hoạch Kiểm Thử Tải & Đồng Thời (Multi-Room & Multi-Participant Test Plan)

> **Dự án:** AI-Translate-Meeting  
> **Chủ đề:** Kiểm thử hiệu năng, độ trễ và độ ổn định khi nhiều người tham gia và nhiều phòng họp được mở đồng thời  
> **Mục tiêu chính:** Đo lường giới hạn chịu tải, kiểm chứng SLA phụ đề (TTFS), xác thực cách ly phòng (Zero Leakage) và độ ổn định tài nguyên (CPU/RAM/Redis) trên hạ tầng Self-Hosted.

---

## 1. Giả Định Cốt Lõi (Assumptions & Preconditions)

```text
ASSUMPTIONS I'M MAKING:
1. Về Yêu cầu Kiểm thử:
   - "Nhiều người tham gia": Kiểm thử từ 10 đến 50 người dùng đồng thời trong 1 phòng (High Density) và phân bổ trên nhiều phòng.
   - "Nhiều phòng họp được mở": Kiểm thử từ 5 đến 20 phòng họp hoạt động song song độc lập.
   - Phân biệt rõ vai trò: Trong thực tế, mỗi phòng chỉ có 1-2 Active Speaker (nói thật, cần STT Whisper CPU) và đa số là Passive Listener (nghe/nhận phụ đề broadcast qua WebSocket).
2. Về Kiến trúc & Hạ tầng:
   - Môi trường kiểm thử mục tiêu: VPS / Docker host (Profile Pilot: 4 vCPU / 8GB RAM; hoặc Profile Business: 8 vCPU / 16GB RAM).
   - Các dịch vụ tham gia: .NET API (Kestrel/EF Core/Postgres), AI Service (FastAPI/Faster-Whisper/Redis), LiveKit SFU (WebRTC).
3. Về Phạm vi Thực thi:
   - Kiểm thử tập trung chính vào luồng dữ liệu nặng nhất: HTTP API Room Lifecycle -> WebSocket Authentication -> Audio Streaming & VAD -> Faster-Whisper STT -> Live Translation Fan-out -> Subtitle Broadcast.
   - Tạo bộ công cụ giả lập tự động (mở rộng từ `scripts/load-test.py`) có khả năng chạy không cần mở hàng chục trình duyệt thủ công, kết hợp với kiểm thử xác thực 1-2 browser thật.
```

---

## 2. Phân Tích Các Rào Cản Kỹ Thuật Cần Xử Lý Trước Khi Test

Trước khi chạy kiểm thử quy mô lớn, hệ thống có 3 chốt chặn bảo vệ (Guardrails) được thiết kế cho môi trường sản phẩm:

| Chốt chặn | Hiện trạng trong Code | Tác động khi Load Test | Giải pháp cho Môi trường Test |
| :--- | :--- | :--- | :--- |
| **1. License Capacity** | `LicenseService.cs`: Chế độ Trial mặc định chỉ cho phép **1 phòng** và **5 người/phòng**. | Khi mở phòng thứ 2 hoặc người thứ 6, API ném HTTP 400/409 `License capacity reached`. | Cung cấp License Key kiểm thử doanh nghiệp (`max_rooms: 50`, `max_participants: 100`, tier: `business`) hoặc cờ cấu hình bypass cho test environment. |
| **2. Rate Limiting** | `DistributedRateLimiter.cs` & `WebSocketRateLimiter.py`: `CreateMeeting`: 10 req/phút/IP; `JoinAdmission`: 30 req/phút/IP; AI WebSocket: 30 handshakes/phút/IP. | Load test runner chạy từ 1 máy client (cùng 1 IP) sẽ bị chặn HTTP 429 và WebSocket close code 4029. | Bổ sung cờ cấu hình nâng hạn ngạch hoặc giả lập IP ngẫu nhiên qua trusted proxy header (`X-Forwarded-For`) khi chạy test nội bộ. |
| **3. STT CPU Bound** | `whisper_service.py`: Faster-Whisper int8 chạy trên CPU đa luồng. 1 câu nói cần ~200-400ms thời gian tính toán CPU. | Nếu 20 workers cùng stream audio liên tục không ngừng, CPU sẽ nghẽn 100%, hàng đợi WebSocket phình to, TTFS tăng vọt. | Kịch bản test phải mô phỏng **nhịp nói tự nhiên**: Nói 3-5 giây -> Ngừng 5-10 giây (VAD drop khoảng lặng) -> Luân phiên giữa các speaker trong từng phòng. |

---

## 3. Ma Trận Kịch Bản Kiểm Thử (Test Scenarios Matrix)

### Kịch bản 1: Single Room - High Density Fan-out (1 phòng, đông người nghe)
- **Cấu hình:** 1 phòng họp, 1 Active Speaker (nói liên tục các câu 3-5s), 10 đến 50 Passive Listeners (đăng ký nhận phụ đề với các ngôn ngữ đích khác nhau: `vi`, `ja`, `en`).
- **Mục tiêu kiểm chứng:**
  - Kiểm tra khả năng Fan-out phụ đề của `MeetingConnectionManager`: Khi 1 người nói, tin nhắn phụ đề phải được gửi đồng thời tới 50 kết nối WebSocket mà không gây trễ hoặc nghẽn `send_lock`.
  - Cache hiệu quả: Translation provider chỉ dịch 1 lần cho mỗi cặp ngôn ngữ đích (`vi -> en`, `vi -> ja`), không dịch lặp lại 50 lần.
- **Tiêu chí đạt (Acceptance Criteria):**
  - Tỷ lệ nhận phụ đề thành công ở tất cả listener: >= 99.5%.
  - TTFS p50 < 1200ms, p95 < 2000ms.
  - Không có kết nối WebSocket nào bị disconnect bất thường.

### Kịch bản 2: Multi-Room Isolation & Scalability (Nhiều phòng song song)
- **Cấu hình:** 5 đến 10 phòng họp hoạt động độc lập cùng lúc. Mỗi phòng có 1 Host/Speaker + 3-5 Listeners.
- **Mục tiêu kiểm chứng:**
  - **Zero Cross-room Leakage (Cách ly tuyệt đối):** Phụ đề của Phòng A tuyệt đối không lọt sang Phòng B hay bất kỳ phòng nào khác.
  - **Khởi tạo đồng thời:** .NET API xử lý mượt mà việc tạo 10 phòng và cấp 40-50 tokens (Admission, Subtitle JWT, LiveKit Token) trong vòng 5 giây.
  - Khả năng xử lý song song của AI Service: Các kết nối WebSocket thuộc các phòng khác nhau không khóa lẫn nhau (`asyncio.Lock` chỉ phạm vi per-room/per-socket).
- **Tiêu chí đạt:**
  - 100% token được cấp hợp lệ.
  - 0% rò rỉ phụ đề giữa các phòng (được đo tự động bằng UUID tracking trong payload).
  - TTFS p50 trên tất cả các phòng < 1500ms.

### Kịch bản 3: Multi-Speaker Overlap & Turn-Taking trong từng phòng
- **Cấu hình:** 3 phòng song song, mỗi phòng có 2-3 Active Speakers nói xen kẽ và nói đè (Cross-talk).
- **Mục tiêu kiểm chứng:**
  - Bộ đệm âm thanh (`audio_buffer`) của từng người nói được cách ly tuyệt đối, không bị trộn lẫn PCM bytes.
  - LiveKit identity và sequence counter (`#1`, `#2`) gán đúng từng người nói.
  - Pipeline status (`transcribing`, `translating`, `ready`) cập nhật nhịp nhàng.
  - Laya Intelligence phân loại câu song song bằng background sidecar không làm block luồng phát phụ đề của người khác.
- **Tiêu chí đạt:**
  - Nội dung transcript của mỗi speaker không bị lẫn lộn câu từ của speaker khác.
  - Laya tags badge gắn đúng ID câu thoại của từng speaker.

### Kịch bản 4: Stress & Saturation Limit (Đo ngưỡng chịu tải tối đa)
- **Cấu hình:** Tăng tải bậc thang (Step-up Load):
  - Bước 1: 3 phòng (6 users) -> Đo TTFS & CPU.
  - Bước 2: 6 phòng (18 users) -> Đo TTFS & CPU.
  - Bước 3: 10 phòng (40 users) -> Đo TTFS & CPU.
  - Bước 4: 15 phòng (60 users) -> Xác định điểm bắt đầu thoái hóa (Degradation Point).
- **Mục tiêu kiểm chứng:**
  - Tìm ra giới hạn số phòng và số người tham gia tối đa mà máy chủ hiện tại có thể phục vụ với SLA TTFS < 2000ms.
  - Kiểm tra hành vi khi quá tải: Hệ thống có từ chối nhẹ nhàng (Graceful degradation, HTTP 429/4029) hay bị crash/OOM.

### Kịch bản 5: Soak / Endurance Test (Kiểm tra độ bền & rò rỉ bộ nhớ)
- **Cấu hình:** 5 phòng họp duy trì hoạt động liên tục trong 30–60 phút. Các worker phát audio theo chu kỳ lặp (nói 4s, nghỉ 8s).
- **Mục tiêu kiểm chứng:**
  - Theo dõi RAM (Resident Set Size - RSS) của: `ai-service`, `api`, `redis`, `postgres`, `livekit`.
  - Đảm bảo RAM không tăng tuyến tính (Zero Memory Leaks).
  - Đảm bảo Redis memory duy trì ổn định (Key TTL 24h hoạt động, không tràn RAM).
  - Kết nối sau 45 phút vẫn nhận phụ đề với độ trễ như ban đầu.

---

## 4. Kế Hoạch Triển Khai Nhiệm Vụ (Implementation & Task Breakdown)

Theo quy chuẩn kỹ thuật của `planning-and-task-breakdown`, kế hoạch được chia thành các lát cắt dọc (Vertical Slices):

```text
Dependency Graph:
[Task 1: Test License & Rate Limit Bypass Harness]
      │
      ▼
[Task 2: Nâng Cấp scripts/load-test.py Hỗ Trợ Multi-Room & Role Matrix]
      │
      ▼
[Task 3: Resource & Latency Telemetry Collector]
      │
      ▼
[Task 4: Bộ Kiểm Thử Tự Động Hóa Kịch Bản (Pytest Contract & PowerShell)]
      │
      ▼
[Task 5: Thực Thi Benchmark, Thu Thập Báo Cáo & Khuyến Nghị Sizing]
```

---

### Task 1: Cấu hình Test License Key & Rate Limit Guard cho Môi Trường Test
**Description:** Tạo cơ chế cấp License test tạm thời (`max_rooms: 50`, `max_participants: 200`) và cho phép cấu hình rate limit thân thiện với benchmark trong môi trường dev/staging mà không làm suy yếu bảo mật production.

**Acceptance criteria:**
- [ ] Tạo helper sinh token License hợp lệ hoặc profile cấu hình test `config/profiles/test-load.env`.
- [ ] .NET API và AI Service cho phép chạy tải mà không bị chặn bởi rate limit khi có cờ cấu hình rõ ràng.
- [ ] Vẫn giữ nguyên cơ chế bảo vệ HMAC và IP validation khi chạy ở chế độ production chuẩn.

**Verification:**
- [ ] `dotnet test tests/AITranslateMeeting.Api.Tests` pass 100%.
- [ ] Gọi liên tục 15 API tạo phòng trong 10 giây ở test mode thành công không dính 429.

**Files likely touched:**
- `config/profiles/test-load.env`
- `tests/test_load_test_contract.py`

**Estimated scope:** S

---

### Task 2: Nâng Cấp `scripts/load-test.py` Hỗ Trợ Đa Phòng & Đa Vai Trò
**Description:** Nâng cấp công cụ giả lập âm thanh và kết nối `scripts/load-test.py` để hỗ trợ tham số `--rooms R`, `--participants-per-room P`, `--speakers-per-room S`, và mô phỏng nhịp nói/nghỉ tự nhiên.

**Acceptance criteria:**
- [ ] Hỗ trợ tạo đồng thời $R$ phòng họp qua API, mỗi phòng có mã phòng và Host riêng biệt.
- [ ] Mỗi phòng tạo $P$ người tham gia: trong đó $S$ người đóng vai trò Active Speaker (stream PCM), $P - S$ người đóng vai trò Passive Listener (nhận và ghi nhận TTFS/phụ đề).
- [ ] Hỗ trợ kiểm tra rò rỉ phụ đề: Mỗi phòng có UUID/prefix nội dung riêng; script assert không có bất kỳ thông điệp nào từ phòng $i$ gửi nhầm sang phòng $j$.
- [ ] Xuất kết quả chi tiết theo bảng: Thống kê per-room và aggregate toàn hệ thống (Total Rooms, Total Participants, Active Speakers, TTFS p50, TTFS p95, Success Rate).

**Verification:**
- [ ] `python scripts/load-test.py --help` hiển thị các tham số mới `--rooms`, `--participants-per-room`, `--speakers-per-room`.
- [ ] `tests/test_load_test_contract.py` kiểm tra các tham số mới và chạy syntax check.

**Files likely touched:**
- `scripts/load-test.py`
- `tests/test_load_test_contract.py`

**Estimated scope:** M

---

### Task 3: Bộ Thu Thập Dữ Liệu Tài Nguyên Hệ Thống (Resource Telemetry)
**Description:** Xây dựng script hoặc tích hợp module đo đạc tài nguyên (CPU %, RAM MB, Network I/O, Redis Keys) trong suốt quá trình chạy test để vẽ biểu đồ và đánh giá mức độ căng thẳng của phần cứng.

**Acceptance criteria:**
- [ ] Ghi lại mẫu tài nguyên mỗi 1-2 giây: Docker container stats (CPU %, Memory MB) cho `api`, `ai-service`, `livekit`, `redis`, `postgres`.
- [ ] Kết xuất file `benchmark-results/metrics-<timestamp>.json` hoặc `.csv`.
- [ ] Tự động cảnh báo nếu CPU > 90% hoặc RAM tăng đột biến không hạ.

**Verification:**
- [ ] Chạy thử nghiệm 15 giây, sinh ra file kết quả telemetry chuẩn định dạng.

**Files likely touched:**
- `scripts/load-test.py` hoặc `scripts/collect-metrics.py`

**Estimated scope:** S

---

### Task 4: Kịch Bản Chạy Benchmark Tự Động Hóa (Runner Script)
**Description:** Xây dựng script tiện ích PowerShell / Bash (`scripts/run-concurrency-test.ps1` & `.sh`) để thực thi lần lượt 4 kịch bản (Fan-out, Multi-Room, Stress, Soak) chỉ với 1 lệnh bấm.

**Acceptance criteria:**
- [ ] Kiểm tra điều kiện tiên quyết (Preflight: API sống, AI Service ready, sample audio PCM tồn tại).
- [ ] Chạy Kịch bản 1 (1 phòng, 1 speaker, 15 listeners).
- [ ] Chạy Kịch bản 2 (5 phòng, mỗi phòng 1 speaker + 3 listeners).
- [ ] Chạy Kịch bản 3 (10 phòng, mỗi phòng 1 speaker + 2 listeners).
- [ ] Tổng hợp kết quả thành file báo cáo Markdown `benchmark-report.md`.

**Verification:**
- [ ] Chạy `powershell -ExecutionPolicy Bypass -File scripts/run-concurrency-test.ps1 -DryRun` thành công.

**Files likely touched:**
- `scripts/run-concurrency-test.ps1`
- `scripts/run-concurrency-test.sh`

**Estimated scope:** S

---

### Task 5: Thực Nghiệm Benchmark Thực Tế & Lập Bảng Khuyến Nghị Cấu Hình (Sizing Guide)
**Description:** Chạy thử nghiệm thực tế trên môi trường Docker của máy chủ hiện tại, thu thập số liệu thật và đưa ra bảng thông số khuyến nghị phần cứng theo quy mô doanh nghiệp.

**Acceptance criteria:**
- [ ] Ghi nhận bảng số liệu TTFS p50/p95, CPU peak, RAM consumption cho từng kịch bản.
- [ ] Xác định rõ ngưỡng giới hạn của Profile Pilot (4 vCPU / 8 GB RAM) và Profile Business (8 vCPU / 16 GB RAM).
- [ ] Bổ sung hướng dẫn vào `docs/self-hosted-product.md` và `docs/architecture.md`.

**Verification:**
- [ ] Báo cáo nghiệm thu có đầy đủ số liệu kiểm chứng thực tế.

**Estimated scope:** M

---

## 5. Checkpoints Kiểm Soát Chất Lượng

- [ ] **Checkpoint L1 (Tooling Readiness):** `scripts/load-test.py` hỗ trợ đầy đủ `--rooms` và `--participants-per-room`, các unit test trong `test_load_test_contract.py` pass 100%.
- [ ] **Checkpoint L2 (Functional Multi-Room Pass):** Chạy thử 3 phòng x 3 người (9 kết nối), 100% kết nối ổn định, TTFS p50 < 1500ms, 0% rò rỉ phòng.
- [ ] **Checkpoint L3 (Stress & Stability Pass):** Chạy thử tải cao (10 phòng x 3 người = 30 người) không phát sinh lỗi 500, không crash service, CPU & RAM phục hồi về baseline sau khi test kết thúc.
