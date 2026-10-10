# ViMeet Mobile - Flutter App

Cross-platform mobile application for **AI-Translate-Meeting** platform. Supports real-time video conferencing with bilingual subtitle translation on Android and iOS.

## 🚀 Quick Start

### Prerequisites

- Flutter SDK 3.24+ ([Install Guide](SETUP.md))
- Android Studio (for Android development)
- Xcode 14+ (for iOS development, macOS only)

### Installation

```bash
# Install dependencies
flutter pub get

# Generate code (models, providers)
flutter pub run build_runner build --delete-conflicting-outputs

# Run on emulator/simulator
flutter run

# Run on specific device
flutter run -d "iPhone 15 Pro"      # iOS
flutter run -d "Pixel_7_Pro_API_34"  # Android
```

## 📁 Project Structure

```
lib/
├── main.dart                    # App entry point
├── app.dart                     # MaterialApp config
├── core/                        # Shared infrastructure
│   ├── api/                     # HTTP & WebSocket clients
│   ├── models/                  # Data models
│   ├── providers/               # Global providers
│   ├── constants/               # Configuration
│   └── utils/                   # Utilities
├── features/                    # Feature modules
│   ├── home/                    # Join meeting screen
│   ├── prejoin/                 # Device setup
│   ├── meeting_room/            # Video room
│   └── shared/                  # Reusable widgets
└── l10n/                        # Internationalization
```

## 🛠️ Development

### Run Tests

```bash
# Unit & widget tests
flutter test

# Integration tests
flutter test integration_test/

# Test coverage
flutter test --coverage
```

### Code Generation

```bash
# Generate freezed models & riverpod providers
flutter pub run build_runner watch
```

### Linting

```bash
flutter analyze
flutter format lib/ --set-exit-if-changed
```

### Build

```bash
# Android APK (debug)
flutter build apk --debug

# Android AAB (release)
flutter build appbundle --release

# iOS (requires macOS)
flutter build ios --release
```

## 🌍 Localization

Supported languages:
- 🇻🇳 Vietnamese (`vi`)
- 🇯🇵 Japanese (`ja`)
- 🇬🇧 English (`en`)

Add translations in `lib/l10n/app_*.arb` files.

## 🧪 Testing Strategy

- **Unit Tests**: All providers, models, utilities (target 80%+ coverage)
- **Widget Tests**: All screens and widgets
- **Integration Tests**: End-to-end user flows

## 📦 Dependencies

### Core
- `flutter_riverpod` - State management
- `livekit_client` - WebRTC video/audio
- `dio` - HTTP client
- `web_socket_channel` - Real-time subtitles

### Storage
- `flutter_secure_storage` - Token storage
- `shared_preferences` - User preferences

### Utilities
- `permission_handler` - Camera/mic permissions
- `logger` - Logging
- `freezed` - Immutable models

## 🔧 Configuration

### Environment Variables

Create `.env` file (gitignored):

```env
API_BASE_URL=https://api.vimeet.vn
LIVEKIT_URL=wss://livekit.vimeet.vn
SUBTITLE_WS_URL=wss://api.vimeet.vn/ws/transcribe
```

For local development, defaults to:
- API: `http://10.0.2.2:5000` (Android emulator localhost)
- LiveKit: `ws://10.0.2.2:7880`
- Subtitle WS: `ws://10.0.2.2:8000/ws/transcribe`

### Android Permissions

Configured in `android/app/src/main/AndroidManifest.xml`:
- `INTERNET` - Network access
- `CAMERA` - Video streaming
- `RECORD_AUDIO` - Audio streaming
- `FOREGROUND_SERVICE` - Background audio

### iOS Permissions

Configured in `ios/Runner/Info.plist`:
- `NSCameraUsageDescription` - Camera access
- `NSMicrophoneUsageDescription` - Microphone access
- `UIBackgroundModes: audio` - Background audio

## 🚢 Deployment

### Android (Google Play)

1. Generate signing key:
   ```bash
   keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

2. Configure `android/key.properties` (gitignored):
   ```properties
   storePassword=<password>
   keyPassword=<password>
   keyAlias=upload
   storeFile=<path-to-keystore>
   ```

3. Build release:
   ```bash
   flutter build appbundle --release
   ```

### iOS (App Store)

1. Configure signing in Xcode:
   - Open `ios/Runner.xcworkspace`
   - Select Runner target → Signing & Capabilities
   - Set Team and Bundle Identifier

2. Archive and upload:
   ```bash
   flutter build ios --release
   open ios/Runner.xcworkspace
   # Product → Archive → Distribute App
   ```

## 📱 Supported Platforms

| Platform | Minimum Version | Target Version |
|----------|----------------|----------------|
| Android | API 24 (7.0) | API 35 (15.0) |
| iOS | 12.1 | 18.0 |

## 🐛 Troubleshooting

### Common Issues

**1. Flutter command not found**
```bash
# Add Flutter to PATH
export PATH="$PATH:/path/to/flutter/bin"
```

**2. Android licenses not accepted**
```bash
flutter doctor --android-licenses
```

**3. iOS build fails**
```bash
cd ios
pod install
cd ..
flutter clean
flutter pub get
```

**4. Code generation errors**
```bash
flutter pub run build_runner clean
flutter pub run build_runner build --delete-conflicting-outputs
```

## 📚 Documentation

- [Setup Guide](SETUP.md) - Flutter SDK installation
- [Implementation Plan](../../docs/mobile-implementation-plan.md) - Development roadmap
- [API Documentation](../../docs/PRD.md) - Backend API reference
- [Architecture](../../docs/architecture.md) - System design

## 🤝 Contributing

See parent repository [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 📄 License

Business Source License 1.1 (BSL 1.1) - See [LICENSE](../../LICENSE)

---

**Version**: 1.0.0  
**Last Updated**: October 11, 2026  
**Status**: 🚧 In Development
