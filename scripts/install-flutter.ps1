# Install Flutter SDK on D:\ Drive
# Run as Administrator: powershell -ExecutionPolicy Bypass -File install-flutter.ps1

param(
    [string]$InstallPath = "D:\flutter",
    [string]$FlutterVersion = "3.24.0"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Flutter SDK Installation Script" -ForegroundColor Cyan
Write-Host "  Install Location: $InstallPath" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Flutter already exists
if (Test-Path "$InstallPath\bin\flutter.bat") {
    Write-Host "Flutter already installed at $InstallPath" -ForegroundColor Yellow
    & "$InstallPath\bin\flutter.bat" --version
    $continue = Read-Host "Reinstall? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Installation cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Create install directory
Write-Host "`nCreating installation directory..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null

# Download Flutter SDK
$downloadUrl = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_$FlutterVersion-stable.zip"
$zipPath = "$env:TEMP\flutter.zip"

Write-Host "Downloading Flutter SDK v$FlutterVersion..." -ForegroundColor Green
Write-Host "URL: $downloadUrl" -ForegroundColor Gray

try {
    # Use WebClient for better progress
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($downloadUrl, $zipPath)
    Write-Host "Download completed: $zipPath" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $_" -ForegroundColor Red
    Write-Host "Please download manually from: https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Yellow
    exit 1
}

# Extract Flutter
Write-Host "`nExtracting Flutter SDK..." -ForegroundColor Green
try {
    # Extract to parent directory (will create flutter\ subfolder)
    $parentPath = Split-Path -Parent $InstallPath
    Expand-Archive -Path $zipPath -DestinationPath $parentPath -Force
    Write-Host "Extraction completed." -ForegroundColor Green
} catch {
    Write-Host "Extraction failed: $_" -ForegroundColor Red
    exit 1
}

# Clean up
Remove-Item $zipPath -Force
Write-Host "Cleaned up temporary files." -ForegroundColor Green

# Add to PATH
Write-Host "`nAdding Flutter to PATH..." -ForegroundColor Green
$flutterBin = "$InstallPath\bin"

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($currentPath -notlike "*$flutterBin*") {
    # Add Flutter to PATH
    $newPath = "$currentPath;$flutterBin"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Flutter added to PATH successfully." -ForegroundColor Green
    Write-Host "Please restart your terminal for PATH changes to take effect." -ForegroundColor Yellow
} else {
    Write-Host "Flutter already in PATH." -ForegroundColor Yellow
}

# Update current session PATH
$env:Path += ";$flutterBin"

# Run flutter doctor
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Running Flutter Doctor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

& "$flutterBin\flutter.bat" doctor -v

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Installation Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter SDK: $InstallPath" -ForegroundColor Green
Write-Host "Flutter Version: " -NoNewline
& "$flutterBin\flutter.bat" --version | Select-Object -First 1
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Restart your terminal (or run: refreshenv)" -ForegroundColor White
Write-Host "2. Run: flutter doctor" -ForegroundColor White
Write-Host "3. Accept Android licenses: flutter doctor --android-licenses" -ForegroundColor White
Write-Host "4. Create project: cd apps && flutter create --org com.vimeet mobile" -ForegroundColor White

Write-Host "`nInstallation complete! 🎉" -ForegroundColor Green
