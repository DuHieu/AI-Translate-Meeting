# scripts/start-tunnel.ps1 - ViMeet Cloudflare Quick Tunnel launcher
$ErrorActionPreference = "Stop"

function Show-Usage {
    Write-Host "Usage: powershell -ExecutionPolicy Bypass -File ./scripts/start-tunnel.ps1 [--Port <1-65535>]"
}

function Get-TunnelPort {
    param([object[]]$Arguments)

    $Port = 3000
    for ($index = 0; $index -lt $Arguments.Count; $index++) {
        $argument = [string]$Arguments[$index]

        switch -Regex ($argument) {
            '^(--Port|-Port)$' {
                if ($index + 1 -ge $Arguments.Count) {
                    throw "Missing value for $argument."
                }

                $index++
                $argumentValue = [string]$Arguments[$index]
                if (-not [int]::TryParse($argumentValue, [ref]$Port)) {
                    throw "Port must be a number between 1 and 65535."
                }
                break
            }
            '^--Port=(.+)$' {
                if (-not [int]::TryParse($Matches[1], [ref]$Port)) {
                    throw "Port must be a number between 1 and 65535."
                }
                break
            }
            '^(-h|--help)$' {
                Show-Usage
                exit 0
            }
            default {
                throw "Unknown argument: $argument"
            }
        }
    }

    if ($Port -lt 1 -or $Port -gt 65535) {
        throw "Port must be between 1 and 65535."
    }

    return $Port
}

function Assert-LocalServiceAvailable {
    param([int]$Port)

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $connectTask = $client.ConnectAsync("localhost", $Port)
        if (-not $connectTask.Wait(3000) -or -not $client.Connected) {
            throw "Connection timed out."
        }
    }
    catch {
        throw "No local service is listening at http://localhost:$Port. Start ViMeet first, then run this script again."
    }
    finally {
        $client.Dispose()
    }
}

function Resolve-Cloudflared {
    $installedCommand = Get-Command cloudflared -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -ne $installedCommand) {
        return $installedCommand.Source
    }

    $architecture = $env:PROCESSOR_ARCHITECTURE
    switch ($architecture) {
        "AMD64" { $assetArchitecture = "amd64" }
        "x86" { $assetArchitecture = "386" }
        default { throw "Unsupported Windows architecture: $architecture. Install cloudflared manually and add it to PATH." }
    }

    $baseDirectory = $env:LOCALAPPDATA
    if ([string]::IsNullOrWhiteSpace($baseDirectory)) {
        $baseDirectory = $env:TEMP
    }

    $installDirectory = Join-Path $baseDirectory "ViMeet\bin"
    $cloudflaredPath = Join-Path $installDirectory "cloudflared.exe"
    if (Test-Path -LiteralPath $cloudflaredPath -PathType Leaf) {
        return $cloudflaredPath
    }

    New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
    $downloadPath = "$cloudflaredPath.download"
    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-$assetArchitecture.exe"

    Write-Host "[ViMeet] cloudflared was not found. Downloading the official binary..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -OutFile $downloadPath
        if (-not (Test-Path -LiteralPath $downloadPath -PathType Leaf) -or (Get-Item -LiteralPath $downloadPath).Length -eq 0) {
            throw "Downloaded cloudflared file is empty."
        }
        Move-Item -LiteralPath $downloadPath -Destination $cloudflaredPath -Force
    }
    finally {
        if (Test-Path -LiteralPath $downloadPath) {
            Remove-Item -LiteralPath $downloadPath -Force
        }
    }

    return $cloudflaredPath
}

try {
    $Port = Get-TunnelPort -Arguments $args
    $localUrl = "http://localhost:$Port"

    Write-Host "[ViMeet] Checking local service: $localUrl" -ForegroundColor Cyan
    Assert-LocalServiceAvailable -Port $Port
    $cloudflaredPath = Resolve-Cloudflared

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " ViMeet Cloudflare Quick Tunnel" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " Local service : $localUrl"
    Write-Host " Public URL    : cloudflared will print an https://*.trycloudflare.com URL below."
    Write-Host " Share         : send that public URL to meeting participants."
    Write-Host " Stop          : keep this terminal open; press Ctrl+C to close the tunnel."
    Write-Host " Note          : the URL is temporary and changes every time."
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""

    & $cloudflaredPath tunnel --url $localUrl
    if ($LASTEXITCODE -ne 0) {
        throw "cloudflared exited with code $LASTEXITCODE."
    }
}
catch {
    Write-Error "[ViMeet] $($_.Exception.Message)"
    Show-Usage
    exit 1
}
