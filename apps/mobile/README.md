# Laya Meet

Flutter client for AI-Translate-Meeting (Android + iOS).

## Features (Tasks 1–13)

- Home: create / join meeting by 6-character code, recent meetings
- Prejoin: camera preview, mic/camera toggles, language selection, permissions
- Meeting room: LiveKit video grid with sequential camera→mic publish
- Real-time bilingual subtitles over WebSocket with exponential backoff reconnect
- In-call controls: mute, camera, flip, speaker, leave confirmation
- Android foreground service notification for active meetings
- iOS voice-chat audio session + background audio mode
- Network quality indicator, auto-reconnect (max 3), video degrade on poor network
- Localization: English, Vietnamese, Japanese
- Shared `ErrorDialog` for user-facing failures

## Setup

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
```

Pass API endpoints at build/run time:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:5000 \
  --dart-define=LIVEKIT_URL=ws://10.0.2.2:7880 \
  --dart-define=SUBTITLE_WS_URL=ws://10.0.2.2:8000/ws/transcribe
```

## Release / store prep (Task 14)

Full guide: [`docs/RELEASE.md`](docs/RELEASE.md)

Quick Android release:

```powershell
# once
./scripts/create-upload-keystore.ps1

# every release
./scripts/build-release.ps1 -Android `
  -ApiBaseUrl "https://your-api" `
  -LivekitUrl "wss://your-livekit" `
  -SubtitleWsUrl "wss://your-ai/ws/transcribe"
```

Upload `build/app/outputs/bundle/release/app-release.aab` to Play **Internal testing**.

iOS (macOS): configure signing in Xcode, copy `ios/ExportOptions-appstore.plist.example` → `ios/ExportOptions.plist`, then:

```bash
./scripts/build-release.sh --ios
```

Upload the IPA via Xcode Organizer or `xcrun altool` / Transporter → TestFlight.

Related files:

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Version history |
| `docs/RELEASE_NOTES_1.0.0.md` | Store / TestFlight notes |
| `docs/BETA_TESTERS.md` | Tester invite tracker |
| `android/key.properties.example` | Signing template |
| `.github/workflows/mobile-ci.yml` | Analyze / test / debug APK / iOS |
| `.github/workflows/mobile-release.yml` | Tagged / manual release AAB |
| `docs/CI_CD.md` | Secrets, variables, tag flow |

### GitHub Actions secrets (signed AAB)

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload-keystore.jks` |
| `ANDROID_STORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Key password |
| `ANDROID_KEY_ALIAS` | Alias (e.g. `layameet`) |

Optional repo **Variables**: `API_BASE_URL`, `LIVEKIT_URL`, `SUBTITLE_WS_URL`. Full guide: [`docs/CI_CD.md`](docs/CI_CD.md).

## Manual QA checklist

- [ ] Join with valid code → prejoin → room
- [ ] Invalid / ended room shows friendly error
- [ ] Mute / camera / flip / speaker toggle
- [ ] Leave confirm → returns home, tokens cleared
- [ ] Android: Home button keeps notification + audio
- [ ] iOS: Lock screen keeps audio
- [ ] Airplane mode → reconnect toast or failure dialog
- [ ] Subtitles appear with speaker + translation
- [ ] Internal track / TestFlight install works for beta testers

## Crashlytics (optional)

Not bundled yet. See `docs/RELEASE.md` §4 when Firebase project files are available.
