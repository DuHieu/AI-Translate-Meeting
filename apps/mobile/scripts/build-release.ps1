param(
    [switch]$Android,
    [switch]$Ios,
    [string]$ApiBaseUrl = "https://api.example.com",
    [string]$LivekitUrl = "wss://livekit.example.com",
    [string]$SubtitleWsUrl = "wss://ai.example.com/ws/transcribe"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $Android -and -not $Ios) {
    $Android = $true
}

$Defines = @(
    "--dart-define=API_BASE_URL=$ApiBaseUrl",
    "--dart-define=LIVEKIT_URL=$LivekitUrl",
    "--dart-define=SUBTITLE_WS_URL=$SubtitleWsUrl"
)

Write-Host "flutter pub get"
flutter pub get

if ($Android) {
    $Props = Join-Path $Root "android\key.properties"
    if (-not (Test-Path $Props)) {
        Write-Warning "android/key.properties missing — release will fall back to debug signing."
        Write-Warning "Run scripts/create-upload-keystore.ps1 for Play-ready builds."
    }

    Write-Host "Building Android App Bundle..."
    flutter build appbundle --release @Defines
    Write-Host "Building Android APK..."
    flutter build apk --release @Defines

    Write-Host "AAB: build/app/outputs/bundle/release/app-release.aab"
    Write-Host "APK: build/app/outputs/flutter-apk/app-release.apk"
}

if ($Ios) {
    if ($IsWindows -or $env:OS -match "Windows") {
        Write-Error "iOS release builds require macOS + Xcode."
    }
    $Export = Join-Path $Root "ios\ExportOptions.plist"
    if (-not (Test-Path $Export)) {
        Write-Warning "ios/ExportOptions.plist missing. Copy from ExportOptions-appstore.plist.example"
    }
    Write-Host "Building iOS IPA..."
    flutter build ipa --release @Defines `
        --export-options-plist=ios/ExportOptions.plist
    Write-Host "IPA under build/ios/ipa/"
}
