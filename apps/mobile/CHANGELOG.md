# Changelog — Laya Meet

All notable changes to the Flutter mobile app are documented here.

## [1.0.0] — 2026-10-11

### Added
- Home: create / join meeting by 6-character code, recent meetings
- Prejoin: camera preview, mic/camera toggles, language selection, permissions
- Meeting room: LiveKit video grid with sequential camera→mic publish
- Real-time bilingual subtitles over WebSocket with exponential backoff reconnect
- In-call controls: mute, camera, flip, speaker, leave confirmation
- Android foreground service notification for active meetings
- iOS voice-chat audio session + background audio mode
- Network quality indicator, auto-reconnect (max 3), video degrade on poor network
- Localization: English, Vietnamese, Japanese
- Release signing templates and build scripts for Play / TestFlight

### Security
- Tokens stored in secure storage and cleared on leave
- Upload keystore / `key.properties` kept out of git

### Known limitations
- Store upload (Play internal track / TestFlight) requires org credentials
- Firebase Crashlytics is optional and not wired until `google-services` files are provided
