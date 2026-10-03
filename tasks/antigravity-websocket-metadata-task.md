# Antigravity Task: Remove participant metadata from WebSocket URL

Work in `D:\MyProject\AI-Translate-Meeting`.

## Goal

Harden the subtitle WebSocket handshake so participant name and language preferences are not placed in the `/ws/transcribe` URL. Keep the existing participant subtitle JWT, meeting binding, reconnect behavior, and join flow working.

## Safety and coordination

- Read `AGENTS.md` and `tasks/todo.md` first.
- Inspect `git status` before editing. The working tree contains many uncommitted user/Codex changes; do not reset, clean, revert, overwrite, commit, push, deploy, or create a PR.
- Do not access production or print secret/token values.
- Another Codex task has completed. Preserve its bundle verifier, readiness, documentation, and tracker changes.

## Exclusive file scope

You may edit only:

- `apps/web/src/services/subtitleService.ts`
- `apps/ai-service/app/main.py`
- `apps/ai-service/tests/test_subtitle_websocket_auth.py`
- `tests/test_subtitle_contract.py`
- `scripts/smoke-test.ps1` only if required to keep runtime verification aligned with the handshake contract

Do not edit API/.NET files, Vite config, package files, CI, Docker configuration, docs, task trackers, migrations, or unrelated frontend/AI files.

## Required behavior

1. Follow RED -> GREEN -> REFACTOR. Add/update tests first and capture the failing evidence.
2. WebSocket URL may contain only the opaque binding values needed before authentication (`meetingId` and `participantId`). It must not contain:
   - subtitle token
   - participant name
   - source language
   - target language
3. The first `authenticate` JSON frame must carry the subtitle token plus participant metadata needed by the AI handler.
4. Validate JWT signature, expiry, issuer, audience, scope, meeting binding, and participant binding before using participant metadata.
5. Validate and normalize untrusted metadata after token validation:
   - trim participant name, maximum 100 characters, safe non-empty fallback
   - allow only supported language codes already used by this project (`vi`, `en`, `ja`)
   - reject invalid metadata with a stable WebSocket close code and no exception detail
6. Never log the token, participant name, or raw authentication frame.
7. Missing/expired/cross-room token behavior and close codes must remain unchanged.
8. Keep backward-safe defaults for existing smoke/runtime clients if metadata is omitted from the authentication frame, unless tests prove a stricter contract is safe.
9. Do not add dependencies, suppress tests/lint, or weaken existing assertions.

## Minimum tests

- Frontend WebSocket URL excludes token, participant name, source language, and target language.
- Frontend authentication frame includes token and normalized metadata fields.
- Valid token plus valid metadata reaches the handler with the expected values.
- Invalid token is rejected before metadata is used.
- Invalid/unsupported language is rejected.
- Oversized/blank participant name is handled according to the validated contract.
- Existing missing, expired, cross-room and valid token tests continue to pass.
- Smoke test uses the new handshake contract without putting metadata in the URL.

## Verification

Run at least:

```powershell
python -m pytest tests/test_subtitle_contract.py apps/ai-service/tests/test_subtitle_websocket_auth.py -v
python -m pytest tests/ apps/ai-service/tests/ -v
Set-Location apps/web
npm run lint
npm run build
Set-Location ../..
docker compose config -q
```

If source runtime files changed and Docker is available, rebuild the affected `web` and `ai-service` containers and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
```

## Final report

Report RED evidence, selected handshake contract, files changed, focused/full verification, Docker smoke result if run, remaining risks, and confirm no commit/push/deploy/PR.
