# AI Translate Meeting

Real-time meeting MVP for video calls with live multilingual subtitles. The current codebase is a monorepo with a React/Vite web client, ASP.NET Core API, Python FastAPI AI service, LiveKit, PostgreSQL, and Redis.

## Current Status

This repository is a Phase 1 MVP scaffold.

- Meeting creation/join/leave API is implemented with EF Core persistence.
- LiveKit access token generation is implemented for local development.
- React meeting UI and subtitle panels are implemented.
- AI WebSocket flow is present, but speech-to-text and translation currently use placeholder/local fallback responses.
- Docker Compose can run the local service stack.

Production readiness still requires real STT/translation model wiring, authentication, room authorization, stricter CORS, deployment secrets, and end-to-end media testing.

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
| LiveKit | `ws://localhost:7880` |

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

## API Surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/meetings` | Create a meeting |
| `GET` | `/api/meetings/{meetingCode}` | Get meeting details |
| `POST` | `/api/meetings/{meetingCode}/join` | Join a meeting and receive LiveKit token |
| `POST` | `/api/meetings/{meetingCode}/leave` | Mark a participant as left |
| `GET` | `/api/meetings/{meetingCode}/participants` | List active participants |
| `GET` | `/health` | API/database health |
| `WS` | `/ws/transcribe` | AI service subtitle stream |

## Verification Snapshot

Latest local checks:

- `dotnet test tests/AITranslateMeeting.Api.Tests/AITranslateMeeting.Api.Tests.csproj`
- `npm run build` in `apps/web`
- `npm run lint` in `apps/web`
- `python -m compileall -q apps/ai-service/app`

## Roadmap

- Replace placeholder transcript responses with real audio chunk processing.
- Wire real faster-whisper model loading and language detection.
- Add production translation providers and caching policy.
- Add authentication/authorization for meeting and room access.
- Harden CORS and secrets for non-local environments.
- Add API integration tests with `WebApplicationFactory`.
- Add frontend E2E smoke tests for create/join/leave flows.

## License

MIT. See `LICENSE`.
