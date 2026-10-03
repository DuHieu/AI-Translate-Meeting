# scripts/start-tunnel.ps1 - ViMeet Cloudflare Quick Tunnel Launcher
param(
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$cloudflaredPath = "$env:USERPROFILE\cloudflared.exe"

if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "[ViMeet] Downloading cloudflared binary to $cloudflaredPath..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cloudflaredPath
}

Write-Host "[ViMeet] Starting Cloudflare Quick Tunnel targeting http://localhost:$Port..." -ForegroundColor Green
Write-Host "[ViMeet] Đang khởi tạo đường truyền HTTPS công khai (0 VNĐ)..." -ForegroundColor Yellow

& $cloudflaredPath tunnel --url "http://localhost:$Port"
