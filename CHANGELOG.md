# Changelog

All notable changes to the LayaMeet platform are documented in this file.

## [1.6.0] - 2026-10-15

### 🚀 Features & Enhancements
- feat(desktop-web): redesign landing page for desktop companion and scaffold tauri v2 rust engine (1b24683)
- feat(deploy): default STT_PROVIDER to sherpa and WHISPER_PRELOAD to false for automatic CI/CD deployment (f1b59fd)
- feat(ai-service): integrate self-hosted streaming Zipformer-RNNT via sherpa-onnx (Method 2) (5f68bb6)
- feat(stt): implement constrained candidate LID and two-pass hysteresis pipeline (77ec8b3)
- feat(admin): support custom ADMIN_SECRET_KEY via env and align default placeholder (ecc84e3)
- feat(ai): integrate BytePlus ModelArk Doubao translation provider (e60a4ea)

### 🐛 Bug Fixes & Stability
- fix(desktop): decouple cpal stream via worker thread and add windows app icons for msvc build (cbe5e25)
- fix(e2e): align MeetingBottomBar button labels and offline recovery with mobile e2e suite (19db3fa)
- fix(contract): restore WHISPER_PRELOAD default in dev docker-compose.yml to fulfill operations contract (779e7c1)
- fix(stt): improve Vietnamese LID accuracy in local faster-whisper (49bd6c2)
- fix(e2e): handle dropdown menu on home create button in mobile e2e scripts (6efff5f)
- fix(e2e): pass session bearer token on leave meeting and accept live status on api health probe (d3ec6ca)
- fix(mobile): resolve Android missing mipmap icons and raise iOS deployment target to 13.0 for CI (b2f1b59)

### 🛠️ Maintenance & Refactoring
- chore(deploy): add sherpa-onnx environment variables and persistent volume to compose files (492ea66)
- chore(deploy): forward WHISPER_INITIAL_PROMPT to ai-service in production compose (d31e5ec)

### 📝 Documentation
- docs: update AGENTS.md with P7 streaming transducer and constrained LID milestone (6a354c6)

