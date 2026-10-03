# Architecture Design: Nền Tảng AI-Translate-Meeting

> **Tác giả:** AI Solution Architect (Liam) & Senior Product Architect  
> **Dự án:** AI-Translate-Meeting  
> **Phiên bản:** 1.2.0 (Self-Hosted Private Architecture)  
> **Trạng thái:** Approved Architecture Baseline  
> **Mô hình định vị:** Private bilingual AI meeting workspace dành cho đội dự án Việt–Nhật, tự lưu trữ (self-hosted) trên VPS/On-Premise của khách hàng, bảo mật dữ liệu tuyệt đối, không lưu audio thô, tối ưu thuật ngữ kỹ thuật và biên bản hành động song ngữ.

---

## 1. Tổng quan Kiến trúc Hệ thống (System Overview)

Hệ thống **AI-Translate-Meeting** được thiết kế theo kiến trúc Microservices phân tán hướng sự kiện và stream thời gian thực (Real-time Streaming & Event-Driven Architecture), đóng gói toàn diện qua Docker Compose để có thể triển khai trên một máy chủ Ubuntu 24.04 duy nhất hoặc hạ tầng ảo hóa riêng của doanh nghiệp:

1. **Ingress & TLS Proxy (`caddy`)**: Caddy v2 tự động cấp phát và gia hạn chứng chỉ HTTPS/WSS cho hai tên miền công khai (`APP_DOMAIN` và `LIVEKIT_DOMAIN`), định tuyến traffic và chấm dứt TLS.
2. **Client Application (`apps/web`)**: Ứng dụng SPA (React 18 + Vite + Tailwind CSS) phục vụ giao diện họp, hiển thị phụ đề song ngữ trực tiếp, thu thập âm thanh qua Web Audio API (chunk 350ms) và kết nối LiveKit WebRTC / WebSocket AI.
3. **Backend Gateway & API (`apps/api`)**: Dịch vụ REST API trên nền tảng .NET 8 (C#) quản lý vòng đời phòng họp, phát hành LiveKit JWT tokens, cấp token phiên ngắn hạn (`participant_sessions`) và quản lý phòng chờ duyệt thành viên (`meeting_admissions`).
4. **Media SFU Server (`livekit`)**: Máy chủ LiveKit WebRTC phụ trách phân phối luồng âm thanh/hình ảnh chất lượng cao giữa các thành viên qua cổng WebRTC công khai (`7881/TCP`, `7882/UDP`).
5. **AI Speech & Translation Service (`apps/ai-service`)**: Dịch vụ FastAPI (Python 3.11) quản lý kết nối WebSocket phụ đề hai chiều, xử lý audio streaming, VAD, mô hình STT `faster-whisper` (int8 CPU) và dịch thuật ngữ cảnh theo Domain Glossary kèm cache Redis.
6. **Meeting Intelligence Engine (`laya`)**: Dịch vụ AI chuyên biệt chạy mô hình SystemOne đa ngôn ngữ để trích xuất Action Items và Decisions từ lời thoại (chạy dạng non-blocking async sidecar).
7. **Data Storage Layer**:
   - **PostgreSQL 16**: Lưu trữ bền vững thông tin phòng họp, lịch sử người tham gia, yêu cầu duyệt phòng và phiên xác thực.
   - **Redis 7**: Bộ nhớ đệm phân tán cho kết quả dịch thuật (Key-Value, TTL 24h) và bộ đếm rate limiting (TTL 60s).

```
                                      +--------------------------+
                                      |   Browser Client (Web)   |
                                      +-------------+------------+
                                                    |
                       +----------------------------+----------------------------+
                       | HTTP / REST                | WebRTC Audio/Video         | WebSocket (/ws/transcribe)
                       v                            v                            v
            +---------------------+      +---------------------+      +-----------------------+
            |  Backend API (.NET) |      |   LiveKit SFU (Go)  |      | AI Service (FastAPI)  |
            +----------+----------+      +---------------------+      +-----------+-----------+
                       |                                                          |
        +--------------+--------------+                            +--------------+--------------+
        v                             v                            v                             v
+---------------+             +---------------+            +---------------+             +---------------+
| PostgreSQL 16 |             | Redis 7 Cache |            | Redis 7 Cache |             | Laya Service  |
+---------------+             +---------------+            +---------------+             +---------------+
```

---

## 2. Luồng Xử Lý Real-Time Audio & Subtitle Pipeline

Điểm cốt lõi của kiến trúc là tối ưu hóa độ trễ hiển thị phụ đề (Time-To-First-Subtitle < 1 giây) bằng cách **tách hoàn toàn Laya ra khỏi Critical Path**:

```
User Speaks into Mic
        |
        v
Browser Audio Capture (350ms PCM 16kHz Mono chunks)
        |
        v [WebSocket Frame]
AI Service WebSocket Handler
        |
        v
Voice Activity Detector (VAD - Energy & RMS filter)
        |
   +----+--------------------------+
   | (Silent / Below Threshold)    | (Voice Detected)
   v                               v
Drop Chunk (No-op)           Speech Buffer (Accumulate chunks)
                                   |
                                   v
                             faster-whisper STT (int8 Tiny Model)
                                   |
                                   v
                             Transcript Generated (Interim / Final)
                                   |
                                   v
                             Translation Provider (Google GTX / Local)
                                   | (Query / Set Redis Cache)
                                   v
                     +-------------+-------------+
                     |                           |
                     v (CRITICAL PATH)           v (NON-BLOCKING SIDECAR)
             Send Subtitle Message         asyncio.create_task(
             Immediately to Frontend       call_laya_classifier(transcript))
                     |                                   |
                     v                                   v
             Render Subtitle on UI               Laya Classification
             (Latency ~960ms p50)                Tags: ['decision', 'action_item']
                                                         |
                                                         v
                                                 Send Laya Tag Badge
                                                 Update to Frontend (+658ms)
```

---

## 3. Chi Tiết Thiết Kế Thành Phần (Component Design)

### 3.1. Frontend WebRTC & Media Lifecycle Contract
Để khắc phục lỗi xung đột `NegotiationError` khi đàm phán PeerConnection với LiveKit:
- Thẻ `<LiveKitRoom audio={false} video={false}>` được cấu hình **không tự động publish track mặc định**.
- `MeetingShell.tsx` thực hiện publish tuần tự:
  1. Đợi kết nối `RoomState.Connected` thành công.
  2. Bật Microphone với thiết bị `session.audioDeviceId`:
     `await localParticipant.setMicrophoneEnabled(true, buildAudioOptions())`
  3. Bật Camera với thiết bị `session.videoDeviceId`:
     `await localParticipant.setCameraEnabled(true, buildVideoOptions())`
  4. Sử dụng khóa cờ `isTogglingMicRef` và `isTogglingCamRef` ngăn chặn thao tác click liên tục của người dùng.

### 3.2. Voice Activity Detection (VAD)
- **Tập tin:** `apps/ai-service/app/audio/vad.py`
- **Thuật toán:** Phân tích Root Mean Square (RMS) trên mảng tín hiệu PCM 16-bit và ước tính mức năng lượng tương đối (dBFS).
- **Cơ chế:** Khi chunk âm thanh có năng lượng thấp hơn ngưỡng im lặng, chunk bị loại bỏ ngay lập tức, không đưa vào bộ giải mã Whisper, giảm thiểu chi phí CPU máy chủ tới 75%.

### 3.3. Speech-to-Text (`SpeechToTextService`)
- **Tập tin:** `apps/ai-service/app/speech/whisper_service.py`
- **Công nghệ:** `faster-whisper` (CTranslate2 backend)
- **Tham số cấu hình:**
  - `model_size`: `tiny` (đa ngôn ngữ, bộ nhớ nhẹ ~150MB).
  - `device`: `cpu`
  - `compute_type`: `int8` (tối ưu hóa phép tính số nguyên 8-bit trên CPU Intel/AMD hiện đại).
  - `cpu_threads`: 4 luồng xử lý song song.

### 3.4. Dịch thuật & Caching (`TranslationProvider`)
- **Tập tin:** `apps/ai-service/app/translation/local_provider.py`
- **Khóa Cache Redis:** `tr:{sourceLanguage}:{targetLanguage}:{sha256(text)}`
- **TTL Cache:** 86,400 giây (24 giờ).
- **Cơ chế Fallback:** Thử dịch qua endpoint dịch thuật thời gian thực; nếu có timeout hoặc lỗi kết nối, tự động chuyển về từ điển đối chiếu offline mà không ném exception làm gián đoạn pipeline.

### 3.5. Laya Intelligence Client (`LayaDecisionClient`)
- **Tập tin:** `apps/ai-service/app/services/laya_client.py`
- **Cơ chế:** Gọi HTTP POST `/v1/systemone` tới Laya Container.
- **Ngưỡng tin cậy (Confidence):** Mặc định 0.80.
- **Tính độc lập:** Chạy hoàn toàn dưới dạng background task không đợi kết quả trước khi gửi tin nhắn phụ đề ban đầu.

---

## 4. Đặc Tả Hợp Đồng Dữ Liệu (Data Contracts)

### 4.1. Subtitle WebSocket Payload
Định dạng JSON gửi từ AI Service về Frontend:
```json
{
  "type": "subtitle",
  "data": {
    "meetingId": "583ed363-ffd7-464d-8282-7c2cf72f0c97",
    "participantId": "9bc0ce05-97df-4f2d-99fe-ca6799d95ee9",
    "participantName": "Nguyen Van A",
    "sourceLanguage": "vi",
    "targetLanguage": "ja",
    "originalText": "Chúng ta thống nhất chốt giải pháp triển khai trên đám mây.",
    "translatedText": "クラウドへの導入ソリューションを確定することに合意しました。",
    "isFinal": true,
    "confidence": 0.90,
    "tags": ["decision"],
    "timestamp": 1727546443000
  }
}
```

#### Multi-speaker identity và critical path

- `participantName` chỉ được tin cậy khi nằm trong Subtitle JWT đã ký. Token tương thích cũ không có claim này vẫn kết nối được nhưng được gán tên chung `Participant`; metadata tự khai trong auth frame không được dùng làm danh tính.
- Mỗi kết nối được đăng ký bằng đúng object connection. Khi reconnect, cleanup của handler cũ chỉ được xóa chính connection cũ và không thể xóa connection thay thế.
- Translation cache dùng Redis async để không block event loop. Domain hint được phân loại cục bộ; enrichment Laya qua mạng chỉ chạy background sau khi subtitle đầu tiên đã broadcast.
- Contextual translation chỉ được chọn qua `CONTEXTUAL_TRANSLATION_ENABLED`. Dataset collector không được wire vào subtitle runtime, vì vậy bật nhầm biến môi trường không làm lưu transcript hội thoại.
- Log runtime chỉ ghi metadata vận hành an toàn; không ghi JWT, secret, participant name hoặc transcript thô.
- Uvicorn giới hạn message WebSocket ở 128 KiB và receive queue ở 8 message. Handler giới hạn riêng audio 128 KiB, text 16 KiB và đóng connection bằng code `1009` trước decode/STT nếu vượt ngưỡng.
- Uvicorn protocol/access log được hạ xuống mức warning và tắt access log để query chứa participant identifier không xuất hiện trong log; application warning vẫn được giữ cho vận hành.

### 4.2. REST API Endpoints (.NET)
| Phương thức | Đường dẫn | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/api/meetings` | Tạo phòng họp mới, trả về `meetingCode` |
| `GET` | `/api/meetings/{meetingCode}` | Lấy thông tin phòng họp |
| `POST` | `/api/meetings/{meetingCode}/join` | Tham gia phòng, trả về LiveKit JWT Access Token |
| `POST` | `/api/meetings/{meetingCode}/leave` | Rời phòng họp, cập nhật `leftAt` |
| `GET` | `/api/meetings/{meetingCode}/participants` | Lấy danh sách thành viên đang có mặt |

### 4.3. Admission & Join Security

- `POST /api/meetings` trả thêm host capability JWT trong JSON response. Token có TTL 4 giờ, bind `meetingId`, role `host`, scope `meeting:host`.
- `POST /api/meetings/{meetingCode}/join` nhận `admissionToken` trong JSON body, không nhận token từ URL:
  - Host token hợp lệ: tham gia với role `host`.
  - Invite token hợp lệ: tham gia một lần với role `participant`.
  - Không có token: trả `202 Accepted` và admission request trạng thái `pending`; chưa phát LiveKit/subtitle JWT.
  - Admission request đã được host duyệt: client gửi lại request token để hoàn tất join.
- Host quản lý admission qua bearer token trong header `Authorization`:
  - `POST /api/meetings/{meetingCode}/invites`
  - `GET /api/meetings/{meetingCode}/admissions`
  - `POST /api/meetings/{meetingCode}/admissions/{admissionId}/decision`
- JWT admission dùng HS256 với allowlist algorithm, issuer/audience/type riêng, bắt buộc expiry và bind meeting/role/scope.
- Bảng `meeting_admissions` lưu invite/request, trạng thái, expiry và `consumed_at`. PostgreSQL consume grant bằng conditional update trong transaction để chống replay đồng thời.
- Participant, admission consumption và participant-session persistence cùng commit trong một transaction; lỗi phát hành/lưu session rollback toàn bộ join để không tạo participant mồ côi.
- Invite/request mặc định hết hạn sau 15 phút. API trả lỗi admission theo RFC 7807 với mã ổn định trong extension `code`.
- Rate limit: Tích hợp Redis-backed Distributed Rate Limiter với in-memory fallback: join 30 request/phút/IP, host admission 120 request/phút/IP, tạo phòng 10 request/phút/IP, và WebSocket handshake 30 handshakes/phút/IP. API chỉ nhận `X-Forwarded-For` từ IP reverse proxy được allowlist rõ ràng; nếu chưa cấu hình proxy tin cậy thì bỏ qua forwarding header.
- Nginx áp dụng cùng bộ CSP/HSTS/nosniff/frame/referrer/permissions headers cho HTML, SPA fallback và static assets; CSP không cho phép `unsafe-eval`.

### 4.4. Participant Session Authorization & Token Revocation
- Sau khi join phòng thành công, API phát hành **Participant Session JWT** ngắn hạn (TTL 60 phút) kèm phạm vi tối thiểu (`meeting:read`, `meeting:leave`).
- Tất cả các endpoint hậu join (`GET /api/meetings/{code}/participants`, `POST /api/meetings/{code}/leave`) bắt buộc xác thực qua header `Authorization: Bearer <sessionToken>`.
- Khóa bảo vệ chặt chẽ:
  - Token Subtitle WebSocket (`subtitle:write`) bị từ chối nếu gọi vào API REST.
  - Người tham gia thường không thể giả mạo Host hoặc thao tác lên người tham gia khác.
  - Bảng `participant_sessions` trong PostgreSQL lưu trữ định danh phiên (`jti`, `participant_id`, `meeting_id`, `role`, `expires_at`, `revoked_at`). Khi rời phòng, phiên bị thu hồi tức thì trên cơ sở dữ liệu (`revoked_at`), ngăn chặn triệt để tái sử dụng token.

### 4.5. Edge Security & Pipeline Hardening
- **Security Headers Middleware**: Áp dụng chuẩn `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS khi chạy Production, và Content-Security-Policy (CSP) tương thích với LiveKit WebRTC và Vite.
- **Request Body Limit**: Giới hạn kích thước payload HTTP trên máy chủ Kestrel tối đa 10 MB.
- **Fail-Fast Secret Isolation**: API kiểm tra tính hợp lệ của tất cả các secret khi khởi động; cấm sử dụng cùng một secret cho các mục đích bảo mật khác nhau (Admission, Subtitle, LiveKit) và từ chối các chuỗi ngắn hơn 32 ký tự hoặc giá trị placeholder mặc định.

### 4.6. Observability & Giám Sát Sức Khỏe
- **Correlation ID Tracking**: Tự động sinh hoặc kế thừa header `X-Correlation-ID` (hoặc `X-Request-ID`), gắn vào Serilog `LogContext` trên từng luồng request.
- **Zero PII Logging**: Loại bỏ hoàn toàn việc log token, mật khẩu, và nội dung giọng nói hội thoại thô; chỉ ghi nhận độ dài ký tự và mã lỗi mở rộng theo RFC 7807.
- **Phân tách Health Probes**:
  - `GET /health/live`: Kiểm tra tính sống sót (liveness) của tiến trình.
  - `GET /health/ready`: Kiểm tra PostgreSQL và Redis; ở production, Redis thiếu hoặc mất kết nối trả RFC 7807 HTTP 503, còn development có thể chạy với trạng thái `redis: not_configured`.
  - AI service dùng cùng đường dẫn nhưng contract độc lập: `/health/live` luôn phản ánh event loop; `/health/ready` chỉ trả 200 sau khi singleton Whisper đã load. Trạng thái `not_started/loading/failed` trả RFC 7807 HTTP 503.
- **Whisper cold-start**: FastAPI lifespan preload model ở background khi `WHISPER_PRELOAD=true`. WebSocket và health dùng chung một `SpeechToTextService`, nên không load model lần hai. Docker giữ Hugging Face artifacts trong named volume `whisper_cache`; frontend poll same-origin `/ai-health/ready`, vẫn cho phép vào LiveKit nhưng chưa tạo `MediaRecorder` cho đến khi AI ready.
- **Observability an toàn**: chỉ log model/device, transition và `load_duration_ms`; không log token, transcript, tên participant hoặc exception/path nội bộ. LiveKit SDK logger bị đặt `silent` vì URL handshake có thể chứa access token; diagnostics của ứng dụng chỉ bật qua feature flag và dùng dữ liệu đã rút gọn.

### 4.7. Chính Sách Lưu Trữ & Tự Động Dọn Dẹp (Data Retention)
- Bảng `meeting_admissions`: Tự động dọn dẹp các admission đã hết hạn quá 24 giờ.
- Bảng `participant_sessions`: Tự động xóa các session đã hết hạn hoặc đã bị thu hồi quá 24 giờ thông qua `DatabaseCleanupBackgroundService` định kỳ mỗi giờ.
- Redis Cache: Tự động hết hạn kết quả dịch thuật sau 24 giờ (`TTL 86400s`) và khóa rate limit sau 60 giây.

### 4.8. Privacy & Data-Control Contract (Cam Kết Dữ Liệu Riêng Tư)
- **KHÔNG LƯU AUDIO THÔ MẶC ĐỊNH**: Tín hiệu microphone gửi lên dưới dạng chunk PCM 16kHz 350ms được xử lý hoàn toàn trong bộ nhớ đệm RAM (VAD + Whisper) và bị tiêu hủy ngay sau khi phát hành transcript. Không có bất kỳ file âm thanh nào được lưu trữ trên đĩa cứng hoặc cơ sở dữ liệu.
- **Minh bạch về Translation Connectivity**:
  - *Contextual & Local Provider*: Sử dụng bộ từ điển thuật ngữ kỹ thuật cục bộ (Domain Glossary) và Redis cache. Hoàn toàn không gửi dữ liệu ra ngoài mạng nội bộ.
  - *External Translation Fallback*: Nếu quản trị viên bật dịch vụ dịch thuật bên ngoài (Google GTX / DeepL), các đoạn văn bản chưa có trong cache sẽ kết nối ra API bên ngoài. Quản trị viên muốn cô lập mạng tuyệt đối (air-gapped) phải cấu hình `TRANSLATION_FALLBACK_PROVIDER=local` và khóa kết nối Internet outbound của container AI.
- **Zero PII Logging Policy**: CẤM ghi log các thông tin: JWT tokens, API keys, signing keys, transcript thô, tên đầy đủ của participant, nội dung chat. Chỉ ghi nhận độ dài ký tự, correlation ID và mã lỗi RFC 7807.

---

## 5. Quy Chuẩn Triển Khai Docker & Sizing Profiles

### 5.1. Bảng Phân Phối Cổng Mạng (Network & Ports Boundary)

Trong môi trường Production (`docker-compose.production.yml`), toàn bộ các dịch vụ cơ sở dữ liệu và nghiệp vụ nội bộ đều nằm trong mạng subnet cô lập `172.30.0.0/24`, **không publish cổng ra Internet**:

| Service | Container Name | Internal IP / Port | Public Ingress Port | Ghi chú bảo mật |
| :--- | :--- | :--- | :--- | :--- |
| **caddy** | `caddy` | 172.30.0.5:80,443 | `80, 443/tcp, 443/udp` | Điểm tiếp nhận duy nhất cho HTTPS/WSS |
| **livekit** | `livekit` | 172.30.0.x:7880 | `7881/tcp, 7882/udp` | Cổng media WebRTC bắt buộc mở cho client |
| **web** | `web` | 172.30.0.10:3000 | *Không expose* | Nhận reverse proxy từ Caddy |
| **api** | `api` | 172.30.0.20:5000 | *Không expose* | Nhận reverse proxy từ Web Nginx |
| **ai-service**| `ai-service` | 172.30.0.30:8000 | *Không expose* | Nhận reverse proxy từ Web Nginx |
| **laya** | `laya` | 172.30.0.x:8000 | *Không expose* | Chỉ giao tiếp nội bộ với AI Service |
| **postgres** | `postgres` | 172.30.0.x:5432 | *Không expose* | Chỉ giao tiếp nội bộ với API |
| **redis** | `redis` | 172.30.0.x:6379 | *Không expose* | Chỉ giao tiếp nội bộ với API và AI |

### 5.2. Cấu hình Theo Profile Phần Cứng (Deployment Profiles)

1. **Profile `pilot`** (`config/profiles/pilot.env`):
   - **Tài nguyên khuyến nghị:** 4 vCPU, 8 GB RAM, 25 GB SSD.
   - **Cấu hình AI:** Faster-Whisper `tiny` (int8 trên CPU), `LAYA_ENABLED=false` (tắt trích xuất tự động để ưu tiên CPU cho phụ đề).
   - **Quy mô mục tiêu (Sizing Hypothesis):** 1 phòng hoạt động đồng thời, 3–5 người tham gia.
   - *Ghi chú:* Đây là giả định kích thước ban đầu, không phải cam kết dung lượng; cần chạy soak test trên môi trường staging trước khi nghiệm thu.

2. **Profile `business`** (`config/profiles/business.env`):
   - **Tài nguyên khuyến nghị:** 8 vCPU, 16 GB RAM, 50 GB SSD.
   - **Cấu hình AI:** Faster-Whisper `small` (int8 trên CPU), `LAYA_ENABLED=true` (bật trích xuất Action Items & Decisions).
   - **Quy mô mục tiêu:** Hỗ trợ nhiều phòng họp song song của các nhóm dự án gia công phần mềm.
   - *Ghi chú:* Dung lượng thực tế phải được đo đạc qua kịch bản kiểm thử tải (load test) trên hạ tầng khách hàng trước khi đưa vào sản xuất.

### 5.3. Công Cụ Vận Hành Tự Động (Tooling Suite)
- **Preflight Verification (`scripts/preflight.sh`)**: Kiểm tra fail-fast tài nguyên, Docker version, DNS, cổng mạng và cách ly khóa bảo mật trước khi cài đặt.
- **Safe Configuration Generator (`scripts/generate-config.sh`)**: Tự động sinh file `.env.production` với các chuỗi ngẫu nhiên mạnh (>= 48 ký tự), gán quyền `0600`, không in secret ra màn hình.
- **Sanitized Diagnostic Collector (`scripts/diagnostics.sh`)**: Đóng gói metrics, tình trạng container và logs đã lọc sạch hoàn toàn JWTs, mật khẩu và transcript cho đội ngũ hỗ trợ kỹ thuật.
- **Rollback Không Phá Hủy (`scripts/rollback-production.sh`)**: Chuyển đổi symlink về release ổn định trước đó mà không chạm vào PostgreSQL volumes hay dữ liệu đã lưu.

---
*Tài liệu này là chuẩn kiến trúc kỹ thuật ràng buộc toàn bộ các thay đổi mã nguồn trong dự án.*
