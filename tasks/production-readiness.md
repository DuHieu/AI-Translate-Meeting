# Production Readiness & Release Blocker Roadmap

Updated: 2026-10-01  
Stage: PRE-RELEASE HARDENING & VERIFICATION (Closed Beta / Staging Candidate)  

## Summary of Goals
Complete all release blockers to qualify the project for staging / closed beta and prepare for public production.  
No deployment, push, commit, PR, or production access.  
Strict adherence to RED -> GREEN -> REFACTOR across 9 critical work streams (P0.1 to P0.9).  

---

## 1. Work Streams & Tracking

### P0.1 – Secret Isolation & Validation
- [x] Separate signing keys for Admission, Subtitle, and LiveKit.
- [x] Remove fallback `AdmissionToken__SigningKey` -> subtitle signing key in production.
- [x] Production fail-fast validation: fail if secret missing, < 32 chars, or using placeholder values.
- [x] Production validation: fail if Admission, Subtitle, or LiveKit secrets are identical.
- [x] Ensure secrets are never logged or exposed in exceptions.
- [x] Document required environment variable names (no secret values in repo) in `docs/production-runbook.md`.
- [x] Document list of secrets needing rotation before production launch.
- [x] Tests: Unit tests for secret validation rules in both dev and production modes (`tests/AITranslateMeeting.Api.Tests/SecretIsolationTests.cs` – 8/8 passed).

### P0.2 – Participant API Session Authorization
- [x] Survey all post-join endpoints: `get meeting`, `participants`, `leave`.
- [x] Issue dedicated participant session JWT with short TTL and minimal scopes:
  - `meeting:read`
  - `meeting:leave`
- [x] Bind claims: `meetingId`, `participantId`, `role`, `issuer`, `audience`, `expiry`, and `jti`.
- [x] Enforce scope: `subtitle:write` cannot be used as an API session token.
- [x] Enforce role boundary: participant cannot escalate to host.
- [x] Enforce participant boundary: participant can only leave themselves.
- [x] Enforce host boundary: host can view participants and leave the room.
- [x] All auth failures return RFC 7807 ProblemDetails with stable error codes (`session_token_missing`, `session_token_expired`, `session_cross_room`, `session_scope_insufficient`, `participant_impersonation`).
- [x] Preserve existing join, LiveKit WebRTC, and subtitle WebSocket flows.
- [x] Join is atomic: admission consumption and participant creation commit only after session persistence succeeds; non-relational tests use compensating cleanup.
- [x] Tests: Comprehensive negative and positive unit/integration tests in `tests/AITranslateMeeting.Api.Tests/ParticipantSessionAuthTests.cs`.

### P0.3 – Token Lifecycle & Revocation
- [x] Minimal PostgreSQL design: additive table `participant_sessions` tracking `Id`, `MeetingId`, `ParticipantId`, `Jti`, `Role`, `Scope`, `CreatedAt`, `ExpiresAt`, `RevokedAt`.
- [x] Additive EF Core migration with safe rollback (`Down`) (`20261001100000_AddParticipantSessions.cs`).
- [x] Support session revocation by `jti` or session record upon leave or host action (`revoked_at` timestamp).
- [x] No raw tokens stored (only jti identifier and metadata).
- [x] Retention & cleanup utility for expired admissions and sessions (`DatabaseCleanupService`).
- [x] Public host identity via OIDC/magic link: Marked as BLOCKED (closed beta uses capability-based host tokens; public production requires enterprise IdP integration).

### P0.4 – Edge Security
- [x] Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS in production, and CSP compatible with Vite/LiveKit (`SecurityHeadersMiddleware.cs`).
- [x] Nginx configuration: add security headers and reverse proxy settings (`apps/web/nginx.conf`).
- [x] Frontend response headers are inherited by `/`, SPA fallback, and `/assets/`; CSP removes `unsafe-eval` and broad HTTP origins (`tests/test_nginx_security_contract.py`).
- [x] CORS: enforce strict configured allowed origins.
- [x] Request body limits: Kestrel max request body size configured (10 MB).
- [x] WebSocket handshake limits: enforce connection validation and timeout (30 handshakes/min per IP in `apps/ai-service/app/security/rate_limiter.py`).
- [x] Tests: Integration tests for security headers, CORS, and body size limits (`tests/AITranslateMeeting.Api.Tests/SecurityHeadersTests.cs` – 2/2 passed).

### P0.5 – Shared Rate Limiting
- [x] Redis-backed distributed rate limiter replacing process-local in-memory partitions (`DistributedRateLimiter.cs`).
- [x] Protect endpoints:
  - `CreateMeeting`: 10 req/min per IP
  - `JoinAdmission`: 30 req/min per IP
  - `HostAdmission`: 120 req/min per IP
  - WebSocket handshake: 30 handshakes/min per IP
- [x] Graceful fallback to local limiter when Redis is unreachable in test environments.
- [x] Trust boundary: ignore client-supplied forwarding headers unless the immediate proxy IP is explicitly configured; runtime smoke test covers spoof resistance.
- [x] Tests: Unit/integration tests prove rate limiting triggers 429 ProblemDetails and validate the client-IP trust boundary (`tests/AITranslateMeeting.Api.Tests/RateLimiterTests.cs`; `apps/ai-service/tests/test_rate_limiter.py`).

### P0.6 – Database & Retention
- [x] Multi-instance safety: `Database:MigrateOnStartup` disabled in production; document migration runbook.
- [x] Review & optimize indexes for `meeting_admissions`, `meeting_participants` (`ix_meeting_participants_meeting_id_left_at`), and `participant_sessions` (`ix_participant_sessions_meeting_id_jti`).
- [x] Cleanup job for expired admissions (> 24h) and expired sessions (> 24h) (`DatabaseCleanupBackgroundService.cs`).
- [x] Retention policy defined for transcripts, admissions, logs, and Redis cache (`docs/production-runbook.md`).
- [x] Backup & restore scripts: `scripts/backup-database.ps1` and `scripts/restore-database.ps1`.
- [x] Backup artifacts excluded from Git; failed native commands and empty/partial dumps fail the operation.
- [x] Restore is fail-safe by default: only isolated `_restore_test` targets are accepted unless `-AllowExistingTarget` is explicit.
- [x] Rehearsal: backup and restore verified on 2026-10-01 against newly created `ai_translate_release_20261001_restore_test` with 5 tables; no existing database was dropped.

### P0.7 – Observability
- [x] Structured logging with `CorrelationId` via middleware (`X-Correlation-ID` header propagation and Serilog `LogContext`).
- [x] Zero secret/PII logging audit: verify tokens, passwords, full transcripts are not logged (sanitized `TranslationGateway.cs` to character counts).
- [x] Health checks separated: `/health/live` (liveness) and `/health/ready` (readiness with DB and Redis).
- [x] Production readiness fails with RFC 7807 HTTP 503 when Redis is missing or disconnected; development may report `redis: not_configured` with HTTP 200 (`HealthEndpointTests.cs`).
- [x] Local Docker live verification (2026-10-01): Redis returned `PONG`, TTL read/write worked, API Production-mode readiness returned HTTP 200 with `redis: healthy`, and rate-limit keys were observed after smoke traffic.
- [ ] **BLOCKED:** Metrics/export pipeline for request counts, error rates, p95 latencies, and active meetings/participants is not implemented.
- [ ] **BLOCKED:** External monitoring requires provider credentials and a selected metrics/log backend.

### P0.8 – Runtime, E2E & Capacity
- [x] Frontend production build enforces a `500_000`-byte JavaScript chunk budget and rejects initial `index.html` LiveKit preload; the gate runs in the same CI frontend job that creates `dist`.
- [x] Local capacity baseline (not staging evidence): 200 concurrent-throttled `/health/ready` requests, 200 passed / 0 failed, p50 174.52 ms, p95 573.18 ms, p99 745.35 ms (concurrency 20, 2026-10-01).
- [x] End-to-end automated verification (`scripts/smoke-test.ps1`):
  - Health liveness (`/health/live`) & readiness (`/health/ready`)
  - Host create/join
  - Valid invite & rejection of invalid/tampered tokens
  - Waiting/approve/reject flow
  - Expired/cross-room/replayed invite
  - WebSocket connection and auth (session validation & cross-room rejection)
  - Leave and participant list authorization with revoked session enforcement
- [ ] **BLOCKED:** Run a reproducible staging load/capacity benchmark and retain raw evidence. The local readiness baseline above is diagnostic only and does not prove meeting/STT/WebRTC capacity.

### P0.9 – Release & Rollback Runbook
- [x] Create `docs/production-runbook.md` with:
  - required environment variables (names only)
  - migration order
  - deployment order
  - smoke verification checklist
  - rollback triggers & steps
  - retention policy schedules
  - capacity boundaries
- [x] Update `README.md` and `docs/architecture.md` to reflect runtime contracts.
- [ ] Produce the final release assessment after full gates, staging capacity evidence, monitoring, and production secret/proxy configuration are verified.
