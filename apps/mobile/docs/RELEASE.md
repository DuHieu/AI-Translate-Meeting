# Laya Meet — Release & store preparation (Task 14)

This guide covers everything that can be automated in-repo. Uploading to **Google Play** / **TestFlight** still requires org accounts and secrets that must never be committed.

## 1. Android — upload keystore + signed AAB

### 1.1 Create keystore (once per org)

```powershell
cd apps/mobile
./scripts/create-upload-keystore.ps1
```

Or manually:

```bash
keytool -genkey -v \
  -keystore android/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias layameet
```

### 1.2 Configure signing

```bash
cp android/key.properties.example android/key.properties
# edit passwords / paths
```

`android/key.properties` and `*.jks` are gitignored.

### 1.3 Build release artifacts

```powershell
./scripts/build-release.ps1 -Android
```

Outputs:

- `build/app/outputs/bundle/release/app-release.aab` (Play upload)
- `build/app/outputs/flutter-apk/app-release.apk` (sideload / QA)

Pass production endpoints:

```powershell
./scripts/build-release.ps1 -Android `
  -ApiBaseUrl "https://api.example.com" `
  -LivekitUrl "wss://livekit.example.com" `
  -SubtitleWsUrl "wss://ai.example.com/ws/transcribe"
```

### 1.4 Google Play — Internal testing track

1. Play Console → create app `com.layameet.mobile` (or existing)
2. Setup → App signing → upload the **upload key** (or let Play manage)
3. Testing → Internal testing → Create release → upload `app-release.aab`
4. Add testers (see `BETA_TESTERS.md`)
5. Copy release notes from `RELEASE_NOTES_1.0.0.md`

## 2. iOS — Archive + TestFlight

Requires macOS + Xcode + Apple Developer team.

### 2.1 Xcode signing

1. Open `ios/Runner.xcworkspace` in Xcode
2. Runner target → Signing & Capabilities
3. Team = your Apple Team; Bundle ID = `com.layameet.mobile` (or registered ID)
4. Enable Automatically manage signing (recommended for first beta)

### 2.2 Build IPA

```bash
./scripts/build-release.sh --ios
```

Or in Xcode: Product → Archive → Distribute App → App Store Connect → Upload.

Copy `ios/ExportOptions-appstore.plist.example` → `ios/ExportOptions.plist` and set `teamID`.

### 2.3 TestFlight

1. App Store Connect → My Apps → Laya Meet
2. TestFlight → add build after processing finishes
3. Internal testers (up to 100) or External (Beta App Review)
4. Attach `RELEASE_NOTES_1.0.0.md`

## 3. Versioning

`pubspec.yaml`:

```yaml
version: 1.0.0+1   # name+build
```

- Bump `+N` (build number) for every store upload
- Bump `1.0.0` for user-facing releases; update `CHANGELOG.md`

## 4. Firebase Crashlytics (optional)

Not enabled by default (needs Firebase project files).

When ready:

1. Create Firebase Android + iOS apps
2. Add `android/app/google-services.json` and `ios/Runner/GoogleService-Info.plist` (gitignored templates already noted)
3. Follow FlutterFire Crashlytics docs
4. Re-run release builds

Until then, rely on store crash reports + server logs (never log tokens).

## 5. Beta checklist

- [ ] Signed AAB built locally / CI
- [ ] Internal testing track live on Play
- [ ] TestFlight build processing complete
- [ ] 5–10 testers invited (`BETA_TESTERS.md`)
- [ ] Testers can join a real meeting end-to-end
- [ ] No secrets committed (`git status` clean of `*.jks`, `key.properties`)

## 6. CI/CD

Primary remote is **GitLab** — see [`CI_CD.md`](CI_CD.md).

- Push / MR (`apps/mobile/**`): `.gitlab-ci.yml` → analyze, test, debug APK
- Tag `mobile-v*`: `.gitlab-ci.yml` → `mobile:release-android` (signed AAB when CI variables set)
- Optional GitHub mirror: `.github/workflows/mobile-ci.yml` + `mobile-release.yml`
