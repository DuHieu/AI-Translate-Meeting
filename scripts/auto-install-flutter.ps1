# Auto Flutter Installation - Monitor download and auto-extract
# This script will wait for download to complete, then automatically extract and setup

$zipPath = "D:\flutter_sdk.zip"
$installPath = "D:\flutter"
$maxWaitMinutes = 15
$checkInterval = 10  # seconds

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Automatic Flutter Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nMonitoring download progress..." -ForegroundColor Yellow
Write-Host "ZIP: $zipPath" -ForegroundColor Gray
Write-Host "Target: $installPath" -ForegroundColor Gray

$startTime = Get-Date
$previousSize = 0

while ($true) {
    $elapsed = ((Get-Date) - $startTime).TotalMinutes
    
    if ($elapsed -gt $maxWaitMinutes) {
        Write-Host "`nTimeout: Download did not complete in $maxWaitMinutes minutes." -ForegroundColor Red
        exit 1
    }
    
    if (!(Test-Path $zipPath)) {
        Write-Host "Waiting for download to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds $checkInterval
        continue
    }
    
    $currentSize = (Get-Item $zipPath).Length / 1MB
    $progress = [math]::Round(($currentSize / 1000) * 100, 1)
    $speed = [math]::Round(($currentSize - $previousSize) / $checkInterval, 2)
    
    Write-Host "[$([math]::Round($elapsed, 1)) min] Size: $([math]::Round($currentSize, 2)) MB ($progress%) | Speed: $speed MB/s" -ForegroundColor Green
    
    # Check if download complete
    if ($currentSize -gt 900 -and $speed -lt 1) {
        Write-Host "`nDownload complete! Starting extraction..." -ForegroundColor Green
        break
    }
    
    $previousSize = $currentSize
    Start-Sleep -Seconds $checkInterval
}

# Run setup script
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Extracting and Configuring Flutter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

& "D:\MyProject\AI-Translate-Meeting\scripts\setup-flutter-complete.ps1" -ZipPath $zipPath -InstallPath $installPath
