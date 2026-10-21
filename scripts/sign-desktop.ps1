<#
  Ky so installer LayaMeet Desktop (NSIS) bang signtool.

  Cung cap chung chi qua bien moi truong (KHONG commit .pfx / mat khau):
    $env:LAYAMEET_CERT_PFX       duong dan file .pfx
    $env:LAYAMEET_CERT_PASSWORD  mat khau .pfx
  hoac dung chung chi da cai trong Windows store:
    $env:LAYAMEET_CERT_THUMBPRINT

  Dung:  .\scripts\sign-desktop.ps1 [-Installer <path>]
  Luu y: chung chi tu ky chi la tam thoi; de het canh bao SmartScreen can chung chi OV/EV
  tu CA hop le (DigiCert, Sectigo, SSL.com, Azure Trusted Signing...).
#>
param(
  [string]$Installer = (Get-ChildItem "$PSScriptRoot\..\apps\desktop\src-tauri\target\release\bundle\nsis\*-setup.exe" |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName,
  [string]$TimestampUrl = 'http://timestamp.digicert.com'
)
$ErrorActionPreference = 'Stop'

if (-not $Installer -or -not (Test-Path $Installer)) { throw "Khong tim thay installer: $Installer" }

$signtool = (Get-Command signtool.exe -ErrorAction SilentlyContinue).Source
if (-not $signtool) {
  $signtool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $signtool) { throw 'Khong tim thay signtool.exe (cai Windows SDK).' }

$args = @('sign', '/fd', 'SHA256', '/tr', $TimestampUrl, '/td', 'SHA256', '/d', 'LayaMeet Desktop')
if ($env:LAYAMEET_CERT_PFX) {
  $args += @('/f', $env:LAYAMEET_CERT_PFX, '/p', $env:LAYAMEET_CERT_PASSWORD)
} elseif ($env:LAYAMEET_CERT_THUMBPRINT) {
  $args += @('/sha1', $env:LAYAMEET_CERT_THUMBPRINT)
} else {
  throw 'Dat LAYAMEET_CERT_PFX (+ LAYAMEET_CERT_PASSWORD) hoac LAYAMEET_CERT_THUMBPRINT.'
}

& $signtool @args $Installer
if ($LASTEXITCODE -ne 0) { throw "signtool that bai ($LASTEXITCODE)" }
& $signtool verify /pa /v $Installer | Select-String 'Successfully|Issued to|SHA256'
Get-FileHash $Installer -Algorithm SHA256 | ForEach-Object { "SHA-256: $($_.Hash)" }
