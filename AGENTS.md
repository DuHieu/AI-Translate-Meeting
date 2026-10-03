# AGENTS.md - Context for Claude Code, Antigravity, Codex, and Cursor

Dự án: **AI-Translate-Meeting**  
Chủ dự án (Owner): **Chủ Dự Án**  
Giai đoạn hiện tại (Stage): **COMPLETION_AND_STABILIZATION**  
Thư mục làm việc: `D:\MyProject\AI-Translate-Meeting`

## 1. Mục tiêu & Tầm nhìn (Vision)
Xây dựng nền tảng họp trực tuyến thông minh song ngữ thời gian thực (Real-time AI Meeting & Live Translation) nhằm phá vỡ rào cản ngôn ngữ trong các cuộc họp doanh nghiệp (đặc biệt là các cặp ngôn ngữ Tiếng Việt <-> Tiếng Nhật / Tiếng Anh):
- **WebRTC Streaming**: Âm thanh & hình ảnh độ trễ cực thấp với LiveKit Media Server.
- **Real-time STT**: Nhận dạng giọng nói tiếng Việt/Anh/Nhật bằng `faster-whisper` (int8) với Voice Activity Detection (VAD) lọc khoảng lặng và audio chunking 350ms.
- **Live Translation**: Dịch trực tiếp song song với bộ nhớ đệm phân tán Redis (TTL 24h) và fallback thông minh.
- **Laya Intelligence Sidecar**: Trích xuất Action Items và Decisions độc lập hoàn toàn khỏi critical path hiển thị phụ đề (non-blocking async tagging).
- **Meeting Minutes & Export**: Ghi lại lịch sử cuộc họp, phụ đề song ngữ và biên bản họp phục vụ lưu trữ/xuất báo cáo.

## 2. Quy Chuẩn Kỹ Thuật Bắt Buộc (Company Guidelines)
- **Kiến trúc Microservices**:
  - `apps/web`: React 18, Vite, TypeScript, Tailwind CSS, `@livekit/components-react`.
  - `apps/api`: .NET 8 Web API, Entity Framework Core, PostgreSQL, LiveKit Server SDK.
  - `apps/ai-service`: Python 3.11, FastAPI, `faster-whisper`, WebSockets, Redis.
  - `laya`: Laya Intelligent Decision & Action Item Classifier.
- **Tiêu chuẩn mã nguồn**:
  - Không block luồng phụ đề chính khi gọi các service phân tích AI phụ trợ.
  - Xử lý WebRTC device publishing tuần tự để tránh race condition renegotiation trên RTCPeerConnection.
  - Tất cả API response chuẩn ProblemDetails theo RFC 7807 khi phát sinh lỗi.
  - Mọi biến nhạy cảm, token, secret phải cấu hình qua file `.env` hoặc appsettings, không log token vào console.

## 3. Quy Trình Chạy Kiểm Thử (Verification Commands)
Mọi thay đổi mã nguồn trước khi coi là hoàn thành phải vượt qua toàn bộ các bộ kiểm thử:
```bash
# 1. Kiểm thử Python (AI Service & Subtitle/Media Contracts)
python -m pytest tests/ apps/ai-service/tests/ -v

# 2. Kiểm thử .NET API (Meeting Service & Controller Logic)
dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj

# 3. Kiểm tra chất lượng mã nguồn Frontend
cd apps/web && npm run lint && npm run build
```

## 4. Danh Sách Tasks Hiện Tại (Sprint Backlog)
- [x] **P0 - Core MVP Infrastructure**:
  - [x] Chuẩn hóa routing WebSocket `/ws/transcribe` cho dev & Docker.
  - [x] SubtitleOverlay và SubtitlePanel hiển thị song ngữ trực tiếp.
  - [x] Contract Subtitle Broadcast Message thống nhất giữa FastAPI và React.
- [x] **P1 - Real AI Pipeline (Nâng cấp từ Mock sang Realtime thật)**:
  - [x] Tích hợp `faster-whisper` (tiny int8, multi-threaded CPU).
  - [x] Tích hợp `VoiceActivityDetector` (Energy + RMS thresholding) vào `transcribe_handler`.
  - [x] Rút ngắn browser audio chunk từ 1500ms xuống 350ms.
  - [x] Hỗ trợ partial / interim transcript cập nhật tức thì (TTFS ~964ms).
  - [x] Thay thế local provider bằng mô hình dịch thật kèm Redis caching.
  - [x] Tách Laya khỏi critical path của Subtitle thành Async Sidecar (`asyncio.create_task`).
  - [x] Giải quyết race condition media publishing trên LiveKit Room.
- [x] **P2 - Stabilization & Verification**:
  - [x] Cấu hình `pytest.ini` đồng bộ root và discovery.
  - [x] Bổ sung Unit & Integration tests cho .NET API Controllers & Services.
  - [x] Cập nhật GitHub Actions CI workflow đa nền tảng (Web Lint/Build, .NET Test, Python Pytest).
  - [x] Xây dựng kịch bản Smoke Test tự động hóa (`scripts/smoke-test.ps1`).
- [ ] **P3 - Production Hardening & Features**:
  - [x] Room access security & LiveKit token TTL.
  - [x] Export biên bản họp (Markdown/Action Items) trên giao diện SubtitlePanel.

## 5. Cấu Trúc Tài Liệu Nghiệp Vụ
- **docs/PRD.md**: Đặc tả yêu cầu từ AI BA (Bella).
- **docs/architecture.md**: Thiết kế kiến trúc từ AI Architect (Liam).
- **apps/**: Mã nguồn thực thi (Frontend `web`, Backend `api`, AI Service `ai-service`).
- **tests/**: Bộ kiểm thử tự động (.NET xUnit, Python pytest, media/subtitle contracts).
