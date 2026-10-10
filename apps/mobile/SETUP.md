# Flutter Mobile App Setup Guide

## Prerequisites Installation

### 1. Install Flutter SDK

**Windows:**
1. Download Flutter SDK: https://docs.flutter.dev/get-started/install/windows
2. Extract ZIP to `C:\src\flutter`
3. Add to PATH: `C:\src\flutter\bin`
4. Verify: `flutter --version`

**macOS:**
```bash
# Using Homebrew
brew install flutter

# Or download from https://docs.flutter.dev/get-started/install/macos
```

**Linux:**
```bash
# Download and extract
wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.0-stable.tar.xz
tar xf flutter_linux_3.24.0-stable.tar.xz
export PATH="$PATH:`pwd`/flutter/bin"
```

### 2. Run Flutter Doctor

```bash
flutter doctor
```

Fix any issues reported:
- ✅ Flutter SDK installed
- ✅ Android toolchain (Android Studio + SDK)
- ✅ Xcode (macOS only, for iOS development)
- ✅ Chrome (for web debugging)
- ✅ VS Code or Android Studio with Flutter plugins

### 3. Install Android Studio (for Android development)

1. Download: https://developer.android.com/studio
2. Install Android SDK (API 24-34)
3. Install Android Emulator
4. Accept licenses: `flutter doctor --android-licenses`

### 4. Install Xcode (macOS only, for iOS development)

1. Install from App Store
2. Install Command Line Tools: `xcode-select --install`
3. Open Xcode and accept license
4. Install iOS Simulator

## Project Creation

Once Flutter is installed, run:

```bash
cd d:\MyProject\AI-Translate-Meeting\apps
flutter create --org com.vimeet --project-name mobile mobile
cd mobile
flutter pub get
```

## Verify Installation

```bash
# Check Flutter setup
flutter doctor -v

# Run on Android emulator
flutter run

# Run on iOS simulator (macOS only)
flutter run -d "iPhone 15 Pro"

# Run tests
flutter test
```

## Next Steps

After Flutter is installed and project created:
1. Review Task 1 implementation plan in main plan document
2. Configure `pubspec.yaml` with required dependencies
3. Setup Android permissions in `AndroidManifest.xml`
4. Setup iOS permissions in `Info.plist`
5. Implement folder structure (Clean Architecture)

## Troubleshooting

### Windows: Flutter not recognized
- Add `C:\src\flutter\bin` to System PATH
- Restart terminal/IDE

### Android licenses not accepted
```bash
flutter doctor --android-licenses
```

### iOS build fails (macOS)
```bash
cd ios
pod install
cd ..
flutter clean
flutter pub get
```

### Network proxy issues
```bash
flutter config --no-analytics
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
```

## Resources

- Flutter Documentation: https://docs.flutter.dev
- Flutter Samples: https://github.com/flutter/samples
- LiveKit Flutter SDK: https://pub.dev/packages/livekit_client
- Riverpod State Management: https://riverpod.dev
