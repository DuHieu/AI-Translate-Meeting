# Changelog

All notable changes to the LayaMeet platform are documented in this file.

## [1.7.0] - 2026-10-22

### 🚀 Features & Enhancements
- feat(desktop): add LayaMeet Desktop v1.6.0 installer and release notes (18369f8)
- feat(web): mobile copy-link hint and download-started status (98da4b3)
- feat(web): redesign homepage and download flow (40b8ee7)
- feat(desktop): branded icons, NSIS installer polish, v1.6.0 download page and signing script (22c46b2)
- feat(desktop): on-device streaming STT to cut server STT cost (dd684f6)
- feat(desktop): integrate real-time STT Groq LPU with AI Voice Dubbing (TTS) and mini floating companion overlay (52c8450)
- feat(desktop): package full LiveKit meeting client into Tauri with Zoom-style Home hub and desktop bridge (d269af0)
- feat(desktop): package standalone embedded overlay UI and remove devUrl localhost dependency (2039915)
- feat(web): streamline landing page - remove neural canvas, simplify footer, drop settings & google auth (3960a98)
- feat(web): redesign layameet landing to enterprise trust style and optimize seo for desktop companion (9ff0258)

### 🐛 Bug Fixes & Stability
- fix(test): adapt subtitle hook readiness contract to localSttReady (1c2cd83)
- fix(desktop): disable window maximize, set compact overlay bounds, and add subtitle stream history (87b495e)
- fix(desktop): resolve process lock and tray-icon conflict in desktop companion release (23025b5)
- fix(desktop): resolve invisible window and lifecycle crash in desktop overlay companion (461a775)
- fix(desktop): embed real signed Windows desktop binary and cert in public downloads (2b95f6a)

### ⚡ Performance Optimizations
- perf(web): lazy-load heavyweight meeting dialogs to reduce meeting bundle chunk (c14a6e5)

### 🛠️ Maintenance & Refactoring
- refactor: modularize frontend modals and decompose backend meeting service (e78e1d4)
- build(desktop): re-sign exe after bundle patch; update download modal size and certificate link (f8b1ba6)
- build(desktop): auto-sign bundle via signCommand and keep website installers out of the app bundle (9cb149a)
- ci(workflows): streamline pipeline to only build and deploy on push to main (128e0d6)

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

