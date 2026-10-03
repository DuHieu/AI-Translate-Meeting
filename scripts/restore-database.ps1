[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z_][A-Za-z0-9_]*$')]
    [string]$TargetDatabase,

    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_.-]*$')]
    [string]$ContainerName = "ai_translate_postgres",

    [string]$User = $env:POSTGRES_USER,

    [bool]$CreateIfMissing = $true,

    [switch]$AllowExistingTarget
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($User)) {
    $User = "postgres"
}
if ($User -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "User must be a valid PostgreSQL identifier."
}

if (-not $TargetDatabase.EndsWith("_restore_test", [System.StringComparison]::OrdinalIgnoreCase) -and -not $AllowExistingTarget) {
    throw "Refusing to restore into '$TargetDatabase'. Use an isolated database ending in '_restore_test', or pass -AllowExistingTarget for an intentional restore."
}

if (-not (Test-Path $BackupFile)) {
    throw "Backup file '$BackupFile' does not exist."
}

$fileInfo = Get-Item $BackupFile
if ($fileInfo.Length -eq 0) {
    throw "Backup file '$BackupFile' is empty (0 bytes)."
}

Write-Host "==> Starting database restore..."
Write-Host "    Backup File    : $BackupFile"
Write-Host "    Target Database: $TargetDatabase"
Write-Host "    Container      : $ContainerName"
Write-Host "    User           : $User"

try {
    # Check container running
    $containerStatus = (docker inspect -f '{{.State.Running}}' $ContainerName 2>$null)
    if ($containerStatus -ne "true") {
        throw "Docker container '$ContainerName' is not running."
    }

    # If CreateIfMissing, check if target database exists; if not, create it
    if ($CreateIfMissing) {
        $dbCheck = (docker exec $ContainerName psql -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$TargetDatabase'" 2>$null)
        $dbCheckExitCode = $LASTEXITCODE
        if ($dbCheckExitCode -ne 0) {
            throw "Failed to check target database (exit code $dbCheckExitCode)."
        }
        if ([string]::IsNullOrWhiteSpace($dbCheck) -or $dbCheck.Trim() -ne "1") {
            Write-Host "==> Target database '$TargetDatabase' does not exist. Creating..."
            docker exec $ContainerName createdb -U $User $TargetDatabase
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to create target database '$TargetDatabase'."
            }
        }
    }

    Write-Host "==> Restoring dump into '$TargetDatabase'..."
    # Pipe backup file into psql inside container
    Get-Content -Path $BackupFile -Raw | docker exec -i $ContainerName psql -U $User -d $TargetDatabase --quiet
    $restoreExitCode = $LASTEXITCODE
    if ($restoreExitCode -ne 0) {
        throw "psql restore failed with exit code $restoreExitCode."
    }

    # Verify tables exist in target database
    $rawCount = (docker exec $ContainerName psql -U $User -d $TargetDatabase -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
    $verificationExitCode = $LASTEXITCODE
    if ($verificationExitCode -ne 0) {
        throw "Restore verification query failed with exit code $verificationExitCode."
    }
    $tableCount = if ([string]::IsNullOrWhiteSpace($rawCount)) { 0 } else { [int]$rawCount.Trim() }
    if ($tableCount -lt 1) {
        throw "Restore verification failed: no public tables were found in '$TargetDatabase'."
    }

    Write-Host "==> Restore completed successfully!" -ForegroundColor Green
    Write-Host "    Target Database: $TargetDatabase" -ForegroundColor Green
    Write-Host "    Tables restored: $tableCount" -ForegroundColor Green

    return $tableCount
}
catch {
    Write-Error "Database restore failed: $_"
    exit 1
}
