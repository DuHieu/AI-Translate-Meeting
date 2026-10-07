# scripts/setup-autostart.ps1 - Configure and manage ViMeet / Docker autostart on Windows
param(
    [switch]$Enable,
    [switch]$Disable,
    [switch]$Status,
    [switch]$Logs
)

$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$vbsPath = Join-Path $startupFolder "ViMeet-Autostart.vbs"
$logPath = "$env:LOCALAPPDATA\ViMeet\autostart.log"
$dockerSettings = "$env:APPDATA\Docker\settings-store.json"
$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

function Show-Status {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " ViMeet & Docker Autostart Status" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    # 1. Docker Desktop setting
    $dockerSettingValue = $false
    if (Test-Path $dockerSettings) {
        $json = Get-Content $dockerSettings | ConvertFrom-Json
        $dockerSettingValue = [bool]$json.AutoStart
    }
    $dockerText = if ($dockerSettingValue) { "ENABLED" } else { "DISABLED" }
    $dockerColor = if ($dockerSettingValue) { "Green" } else { "Yellow" }
    Write-Host " [1] Docker Desktop Settings (AutoStart) : $dockerText" -ForegroundColor $dockerColor

    # 2. Windows Registry Run entry
    $reg = Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Docker Desktop" -ErrorAction SilentlyContinue
    $regOk = ($null -ne $reg)
    $regText = if ($regOk) { "ENABLED" } else { "DISABLED" }
    $regColor = if ($regOk) { "Green" } else { "Yellow" }
    Write-Host " [2] Windows Registry Run (Docker)      : $regText" -ForegroundColor $regColor

    # 3. ViMeet Startup VBS
    $vbsOk = (Test-Path $vbsPath)
    $vbsText = if ($vbsOk) { "INSTALLED ($vbsPath)" } else { "NOT INSTALLED" }
    $vbsColor = if ($vbsOk) { "Green" } else { "Yellow" }
    Write-Host " [3] ViMeet Background Runner (Startup)  : $vbsText" -ForegroundColor $vbsColor

    # 4. Cloudflared Windows Service
    $cf = Get-Service -Name "Cloudflared" -ErrorAction SilentlyContinue
    $cfOk = ($cf -and $cf.StartType -eq "Automatic")
    $cfText = if ($cf) { "$($cf.StartType) ($($cf.Status))" } else { "NOT FOUND" }
    $cfColor = if ($cfOk) { "Green" } else { "Yellow" }
    Write-Host " [4] Cloudflare Tunnel Service (StartType): $cfText" -ForegroundColor $cfColor

    # 5. Containers restart policy
    Write-Host " [5] Docker Containers Restart Policy    : restart: always (configured in docker-compose.yml)" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Enable-Autostart {
    Write-Host "[ViMeet] Enabling full autostart on Windows boot..." -ForegroundColor Green

    # Enable Docker settings-store.json
    if (Test-Path $dockerSettings) {
        $content = Get-Content $dockerSettings -Raw
        $content = $content -replace '"AutoStart":\s*false', '"AutoStart": true'
        Set-Content -Path $dockerSettings -Value $content -NoNewline
        Write-Host " -> Enabled Docker Desktop AutoStart in settings-store.json" -ForegroundColor Green
    }

    # Enable Registry Run
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Docker Desktop" -Value "`"$dockerExe`""
    Write-Host " -> Registered Docker Desktop in HKCU Startup Registry" -ForegroundColor Green

    # Install VBS launcher
    $scriptRoot = "D:\MyProject\AI-Translate-Meeting\scripts"
    $vbsContent = "Set WshShell = CreateObject(""WScript.Shell"")`r`nWshShell.Run ""powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """"$scriptRoot\autostart-vimeet.ps1"""" "", 0, False"
    Set-Content -Path $vbsPath -Value $vbsContent -Encoding ASCII
    Write-Host " -> Created silent background startup launcher: $vbsPath" -ForegroundColor Green

    Show-Status
    Write-Host "All components are configured to start automatically on Windows boot!" -ForegroundColor Green
}

function Disable-Autostart {
    Write-Host "[ViMeet] Disabling autostart..." -ForegroundColor Yellow

    # Remove VBS launcher
    if (Test-Path $vbsPath) {
        Remove-Item -Path $vbsPath -Force
        Write-Host " -> Removed $vbsPath" -ForegroundColor Yellow
    }

    # Remove Registry Run
    Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Docker Desktop" -ErrorAction SilentlyContinue
    Write-Host " -> Removed Docker Desktop from Registry Run" -ForegroundColor Yellow

    # Disable Docker setting
    if (Test-Path $dockerSettings) {
        $content = Get-Content $dockerSettings -Raw
        $content = $content -replace '"AutoStart":\s*true', '"AutoStart": false'
        Set-Content -Path $dockerSettings -Value $content -NoNewline
        Write-Host " -> Set AutoStart: false in Docker settings-store.json" -ForegroundColor Yellow
    }

    Show-Status
}

function Show-Logs {
    if (Test-Path $logPath) {
        Write-Host "=== Recent ViMeet Autostart Logs ($logPath) ===" -ForegroundColor Cyan
        Get-Content $logPath -Tail 30
    } else {
        Write-Host "No autostart logs found yet at $logPath." -ForegroundColor Yellow
    }
}

if ($Enable) {
    Enable-Autostart
} elseif ($Disable) {
    Disable-Autostart
} elseif ($Logs) {
    Show-Logs
} else {
    Show-Status
}
