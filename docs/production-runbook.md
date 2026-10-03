# Production Operations & Release Runbook: AI-Translate-Meeting

> VPS Docker Compose, TLS, GHCR và GitHub Actions deployment: xem `docs/vps-docker-deployment.md`.

> **Target Release:** Closed Beta / Staging Candidate  
> **Target Audience:** DevOps, Platform Engineers, Site Reliability Engineers, SecOps  
> **Last Verified:** 2026-10-02  
> **Classification:** Internal Technical Runbook  

---

## 1. Overview & Operational Principles

This runbook outlines the operational requirements, startup sequencing, migration protocols, security baselines, and disaster recovery procedures for deploying and maintaining **AI-Translate-Meeting** in Staging and Closed Beta environments.

### Core Principles
1. **Zero Hardcoded Secrets:** All credentials, signing keys, and connection strings must be injected via secure environment variables or vault secret managers at runtime.
2. **Fail-Fast Secret Validation:** The backend API halts startup immediately if critical keys are missing, shorter than 32 characters, using development placeholders, or sharing key values between distinct security domains.
3. **No Migration-on-Startup in Multi-Instance Production:** Database schema migrations must be applied sequentially prior to spinning up multiple API instances (`Database:MigrateOnStartup: false`).
4. **Deterministic Service Sequencing:** Infrastructure storage and media servers must achieve healthy status before application APIs and streaming services start.

---

## 2. Environment Variables & Secret Configuration

> [!IMPORTANT]
> Never commit actual secret values to source control. The values below list environment variable names, constraints, and descriptions only.

### 2.1 Backend API Service (`apps/api`)

| Environment Variable | Required | Minimum Length | Purpose / Constraint |
| :--- | :--- | :--- | :--- |
| `ASPNETCORE_ENVIRONMENT` | Yes | - | Must be `Staging` or `Production`. |
| `ConnectionStrings__DefaultConnection` | Yes | - | PostgreSQL connection string (`Host=...;Port=5432;Database=...;Username=...;Password=...`). |
| `Redis__ConnectionString` | Yes | - | Redis connection string (`redis:6379,abortConnect=false`). |
| `LiveKit__InternalUrl` | Yes | - | Server-side LiveKit endpoint (for example `http://livekit:7880`). |
| `LiveKit__PublicUrl` | Yes | - | Browser-facing LiveKit WebSocket endpoint (for example `wss://meet.example.com/livekit`). |
| `LiveKit__ApiKey` | Yes | 16 chars | LiveKit Server API key. |
| `LiveKit__ApiSecret` | Yes | 32 chars | LiveKit Server API secret. Must NOT match `AdmissionToken__SigningKey` or `SubtitleToken__SigningKey`. |
| `LiveKit__TokenTtlMinutes` | No | - | LiveKit participant token TTL (Default: `60` minutes). |
| `AdmissionToken__SigningKey` | Yes | 32 chars | HS256 secret key for signing host, invite, and participant admission JWTs. Must NOT match other signing keys. |
| `AdmissionToken__Issuer` | Yes | - | Expected JWT issuer (e.g., `ai-translate-meeting-api`). |
| `AdmissionToken__Audience` | Yes | - | Expected JWT audience (e.g., `ai-translate-meeting-clients`). |
| `AdmissionToken__HostTokenTtlMinutes` | No | - | Host capability token TTL (Default: `240` minutes). |
| `AdmissionToken__InviteTokenTtlMinutes` | No | - | Join invite token TTL (Default: `15` minutes). |
| `AdmissionToken__RequestTokenTtlMinutes` | No | - | Waiting room admission request TTL (Default: `15` minutes). |
| `SubtitleToken__SigningKey` | Yes | 32 chars | HS256 secret key for validating subtitle WebSocket tokens. Must NOT match `AdmissionToken__SigningKey` or `LiveKit__ApiSecret`. |
| `SubtitleToken__Issuer` | Yes | - | Subtitle JWT issuer (e.g., `ai-translate-meeting-api`). |
| `SubtitleToken__Audience` | Yes | - | Subtitle JWT audience (e.g., `ai-translate-meeting-ai-service`). |
| `SubtitleToken__TokenTtlMinutes` | No | - | Subtitle token TTL (Default: `10` minutes). |
| `SessionToken__SigningKey` | Yes | 32 chars | Participant API session signing key; must be unique. |
| `SessionToken__Issuer` | Yes | - | Participant session JWT issuer. |
| `SessionToken__Audience` | Yes | - | Participant session JWT audience. |
| `SessionToken__TokenTtlMinutes` | No | - | Participant API session TTL (Default: `60` minutes). |
| `Database__MigrateOnStartup` | Yes | - | Set to `false` in production multi-replica environments. |
| `DatabaseCleanup__Enabled` | No | - | Enable the retention cleanup worker (Default: `true`). |
| `DatabaseCleanup__IntervalHours` | No | - | Automated cleanup execution interval (Default: `1` hour). |
| `DatabaseCleanup__RetentionHours` | No | - | Retention window for expired admissions and sessions (Default: `24` hours). |
| `ForwardedHeaders__KnownProxies__0` | Required behind proxy | - | Exact IP of the trusted immediate reverse proxy. Never trust arbitrary client forwarding headers or a broad public CIDR. |

### 2.2 AI Service (`apps/ai-service`)

| Environment Variable | Required | Minimum Length | Purpose / Constraint |
| :--- | :--- | :--- | :--- |
| `SUBTITLE_TOKEN_SIGNING_KEY` | Yes | 32 chars | Must match `SubtitleToken__SigningKey` from the API. |
| `SUBTITLE_TOKEN_ISSUER` | Yes | - | Must match `SubtitleToken__Issuer` from the API. |
| `SUBTITLE_TOKEN_AUDIENCE` | Yes | - | Must match `SubtitleToken__Audience` from the API. |
| `REDIS_HOST` | Yes | - | Redis host name (for example `redis`). |
| `REDIS_PORT` | Yes | - | Redis port (Default: `6379`). |
| `LAYA_SERVICE_URL` | Yes | - | Laya Intelligence Sidecar endpoint (`http://laya:8000`). |
| `WHISPER_MODEL` | No | - | Whisper model weight (Default: `tiny`). |
| `WHISPER_DEVICE` | No | - | Compute device (`cpu` or `cuda`). |
| `WHISPER_COMPUTE_TYPE` | No | - | `int8` (CPU) or `float16` (GPU). |
| `WHISPER_PRELOAD` | No | - | Preload model in the FastAPI lifespan background task (Docker default: `true`). |
| `AI_MODEL_START_PERIOD` | No | - | Compose readiness grace period for first model download (Default: `180s`). |

### 2.3 LiveKit Media Server (`livekit`)

| Configuration Parameter | Required | Minimum Length | Purpose / Constraint |
| :--- | :--- | :--- | :--- |
| `keys.<API_KEY>` | Yes | 32 chars | API Secret associated with the API Key; must match `LiveKit__ApiSecret`. |
| `port` | Yes | - | HTTP signaling port (Default: `7880`). |
| `rtc.tcp_port` | Yes | - | WebRTC TCP fallback port (Default: `7881`). |
| `rtc.udp_port` | Yes | - | WebRTC UDP media port (Default: `7882`). |
| `rtc.use_external_ip` | Production | - | Set to `true` when deployed behind NAT/Load Balancer. |

Docker Compose probes `http://127.0.0.1:7880/` from inside the LiveKit container. The API waits for this healthcheck; an `Up` container without an HTTP response must not be treated as ready.

### 2.4 Secrets Rotation Checklist Before Production Launch
Before moving from Staging / Closed Beta to Public Production, rotate all of the following secrets:
- [ ] `AdmissionToken__SigningKey` (generate 64-character cryptographically secure hex or base64 string)
- [ ] `SubtitleToken__SigningKey` (generate unique 64-character secret)
- [ ] `SessionToken__SigningKey` (generate another unique 64-character secret)
- [ ] `LiveKit__ApiKey` and `LiveKit__ApiSecret` (generate random key/secret pair)
- [ ] PostgreSQL master password (`POSTGRES_PASSWORD`)
- [ ] Redis access password (require authentication via `requirepass` in production)

---

## 3. Database Migration Runbook

In Staging and Production clusters running multiple API pods or containers, **never** allow containers to run automatic migrations simultaneously on startup.

### 3.1 Migration Execution Steps
1. **Pre-Migration Backup:**
   Execute a point-in-time logical backup before executing schema changes:
   ```powershell
   ./scripts/backup-database.ps1 -Database "ai_translate_meeting" -BackupDir "./backups"
   ```
2. **Review Pending Migrations:**
   ```bash
   dotnet ef migrations list --project apps/api/AITranslateMeeting.Api.csproj
   ```
3. **Apply Pending Migrations:**
   Run migration sequentially using a single-use container or CI/CD pipeline step:
   ```bash
   dotnet ef database update --project apps/api/AITranslateMeeting.Api.csproj
   ```
4. **Verify Database Indexes:**
   Ensure optimized composite indexes exist in PostgreSQL:
   ```sql
   -- Verify composite participant index
   SELECT indexname, indexdef FROM pg_indexes 
   WHERE tablename = 'meeting_participants' AND indexname = 'ix_meeting_participants_meeting_id_left_at';

   -- Verify participant session lookup index
   SELECT indexname, indexdef FROM pg_indexes 
   WHERE tablename = 'participant_sessions' AND indexname = 'ix_participant_sessions_meeting_id_jti';
   ```

---

## 4. Service Deployment & Sequencing

Services have strict runtime dependencies and must be initialized in the exact order below:

```
[Level 1: Storage Layer]      PostgreSQL 16  +  Redis 7
                                     │
                                     ▼
[Level 2: Media SFU]           LiveKit Media Server
                                     │
                                     ▼
[Level 3: Core API]            .NET 8 Backend API (Apps/Api)
                                     │
                                     ▼
[Level 4: AI & Sidecar]        FastAPI AI Service  +  Laya Sidecar
                                     │
                                     ▼
[Level 5: Ingress / Frontend]  React Web UI / Nginx Reverse Proxy
```

### 4.1 Deployment Commands (Docker Compose Reference)
```bash
# 1. Start persistent data stores
docker compose up -d postgres redis

# 2. Wait for healthy database and cache
docker compose exec postgres pg_isready -U postgres
docker compose exec redis redis-cli ping

# 3. Start media SFU
docker compose up -d livekit

# 4. Apply EF Core database migrations
dotnet ef database update --project apps/api/AITranslateMeeting.Api.csproj

# 5. Start Backend API
docker compose up -d api

# 6. Start AI Speech, Translation & Laya Services
docker compose up -d ai-service laya

# 7. Start Frontend Ingress
docker compose up -d web
```

---

## 5. Health Check & Smoke Verification Checklist

After deployment or container restarts, execute the verification checklist:

### 5.1 Automated Smoke Test
Run the comprehensive end-to-end smoke test suite:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/smoke-test.ps1
```
Expected output: **20 passed, 0 failed**.

### 5.2 Manual Health Probes
| Endpoint | Method | Expected Status | Verification Target |
| :--- | :--- | :--- | :--- |
| `http://localhost:5000/health/live` | `GET` | `200 OK` | Process liveness (`{"status":"live"}`). |
| `http://localhost:5000/health/ready` | `GET` | `200 OK` | Readiness probe verifying PostgreSQL and Redis connections (`{"status":"ready","database":"healthy","redis":"healthy"}`). |
| `http://localhost:8000/health/live` | `GET` | `200 OK` | AI process/event-loop liveness, including while Whisper loads. |
| `http://localhost:8000/health/ready` | `GET` | `200 OK` | Whisper singleton loaded and ready; otherwise RFC 7807 `503`. |
| `http://localhost:3000/ai-health/ready` | `GET` | `200 OK` | Same-origin frontend proxy for AI readiness. |
| `http://localhost:7880/` | `GET` | `200 OK` | LiveKit SFU signaling HTTP server. |
| `http://localhost:3000/` | `GET` | `200 OK` | Frontend SPA / Nginx reverse proxy. |

### 5.3 Security Headers Verification
Verify that response headers contain standard edge security directives:
```bash
curl -I http://localhost:5000/health/live
curl -I http://localhost:3000/
curl -I http://localhost:3000/assets/<built-asset-name>.js
```
Confirm presence of:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Correlation-ID: <uuid>`

### 5.4 Whisper cache lifecycle and rollback

- `whisper_cache` is a Docker named volume mounted at `/root/.cache/huggingface`; normal container recreate/restart must preserve it.
- A first start with an empty cache requires network access to the configured model registry. Keep `/health/live` for process monitoring and `/health/ready` for traffic readiness.
- Diagnose startup with `docker compose logs ai-service` and the sanitized `load_duration_ms`. Do not enable SDK logs that expose signed connection URLs.
- Safe rollback: set `WHISPER_PRELOAD=false` and recreate only `ai-service`; this restores lazy loading without changing database or meeting contracts.
- Do not delete `whisper_cache` during rollback. Removing the volume forces a full model download and requires explicit operator approval.
- Local verification with model `small`, CPU/int8:
  - 2026-10-02 empty-cache cold model load: `104.3s`.
  - 2026-10-02 same-engine container restart: `5.1s` model load (`15.2s` wall time including restart/poll).
  - 2026-10-03 full Docker Desktop recovery with the cache volume preserved: `59.9s`; a later AI-service-only restart loaded in `13.2s`. Warm time is therefore storage/contention-sensitive even when no model download is required.

---

## 6. Rate Limiting & Edge Protection Policy

The distributed rate limiting layer operates using Redis atomic token buckets with automatic in-memory fallback:

Client identity is derived from the socket peer. `X-Forwarded-For` is honored only when the immediate sender is listed in `ForwardedHeaders:KnownProxies`; direct client-supplied forwarding headers are ignored. A missing trusted-proxy configuration is fail-closed (all traffic from that proxy shares one limiter identity), so configure the exact ingress IP during deployment.

| Action / Route | Scope / Limiter Key | Limit | Window | Action on Exceeded |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/meetings` | Client IP | 10 requests | 60 seconds | `429 Too Many Requests` (RFC 7807) |
| `POST /api/meetings/{code}/join` | Client IP | 30 requests | 60 seconds | `429 Too Many Requests` (RFC 7807) |
| Host Admissions Management | Client IP | 120 requests | 60 seconds | `429 Too Many Requests` (RFC 7807) |
| WebSocket Handshake (`/ws/transcribe`) | Client IP | 30 handshakes | 60 seconds | WebSocket close code `4429` |
| Max Request Body Size | Global (Kestrel) | 10 MB | Per request | `413 Payload Too Large` |

---

## 7. Data Retention & Automatic Cleanup Policies

To ensure privacy compliance and prevent storage exhaustion, data retention is strictly bounded:

| Data Store / Entity | Retention Window | Purge Mechanism | Frequency |
| :--- | :--- | :--- | :--- |
| **Meeting Admissions** (`meeting_admissions`) | 24 hours past expiration | `DatabaseCleanupBackgroundService` | Hourly |
| **Participant Sessions** (`participant_sessions`) | 24 hours past expiration or revocation | `DatabaseCleanupBackgroundService` | Hourly |
| **Translation Redis Cache** (`tr:*`) | 24 hours (`TTL: 86400s`) | Redis automatic TTL expiration | Automatic |
| **Rate Limiter Redis Keys** (`rl:*`) | 60 seconds (`TTL: 60s`) | Redis automatic TTL expiration | Automatic |
| **Application Logs** (`Serilog`) | Defined by platform | Structured stdout; retention and access controls must be configured in the container/logging platform | External |
| **Spoken Transcripts & Audio Frames** | Ephemeral | Audio chunks destroyed immediately upon VAD/STT processing. Subtitle text stored in memory during active room lifecycle only. | Real-time |

---

## 8. Backup, Disaster Recovery & Rollback

### 8.1 On-Demand Logical Database Backup
```powershell
./scripts/backup-database.ps1 -Database "ai_translate_meeting" -BackupDir "./backups"
```
The script produces a timestamped SQL dump (for example `ai_translate_meeting_backup_20261001_114500.sql`). Failed dumps are removed so a partial file cannot be mistaken for a valid backup. Backup files are local operational artifacts and are excluded from Git.

### 8.2 Database Restore Procedure
Always rehearse into an isolated database first:
```powershell
./scripts/restore-database.ps1 -BackupFile "./backups/ai_translate_meeting_backup_20261001_114500.sql" -TargetDatabase "ai_translate_meeting_restore_test"
```
> [!WARNING]
> The script refuses a target that does not end in `_restore_test` unless `-AllowExistingTarget` is explicitly supplied. The SQL dump uses `--clean --if-exists`, so objects in the selected database can be replaced. For an intentional production recovery, isolate traffic, take a fresh backup, verify the target, and pass `-AllowExistingTarget`; the script does not drop or recreate the database itself.

### 8.3 Application Rollback Triggers
Roll back immediately to the previous stable release artifact if any of the following occur:
1. `GET /health/ready` returns non-200 for > 60 consecutive seconds.
2. HTTP 5xx error rate exceeds 1% over a 5-minute rolling window.
3. Subtitle WebSocket handshake failure rate exceeds 2%.
4. STT / Translation processing latency (p95) degrades beyond 2,500ms.

---

## 9. Capacity Boundaries (Closed Beta Sizing)

**BLOCKED / NOT VERIFIED:** the repository does not contain a reproducible load-test scenario or captured benchmark artifact. The values below are provisional planning targets, not measured release guarantees. Run a staging load test on the intended hardware and record the command, dataset, duration, and raw results before setting a release capacity.

| Metric | Closed Beta Target | Warning Threshold | Maximum Safe Boundary |
| :--- | :--- | :--- | :--- |
| **Concurrent Active Rooms** | 5 | 8 | 10 |
| **Participants Per Room** | 10 | 15 | 20 |
| **API Latency (p95)** | < 120ms | > 250ms | > 500ms |
| **Subtitle Latency (TTFS p50)**| ~960ms | > 1,500ms | > 2,000ms |
| **Subtitle Latency (TTFS p95)**| ~1,400ms | > 2,000ms | > 3,000ms |
| **CPU Utilization (AI Service)**| < 55% (4 cores) | > 75% | > 85% |
| **RAM Utilization (AI Service)**| ~850MB | > 1.8GB | > 2.5GB |
| **PostgreSQL Connection Pool** | 20 connections | > 60 connections | 100 connections |

---

## 10. Status of Public Production Features

| Feature Domain | Staging / Closed Beta Status | Public Production Path & Blockers |
| :--- | :--- | :--- |
| **Host Authentication** | **OPERATIONAL** (Capability-based host JWTs issued upon room creation) | **BLOCKED:** Requires Enterprise Identity Provider (IdP) integration with OIDC (Google Workspace, Microsoft Entra ID) or Magic Links for public multi-tenant authentication. |
| **Monitoring & Telemetry** | **PARTIAL** (Structured correlation logs and health probes) | **BLOCKED:** No implemented metrics/export pipeline for request rate, errors, latency, or active rooms; external monitoring also needs provider configuration. |
| **Participant Sessions** | **OPERATIONAL** (Scoped session JWTs, `meeting:read`/`meeting:leave`, database revocation) | Ready for production. |
| **Distributed Rate Limiting**| **OPERATIONAL** (Redis token bucket with in-memory fallback; trusted-proxy boundary enforced) | Configure the exact ingress proxy IP and verify the spoof-resistance smoke test in the target environment. |
| **Edge Security & Headers** | **OPERATIONAL** (HSTS, CSP, nosniff, DENY, Kestrel 10MB limit) | Ready for production. |
