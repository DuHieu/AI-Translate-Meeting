# AI-Translate-Meeting: Self-Hosted Product Specification & Operator Guide

> **Phiên bản:** 1.3.0  
> **Định vị sản phẩm:** Private bilingual AI meeting workspace dành cho đội dự án Việt–Nhật, có thể triển khai trong VPS/on-premise của khách hàng, tối ưu thuật ngữ dự án, phụ đề thời gian thực và biên bản hành động song ngữ.  
> **Target Environment:** Ubuntu 24.04 LTS (Docker Compose)  
> **Phân loại:** Tài liệu Đặc tả Sản phẩm & Hướng dẫn Vận hành Thương mại  

---

## 1. Định Vị Chiến Lược & Giá Trị Cốt Lõi

### 1.1. Không phải đối thủ thay thế Zoom / Teams / Google Meet
AI-Translate-Meeting **không** định vị là một bản sao toàn diện (clone) của Zoom, Microsoft Teams hay Google Meet (không xây dựng hệ thống calendar, email suite, chat channel diện rộng hay voice cloning).

Sản phẩm tập trung giải quyết bài toán giao tiếp kỹ thuật và dự án giữa **doanh nghiệp Việt Nam và đối tác/khách hàng Nhật Bản hoặc quốc tế**:
- **Data Ownership tuyệt đối**: Doanh nghiệp tự chủ 100% dữ liệu, triển khai trên máy chủ riêng (Private VPS hoặc On-Premise), không lo rò rỉ bí mật công nghệ.
- **Tập trung ngôn ngữ Việt ↔ Nhật ↔ Anh**: Thay vì dàn trải hàng chục ngôn ngữ, sản phẩm tối ưu hóa sâu cho ngữ cảnh dự án IT outsourcing Việt – Nhật.
- **Domain Glossary theo dự án**: Tối ưu nhận dạng và dịch thuật theo danh mục thuật ngữ kỹ thuật, tên module, tên sản phẩm của khách hàng.
- **Speaker-Aware Bilingual Subtitles**: Phụ đề song ngữ hiển thị thời gian thực theo từng người nói với định danh bảo mật từ JWT.
- **Meeting Intelligence Sidecar**: Tự động nhận diện Action Items (nhiệm vụ) và Decisions (quyết định) từ lời thoại.
- **Biên bản song ngữ tức thì**: Xuất biên bản họp định dạng Markdown, Word, SRT ngay sau cuộc họp.
- **Không lưu audio thô mặc định**: Dữ liệu âm thanh chỉ xử lý tức thời trong RAM và bị hủy ngay lập tức sau nhận dạng.

### 1.2. Đối tượng khách hàng mục tiêu
1. **Công ty IT Outsourcing & Software Development Việt Nam** làm việc trực tiếp với khách hàng Nhật Bản.
2. **Software Team có yêu cầu bảo mật cao**: Ngân hàng, Fintech, Viễn thông, Y tế, hoặc các dự án ký thỏa thuận NDA nghiêm ngặt.
3. **Doanh nghiệp không được phép gửi audio/transcript ra SaaS công cộng bên thứ ba**.
4. **Đội ngũ dự án cần thống nhất thuật ngữ kỹ thuật** và lưu trữ biên bản họp chuẩn mực.

---

## 2. Privacy & Data-Control Contract (Hợp Đồng Kiểm Soát Dữ Liệu)

### 2.1. Phân định vùng lưu trữ dữ liệu

| Vùng lưu trữ | Thành phần dữ liệu | Vòng đời (Lifecycle) | Cơ chế xóa / Purge |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | Thông tin phòng họp (`meetings`), danh sách người tham gia (`meeting_participants`), yêu cầu duyệt vào phòng (`meeting_admissions`), phiên xác thực (`participant_sessions`). | Lưu trữ bền vững hoặc theo chính sách retention. | Background worker dọn dẹp admissions và sessions hết hạn sau 24h (`DatabaseCleanupService`). Quản trị viên có thể purge thủ công. |
| **Redis 7** | Cache câu dịch (`tr:{src}:{tgt}:{hash}`), Distributed rate limiter counters (`rl:*`). | Tạm thời trong bộ nhớ cache. | Redis TTL: Cache dịch tự hủy sau 24h (`86400s`); Rate limit tự hủy sau 60s. |
| **In-Memory (RAM)** | WebRTC Media tracks, WebSocket audio frames (350ms PCM), interim partial transcripts, active connection sockets. | Tức thời (vài trăm mili-giây). | **Tự hủy ngay lập tức** sau khi VAD lọc hoặc STT hoàn tất xử lý chunk. |
| **Đĩa cứng (Disk)** | Hugging Face model cache (`whisper_cache`, `laya_cache`), Caddy TLS certificates. | Bền vững giữa các lần khởi động lại container. | Quản trị viên quản lý qua named volumes. Không chứa dữ liệu hội thoại người dùng. |

### 2.2. Cam kết về Dữ liệu Âm thanh (Raw Audio Policy)
- **KHÔNG LƯU AUDIO THÔ MẶC ĐỊNH**: Hệ thống không ghi âm (no recording) hay lưu bất kỳ file âm thanh nào (`.wav`, `.pcm`, `.mp3`) xuống đĩa cứng hoặc database.
- Từng đoạn audio 350ms từ microphone người dùng gửi qua WebSocket được đưa trực tiếp vào bộ đệm RAM của VAD (Voice Activity Detection) và Faster-Whisper, sau đó giải phóng bộ nhớ.

### 2.3. Minh bạch về Translation Provider & External Connections
Để bảo vệ quyền riêng tư và tính trung thực kỹ thuật:
- **Chế độ Mặc định (Contextual / Local Provider)**: Dịch thuật ngữ cảnh sử dụng từ điển thuật ngữ cục bộ (Domain Glossary) kết hợp Redis cache.
- **Cảnh báo về External Provider**: Nếu quản trị viên cấu hình fallback qua external translation API (ví dụ Google GTX hoặc API dịch thuật đám mây bên ngoài):
  - Hệ thống **KHÔNG được quảng cáo là hoàn toàn Offline**.
  - Các câu dịch chưa có trong cache sẽ gửi đoạn text cần dịch ra endpoint ngoại vi qua HTTPS.
  - Doanh nghiệp có yêu cầu Air-Gapped / Isolated hoàn toàn phải cấu hình `TRANSLATION_FALLBACK_PROVIDER=local` và không cấp internet outbound cho container AI service.

### 2.4. Quy định Logging An toàn (Zero PII & Secret Isolation)
Hệ thống tuân thủ nghiêm ngặt chuẩn Zero PII Logging:
- **TUYỆT ĐỐI KHÔNG GHI LOG**:
  - Mã token JWT (Admission JWT, Subtitle JWT, Session JWT, LiveKit JWT).
  - API Keys, Signing Keys, Database Passwords.
  - Nội dung transcript thô hoặc câu thoại hội thoại của người tham gia.
  - Tên đầy đủ của participant (chỉ ghi participantId hoặc mask).
  - Nội dung tin nhắn chat hoặc payload DataChannel.
- **Log được phép lưu**: Mã lỗi chuẩn RFC 7807, HTTP method/status code, Correlation ID (`X-Correlation-ID`), độ trễ xử lý (processing duration ms), số lượng bytes audio frame nhận được.

---

## 3. Cấu Hình Theo Profile Triển Khai (Deployment Profiles)

Hệ thống cung cấp 2 cấu hình mẫu chuẩn hóa, sử dụng chung kiến trúc container và chỉ khác biệt về hạn mức tài nguyên cùng cờ tính năng:

```
+-----------------------------------------------------------------------------------+
|                        KIẾN TRÚC CONTAINER ĐỒNG NHẤT                              |
|   [Caddy Edge TLS] -> [Web Nginx] -> [LiveKit SFU] + [.NET API] + [FastAPI AI]    |
|                                                     |                             |
|                                     +---------------+---------------+             |
|                                     v                               v             |
|                              [PostgreSQL 16]                   [Redis 7]          |
+-----------------------------------------------------------------------------------+
```

### Profile 1: `pilot` (Thử nghiệm & Đội nhóm nhỏ)
- **Mục tiêu:** Đánh giá thử nghiệm giải pháp (PoC), phòng họp nội bộ nhóm nhỏ.
- **Yêu cầu phần cứng:** 4 vCPU, 8 GB RAM, 25+ GB SSD.
- **Speech-to-Text Model:** Faster-Whisper `tiny` (int8 trên CPU).
- **Meeting Intelligence (Laya):** Tắt (`LAYA_ENABLED=false`) để tối ưu hóa CPU cho STT và subtitle.
- **Quy mô khuyến nghị (Sizing Hypothesis):** 1 phòng hoạt động đồng thời, 3–5 người tham gia.
- **Tuyên bố kỹ thuật:** *Đây là giả định kích thước ban đầu (sizing hypothesis) dựa trên benchmark môi trường chuẩn, chưa phải cam kết tải (capacity guarantee). Khách hàng cần đo đạc thực tế theo mức độ nói đồng thời.*

### Profile 2: `business` (Doanh nghiệp & Đội dự án chính thức)
- **Mục tiêu:** Môi trường sản xuất chính thức cho các dự án gia công phần mềm Việt – Nhật.
- **Yêu cầu phần cứng:** 8 vCPU, 16 GB RAM, 50+ GB SSD.
- **Speech-to-Text Model:** Faster-Whisper `small` (int8 trên CPU, nâng cao độ chính xác nhận dạng tiếng Nhật/Việt).
- **Meeting Intelligence (Laya):** Bật (`LAYA_ENABLED=true`), trích xuất Decisions và Action Items tự động.
- **Bảo trì & Vận hành:** Kích hoạt sao lưu định kỳ, dọn dẹp retention hàng giờ (`DATABASE_CLEANUP_INTERVAL_HOURS=1`).
- **Tuyên bố kỹ thuật:** *Khả năng chịu tải và số lượng phòng đồng thời phải được xác định qua kiểm thử tải (Load Test) tại hạ tầng cụ thể của khách hàng trước khi đưa vào vận hành đại trà.*

### 3.3. Kết Quả Kiểm Thử Tải Thực Tế & Khuyến Nghị Phần Cứng (Benchmark Baseline)

Dựa trên bộ công cụ kiểm thử tải giả lập đa phòng (`scripts/load-test.py` và `scripts/run-concurrency-test.ps1`):

| Kịch bản kiểm thử | Quy mô | Tỷ lệ thành công | TTFS p50 | TTFS p95 | Zero Leakage | Tiêu chuẩn SLA |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Kịch bản 1: Single Room Fan-out** | 1 phòng, 6 người (1 speaker, 5 listeners) | 100% | 71.5 ms | 72.8 ms | PASSED (0) | Đạt (SLA < 2000ms) |
| **Kịch bản 2: Multi-Room Isolation** | 3 phòng, 9 người (3 speakers, 6 listeners) | 100% | 89.5 ms | 169.5 ms | PASSED (0) | Đạt (Zero Cross-Room Leakage) |
| **Kịch bản 3: Multi-Room Under Load** | 5 phòng, 15 người (5 speakers, 10 listeners) | 100% | 88.0 ms | 105.8 ms | PASSED (0) | Đạt (SLA < 2000ms) |

**Định mức tài nguyên đo đạc thực tế:**
- **AI Service (`faster-whisper` int8 CPU)**: Chiếm đỉnh ~400–430% CPU (tận dụng tối đa 4 lõi CPU đa luồng trong lúc phiên dịch), RAM ổn định ~770–860 MB.
- **Backend API (.NET 8 Kestrel)**: Chiếm đỉnh ~30–40% CPU khi đồng thời cấp JWT/admissions cho hàng chục user, RAM ổn định ~150 MB.
- **Media Server (LiveKit SFU)**: Chiếm đỉnh ~4–13% CPU, RAM ~40 MB.
- **Cache & Storage Layer (Redis + Postgres)**: Redis RAM ~8.5 MB, Postgres RAM ~62 MB.

**Khuyến nghị kích thước phần cứng (Hardware Sizing Guide):**
1. **VPS 4 vCPU / 8 GB RAM (Profile Pilot)**: Phù hợp tối đa 3–5 phòng họp đồng thời, mỗi phòng 1–2 speaker luân phiên và 5–10 listeners.
2. **VPS 8 vCPU / 16 GB RAM (Profile Business)**: Phục vụ ổn định 8–12 phòng họp đồng thời với đầy đủ Laya Decision/Action Item sidecar.

---

## 4. Gói Đề Xuất Thương Mại (Business Packaging Proposal)

*(Lưu ý: Không hardcode biểu giá trong mã nguồn ứng dụng; biểu giá cụ thể được quy định trong đề xuất hợp đồng dịch vụ).*

| Hạng mục | Gói PILOT (30 Ngày) | Gói TEAM | Gói PRIVATE ENTERPRISE |
| :--- | :--- | :--- | :--- |
| **Mục đích** | Đánh giá tính khả thi kỹ thuật | Đội dự án outsourcing cố định | Doanh nghiệp bảo mật nghiêm ngặt |
| **Hình thức triển khai** | Single VPS (Khách hàng tự host) | Dedicated VPS do khách hàng kiểm soát | On-Premise Server / Private Cloud |
| **Số phòng đồng thời** | 1 phòng hoạt động | 2–3 phòng hoạt động | Không giới hạn phần mềm (theo phần cứng) |
| **Quy mô mỗi phòng** | 3–5 người tham gia | 5–10 người tham gia | 10–20+ người tham gia |
| **AI Model STT** | Whisper `tiny` | Whisper `small` | Whisper `small` / `medium` (có GPU tùy chọn) |
| **Laya Intelligence** | Không kèm theo | Bật (Action Items & Decisions) | Bật kèm tùy biến câu hỏi trích xuất |
| **Domain Glossary** | Glossary cơ bản mặc định | Tùy biến Glossary dự án (IT, Biz) | Tùy biến Glossary sâu theo từng khách hàng |
| **Xuất biên bản họp** | Markdown cơ bản | Markdown, Word (.doc), Subtitle (.srt) | Đầy đủ định dạng & Tích hợp kho lưu trữ |
| **Chính sách dữ liệu** | Khách hàng sở hữu dữ liệu | Khách hàng sở hữu dữ liệu | Khách hàng sở hữu dữ liệu 100% |
| **Hỗ trợ kỹ thuật** | Hỗ trợ cài đặt ban đầu | Hỗ trợ kỹ thuật trong giờ hành chính | Hỗ trợ 24/7, SLA cam kết, setup theo yêu cầu |

---

## 5. Quy Trình Triển Khai Self-Hosted 10 Bước

Dành cho quản trị viên hệ thống (Sysadmin / DevOps) triển khai trên Ubuntu 24.04:

```text
[1. Preflight] -> [2. Gen Config] -> [3. Generate Secrets] -> [4. Check DNS/Ports]
                                                                        |
[8. Smoke Test] <- [7. Start Stack] <- [6. Run Migration] <- [5. Pull Images]
       |
[9. Operations] -> [10. Safe Rollback Ready]
```

### Chia sẻ staging nhanh qua Cloudflare Tunnel (0 VNĐ)

Dùng cách này khi cần gửi một URL HTTPS tạm thời để demo ViMeet qua Internet mà không mua domain hoặc trả phí tunnel.

1. Khởi động ViMeet và kiểm tra `http://localhost:3000` truy cập được.
2. Mở terminal khác và chạy đúng lệnh theo hệ điều hành:

```powershell
# Windows PowerShell; có thể đổi 3000 bằng --Port
powershell -ExecutionPolicy Bypass -File .\scripts\start-tunnel.ps1 --Port 3000
```

```bash
# Linux/macOS; có thể đổi cổng qua biến PORT
PORT=3000 bash scripts/start-tunnel.sh
```

Script sẽ:

- Kiểm tra service local trước khi mở tunnel.
- Dùng `cloudflared` trong `PATH`; nếu chưa có thì tải binary chính thức về máy.
- Chạy `cloudflared tunnel --url http://localhost:3000` và hiển thị URL dạng `https://<random>.trycloudflare.com`.

Gửi URL đó cho người tham gia và giữ terminal đang chạy. Nhấn `Ctrl+C` để dừng; URL sẽ hết hiệu lực và lần chạy sau nhận hostname mới.

**Giới hạn bắt buộc:** Quick Tunnel chỉ dành cho staging/demo, không có SLA và bất kỳ ai có URL đều có thể truy cập. Tunnel port 3000 xử lý HTTPS/WSS cho Web, API, subtitle và LiveKit signaling; luồng media WebRTC của LiveKit vẫn cần public ICE/TURN (`7881/tcp`, `7882/udp` hoặc TURN). Muốn họp audio/video đầy đủ qua Internet, dùng quy trình VPS public bên dưới. Tham khảo [tài liệu Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

### Rehearsal staging 1 lệnh

Điều kiện trước khi chạy:

- Ubuntu 24.04/Debian, tối thiểu 4 vCPU, 8 GB RAM và 25 GB SSD trống.
- Tạo DNS A/AAAA cho `staging.example.com` và `rtc.staging.example.com` cùng trỏ về VPS. `--domain staging.example.com` tự suy ra LiveKit domain là `rtc.staging.example.com`.
- Mở firewall/security group: `80/tcp`, `443/tcp`, `443/udp`, `7881/tcp`, `7882/udp`.
- Đăng nhập GHCR nếu image là private: `docker login ghcr.io`. Dùng commit SHA đã được workflow publish làm `--image-tag`, không dùng `latest` cho production.

Chạy rehearsal bằng certificate self-signed của Caddy:

```bash
git clone https://github.com/DuHieu/AI-Translate-Meeting.git
cd AI-Translate-Meeting
git checkout <RELEASE_SHA>

sudo bash scripts/setup-self-hosted.sh \
  --domain staging.example.com \
  --ssl-mode self-signed \
  --profile pilot \
  --image-namespace duhieu \
  --image-tag <RELEASE_SHA> \
  --non-interactive
```

Installer thực hiện theo thứ tự: validate domain/profile/TLS, kiểm tra Docker, sinh secret, chạy preflight, pull image, migrate, start service, readiness gate và smoke test. Self-signed chỉ dùng cho rehearsal; trình duyệt sẽ cảnh báo cho tới khi CA nội bộ được trust.

Xác minh lại từ một máy khác ngoài VPS:

```bash
bash scripts/smoke-test.sh \
  --domain staging.example.com \
  --livekit-domain rtc.staging.example.com \
  --livekit-tcp-port 7881 \
  --livekit-udp-port 7882 \
  --insecure
```

Khi chuyển sang production, DNS phải public và bỏ `--insecure`:

```bash
sudo bash scripts/setup-self-hosted.sh \
  --domain meet.example.com \
  --livekit-domain rtc.example.com \
  --ssl-mode letsencrypt \
  --email ops@example.com \
  --profile business \
  --image-namespace duhieu \
  --image-tag <RELEASE_SHA> \
  --non-interactive

bash scripts/smoke-test.sh \
  --domain meet.example.com \
  --livekit-domain rtc.example.com
```

Không dùng `--insecure` ở production: smoke test phải xác minh được certificate chain thật qua HTTPS/WSS.

### Bước 1: Chạy kiểm tra tiền kiểm (Preflight)
```bash
./scripts/preflight.sh /opt/ai-translate-meeting
```
Kiểm tra tự động: OS distribution, Docker Engine, Compose plugin, CPU, RAM, Disk, DNS resolution và kiểm tra xung đột cổng.

### Bước 2 & 3: Tạo cấu hình & sinh mã bảo mật an toàn
```bash
# Cho cấu hình Pilot:
./scripts/generate-config.sh \
  --app-domain "meet.example.com" \
  --livekit-domain "rtc.example.com" \
  --profile pilot \
  --output "/opt/ai-translate-meeting/shared/.env.production"

# Hoặc cho cấu hình Business:
./scripts/generate-config.sh \
  --app-domain "meet.example.com" \
  --livekit-domain "rtc.example.com" \
  --profile business \
  --output "/opt/ai-translate-meeting/shared/.env.production"
```
*Script tự động tạo 6 khóa ngẫu nhiên độc lập (cryptographically secure), gán quyền `chmod 600` và KHÔNG in mã bí mật ra màn hình.*

### Bước 4: Kiểm tra DNS và Firewall
Đảm bảo DNS A record trỏ đúng IP public của máy chủ và mở các cổng:
- `80/tcp`, `443/tcp`, `443/udp` (Caddy TLS Ingress)
- `7881/tcp`, `7882/udp` (LiveKit WebRTC Media)

### Bước 5: Pull Immutable Docker Images
```bash
docker compose --env-file /opt/ai-translate-meeting/shared/.env.production \
  -f docker-compose.production.yml pull
```

### Bước 6: Chạy Migration cơ sở dữ liệu một lần
```bash
docker compose --env-file /opt/ai-translate-meeting/shared/.env.production \
  -f docker-compose.production.yml run --rm migrate
```

### Bước 7: Khởi động hệ thống
```bash
docker compose --env-file /opt/ai-translate-meeting/shared/.env.production \
  -f docker-compose.production.yml up -d
```

### Bước 8: Chạy kiểm tra sẵn sàng (Readiness & Smoke Test)
```bash
bash scripts/smoke-test.sh \
  --domain meet.example.com \
  --livekit-domain rtc.example.com
```

Smoke test kiểm tra Web HTTPS, API/AI readiness, security headers, WSS proxy của subtitle và LiveKit, cổng media `7881/tcp` + `7882/udp`, cùng flow tạo phòng/join/cấp Subtitle JWT. Script không in JWT hoặc secret ra output.

### Bước 9: Hướng dẫn vận hành & Giám sát
- **Admin Bootstrap Verification (CLI)**:
  ```bash
  # Chạy kiểm tra khởi động quản trị viên (Zero-secret output):
  ./scripts/bootstrap-admin.sh --env-file /opt/ai-translate-meeting/.env.production
  # Hoặc trên môi trường Windows / PowerShell:
  powershell -ExecutionPolicy Bypass -File scripts/bootstrap-admin.ps1 -EnvFile .env
  ```
- **Kiểm tra trạng thái hệ thống**: `curl -f http://localhost:5000/api/system/status` (trả về phiên bản, profile active, chính sách retention, privacy contract và zero-secret health).
- **Dọn dẹp bản ghi hết hạn theo yêu cầu (On-Demand Retention Purge)**:
  `curl -X POST http://localhost:5000/api/system/cleanup` (xóa ngay các admission và session hết hạn vượt quá retention window, trả về số lượng bản ghi đã dọn dẹp).
- **Kiểm tra & Nạp lại Glossary**: `curl -f http://localhost:8000/glossary/stats` và `curl -X POST http://localhost:8000/glossary/reload` (hot-reload thuật ngữ không cần restart container).
- **Giao diện Trạng thái Hệ thống & Quyền riêng tư (Web Modal)**: Người vận hành hoặc Host có thể bấm nút "Hệ thống & Quyền riêng tư" ngay trên trang chủ để theo dõi trực quan trạng thái DB, Redis, AI STT, kiểm tra chính sách Zero-Audio, nạp lại glossary và kích hoạt dọn dẹp retention.
- **Kiểm thử tải âm thanh giả lập**: `python scripts/load-test.py --concurrency 3 --sample-file vi_sample_16k.pcm` (đo đạc TTFS p50/p95 để kiểm chứng hypothesis của profile `pilot` hoặc `business`).
- **Theo dõi logs an toàn**: `docker compose -f docker-compose.production.yml logs -f --tail 100`
- **Sao lưu cơ sở dữ liệu định kỳ**: `./scripts/backup-database.ps1 -Database ai_translate_meeting -BackupDir /opt/ai-translate-meeting/shared/backups`
- **Xuất bundle chẩn đoán khi gặp sự cố**: `./scripts/diagnostics.sh /opt/ai-translate-meeting`

### Bước 10: Quy trình Rollback an toàn (Disaster Recovery)
Khi phát hiện sự cố sau triển khai:
```bash
./scripts/rollback-production.sh /opt/ai-translate-meeting
```
*Cam kết an toàn: Rollback chỉ phục hồi image và manifest của phiên bản ổn định liền trước; TUYỆT ĐỐI KHÔNG xóa database hoặc named volumes.*

### Troubleshooting runbook

| Triệu chứng | Kiểm tra nhanh | Cách xử lý |
| :--- | :--- | :--- |
| Let's Encrypt không cấp certificate | `docker compose -p ai-translate-meeting-production --env-file /opt/ai-translate-meeting/shared/.env.production -f /opt/ai-translate-meeting/current/docker-compose.production.yml logs caddy --tail 100` | Kiểm tra A/AAAA của cả hai domain, đồng hồ hệ thống, `80/tcp` và `443/tcp`; không đặt proxy CDN trước lần cấp certificate đầu tiên. |
| Self-signed báo lỗi certificate | Chạy smoke với `--insecure` | Đây là hành vi dự kiến ở staging. Không dùng `--insecure` ở production; trust CA nội bộ nếu cần test bằng trình duyệt. |
| LiveKit WSS trả `502/503` | Kiểm tra `wss://rtc.<domain>` và logs `caddy`, `livekit` | Xác nhận `LIVEKIT_DOMAIN`, container LiveKit healthy và Caddy reverse proxy tới `livekit:7880`. |
| Có signaling nhưng không có audio/video | Từ mạng ngoài chạy smoke và kiểm tra `7881/tcp`, `7882/udp` | Mở cả firewall trên VPS và security group của cloud; tránh NAT/CGNAT chặn UDP. |
| Subtitle WSS kết nối nhưng bị đóng `4401/4403` | Kiểm tra join response có `subtitleToken`; đồng bộ UTC trên VPS | Đảm bảo API và AI service dùng cùng `SUBTITLE_TOKEN_SIGNING_KEY`, issuer/audience đúng; không gọi endpoint `/subtitle-token` cũ. |
| API/AI chưa ready | Chạy `bootstrap-admin.sh`; sau đó xem `docker compose` logs của `ai-service` | Chờ tải model Whisper lần đầu; kiểm tra RAM/disk/Redis/PostgreSQL. Không bỏ qua readiness gate. |
| Deploy mới gây lỗi | `bash /opt/ai-translate-meeting/current/scripts/diagnostics.sh /opt/ai-translate-meeting` | Thu thập bundle đã sanitize, sau đó chạy `rollback-production.sh`; không xóa volume/database. |

Sau mỗi deploy, lưu kết quả smoke test, image SHA và thời điểm triển khai. Không chụp hoặc gửi `.env.production`, JWT, license key hay log có secret.

---

## 6. Ma Trận Tính Năng: Hiện Có (Operational) vs Kế Hoạch (Roadmap)

| Tính năng | Trạng thái hiện tại | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Real-time WebRTC Audio/Video** | **OPERATIONAL** | LiveKit SFU, khởi tạo track tuần tự chống race condition. |
| **Real-time Subtitle & Translation**| **OPERATIONAL** | VAD 350ms, Faster-Whisper int8, Redis cache (TTL 24h), hỗ trợ 8 ngôn ngữ phổ biến: VI, EN, JA, KO, ZH, FR, DE, ES. |
| **Meeting Intelligence (Laya)** | **OPERATIONAL** | Sidecar bất đồng bộ phát hiện Action Items & Decisions. |
| **Domain Glossary Engine** | **OPERATIONAL** | Tích hợp thuật ngữ kỹ thuật IT và kinh doanh; Hot-reload API (`/glossary/reload`). |
| **Export Biên bản song ngữ** | **OPERATIONAL** | Xuất Markdown, Text transcript, Word (.doc), Phụ đề (.srt). |
| **Host Waiting Room & Admission** | **OPERATIONAL** | Duyệt người tham gia, phòng chờ bảo mật, Host capability token. |
| **Scoped Session & Token Revoke** | **OPERATIONAL** | JWT phiên ngắn hạn, thu hồi phiên ngay khi rời phòng. |
| **Distributed Rate Limiting** | **OPERATIONAL** | Redis token bucket chống brute-force và DDoS. |
| **Zero PII Logging & Edge Security**| **OPERATIONAL** | CSP không eval, HSTS, không log token/transcript thô. |
| **Preflight & Config Generation** | **OPERATIONAL** | Tooling kiểm tra tiền kiểm, sinh secret an toàn, chmod 600. |
| **Sanitized Diagnostics Bundle** | **OPERATIONAL** | Thu thập bundle sự cố đã lọc sạch bí mật và transcript. |
| **System Status & Overview API** | **OPERATIONAL** | Cung cấp thông tin phiên bản, profile, retention, privacy contract (`/api/system/status`). |
| **On-Demand Retention Cleanup API**| **OPERATIONAL** | Kích hoạt dọn dẹp các admission/session hết hạn (`POST /api/system/cleanup`). |
| **Admin Bootstrap Tooling (CLI)** | **OPERATIONAL** | Script kiểm tra và in tóm tắt vận hành zero-secret (`scripts/bootstrap-admin.sh`, `scripts/bootstrap-admin.ps1`). |
| **System Status & Data Control Modal**| **OPERATIONAL** | Giao diện Web hiển thị trạng thái hạ tầng, cờ bảo mật, hot-reload glossary và kích hoạt dọn dẹp. |
| **Host Security & Authentication**| **OPERATIONAL** | Bảo vệ quyền khởi tạo phòng qua khóa máy chủ riêng (`X-Host-Key`), cờ `RequireHostAuthentication`. |
| **Audit Log & Security Event Stream**| **OPERATIONAL** | Bounded 200 circular buffer, Zero-PII sanitization (tự động xóa JWT/Bearer), API `GET /api/system/audit` & Web stream. |
| **Air-Gapped Offline Translation**| **OPERATIONAL** | Hỗ trợ 3 backend: `offline_http` (nội bộ container MarianMT/CTranslate2/LibreTranslate), `local_dictionary` (100% offline không network), `gtx_cloud` (fallback kèm Redis 24h). |
| **Synthetic Audio Load Test** | **OPERATIONAL** | Công cụ đo đạc TTFS p50/p95 với luồng audio PCM 16kHz thật, hỗ trợ phòng chia sẻ đa người nói (`scripts/load-test.py`). |
| **Commercial Licensing & Organization Engine** | **OPERATIONAL** | Xác thực bản quyền số qua HMAC-SHA256, kiểm soát hạn ngạch phòng đồng thời (`MeetingService`), API `GET /api/system/license`, Web modal badge và CLI admin bootstrap. |
| *Enterprise SSO (OIDC / SAML)* | **ROADMAP** | Đăng nhập qua Google Workspace, Microsoft Entra ID, Okta cho Host doanh nghiệp. |
| *High-Availability (Dual VPS / Failover)* | **ROADMAP** | Kiến trúc dự phòng nóng active-passive cho hạ tầng on-premise doanh nghiệp lớn. |
