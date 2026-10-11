# Laya Meet Mobile — CI/CD

## Remote

Primary git remote: **GitLab** (`origin` → `gitlab.com/.../ai-translate-meeting`).

| Pipeline | File | When it runs |
|----------|------|----------------|
| **GitLab CI (active)** | `.gitlab-ci.yml` | Push / MR touching `apps/mobile/**`, tags `mobile-v*` |
| GitHub Actions (optional) | `.github/workflows/mobile-ci.yml`, `mobile-release.yml` | Only if the repo is also on GitHub |

## GitLab jobs

| Job | Stage | Purpose |
|-----|-------|---------|
| `mobile:analyze` | analyze | `dart format` + `flutter analyze` |
| `mobile:test` | test | `flutter test --coverage` |
| `mobile:build-android-debug` | build | Debug APK artifact (branch/MR) |
| `mobile:release-android` | release | Release AAB on tag `mobile-v*` |

## GitLab CI/CD variables (Settings → CI/CD → Variables)

For **signed** release AAB:

| Variable | Protected | Masked | Notes |
|----------|-----------|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | ✅ | ✅ | `base64 -w0 android/upload-keystore.jks` |
| `ANDROID_STORE_PASSWORD` | ✅ | ✅ | |
| `ANDROID_KEY_PASSWORD` | ✅ | ✅ | |
| `ANDROID_KEY_ALIAS` | ✅ | | usually `layameet` |
| `API_BASE_URL` | optional | | production API |
| `LIVEKIT_URL` | optional | | `wss://...` |
| `SUBTITLE_WS_URL` | optional | | `wss://.../ws/transcribe` |

Without keystore variables, the release job still builds an AAB (debug-signed) for smoke tests — do **not** upload that to Play.

## Trigger a release build

```bash
git tag mobile-v1.0.0
git push origin mobile-v1.0.0
```

Download the AAB from the pipeline **Artifacts**.

## Local parity

```powershell
cd apps/mobile
flutter pub get
dart format --output=none --set-exit-if-changed lib/
flutter analyze
flutter test
./scripts/build-release.ps1 -Android
```
