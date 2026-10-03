# AI Translate Meeting todo

## P0 - Cần làm ngay để có demo
- [x] Task 1 implementation: Sửa đường WebSocket subtitle cho dev và Docker config.
- [x] Task 2 implementation: Gắn subtitle overlay/panel vào meeting screen.
- [x] Task 3 implementation: Chuẩn hóa subtitle message contract.
- [x] Task 1-3 browser verification: subtitle mock hiển thị trên overlay và transcript panel.
- [x] Task 1-3 Docker verification: tất cả container đã chạy healthy trên Docker compose.
- [x] Checkpoint A: Demo subtitle hoạt động end-to-end trong Docker và browser.

## P1 - Real AI flow (Đã thay thế mock bằng AI thật)
- [x] Task 4: Capture và gửi audio chunks từ browser (350ms, VAD filter).
- [x] Task 5: Thay mock STT bằng faster-whisper lazy loading & partial/interim support.
- [x] Task 6: Translation provider thật và cache (Redis TTL + Google GTX + fallback).
- [x] Checkpoint B: Demo mic -> STT -> translation -> UI (Laya async sidecar non-blocking, TTFS p50 ~964ms).

## P2 - Stabilize & Testing
- [x] Task 7: API integration tests & controller unit tests (62/62 .NET tests passed).
- [x] Task 8: CI chạy đầy đủ quality gates (`.github/workflows/ci.yml` gồm web lint/build, .NET test, Python pytest).
  - [x] Frontend build chạy bundle gate ngay sau Vite build; fail khi thiếu artifact, initial index preload LiveKit hoặc JavaScript chunk vượt `500_000` bytes.
  - [x] Bundle re-measurement: `livekit-client` là upstream ESM bundle đơn, được lazy-load qua MeetingPage; chunk hiện tại `489,535` bytes và được CI gate chặn khi vượt budget.
- [x] Task 9: Docker smoke test tự động hóa.
  - [x] Mở rộng `scripts/smoke-test.ps1` thành 19 checks, gồm JWT WebSocket success, missing token 4401, cross-room 4403 và oversized audio 1009.
  - [x] Runtime re-verification: Docker Desktop đã phục hồi, data VHD được bảo toàn; Redis `PONG`, API readiness báo `redis: healthy`, rate-limit keys được tạo thật và smoke test 19/19 ngày 2026-10-01.

## P3 - Production Hardening & Documentation
- [x] Task 10: Room access security & participant session.
  - [x] LiveKit token TTL cấu hình được (mặc định 60 phút).
  - [x] API phát hành JWT phụ đề 10 phút, bind `meetingId` + `participantId`, scope `subtitle:write`.
  - [x] AI WebSocket xác thực signature/expiry/issuer/audience/scope/binding trước khi nhận audio; có test missing/expired/cross-room.
  - [x] Host capability JWT, invite one-time và waiting-room admission bind meeting/role/scope; meeting code không còn cấp session token trực tiếp.
  - [x] Host API/UI tạo invite, xem pending request, approve/reject; frontend xử lý pending/rejected/invalid/expired.
  - [x] PostgreSQL migration additive cho `meeting_admissions` và participant role; replay protection dùng conditional update trong transaction.
- [x] Task 11: CORS/config/secrets hardening & error recovery modals.
  - [x] CORS allowlist cấu hình được cho API và AI service, có integration tests.
  - [x] Loại bỏ credential/dev secret khỏi tracked config, thêm fail-fast validation và token TTL cấu hình được (mặc định 60 phút).
  - [x] Chuẩn hóa `/health` lỗi theo RFC 7807 và không trả exception detail.
- [x] Task 12: Release hardening follow-up.
  - [x] Khóa trust boundary của rate limiter: chỉ tin forwarding header từ proxy IP cấu hình rõ ràng; smoke test chống spoof.
  - [x] Join transaction chỉ commit sau khi lưu participant session thành công; có test rollback participant/admission khi lỗi.
  - [x] Nginx áp dụng security headers cho HTML và assets; CSP bỏ `unsafe-eval`.
  - [x] Backup/restore fail-safe, rehearsal trên database cô lập và runbook dùng đúng contract.
- [x] Task 13: Multi-speaker subtitle runtime hardening.
  - [x] Speaker identity chỉ lấy từ claim JWT đã ký; token legacy không có tên dùng nhãn chung `Participant`.
  - [x] Reconnect-safe connection registry: handler cũ không thể unregister kết nối thay thế mới hơn.
  - [x] Redis translation cache dùng async I/O; domain classification cục bộ không gọi mạng trên critical path.
  - [x] Dataset collector không được khởi tạo trong subtitle runtime; contextual translation chỉ bật qua feature flag.
  - [x] Log AI không chứa token, secret, tên hoặc nội dung transcript thô.
- [x] Task 14: Local real-browser readiness.
  - [x] Giới hạn WebSocket audio frame 128 KiB, text frame 16 KiB và Uvicorn receive queue 8 message; frame quá lớn đóng bằng code 1009 trước decode/STT.
  - [x] Loại bỏ Uvicorn protocol log chứa query `participantId`; app log không ghi participant/token.
  - [x] Bỏ Google Fonts bị CSP chặn, dùng system font và giữ CSP chặt.
  - [x] Pre-join xóa cảnh báo permission cũ khi người dùng tắt cả mic và camera.
  - [x] LiveKit có HTTP healthcheck thật; API chỉ start sau khi LiveKit healthy.
  - [x] Browser test thật: host create/join, code-only guest pending, host approve, guest tự join, hai participant cùng phòng và subtitle hiển thị; console cuối 0 error.
  - [x] Audio runtime thật: PCM 16 kHz đi qua API/JWT/WebSocket/VAD/faster-whisper/translation, nhận final subtitle `vi -> en`, binding đúng participant; 5 chunks/55.296 bytes, warm latency 3,781 giây (2026-10-02).
- [x] Task 15: Whisper cold-start hardening (chi tiết trong `tasks/plan.md`).
  - [x] 15.1: STT lifecycle state và preload idempotent, có concurrency/failure tests. Phụ thuộc: không.
  - [x] 15.2: FastAPI background preload, shared STT singleton và `/health/live` + `/health/ready`. Phụ thuộc: 15.1.
  - [x] Checkpoint C1: backend readiness tests và subtitle JWT/WebSocket regression pass.
  - [x] 15.3: Docker persistent Whisper cache, preload env và readiness healthcheck. Phụ thuộc: 15.2.
  - [x] 15.4: Frontend readiness service/hook qua same-origin proxy. Phụ thuộc: 15.2.
  - [x] 15.5: Banner “AI đang khởi động” và không gửi audio trước readiness. Phụ thuộc: 15.4.
  - [x] Checkpoint C2: browser cold-start UX và audio gating hoạt động; meeting vẫn connected khi AI dừng, banner tự biến mất khi ready (2026-10-03).
  - [x] 15.6: Runtime cold/warm gate, sanitized observability và runbook. Phụ thuộc: 15.3, 15.5.
  - [x] Warm audio re-verification: 55.296 byte PCM qua API/JWT/WebSocket/VAD/Whisper/translation, nhận final `vi -> en`, binding đúng; 8,061 giây (2026-10-03).
  - [x] Checkpoint C3: full test/build/audit/smoke pass và local code review; cần human review trước merge/deploy.
- [x] Node build runtime nâng từ Node 20 EOL lên Node 24 LTS; CI dùng `npm ci` và audit gate.
- [x] Vá dependency High: npm audit 0; NuGet vulnerability scan 0, giữ tương thích .NET/EF Core 8.
- [x] Documentation: Hoàn thiện `docs/PRD.md` (AI BA Bella) và `docs/architecture.md` (AI Architect Liam).
- [x] Update `AGENTS.md` đồng bộ hóa vision, stage, và quy trình kiểm định.

## P4 - Tính năng giá trị gia tăng (Delivered)
- [x] Meeting Minutes & Action Items Markdown export (Nút "Xuất biên bản" trong SubtitlePanel).
- [x] Export toàn bộ transcript định dạng văn bản (`meeting-transcript-*.txt` qua nút "Tải file .txt").
- [x] Thanh trượt điều chỉnh ngưỡng tin cậy Laya Intelligence (50% - 95%).
- [x] Tích hợp AI Meeting Intelligence Recap tóm tắt tự động (Executive Highlights, Topic Clusters, Speaker Talk-Time Analytics).
- [x] Export đa định dạng: `.srt` (phụ đề video), `.doc` (Word biên bản hoàn chỉnh kèm AI summary), và `.md` (Markdown Slack/Teams).
- [x] Custom Domain Glossary theo dự án (Engineering IT, Business, General) tại PreJoinPage kết hợp Whisper STT Initial Prompting.
- [x] In-Meeting Real-time Chat & Floating Emoji Reactions qua WebRTC DataChannel (Topic `meeting-chat` & `meeting-reaction`).
- [x] Audio-Transcript Speech Replay (Nghe lại phát âm lời thoại bằng Web Speech Synthesis) & Web Audio API Action Chime.

## P3.1 - VPS Docker release
- [x] Production Compose chỉ public Caddy TLS và LiveKit media ports; database/cache/API nội bộ không publish host port.
- [x] Caddy automatic HTTPS, LiveKit public WSS và external-IP media config.
- [x] Immutable GHCR images cho API, AI, Laya và web; Laya dependency pin `0.3.20` tại build time.
- [x] Migration one-shot, pre-deploy PostgreSQL backup, readiness gate và automatic rollback scripts.
- [x] GitHub Actions CI bổ sung audit/Compose gates; CD có production Environment approval và pinned SSH host key.
- [x] Reverse-proxy trust boundary cho API/AI rate-limit, không tin client-supplied forwarding header trực tiếp.
- [ ] BLOCKED: cấu hình VPS/DNS/GitHub secrets và thực hiện deployment thật.
- [ ] Post-deploy smoke, multi-user audio/video/subtitle và soak test 30–60 phút.

## P3.2 - Self-Hosted Commercial Packaging & Privacy Baseline
- [x] Chuyển đổi định vị chiến lược sang **Private Bilingual AI Meeting Workspace cho đội dự án Việt–Nhật** tự host trên VPS/On-Premise; không cạnh tranh thay thế Zoom/Teams/Meet.
- [x] Xác lập Privacy & Data Control Contract: Không lưu audio thô mặc định, RAM ephemeral chunks, Zero PII logging, minh bạch kết nối dịch thuật.
- [x] Thiết lập hai profile triển khai: `pilot` (4 vCPU / 8 GB RAM, Whisper tiny, Laya tắt, sizing hypothesis) và `business` (8 vCPU / 16 GB RAM, Whisper small, Laya bật, load test yêu cầu) tại `config/profiles/`.
- [x] Xây dựng công cụ kiểm tra tiền kiểm `scripts/preflight.sh` (kiểm tra CPU, RAM, Disk, Docker, DNS, ports, biến bắt buộc, độ dài secret >= 32, cách ly khóa bí mật, zero secret echo, exit codes chuẩn).
- [x] Xây dựng công cụ tạo cấu hình an toàn `scripts/generate-config.sh` (tự động tạo secret ngẫu nhiên >= 48 ký tự, chmod 600, không echo secret).
- [x] Xây dựng công cụ chẩn đoán bảo mật `scripts/diagnostics.sh` (tự động lọc sạch JWTs, secrets, passwords và transcripts trước khi đóng gói tar.gz).
- [x] Bổ sung bộ kiểm thử hợp đồng tự động `tests/test_self_hosted_contract.py` (25/25 checks passed).
- [x] Xây dựng công cụ khởi động & thẩm định quản trị viên `scripts/bootstrap-admin.sh` và `scripts/bootstrap-admin.ps1` (Zero secret echo, xác minh profile, STT model, glossary và retention).
- [x] Xây dựng API trạng thái hệ thống `GET /api/system/status` (.NET Kestrel) cung cấp thông tin profile, retention policy, privacy contract và zero-secret health.
- [x] Xây dựng API kích hoạt dọn dẹp lưu trữ theo yêu cầu `POST /api/system/cleanup` (.NET Kestrel) dọn dẹp các admission/session quá hạn retention.
- [x] Xây dựng giao diện web quản lý hạ tầng & dữ liệu `SystemStatusModal.tsx` và `systemService.ts` trên `apps/web` (theo dõi DB, Redis, AI Whisper, hot-reload glossary, kích hoạt dọn dẹp).
- [x] Xây dựng API quản lý Glossary `GET /glossary/stats` & `POST /glossary/reload` (FastAPI) hỗ trợ cập nhật từ điển nóng.
- [x] Thiết kế & triển khai Động cơ Dịch thuật Đa Backend Air-Gapped (`offline_http`, `local_dictionary`, `gtx_cloud`) tại `apps/ai-service/app/translation/local_provider.py` với Redis caching và zero network mode.
- [x] Triển khai Bảo mật Khởi tạo Cuộc họp Doanh nghiệp (`HostSecurityOptions`, `RequireHostAuthentication`, header `X-Host-Key`).
- [x] Triển khai Hệ thống Ghi vết & Kiểm toán An ninh (`AuditLogService`, circular buffer 200 bản ghi, tự động lọc sạch JWT/Bearer tokens, API `GET /api/system/audit` và stream sự kiện trên Web UI).
- [x] Phát triển công cụ kiểm thử tải âm thanh giả lập đa người nói chia sẻ phòng `scripts/load-test.py` đo đạc TTFS p50/p95 (3/3 sessions passed, TTFS p50 ~1.4ms).
- [x] Thiết kế & triển khai Động cơ Quản lý Giấy phép Doanh nghiệp & Tổ chức (`LicenseOptions.cs`, `LicenseService.cs`, HMAC-SHA256 constant-time verification, kiểm soát số phòng đồng thời trong `MeetingService.cs`).
- [x] Tích hợp API Giấy phép `GET /api/system/license` và nhúng siêu dữ liệu bản quyền trong `GET /api/system/status`.
- [x] Tích hợp Frontend: `SystemLicenseInfo` interface & `fetchSystemLicense()` trong `systemService.ts`, bảng hiển thị bản quyền doanh nghiệp & hạn ngạch phòng trong `SystemStatusModal.tsx`.
- [x] Cập nhật công cụ CLI bootstrap `scripts/bootstrap-admin.ps1` và `scripts/bootstrap-admin.sh` hiển thị tổ chức, gói giấy phép và trạng thái mà không làm lộ khóa ký hay secret.
- [x] Bổ sung bộ kiểm thử bản quyền: `LicenseServiceTests.cs` (5 tests), `SystemControllerTests.cs`, `test_self_hosted_contract.py` (27 checks passed).
- [x] Mở rộng ma trận ngôn ngữ sang 8 ngôn ngữ phổ biến: Tiếng Việt (vi), Anh (en), Nhật (ja), Hàn (ko), Trung (zh), Pháp (fr), Đức (de), Tây Ban Nha (es) trên toàn bộ pipeline (DTOs, MeetingService, AI WebSocket, PreJoinPage, JoinMeetingPage, SpeechSynthesis locales).
- [x] Soạn thảo đặc tả thương mại & cẩm nang vận hành `docs/self-hosted-product.md`.
- [x] Đồng bộ hóa tài liệu kiến trúc `docs/architecture.md`, `docs/PRD.md` và `README.md`.
- [x] Phát triển công cụ cài đặt trọn gói Turnkey Self-Hosted `scripts/setup-self-hosted.sh` (tự động hóa 8 bước trên Ubuntu 24.04/Debian: preflight, sinh cấu hình bí mật 0600, di trú DB, kiểm tra readiness, chạy smoke test và cài đặt systemd autostart).
- [x] Phát triển công cụ sao lưu & phục hồi database Linux native `scripts/backup-database.sh` và `scripts/restore-database.sh` (nén gzip 0600, guard kiểm thử `_restore_test`, không log mật khẩu).
- [x] Thiết lập Systemd Service Unit `infra/systemd/ai-translate-meeting.service` đảm bảo hệ thống tự động khởi động lại khi VPS reboot.
- [x] Nâng cấp bộ kiểm thử khói Linux `scripts/smoke-test.sh` hỗ trợ kiểm tra 20 điểm toàn diện qua cờ `--domain` và mạng nội bộ Docker.
- [x] Bổ sung bộ kiểm thử hợp đồng triển khai VPS `tests/test_vps_deployment_contract.py` (12/12 checks passed).

## P3.3 - Translation-Aware Anti-Chaos Flow (Soft Floor, Timeline Review & Audio Booth)
- [x] Slice 1: Protocol & Mapping: Hợp đồng `pipeline_status` (`transcribing`, `translating`, `ready`, `failed`), sequence counter, và LiveKit identity mapping qua signed JWT claim.
- [x] Slice 2: Soft Floor UI Wiring: Truyền `pipelineStatuses` từ `useSubtitle` qua `MeetingShell`, `MeetingStage`, `ParticipantTile`, `FloatingSelfView`, `PresentationStage`, `SubtitleOverlay` ("Đang dịch...").
- [x] Slice 3: Timeline Review Hardening & Badges: Hiển thị cặp ngôn ngữ gốc/đích (`VI → JA`), số thứ tự phát biểu (`#1`), và smart auto-scroll phát hiện cuộn tay kèm nút "Cuộn xuống mới nhất".
- [x] Slice 4: Simultaneous Audio Booth & Ducking: Client-side zero-server-cost TTS queue tuần tự (chỉ final, lọc self, drop lag > 2.5s) và smooth -18dB remote audio ducking qua `audioDuckingRegistry`.
- [x] Slice 5: Quality Gate Verification: Vượt qua toàn bộ bộ kiểm thử tự động (.NET: 84/84 passed, Python Pytest: 174/174 passed, Web lint: 0 warnings, Web build: 12 chunks <= 500kB).

## Lệnh verify chuẩn sau mỗi batch
- [x] `npm run lint` trong `apps/web` (0 errors, 0 warnings, 2026-10-03)
- [x] `npm run build` trong `apps/web` (Pass, 12 chunks <= 500,000 bytes, 2026-10-03)
- [x] `dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj` (84 passed, 0 failed, 2026-10-03)
- [x] `python -m pytest tests/ apps/ai-service/tests/ -v` (174 passed trên host, 0 failed, 2026-10-03)
- [x] `npm audit --omit=dev --audit-level=low` (0 vulnerabilities, 2026-10-03)
- [x] NuGet vulnerability scan cho API và test project (0 vulnerable packages, 2026-10-03)
- [x] `docker compose config -q` (Pass, 2026-10-03)
- [x] `docker compose --env-file <test-production-env> -f docker-compose.production.yml config -q` (Pass, 2026-10-03)
- [x] `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-test.ps1` (20/20, 2026-10-03)
- [x] `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bootstrap-admin.ps1 -EnvFile config/profiles/pilot.env` (Pass, 2026-10-03)
- [x] `python scripts/load-test.py --concurrency 3 --sample-file vi_sample_16k.pcm` (3/3 sessions passed, TTFS p50 1.4ms, 2026-10-03)



