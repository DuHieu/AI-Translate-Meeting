# LayaMeet SEO Health Inspector & IndexNow Launcher
param(
    [string]$Target = "https://layameet.com/",
    [switch]$All,
    [switch]$Ping,
    [switch]$Report
)

$scriptPath = Join-Path $PSScriptRoot "..\apps\web\scripts\seo-tool.mjs"
$cliArgs = @()

if ($All) {
    $cliArgs += "--all"
} else {
    $cliArgs += $Target
}

if ($Ping) {
    $cliArgs += "--ping"
}

if ($Report) {
    $cliArgs += "--report"
}

Write-Host "🚀 Đang khởi chạy LayaMeet SEO Inspector Tool..." -ForegroundColor Cyan
node $scriptPath @cliArgs
