param(
    [Parameter(Mandatory = $true)]
    [string]$PromptFile,
    [ValidateRange(10, 600)]
    [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
$cli = Get-Command agy -ErrorAction SilentlyContinue
$executable = if ($cli) { $cli.Source } else {
    Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe'
}
if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
    throw 'Antigravity CLI is missing. Install from https://antigravity.google/cli/install.ps1 first.'
}
$promptPath = (Resolve-Path -LiteralPath $PromptFile).Path
$prompt = Get-Content -LiteralPath $promptPath -Raw -Encoding UTF8
if ([string]::IsNullOrWhiteSpace($prompt)) { throw 'Prompt file is empty.' }

# Plan mode requests read-only review; never bypass tool approval checks.
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    $output = & $executable --mode plan --output-format json --print-timeout "$($TimeoutSeconds)s" --print $prompt
    $resultCode = $LASTEXITCODE
    $output | Write-Output
    if ($resultCode -eq 0) {
        try {
            $result = ($output -join "`n") | ConvertFrom-Json
            if ($result.status -ne 'SUCCESS' -or $result.denied_actions.Count -gt 0 -or
                [string]::IsNullOrWhiteSpace($result.response)) {
                Write-Warning 'Antigravity did not complete the review; inspect status and denied_actions.'
                $resultCode = 2
            }
        } catch {
            Write-Warning 'Antigravity returned invalid JSON.'
            $resultCode = 2
        }
    }
} finally {
    Pop-Location
}
exit $resultCode
