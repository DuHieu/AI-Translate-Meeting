# scripts/run-concurrency-test.ps1 - Automated Concurrency & Multi-Room Load Benchmark Runner
param (
    [string]$ApiUrl = "http://localhost:5000",
    [string]$WsUrl = "ws://localhost:8000",
    [string]$SampleFile = "vi_sample_16k.pcm",
    [string]$OutputDir = "benchmark-results",
    [switch]$DryRun,
    [switch]$Quick
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   AI-Translate-Meeting: Multi-Room & Concurrency Benchmark Runner" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Preflight Validations
Write-Host "`n[1/4] Running Preflight Environment Checks..." -ForegroundColor Yellow

# Check Sample Audio File
$SamplePath = Resolve-Path $SampleFile -ErrorAction SilentlyContinue
if (-not $SamplePath -or -not (Test-Path $SamplePath)) {
    Write-Host "[ERROR] Sample audio file '$SampleFile' not found." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Sample PCM audio: $SamplePath" -ForegroundColor Green

# Check Python Runtime
try {
    $pyVer = python --version 2>&1
    Write-Host "  [OK] Python Runtime: $pyVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python 3 is not found in PATH." -ForegroundColor Red
    exit 1
}

# Check API Health
try {
    $apiHealth = Invoke-RestMethod -Uri "$ApiUrl/health/live" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  [OK] Backend API is reachable: $ApiUrl" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Backend API check failed at $ApiUrl. Verify container or host process." -ForegroundColor Yellow
}

# Check AI Service Health
try {
    $aiHealth = Invoke-RestMethod -Uri "http://localhost:8000/health/live" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  [OK] AI Service is reachable: $WsUrl" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] AI Service check failed. Verify container or host process." -ForegroundColor Yellow
}

if ($DryRun) {
    Write-Host "`n[DRY RUN] Preflight verification completed successfully. Exiting without launching benchmark." -ForegroundColor Cyan
    exit 0
}

# Ensure Output Directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$Scenarios = @(
    @{
        Name = "Scenario 1: Single Room High Density Fan-out"
        Rooms = 1
        ParticipantsPerRoom = 6
        SpeakersPerRoom = 1
        OutputFile = "$OutputDir/scenario-1-fanout.json"
        MetricsFile = "$OutputDir/metrics-scenario-1.json"
    },
    @{
        Name = "Scenario 2: Multi-Room Parallel Isolation (Zero Leakage)"
        Rooms = 3
        ParticipantsPerRoom = 3
        SpeakersPerRoom = 1
        OutputFile = "$OutputDir/scenario-2-multiroom.json"
        MetricsFile = "$OutputDir/metrics-scenario-2.json"
    }
)

if (-not $Quick) {
    $Scenarios += @{
        Name = "Scenario 3: Multi-Room Scalability Under Load"
        Rooms = 5
        ParticipantsPerRoom = 3
        SpeakersPerRoom = 1
        OutputFile = "$OutputDir/scenario-3-scale.json"
        MetricsFile = "$OutputDir/metrics-scenario-3.json"
    }
}

$TotalScenarios = $Scenarios.Count
$CompletedScenarios = 0
$ScenarioSummaries = @()

# 2. Execute Benchmark Scenarios
Write-Host "`n[2/4] Executing Benchmark Scenarios ($TotalScenarios total)..." -ForegroundColor Yellow

foreach ($sc in $Scenarios) {
    Write-Host "`n------------------------------------------------------------------" -ForegroundColor Magenta
    Write-Host " >> $($sc.Name)" -ForegroundColor Magenta
    Write-Host "    Rooms: $($sc.Rooms) | Participants/Room: $($sc.ParticipantsPerRoom) | Speakers/Room: $($sc.SpeakersPerRoom)" -ForegroundColor Gray
    Write-Host "------------------------------------------------------------------" -ForegroundColor Magenta

    # Start background telemetry collector with graceful stop file
    $stopFlag = "$OutputDir/collector.flag"
    New-Item -ItemType File -Path $stopFlag -Force | Out-Null
    $metricsProc = Start-Process python -ArgumentList @(
        "scripts/collect-metrics.py",
        "--interval", "1.0",
        "--output", $sc.MetricsFile,
        "--stop-file", $stopFlag
    ) -PassThru -NoNewWindow

    Start-Sleep -Seconds 1

    # Run Load Test Runner
    $loadArgs = @(
        "scripts/load-test.py",
        "--api-url", $ApiUrl,
        "--ws-url", $WsUrl,
        "--rooms", "$($sc.Rooms)",
        "--participants-per-room", "$($sc.ParticipantsPerRoom)",
        "--speakers-per-room", "$($sc.SpeakersPerRoom)",
        "--sample-file", $SampleFile,
        "--output-json", $sc.OutputFile
    )

    $exitCode = 0
    try {
        & python @loadArgs
        $exitCode = $LASTEXITCODE
    } catch {
        $exitCode = 1
    }

    # Signal collector to stop and save output
    Remove-Item -Path $stopFlag -Force -ErrorAction SilentlyContinue
    if (-not $metricsProc.HasExited) {
        $metricsProc.WaitForExit(3000) | Out-Null
    }

    if ($exitCode -eq 0) {
        Write-Host "  >> Result: PASSED" -ForegroundColor Green
        $CompletedScenarios++
    } else {
        Write-Host "  >> Result: FAILED (Exit Code: $exitCode)" -ForegroundColor Red
    }

    if (Test-Path $sc.OutputFile) {
        $json = Get-Content $sc.OutputFile -Raw | ConvertFrom-Json
        $ScenarioSummaries += [PSCustomObject]@{
            Name = $sc.Name
            Rooms = $json.rooms
            TotalParticipants = $json.total_participants
            SuccessSessions = $json.successful_sessions
            TTFSp50 = $json.ttfs_p50_ms
            TTFSp95 = $json.ttfs_p95_ms
            LeakageCount = $json.cross_room_leakage_count
            WallTimeSec = $json.total_wall_time_sec
            Passed = ($exitCode -eq 0)
        }
    }

    # Short cooldown between scenarios
    Start-Sleep -Seconds 5
}

# 3. Generate Benchmark Markdown Report
Write-Host "`n[3/4] Generating Consolidated Benchmark Report..." -ForegroundColor Yellow
$ReportPath = "$OutputDir/benchmark-report.md"

$ReportContent = @"
# AI-Translate-Meeting: Multi-Room & Concurrency Benchmark Report

> **Generated At:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
> **API URL:** $ApiUrl  
> **WebSocket URL:** $WsUrl  
> **Sample Audio:** $SampleFile  

---

## 1. Executive Summary

| Scenario | Rooms | Total Users | Success Rate | TTFS p50 | TTFS p95 | Zero Leakage | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
"@

foreach ($s in $ScenarioSummaries) {
    $successRate = "{0:N1}%" -f (($s.SuccessSessions / [Math]::Max(1, $s.TotalParticipants)) * 100)
    $leakageStatus = if ($s.LeakageCount -eq 0) { "PASSED (0)" } else { "FAILED ($($s.LeakageCount))" }
    $slaStatus = if ($s.Passed -and $s.TTFSp50 -le 2000) { "PASSED" } else { "WARNING" }
    $p50Str = if ($s.TTFSp50) { "{0:N1} ms" -f $s.TTFSp50 } else { "N/A" }
    $p95Str = if ($s.TTFSp95) { "{0:N1} ms" -f $s.TTFSp95 } else { "N/A" }

    $ReportContent += "`n| $($s.Name) | $($s.Rooms) | $($s.TotalParticipants) | $successRate | $p50Str | $p95Str | $leakageStatus | $slaStatus |"
}

foreach ($sc in $Scenarios) {
    if (Test-Path $sc.MetricsFile) {
        $metJson = Get-Content $sc.MetricsFile -Raw | ConvertFrom-Json
        $ReportContent += "`n`n### Resource Utilization: $($sc.Name)`n"
        $ReportContent += "| Container | Peak CPU % | Avg CPU % | Peak RAM (MB) |`n| :--- | :---: | :---: | :---: |`n"
        foreach ($c in $metJson.summary.PSObject.Properties) {
            $ReportContent += "| $($c.Name) | $($c.Value.peak_cpu_perc)% | $($c.Value.avg_cpu_perc)% | $($c.Value.peak_mem_mb) MB |`n"
        }
    }
}

$ReportContent += @"


---

## 2. SLA Criteria & Verification

1. **Time-To-First-Subtitle (TTFS):** SLA Target $\le 2000$ ms (p50).
2. **Cross-Room Zero Leakage:** Subtitles from Room `$i` MUST NEVER be delivered to Room `$j`.
3. **Session Stability:** No unexpected WebSocket drops or unhandled HTTP 500 errors.

*Report saved automatically to ``$ReportPath``.*
"@

Set-Content -Path $ReportPath -Value $ReportContent -Encoding UTF8
Write-Host "  [OK] Benchmark report saved to: $ReportPath" -ForegroundColor Green

# 4. Final Verdict
Write-Host "`n[4/4] Benchmark Verdict" -ForegroundColor Yellow
if ($CompletedScenarios -eq $TotalScenarios) {
    Write-Host "All $TotalScenarios/$TotalScenarios scenarios completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Completed $CompletedScenarios/$TotalScenarios scenarios. Some scenarios reported issues." -ForegroundColor Red
    exit 1
}
