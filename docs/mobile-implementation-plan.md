# 📱 Mobile App Implementation Plan - AI-Translate-Meeting

**Status**: Ready for Implementation  
**Platform**: Flutter Cross-Platform (Android + iOS)  
**Branch**: `mobile-dev`  
**Location**: `apps/mobile/`

---

## Executive Summary

Extend **AI-Translate-Meeting** platform from web-only to mobile devices (Android & iOS), enabling users to join meetings with real-time bilingual subtitles from smartphones/tablets.

### Key Decisions
- ✅ **Platform**: Flutter (single Dart codebase, 60-70% time savings vs native)
- ✅ **Scope**: Mobile-First Essential (join meetings, view video, real-time subtitles, basic controls)
- ✅ **Priorities**: Network resilience + Background audio mode
- ✅ **Out of Scope**: Create meeting, screen sharing, host controls (use web for these)

---

## Architecture Overview

### Tech Stack
| Layer | Technology |
|-------|-----------|
| UI Framework | Flutter 3.24+ |
| State Management | Riverpod 2.5+ |
| WebRTC | LiveKit Client SDK 2.3+ |
| HTTP Client | Dio 5.4+ |
| WebSocket | web_socket_channel 3.0+ |
| Secure Storage | flutter_secure_storage 9.0+ |
| Permissions | permission_handler 11.0+ |

### Architecture Pattern
**Clean Architecture + Feature-First Structure**

```
apps/mobile/lib/
├── main.dart                    # Entry point with ProviderScope
├── app.dart                     # MaterialApp config, routing, theme
├── core/                        # Shared infrastructure
│   ├── api/                     # HTTP & WebSocket clients
│   ├── models/                  # Data models (Meeting, Participant, Subtitle)
│   ├── providers/               # Global Riverpod providers
│   ├── constants/               # Config (API URLs, constants)
│   └── utils/                   # Helpers (SecureStorage, Logger, Validators)
└── features/                    # Feature modules
    ├── home/                    # Join meeting input screen
    ├── prejoin/                 # Device setup & language selection
    ├── meeting_room/            # Main meeting UI (video grid, subtitles, controls)
    └── shared/                  # Reusable widgets
```

### Data Flow
```
User Input (Meeting Code)
  → Home Screen (validation)
  → API: GET /api/meetings/{code}
  → Prejoin Screen (device selection, languages)
  → API: POST /api/meetings/{code}/join (receive tokens)
  → Meeting Room Screen
      ├─→ LiveKit Room (WebRTC video/audio)
      └─→ Subtitle WebSocket (bilingual text stream)
  → Leave Meeting
      ├─→ API: POST /api/meetings/{code}/leave
      └─→ Cleanup (disconnect, clear tokens)
```

---

## Core Features (Phase 1 MVP)

### REQ-1: Join Meeting Flow
- Input 6-character meeting code (case-insensitive)
- Validate meeting exists and is active
- Navigate to pre-join screen

### REQ-2: Pre-join Device Setup
- Local camera preview (not published to room yet)
- Audio level meter for microphone
- Device selection (camera/microphone)
- Language dropdowns: Spoken → Target (vi/ja/en)
- Save preferences to local storage

### REQ-3: WebRTC Video Room
- Connect to LiveKit server via tokens
- Publish local camera + microphone (sequential to avoid race conditions)
- Display video grid (1-4 participants, responsive)
- Subscribe to remote participant tracks
- Participant names overlay on video tiles

### REQ-4: Real-time Bilingual Subtitles
- WebSocket connection to `/ws/transcribe?token={subtitleToken}`
- Display overlay at bottom of screen:
  - Original text (small, 70% opacity)
  - Translated text (large, bold)
  - Speaker name badge
  - Decision/Action tags (if present)
- Auto-scroll, show latest 2-3 entries
- **Network Resilience**: Auto-reconnect with exponential backoff (1s, 2s, 4s, max 10s)

### REQ-5: Audio/Video Controls
- **Microphone**: Toggle mute/unmute
- **Camera**: Toggle on/off, flip (front ↔️ back)
- **Speaker**: Toggle speaker/headphone
- **Leave**: Disconnect, cleanup, navigate home

### REQ-6: Background Mode
- **Android**: Foreground service with persistent notification
- **iOS**: Audio background mode (UIBackgroundModes)
- Continue audio streaming when app backgrounded
- Reduce video bitrate to 360p in background
- Lock screen controls (iOS)

### REQ-7: Picture-in-Picture
- Android 8+ and iOS 14+ support
- Video + subtitles in PiP window
- User can multitask while in meeting

### REQ-8: Network Resilience
- Connection quality indicator (green/yellow/red)
- Graceful degradation: video → audio-only on poor network
- Auto-reconnect LiveKit room (max 3 attempts)
- Auto-reconnect subtitle WebSocket (exponential backoff)
- Toast notifications for network events

### REQ-9: Error Handling
- User-friendly error messages (no stack traces in UI)
- Retry mechanisms for transient errors
- Fallback behaviors (e.g., subtitles unavailable → continue meeting)
- Comprehensive logging (no sensitive data)

---

## Backend API Integration (Reuse Existing)

The mobile app consumes existing backend APIs without modification:

### Authentication & Session Management
```
POST /api/meetings/{code}/join
Request: { displayName, spokenLanguage, targetLanguage }
Response: {
  livekitUrl, livekitToken,
  sessionToken, subtitleToken,
  participantId
}
```

### Meeting Lifecycle
```
GET  /api/meetings/{code}               → Meeting details
POST /api/meetings/{code}/leave         → Leave (requires sessionToken)
GET  /api/meetings/{code}/participants  → Active participants list
```

### Real-time Subtitle Stream
```
WebSocket: /ws/transcribe?token={subtitleToken}
Message Format: {
  type: "subtitle",
  speaker: "Name",
  sourceText: "Original",
  translatedText: "Translation",
  timestamp: "2024-10-11T08:30:45Z",
  tags: ["action_item", "decision"],
  confidence: 0.92
}
```

---

## Implementation Tasks

### ✅ Task 1: Project Setup & Infrastructure
**Owner**: DevOps / Setup  
**Estimated Time**: 2 hours  
**Prerequisites**: Flutter SDK 3.24+, Android Studio, Xcode (macOS)

**Steps**:
1. Install Flutter SDK (see `apps/mobile/SETUP.md`)
2. Create project: `flutter create --org com.layameet mobile`
3. Configure `pubspec.yaml` dependencies
4. Setup Android permissions (`AndroidManifest.xml`)
5. Setup iOS permissions (`Info.plist`)
6. Create folder structure (Clean Architecture)
7. Add GitHub Actions workflow (`mobile-ci.yml`)

**Deliverables**:
- Flutter project structure created
- Dependencies configured
- Permissions setup (Android & iOS)
- CI workflow running

**Tests**:
- ✅ `flutter doctor` all checks pass
- ✅ `flutter build apk --debug` succeeds
- ✅ Empty app runs on emulator/simulator

---

### 🔧 Task 2: API Client & Data Models
**Owner**: Backend Integration  
**Estimated Time**: 4 hours  
**Dependencies**: Task 1 complete

**Steps**:
1. Create data models using `freezed` (Meeting, Participant, Subtitle, JoinResponse)
2. Implement `ApiClient` with Dio (interceptors: auth, logging, error handling)
3. Implement `MeetingApi` (getMeeting, joinMeeting, leaveMeeting)
4. Implement `SecureStorage` for token management
5. Create global Riverpod providers
6. Write unit tests (mock API responses)

**Deliverables**:
- `core/models/` with all data models
- `core/api/` with HTTP client
- `core/utils/secure_storage.dart`
- Unit tests with 100% pass rate

**Tests**:
- ✅ Unit test: `api_client_test.dart`
- ✅ Unit test: `meeting_api_test.dart`
- ✅ Unit test: Models deserialize from JSON fixtures

---

### 🏠 Task 3: Home Screen & Join Flow
**Owner**: Frontend  
**Estimated Time**: 3 hours  
**Dependencies**: Task 2 complete

**Steps**:
1. Create `HomeProvider` (state: meetingCode, isLoading, error)
2. Implement `HomeScreen` UI (input field, validation, join button)
3. Validate meeting code format (6 characters, alphanumeric)
4. Call `getMeeting` API to verify meeting exists
5. Navigate to PrejoinScreen on success
6. Show error messages on failure

**Deliverables**:
- `features/home/` module
- Fully functional join meeting input

**Tests**:
- ✅ Widget test: `home_screen_test.dart`
- ✅ Unit test: `home_provider_test.dart`

---

### 📹 Task 4: Pre-join Screen - Device Setup
**Owner**: Frontend + Media  
**Estimated Time**: 6 hours  
**Dependencies**: Task 3 complete

**Steps**:
1. Request camera/microphone permissions
2. Implement local camera preview (LiveKit `VideoView`, not published)
3. Implement audio level meter (visualize RMS)
4. Device selection dropdowns (cameras, microphones)
5. Language selection dropdowns (vi/ja/en → vi/ja/en)
6. Save preferences to `SharedPreferences`
7. Join button calls `joinMeeting` API
8. Navigate to MeetingRoomScreen with tokens

**Deliverables**:
- `features/prejoin/` module
- Device preview working
- Permissions flow complete

**Tests**:
- ✅ Widget test: `prejoin_screen_test.dart`
- ✅ Integration test: Mock permissions, verify preview

---

### 🎥 Task 5: Meeting Room - LiveKit Integration
**Owner**: WebRTC Specialist  
**Estimated Time**: 8 hours  
**Dependencies**: Task 4 complete

**Steps**:
1. Create `LiveKitProvider` (Room connection, track management)
2. Connect to LiveKit server with token
3. Publish local tracks sequentially (camera → wait → microphone)
4. Listen to room events (participantConnected, trackSubscribed)
5. Implement `VideoGrid` widget (1-4 participants, responsive)
6. Show participant names on video tiles
7. Handle track subscriptions (mute icons)
8. Cleanup on disconnect

**Deliverables**:
- `features/meeting_room/providers/livekit_provider.dart`
- `features/meeting_room/widgets/video_grid.dart`
- Video room functional

**Tests**:
- ✅ Unit test: `livekit_provider_test.dart`
- ✅ Integration test: Connect to test room, verify video

---

### 💬 Task 6: Real-time Subtitles WebSocket
**Owner**: WebSocket Specialist  
**Estimated Time**: 5 hours  
**Dependencies**: Task 5 complete

**Steps**:
1. Create `SubtitleProvider` (WebSocket connection, auto-reconnect)
2. Connect to `/ws/transcribe?token={subtitleToken}`
3. Parse incoming subtitle JSON messages
4. Buffer last 50 subtitles in state
5. Implement exponential backoff reconnect (1s, 2s, 4s, max 10s)
6. Create `SubtitleOverlay` widget
7. Display latest 2-3 subtitles with animations
8. Show speaker name, original + translated text, tags

**Deliverables**:
- `features/meeting_room/providers/subtitle_provider.dart`
- `features/meeting_room/widgets/subtitle_overlay.dart`
- Subtitles display in real-time

**Tests**:
- ✅ Unit test: `subtitle_provider_test.dart`
- ✅ Widget test: `subtitle_overlay_test.dart`

---

### 🎛️ Task 7: Audio/Video Controls
**Owner**: Frontend  
**Estimated Time**: 4 hours  
**Dependencies**: Task 5 & 6 complete

**Steps**:
1. Create `ControlButtons` widget (mute, camera, flip, speaker, leave)
2. Wire to LiveKitProvider methods (toggleMicrophone, toggleCamera)
3. Implement flip camera (front ↔️ back)
4. Implement leave flow (confirmation dialog)
5. On leave: disconnect LiveKit, close WebSocket, call leave API, clear tokens
6. Navigate back to Home screen

**Deliverables**:
- `features/meeting_room/widgets/control_buttons.dart`
- All controls functional

**Tests**:
- ✅ Widget test: `control_buttons_test.dart`
- ✅ Integration test: Mute → verify API call

---

### 🔊 Task 8: Background Mode - Android Foreground Service
**Owner**: Android Native Developer  
**Estimated Time**: 6 hours  
**Dependencies**: Task 7 complete

**Steps**:
1. Create `MeetingForegroundService.kt` in `android/app/src/main/kotlin/`
2. Notification with "Active Meeting" + "Return" action
3. Declare service in `AndroidManifest.xml`
4. Add `FOREGROUND_SERVICE` permission
5. Create Flutter `MethodChannel` to start/stop service
6. Reduce video bitrate to 360p when backgrounded

**Deliverables**:
- Android foreground service working
- Audio continues in background
- Persistent notification visible

**Tests**:
- ✅ Manual test: Join meeting → Home button → Audio continues

---

### 🍎 Task 9: Background Mode - iOS Audio
**Owner**: iOS Native Developer  
**Estimated Time**: 4 hours  
**Dependencies**: Task 7 complete

**Steps**:
1. Verify `UIBackgroundModes: audio` in Info.plist (already configured)
2. Configure `AVAudioSession` for voice chat
3. Verify LiveKit maintains audio when backgrounded
4. Implement lock screen controls (optional: `audio_service` package)
5. Implement Picture-in-Picture (iOS 14+)

**Deliverables**:
- iOS background audio working
- Lock screen controls
- PiP functional (iOS 14+)

**Tests**:
- ✅ Manual test: Join meeting → Lock screen → Audio continues

---

### 🌐 Task 10: Network Resilience
**Owner**: Network Engineering  
**Estimated Time**: 5 hours  
**Dependencies**: Task 6 complete

**Steps**:
1. Listen to LiveKit `connectionStateChanged` events
2. Create `NetworkIndicator` widget (green/yellow/red icon)
3. Implement graceful degradation (disable video if bandwidth < 300kbps)
4. Auto-reconnect LiveKit room (max 3 attempts)
5. Show toast notifications for network events
6. Retry dialog for persistent failures

**Deliverables**:
- `features/meeting_room/widgets/network_indicator.dart`
- Auto-reconnect working
- Graceful degradation functional

**Tests**:
- ✅ Manual test: Airplane mode → Reconnects on restore
- ✅ Unit test: Network quality state transitions

---

### 🚨 Task 11: Error Handling & User Feedback
**Owner**: Frontend + QA  
**Estimated Time**: 3 hours  
**Dependencies**: All core tasks complete

**Steps**:
1. Implement global error interceptor in Dio
2. Map HTTP status codes to user-friendly messages
3. Create `ErrorDialog` reusable widget
4. Wrap all async operations in try-catch
5. Implement logging (no sensitive data)
6. Show retry actions for transient errors

**Deliverables**:
- `features/shared/widgets/error_dialog.dart`
- All errors display user-friendly messages

**Tests**:
- ✅ Unit test: `error_handler_test.dart`
- ✅ Widget test: `error_dialog_test.dart`

---

### 🎨 Task 12: UI Polish & Internationalization
**Owner**: UI/UX Designer + Frontend  
**Estimated Time**: 6 hours  
**Dependencies**: All core tasks complete

**Steps**:
1. Setup `flutter_localizations` (vi/ja/en)
2. Translate all UI strings (`lib/l10n/*.arb`)
3. Configure dark mode support
4. Implement responsive layouts (phone & tablet)
5. Add animations (screen transitions, subtitle fade-in)
6. Accessibility improvements (semantic labels, touch targets, contrast)

**Deliverables**:
- Multi-language support
- Dark mode functional
- Responsive layouts
- Accessibility compliant

**Tests**:
- ✅ Manual test: Switch language → UI updates
- ✅ Accessibility audit (Android Accessibility Scanner)

---

### ✅ Task 13: Testing & Quality Assurance
**Owner**: QA Team  
**Estimated Time**: 8 hours  
**Dependencies**: All tasks complete

**Steps**:
1. Write unit tests for all providers (target 80%+ coverage)
2. Write widget tests for all screens
3. Write integration test (E2E: Home → Prejoin → Join → Leave)
4. Manual QA on real devices (Android: Pixel, Samsung; iOS: iPhone, iPad)
5. Test network scenarios (4G, WiFi, airplane mode)
6. Battery drain test (1-hour meeting)
7. Update GitHub Actions with test coverage report

**Deliverables**:
- 80%+ test coverage
- QA test report
- CI pipeline running tests

**Tests**:
- ✅ `flutter test --coverage`
- ✅ Integration test passes on emulator
- ✅ Manual QA checklist complete

---

### 🚀 Task 14: Deployment & App Store Preparation
**Owner**: DevOps + Release Manager  
**Estimated Time**: 6 hours  
**Dependencies**: Task 13 complete  
**Status**: Repo prep complete — store upload requires org credentials

**Steps**:
1. [x] Android release signing via `key.properties` + upload keystore scripts
2. [x] iOS ExportOptions templates + IPA build script
3. [ ] Create internal testing track (Google Play Console) — manual
4. [ ] Upload to TestFlight (iOS) — manual
5. [x] Create release notes and changelog
6. [x] Beta tester invite tracker template (`docs/BETA_TESTERS.md`)
7. [x] Crashlytics documented as optional (no Firebase files committed)
8. [x] Update documentation (`apps/mobile/README.md`, `docs/RELEASE.md`)
9. [x] CI/CD: GitLab `.gitlab-ci.yml` (analyze/test/APK + tagged AAB) + optional GitHub mobile workflows

**Deliverables**:
- [x] Signing + build scripts for signed AAB/APK / IPA
- [ ] Play internal track live (manual)
- [ ] TestFlight build live (manual)
- [x] Documentation + changelog + release notes

**Tests**:
- [ ] Install APK/AAB from Play Console internal track
- [ ] Install from TestFlight on iPhone
- [ ] Beta testers successfully join test meeting

---

## Timeline Estimate

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|---------------|--------------|
| **Phase 1: Foundation** | Tasks 1-3 | 9 hours | None |
| **Phase 2: Core Features** | Tasks 4-7 | 23 hours | Phase 1 |
| **Phase 3: Platform-Specific** | Tasks 8-9 | 10 hours | Phase 2 |
| **Phase 4: Polish & QA** | Tasks 10-13 | 22 hours | Phase 3 |
| **Phase 5: Deployment** | Task 14 | 6 hours | Phase 4 |
| **Total** | 14 tasks | **~70 hours** | Sequential |

**Team Size**: 2-3 developers (1 Flutter expert, 1 Android specialist, 1 iOS specialist)  
**Estimated Duration**: 2-3 weeks (full-time), 4-6 weeks (part-time)

---

## Success Metrics

### Performance
- ✅ App launch time: < 3 seconds (cold start)
- ✅ Join meeting flow: < 5 seconds (code input → video visible)
- ✅ Battery drain: < 25% per hour (video mode), < 10% per hour (audio-only)
- ✅ Memory footprint: < 150MB during active meeting

### Quality
- ✅ Test coverage: 80%+ (unit + widget tests)
- ✅ Crash rate: < 2% per session
- ✅ Meeting join success rate: 80%+ on first attempt
- ✅ Subtitle WebSocket disconnect rate: < 5%

### User Experience
- ✅ Average meeting duration: > 15 minutes (indicates stable experience)
- ✅ Background mode functional (audio continues)
- ✅ Auto-reconnect successful: > 90% of disconnects
- ✅ User-friendly error messages (no stack traces in UI)

---

## Risk Management

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **iOS App Store rejection** (PiP/Background) | Medium | High | Follow Apple HIG strictly, declare background modes properly, test thoroughly on TestFlight |
| **Android battery optimization kills app** | Medium | Medium | Request exemption, use foreground service, educate users in onboarding |
| **WebRTC performance on low-end devices** | Medium | Medium | Adaptive quality settings, disable video on devices < 2GB RAM, test on various devices |
| **Subtitle latency higher than web** | Low | Low | Reuse same 350ms chunking strategy, implement client-side buffering |
| **Network resilience insufficient** | Low | Medium | Comprehensive testing on 3G/4G/WiFi, exponential backoff, graceful degradation |
| **Flutter SDK compatibility issues** | Low | High | Pin Flutter version in CI, test on multiple Flutter versions, monitor release notes |

---

## Next Steps (After Completion)

### Phase 2 Enhancements (Future Roadmap)
- Meeting history & saved meetings
- Push notifications (meeting reminders)
- Export meeting minutes from mobile
- Screen sharing from mobile (Android 10+)
- Meeting recording (local device storage)
- Chat messages & reactions
- Virtual backgrounds (iOS ML Kit)
- Meeting analytics dashboard

### Platform Expansion
- Web Assembly (Flutter Web) for browser fallback
- Desktop apps (Flutter Windows/macOS/Linux)
- Tablet-optimized layouts (iPad, Android tablets)
- Wearable support (Apple Watch complications)

### Enterprise Features
- SSO integration (Google Workspace, Microsoft Entra ID)
- Custom branding (white-label)
- Advanced admin controls
- Compliance certifications (SOC 2, HIPAA)

---

## References

### Documentation
- Flutter Official Docs: https://docs.flutter.dev
- LiveKit Flutter SDK: https://docs.livekit.io/client-sdk-flutter/
- Riverpod: https://riverpod.dev
- Backend API Docs: `docs/PRD.md`, `docs/architecture.md`

### Code Examples
- Flutter Samples: https://github.com/flutter/samples
- LiveKit Examples: https://github.com/livekit/client-sdk-flutter/tree/main/example
- Clean Architecture Flutter: https://github.com/ResoCoder/flutter-tdd-clean-architecture

### Tools
- Flutter DevTools: https://docs.flutter.dev/tools/devtools
- Android Studio: https://developer.android.com/studio
- Xcode: https://developer.apple.com/xcode/
- Firebase Crashlytics: https://firebase.google.com/products/crashlytics

---

**Document Version**: 1.0.0  
**Last Updated**: October 11, 2026  
**Author**: AI Planning Agent  
**Status**: ✅ Ready for Implementation
