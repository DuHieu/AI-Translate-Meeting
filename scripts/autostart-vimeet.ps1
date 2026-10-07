# scripts/autostart-vimeet.ps1 - Automated background runner for ViMeet on Windows boot
param(
    [string]$ProjectRoot = "D:\MyProject\AI-Translate-Meeting",
    [int]$Port = 3000,
    [int]$DockerTimeoutSeconds = 180
)

$ErrorActionPreference = "Continue"

$logDir = Join-Path $env:LOCALAPPDATA "ViMeet"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logFile = Join-Path $logDir "autostart.log"

function Write-Log {
    param([string]$Message)
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $entry = "[$timestamp] $Message"
    Add-Content -Path $logFile -Value $entry
    Write-Host $entry
}

Write-Log "=== ViMeet Autostart Initiated ==="

# 1. Ensure Docker Desktop is launched
$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$dockerProcess = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerProcess) {
    if (Test-Path $dockerExe) {
        Write-Log "Launching Docker Desktop..."
        Start-Process -FilePath $dockerExe
    } else {
        Write-Log "ERROR: Docker Desktop executable not found at $dockerExe"
    }
} else {
    Write-Log "Docker Desktop process is already running."
}

# 2. Wait for Docker Engine API to be responsive
Write-Log "Waiting for Docker Engine daemon to respond..."
$startTime = Get-Date
$dockerReady = $false

while (((Get-Date) - $startTime).TotalSeconds -lt $DockerTimeoutSeconds) {
    $info = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        break
    }
    Start-Sleep -Seconds 3
}

if (-not $dockerReady) {
    Write-Log "ERROR: Docker daemon did not become ready within $DockerTimeoutSeconds seconds."
    exit 1
}

Write-Log "Docker Engine is healthy and ready."

# 3. Start ViMeet Compose Services
$composeFile = Join-Path $ProjectRoot "docker-compose.yml"
if (Test-Path $composeFile) {
    Write-Log "Starting ViMeet containers via docker compose..."
    Set-Location $ProjectRoot
    $composeOutput = docker compose -f $composeFile up -d 2>&1
    Write-Log "Compose output: $($composeOutput -join ' ')"
} else {
    Write-Log "ERROR: docker-compose.yml not found at $composeFile"
    exit 1
}

# 4. Verify local port 3000
$webReady = $false
$webStart = Get-Date
while (((Get-Date) - $webStart).TotalSeconds -lt 60) {
    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $connectTask = $client.ConnectAsync("localhost", $Port)
        if ($connectTask.Wait(2000) -and $client.Connected) {
            $client.Dispose()
            $webReady = $true
            break
        }
        $client.Dispose()
    } catch {
        # Retry until container starts
    }
    Start-Sleep -Seconds 2
}

if ($webReady) {
    Write-Log "ViMeet web application is successfully online at http://localhost:$Port"
} else {
    Write-Log "WARNING: Port $Port did not respond within 60s, containers may still be initializing."
}

# 5. Check Cloudflared service (for layameet.com)
$cloudflaredService = Get-Service -Name "Cloudflared" -ErrorAction SilentlyContinue
if ($cloudflaredService) {
    if ($cloudflaredService.Status -ne "Running") {
        Write-Log "Starting Cloudflared service..."
        Start-Service -Name "Cloudflared" -ErrorAction SilentlyContinue
    }
    Write-Log "Cloudflared tunnel service status: $($cloudflaredService.Status)"
} else {
    Write-Log "Cloudflared Windows service not registered (or using CLI tunnel)."
}

Write-Log "=== ViMeet Autostart Completed Successfully ==="
