# AI Translate Meeting: Private Bilingual AI Meeting Workspace

> **Định vị:** Private bilingual AI meeting workspace dành cho đội dự án Việt–Nhật, có thể triển khai trong VPS/on-premise của khách hàng, tối ưu thuật ngữ dự án, phụ đề thời gian thực và biên bản hành động song ngữ.  
> **Tài liệu đặc tả sản phẩm & vận hành:** [docs/self-hosted-product.md](docs/self-hosted-product.md)  
> **Hướng dẫn triển khai VPS Docker:** [docs/vps-docker-deployment.md](docs/vps-docker-deployment.md)  
> **Runbook vận hành production:** [docs/production-runbook.md](docs/production-runbook.md)

AI-Translate-Meeting **không** định vị là đối thủ cạnh tranh hay bản sao thay thế Zoom, Microsoft Teams hoặc Google Meet. Sản phẩm tập trung giải quyết bài toán cốt lõi cho các công ty IT Outsourcing Việt Nam làm việc với đối tác Nhật Bản/quốc tế:
- **Data Ownership tuyệt đối**: Triển khai private VPS hoặc On-Premise, khách hàng sở hữu toàn bộ dữ liệu, không gửi audio/transcript ra các dịch vụ SaaS ngoại vi.
- **Không lưu audio thô mặc định**: Dữ liệu giọng nói chỉ xử lý tức thời trong RAM rồi giải phóng ngay lập tức.
- **Domain Glossary theo dự án**: Tối ưu thuật ngữ kỹ thuật, tên module và sản phẩm cho cặp ngôn ngữ Việt ↔ Nhật ↔ Anh.
- **Speaker-Aware Bilingual Subtitles**: Phụ đề song ngữ hiển thị thời gian thực theo từng người nói với token bảo mật.
- **Meeting Intelligence Sidecar**: Tự động nhận diện Quyết định (Decisions) và Nhiệm vụ (Action Items).
- **Xuất biên bản song ngữ tức thì**: Tạo biên bản họp đa định dạng (Markdown, Word .doc, Subtitle .srt, Transcript .txt).

## Current Status

**Stage: Self-Hosted Staging & Closed Beta Candidate**

- **Real-time STT & Translation Pipeline**: Powered by `faster-whisper` (int8 on CPU) with Voice Activity Detection (VAD) audio filtering (350ms chunks) and multi-engine translation with Redis caching (TTL 24h).
- **Laya Intelligence Sidecar**: Asynchronous decision and action item classification decoupled completely from critical subtitle path.
- **Admission & Participant Session Authorization**: Capability-based host token, waiting room approval flow, and scoped participant session JWTs (`meeting:read`, `meeting:leave`) with server-side database revocation (`participant_sessions`).
- **Edge Security & Rate Limiting**: Distributed Redis token bucket rate limiting (10 req/min create, 30 req/min join, 120 req/min host, 30 handshakes/min WebSocket), CSP, nosniff, DENY, Referrer-Policy, HSTS, and 10MB body limits.
- **Observability & Health Checks**: Structured Serilog correlation ID (`X-Correlation-ID`) propagation, `/health/live` (process liveness) and `/health/ready` (database + Redis readiness probes), and zero PII logging.
- **Data Retention & Operations**: Automated hourly background purge for expired admissions and participant sessions (> 24h), plus tested database backup and restore runbooks (`scripts/backup-database.ps1`, `scripts/restore-database.ps1`).
- **Self-Hosted Automation Tooling**: Preflight verification script (`scripts/preflight.sh`), safe configuration generator (`scripts/generate-config.sh`), and sanitized diagnostic bundle collector (`scripts/diagnostics.sh`).

## Architecture

```text
Browser
  |-- React + Vite web app
  |     |-- REST calls to ASP.NET Core API
  |     |-- LiveKit client for WebRTC media
  |     `-- WebSocket to AI service for subtitle events
  |
  |-- LiveKit server
  |
  |-- ASP.NET Core API
  |     |-- Meeting and participant endpoints
  |     |-- LiveKit token generation
  |     `-- PostgreSQL via EF Core
  |
  `-- Python FastAPI AI service
        |-- WebSocket transcript endpoint
        |-- Speech-to-text service abstraction
        `-- Translation provider abstraction

Redis is available for caching and future realtime coordination.
```

## Tech Stack

| Area | Stack |
| --- | --- |
| Web | React 18, TypeScript, Vite, Tailwind CSS |
| API | ASP.NET Core 8, Controllers, SignalR, EF Core, PostgreSQL |
| AI service | Python, FastAPI, WebSocket, faster-whisper-ready service layer |
| Realtime media | LiveKit |
| Cache | Redis |
| Local runtime | Docker Compose |

## Repository Layout

```text
apps/
  web/         React + Vite frontend
  api/         ASP.NET Core API
  ai-service/  Python FastAPI AI service
infra/
  livekit/     LiveKit local config
tests/
  AITranslateMeeting.Api.Tests/  .NET unit tests
.github/
  workflows/   CI build workflow
```

## Prerequisites

- Docker Desktop
- Node.js 20+
- .NET SDK 8.x
- Python 3.11+

## Quick Start with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Local URLs:

| Service | URL |
| --- | --- |
| Web app | `http://localhost:3000` |
| API | `http://localhost:5000` |
| API health | `http://localhost:5000/health` |
| AI service | `http://localhost:8000` |
| AI health | `http://localhost:8000/health` |
| LiveKit | `ws://127.0.0.1:7880` |

Local media compatibility and verification limits: [Media verification](docs/media-verification.md).
Codex/Antigravity collaboration: [Agent bridge](docs/agent-bridge.md).

Optional Linux/WSL2 host networking profile:

```bash
docker compose -f docker-compose.yml -f docker-compose.hostnet.yml up --build
```

## Local Development

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

### API

```bash
cd apps/api
dotnet restore
dotnet run
```

### AI service

```bash
cd apps/ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On Linux/macOS, activate the virtual environment with:

```bash
source .venv/bin/activate
```

## Common Commands

| Command | Path | Purpose |
| --- | --- | --- |
| `npm run dev` | `apps/web` | Start frontend dev server |
| `npm run build` | `apps/web` | Type-check and build frontend |
| `npm run lint` | `apps/web` | Run frontend ESLint |
| `dotnet test` | `tests/AITranslateMeeting.Api.Tests` | Run API tests |
| `python -m compileall -q app` | `apps/ai-service` | Check Python syntax |
| `docker compose up --build` | repo root | Run full local stack |

## Environment Notes

`.env.example` contains local development defaults only.

Do not reuse the included LiveKit key/secret, database password, or Redis config for production. Replace them with environment-specific secrets before deployment.

Important variables:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | PostgreSQL local database |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection |
| `LIVEKIT_PUBLIC_URL` | Browser-facing LiveKit URL |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | LiveKit token signing credentials |
| `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE` | AI service STT settings |

Frontend runtime defaults:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Optional API base URL. If unset, the web app uses same-origin `/api`. |
| `VITE_SUBTITLE_WS_URL` | Optional full WebSocket endpoint. If unset, the web app uses same-origin `/ws/transcribe`. |
| `VITE_ENABLE_WEBRTC_DEBUG` | Enables the debug overlay when set to `true`. |

In Docker, `apps/web/nginx.conf` proxies `/api/` to the API container and `/ws/` to the AI service container.

## API Surface

| Method | Endpoint | Authorization | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/meetings` | None (Rate limited: 10/min) | Create a meeting, return host capability token |
| `GET` | `/api/meetings/{meetingCode}` | None | Get meeting status & active state |
| `POST` | `/api/meetings/{meetingCode}/join` | Admission Token (Body) | Join room, receive LiveKit token & Participant Session token |
| `POST` | `/api/meetings/{meetingCode}/leave` | `Bearer <sessionToken>` | Leave room, revoke participant session in DB |
| `GET` | `/api/meetings/{meetingCode}/participants` | `Bearer <sessionToken>` | List active participants (scoped to room) |
| `GET` | `/health/live` | None | Process liveness probe |
| `GET` | `/health/ready` | None | Readiness probe (verifies PostgreSQL and Redis) |
| `GET` | `/health` | None | Backward-compatible health probe alias |
| `WS` | `/ws/transcribe` | `?token=<subtitleToken>` | AI service subtitle stream (JWT validated) |

## Verification Snapshot

Verified local test and build suite:

- `dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj` (54/54 passed)
- `python -m pytest tests/ apps/ai-service/tests/ -v` (24/24 passed)
- `npm run build` in `apps/web` (0 errors, 0 warnings)
- `npm run lint` in `apps/web` (clean)
- `powershell -ExecutionPolicy Bypass -File ./scripts/smoke-test.ps1` (E2E API, WebSocket, auth & lifecycle)
- `powershell -ExecutionPolicy Bypass -File ./scripts/backup-database.ps1` & `./scripts/restore-database.ps1` (Disaster recovery verified)

## License

MIT. See `LICENSE`.
