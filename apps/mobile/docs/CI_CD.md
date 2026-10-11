# Laya Meet Mobile — CI/CD (GitHub Actions)

## Pipelines

| Workflow | File | Triggers |
|----------|------|----------|
| **Mobile CI** | `.github/workflows/mobile-ci.yml` | Push / PR on `mobile-dev`, `main`, `master` (paths: `apps/mobile/**`) |
| **Mobile Release** | `.github/workflows/mobile-release.yml` | Tag `mobile-v*`, or **workflow_dispatch** |
| **E2E Production** | `.github/workflows/e2e-production.yml` | Push to `main` / `master` — full monorepo stack (see [`docs/e2e/E2E_PRODUCTION.md`](../../../docs/e2e/E2E_PRODUCTION.md)) |

Jobs (CI): `analyze` → `test` → `build-android` (debug APK) + `build-ios` (no codesign).

## GitHub secrets & variables

**Settings → Secrets and variables → Actions**

### Secrets (signed AAB)

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 android/upload-keystore.jks` (Git Bash / WSL) |
| `ANDROID_STORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Key password |
| `ANDROID_KEY_ALIAS` | Usually `layameet` |

### Variables (optional dart-defines)

| Variable | Example |
|----------|---------|
| `API_BASE_URL` | `https://api.example.com` |
| `LIVEKIT_URL` | `wss://livekit.example.com` |
| `SUBTITLE_WS_URL` | `wss://ai.example.com/ws/transcribe` |

Without keystore secrets, release still builds an AAB with **debug signing** — do not upload that to Play.

## Release flow

```bash
git tag mobile-v1.0.0
git push origin mobile-v1.0.0
# or: git push github mobile-v1.0.0
```

Then open **Actions → Mobile Release → Artifacts** and download `layameet-android-release-aab`.

Or run **Actions → Mobile Release → Run workflow** manually.

## Local parity

```powershell
cd apps/mobile
flutter pub get
dart format --output=none --set-exit-if-changed lib/
flutter analyze
flutter test
./scripts/build-release.ps1 -Android
```
