# Complete Flutter Setup Script - Extract and Configure
# Run after download completes

param(
    [string]$ZipPath = "D:\flutter_sdk.zip",
    [string]$InstallPath = "D:\flutter"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Flutter SDK Setup - Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Verify ZIP exists
if (!(Test-Path $ZipPath)) {
    Write-Host "ERROR: Flutter ZIP not found at $ZipPath" -ForegroundColor Red
    exit 1
}

$zipSize = (Get-Item $ZipPath).Length / 1MB
Write-Host "`nZIP file found: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Green

if ($zipSize -lt 900) {
    Write-Host "WARNING: File size seems incomplete. Expected ~1000 MB." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Extract Flutter
Write-Host "`nExtracting Flutter SDK to $InstallPath..." -ForegroundColor Green
Write-Host "(This will take 2-3 minutes...)" -ForegroundColor Gray

$parentPath = Split-Path -Parent $InstallPath

try {
    Expand-Archive -Path $ZipPath -DestinationPath $parentPath -Force
    Write-Host "Extraction complete!" -ForegroundColor Green
} catch {
    Write-Host "ERROR during extraction: $_" -ForegroundColor Red
    exit 1
}

# Verify Flutter binary
$flutterExe = "$InstallPath\bin\flutter.bat"
if (!(Test-Path $flutterExe)) {
    Write-Host "ERROR: Flutter executable not found at $flutterExe" -ForegroundColor Red
    exit 1
}

Write-Host "Flutter binary verified: $flutterExe" -ForegroundColor Green

# Add to PATH
Write-Host "`nConfiguring PATH environment variable..." -ForegroundColor Green
$flutterBin = "$InstallPath\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($currentPath -notlike "*$flutterBin*") {
    $newPath = "$currentPath;$flutterBin"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Flutter added to PATH." -ForegroundColor Green
    Write-Host "NOTE: You must restart terminal for PATH to take effect." -ForegroundColor Yellow
} else {
    Write-Host "Flutter already in PATH." -ForegroundColor Yellow
}

# Update current session
$env:Path += ";$flutterBin"

# Run Flutter Doctor
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Running Flutter Doctor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

& "$flutterExe" doctor -v

# Show summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete! 🎉" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter SDK: $InstallPath" -ForegroundColor Green
Write-Host "Flutter Version:" -ForegroundColor Green
& "$flutterExe" --version

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. CLOSE and REOPEN your terminal" -ForegroundColor White
Write-Host "2. Verify: flutter --version" -ForegroundColor White
Write-Host "3. Accept Android licenses:" -ForegroundColor White
Write-Host "   flutter doctor --android-licenses" -ForegroundColor Green
Write-Host "4. Create mobile project:" -ForegroundColor White
Write-Host "   cd D:\MyProject\AI-Translate-Meeting\apps" -ForegroundColor Green
Write-Host "   flutter create --org com.layameet --project-name mobile ." -ForegroundColor Green
Write-Host "   cd mobile" -ForegroundColor Green
Write-Host "   flutter pub get" -ForegroundColor Green
Write-Host "   flutter run" -ForegroundColor Green

Write-Host "`nFlutter is ready to use! 🚀" -ForegroundColor Cyan
