[CmdletBinding()]
param (
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_.-]*$')]
    [string]$ContainerName = "ai_translate_postgres",

    [string]$Database = $env:POSTGRES_DB,

    [string]$User = $env:POSTGRES_USER,
    [string]$BackupDir = "",
    [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Database)) {
    $Database = "ai_translate_meeting"
}
if ([string]::IsNullOrWhiteSpace($User)) {
    $User = "postgres"
}
if ($Database -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "Database must be a valid PostgreSQL identifier."
}
if ($User -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "User must be a valid PostgreSQL identifier."
}
if ([string]::IsNullOrWhiteSpace($BackupDir)) {
    $BackupDir = Join-Path $PSScriptRoot "..\backups"
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
if ([string]::IsNullOrWhiteSpace($OutputFile)) {
    $OutputFile = Join-Path $BackupDir "${Database}_backup_${timestamp}.sql"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputFile)) {
    $OutputFile = Join-Path $BackupDir $OutputFile
}

Write-Host "==> Starting database backup..."
Write-Host "    Container : $ContainerName"
Write-Host "    Database  : $Database"
Write-Host "    User      : $User"
Write-Host "    Output    : $OutputFile"

try {
    # Test if container is running
    $containerStatus = (docker inspect -f '{{.State.Running}}' $ContainerName 2>$null)
    if ($containerStatus -ne "true") {
        throw "Docker container '$ContainerName' is not running."
    }

    # Execute pg_dump inside container and write to file
    & docker exec $ContainerName pg_dump -U $User -d $Database --clean --if-exists | Out-File -FilePath $OutputFile -Encoding utf8
    $dumpExitCode = $LASTEXITCODE
    if ($dumpExitCode -ne 0) {
        throw "pg_dump failed with exit code $dumpExitCode."
    }

    if (-not (Test-Path $OutputFile)) {
        throw "Backup file was not created."
    }

    $fileInfo = Get-Item $OutputFile
    if ($fileInfo.Length -eq 0) {
        Remove-Item $OutputFile -Force
        throw "Backup file is empty (0 bytes). Check database connection or permissions."
    }

    $sizeKb = [Math]::Round($fileInfo.Length / 1KB, 2)
    Write-Host "==> Backup completed successfully!" -ForegroundColor Green
    Write-Host "    File size: $sizeKb KB" -ForegroundColor Green
    Write-Host "    Path     : $OutputFile" -ForegroundColor Green

    return $OutputFile
}
catch {
    Write-Error "Database backup failed: $_"
    # A failed pg_dump may leave a non-empty but incomplete file. Never keep it.
    if (Test-Path $OutputFile) {
        Remove-Item $OutputFile -Force -ErrorAction SilentlyContinue
    }
    exit 1
}
