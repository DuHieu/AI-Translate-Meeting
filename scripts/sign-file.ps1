<#
  Duoc Tauri goi tu dong khi build (bundle.windows.signCommand) de ky tung file (exe + installer).
  Doc chung chi tu LAYAMEET_CERT_PFX/LAYAMEET_CERT_PASSWORD hoac LAYAMEET_CERT_THUMBPRINT.
  Neu khong co bien nao thi bo qua (build van thanh cong, file khong duoc ky).
#>
param([Parameter(Mandatory)][string]$File)
$ErrorActionPreference = 'Stop'

$signtool = (Get-Command signtool.exe -ErrorAction SilentlyContinue).Source
if (-not $signtool) {
  $signtool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}

$cert = @()
if ($env:LAYAMEET_CERT_PFX) { $cert = @('/f', $env:LAYAMEET_CERT_PFX, '/p', $env:LAYAMEET_CERT_PASSWORD) }
elseif ($env:LAYAMEET_CERT_THUMBPRINT) { $cert = @('/sha1', $env:LAYAMEET_CERT_THUMBPRINT) }

if (-not $signtool -or $cert.Count -eq 0) {
  Write-Warning "Bo qua ky so cho $File (thieu signtool hoac bien chung chi)."
  exit 0
}

& $signtool sign /fd SHA256 /tr 'http://timestamp.digicert.com' /td SHA256 /d 'LayaMeet Desktop' @cert $File
exit $LASTEXITCODE
