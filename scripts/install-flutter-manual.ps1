# Install Flutter SDK from manually downloaded ZIP
# Usage: 
#   1. Download Flutter ZIP manually from browser
#   2. Run: powershell -ExecutionPolicy Bypass -File install-flutter-manual.ps1 -ZipPath "D:\Downloads\flutter_windows_3.24.0-stable.zip"

param(
    [Parameter(Mandatory=$false)]
    [string]$ZipPath = "",
    [string]$InstallPath = "D:\flutter"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Flutter SDK Installation (Manual)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# If no ZIP provided, guide user to download
if ([string]::IsNullOrEmpty($ZipPath) -or !(Test-Path $ZipPath)) {
    Write-Host "`nNo ZIP file provided or file not found." -ForegroundColor Yellow
    Write-Host "`nPlease follow these steps:" -ForegroundColor Cyan
    Write-Host "1. Open browser and go to:" -ForegroundColor White
    Write-Host "   https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Green
    Write-Host "`n2. Click 'Download Flutter SDK' button" -ForegroundColor White
    Write-Host "`n3. Save the ZIP file (flutter_windows_*-stable.zip)" -ForegroundColor White
    Write-Host "`n4. Run this script again with ZIP path:" -ForegroundColor White
    Write-Host "   powershell -ExecutionPolicy Bypass -File install-flutter-manual.ps1 -ZipPath 'D:\Downloads\flutter_windows_3.24.0-stable.zip'" -ForegroundColor Green
    
    # Try to open browser
    Write-Host "`nOpening download page in browser..." -ForegroundColor Yellow
    Start-Process "https://docs.flutter.dev/get-started/install/windows"
    exit 0
}

# Verify ZIP file
Write-Host "ZIP file found: $ZipPath" -ForegroundColor Green
$zipSize = (Get-Item $ZipPath).Length / 1MB
Write-Host "Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Gray

# Create install directory
Write-Host "`nCreating installation directory: $InstallPath" -ForegroundColor Green
$parentPath = Split-Path -Parent $InstallPath
New-Item -ItemType Directory -Force -Path $parentPath | Out-Null

# Extract Flutter
Write-Host "Extracting Flutter SDK..." -ForegroundColor Green
Write-Host "(This may take 2-3 minutes...)" -ForegroundColor Gray

try {
    Expand-Archive -Path $ZipPath -DestinationPath $parentPath -Force
    Write-Host "Extraction completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Extraction failed: $_" -ForegroundColor Red
    Write-Host "`nTry extracting manually:" -ForegroundColor Yellow
    Write-Host "1. Right-click the ZIP file" -ForegroundColor White
    Write-Host "2. Select 'Extract All...'" -ForegroundColor White
    Write-Host "3. Extract to: $parentPath" -ForegroundColor White
    exit 1
}

# Verify installation
$flutterBin = "$InstallPath\bin"
if (!(Test-Path "$flutterBin\flutter.bat")) {
    Write-Host "Flutter executable not found at $flutterBin" -ForegroundColor Red
    Write-Host "Installation may have failed." -ForegroundColor Red
    exit 1
}

# Add to PATH
Write-Host "`nAdding Flutter to PATH..." -ForegroundColor Green
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($currentPath -notlike "*$flutterBin*") {
    $newPath = "$currentPath;$flutterBin"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Flutter added to PATH successfully." -ForegroundColor Green
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
Write-Host "  Installation Complete! 🎉" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter Location: $InstallPath" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. RESTART your terminal/PowerShell" -ForegroundColor White
Write-Host "2. Run: flutter doctor" -ForegroundColor White
Write-Host "3. Accept licenses: flutter doctor --android-licenses" -ForegroundColor White
Write-Host "4. Create project:" -ForegroundColor White
Write-Host "   cd D:\MyProject\AI-Translate-Meeting\apps" -ForegroundColor Green
Write-Host "   flutter create --org com.vimeet --project-name mobile mobile" -ForegroundColor Green
