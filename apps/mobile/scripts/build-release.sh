#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ANDROID=0
IOS=0
API_BASE_URL="${API_BASE_URL:-https://api.example.com}"
LIVEKIT_URL="${LIVEKIT_URL:-wss://livekit.example.com}"
SUBTITLE_WS_URL="${SUBTITLE_WS_URL:-wss://ai.example.com/ws/transcribe}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --android) ANDROID=1 ;;
    --ios) IOS=1 ;;
    --api) API_BASE_URL="$2"; shift ;;
    --livekit) LIVEKIT_URL="$2"; shift ;;
    --subtitle) SUBTITLE_WS_URL="$2"; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
  shift
done

if [[ $ANDROID -eq 0 && $IOS -eq 0 ]]; then
  ANDROID=1
fi

DEFINES=(
  "--dart-define=API_BASE_URL=${API_BASE_URL}"
  "--dart-define=LIVEKIT_URL=${LIVEKIT_URL}"
  "--dart-define=SUBTITLE_WS_URL=${SUBTITLE_WS_URL}"
)

flutter pub get

if [[ $ANDROID -eq 1 ]]; then
  if [[ ! -f android/key.properties ]]; then
    echo "WARN: android/key.properties missing — release may use debug signing."
  fi
  flutter build appbundle --release "${DEFINES[@]}"
  flutter build apk --release "${DEFINES[@]}"
  echo "AAB: build/app/outputs/bundle/release/app-release.aab"
  echo "APK: build/app/outputs/flutter-apk/app-release.apk"
fi

if [[ $IOS -eq 1 ]]; then
  if [[ ! -f ios/ExportOptions.plist ]]; then
    echo "Copy ios/ExportOptions-appstore.plist.example → ios/ExportOptions.plist and set teamID"
    exit 1
  fi
  flutter build ipa --release "${DEFINES[@]}" \
    --export-options-plist=ios/ExportOptions.plist
  echo "IPA under build/ios/ipa/"
fi
