<#
  Script dong goi chuyen nghiep LayaMeet Desktop (Windows NSIS Setup .exe + OTA Auto-Update Manifest).
  Chuc nang:
  1. Dong bo phien ban (neu truyen -Version, VD: .\scripts\build-desktop.ps1 -Version "1.8.0")
  2. Build Web Frontend (apps/web -> dist)
  3. Build bo cai Windows NSIS Setup (.exe) tao Desktop Shortcut, Start Menu, Uninstaller
  4. Ky so (Code Signing) cho ca file .exe va bo cai Setup.exe (neu co chung chi)
  5. Xuat bo cai vao apps/web/public/downloads/LayaMeet-Desktop-Setup-v<Version>.exe
  6. Tu dong sinh file apps/web/public/downloads/latest.json va cap nhat desktopRelease.ts
#>
param(
  [string]$Version = "",
  [string]$ReleaseNotes = "Cập nhật hiệu năng, giao diện ERP IT Workspace và các module dịch thuật AI."
)
$ErrorActionPreference = 'Stop'

function Write-Utf8NoBom([string]$Path, [string]$Text) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
}

$root = (Resolve-Path "$PSScriptRoot\..").Path
$webDir = "$root\apps\web"
$tauriDir = "$root\apps\desktop\src-tauri"
$tauriConfPath = "$tauriDir\tauri.conf.json"
$cargoTomlPath = "$tauriDir\Cargo.toml"
$webPkgPath = "$webDir\package.json"
$signScript = "$PSScriptRoot\sign-file.ps1"

# 1. Read or bump version (UTF-8 without BOM)
$tauriConfRaw = [System.IO.File]::ReadAllText($tauriConfPath)
$tauriConf = $tauriConfRaw | ConvertFrom-Json
if ($Version -and $Version.Trim() -ne "") {
  $cleanVer = $Version.Trim().TrimStart('v')
  $tauriConfRaw = $tauriConfRaw -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$cleanVer`""
  Write-Utf8NoBom $tauriConfPath $tauriConfRaw

  $cargoContent = [System.IO.File]::ReadAllText($cargoTomlPath)
  $cargoContent = $cargoContent -replace '(?m)^version\s*=\s*".*"', "version = `"$cleanVer`""
  Write-Utf8NoBom $cargoTomlPath $cargoContent

  $webPkgRaw = [System.IO.File]::ReadAllText($webPkgPath)
  $webPkgRaw = $webPkgRaw -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$cleanVer`""
  Write-Utf8NoBom $webPkgPath $webPkgRaw
  Write-Host "[1/5] Da cap nhat version sang v$cleanVer" -ForegroundColor Cyan
} else {
  $cleanVer = $tauriConf.version
  Write-Host "[1/5] Dang dong goi phien ban hien tai: v$cleanVer" -ForegroundColor Cyan
}

# 2. Build Frontend (apps/web)
Write-Host "[2/5] Dang build giao dien Frontend (apps/web)..." -ForegroundColor Cyan
Push-Location $webDir
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build apps/web that bai" }
} finally {
  Pop-Location
}

# 3. Build Tauri NSIS Setup Installer
Write-Host "[3/5] Dang dong goi bo cai Windows NSIS Setup (.exe)..." -ForegroundColor Cyan
Push-Location $tauriDir
try {
  npx --yes "@tauri-apps/cli@2" build --bundles nsis
  if ($LASTEXITCODE -ne 0) { throw "Tauri NSIS build that bai" }
} finally {
  Pop-Location
}

$relDir = "$tauriDir\target\release"
$nsisBundle = Get-ChildItem "$relDir\bundle\nsis\*-setup.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $nsisBundle) {
  throw "Khong tim thay file *-setup.exe trong $relDir\bundle\nsis"
}

# 4. Code Signing (if certificate env vars are present)
$makensis = "$env:LOCALAPPDATA\tauri\NSIS\makensis.exe"
$nsisWorkDir = "$relDir\nsis\x64"
if ((Test-Path "$relDir\layameet-desktop.exe") -and (Test-Path $makensis) -and (Test-Path "$nsisWorkDir\installer.nsi")) {
  Write-Host "[4/5] Dang ky so (Code Signing) cho ung dung va bo cai..." -ForegroundColor Cyan
  & $signScript "$relDir\layameet-desktop.exe"
  $nsisOut = "$nsisWorkDir\nsis-output.exe"
  Remove-Item $nsisOut -ErrorAction SilentlyContinue
  & $makensis "$nsisWorkDir\installer.nsi"
  if ($LASTEXITCODE -eq 0 -and (Test-Path $nsisOut)) {
    Copy-Item $nsisOut $nsisBundle.FullName -Force
  }
  & $signScript $nsisBundle.FullName
}

# 5. Publish to apps/web/public/downloads & Generate OTA latest.json
$downloadsDir = "$webDir\public\downloads"
New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null

$targetFileName = "LayaMeet-Desktop-Setup-v$cleanVer.exe"
$targetFilePath = Join-Path $downloadsDir $targetFileName
Copy-Item $nsisBundle.FullName $targetFilePath -Force

$hashObj = Get-FileHash $targetFilePath -Algorithm SHA256
$sha256 = $hashObj.Hash
$sizeBytes = (Get-Item $targetFilePath).Length
$sizeMb = [Math]::Max(1, [Math]::Round($sizeBytes / 1MB))
$sizeLabel = "$sizeMb MB"
$pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# Write latest.json for OTA Auto-Updater
$latestManifest = [ordered]@{
  version     = $cleanVer
  pubDate     = $pubDate
  platform    = "Windows 10/11 · 64-bit"
  fileName    = $targetFileName
  downloadUrl = "/downloads/$targetFileName"
  sizeLabel   = $sizeLabel
  sha256      = $sha256
  notes       = $ReleaseNotes
}
$latestJsonPath = Join-Path $downloadsDir "latest.json"
Write-Utf8NoBom $latestJsonPath ($latestManifest | ConvertTo-Json -Depth 5)

# Update apps/web/src/config/desktopRelease.ts
$desktopReleaseTsPath = "$webDir\src\config\desktopRelease.ts"
$tsContent = @"
/** Single source of truth for the Windows desktop installer shown on the website. */
export const DESKTOP_RELEASE = {
  version: '$cleanVer',
  sizeLabel: '$sizeLabel',
  platform: 'Windows 10/11 · 64-bit',
  fileName: '$targetFileName',
  downloadUrl: '/downloads/$targetFileName',
  latestManifestUrl: '/downloads/latest.json',
  certificateUrl: '/downloads/LayaMeet-Certificate.cer',
  publisher: 'LayaMeet AI Technologies',
  sha256: '$sha256',
} as const;
"@
Write-Utf8NoBom $desktopReleaseTsPath $tsContent

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Green
Write-Host " DONG GOI THANH CONG BO CAI WINDOWS & OTA AUTO-UPDATE!" -ForegroundColor Green
Write-Host " - Phien ban      : v$cleanVer"
Write-Host " - File bo cai    : apps/web/public/downloads/$targetFileName ($sizeLabel)"
Write-Host " - Manifest OTA   : apps/web/public/downloads/latest.json"
Write-Host " - SHA-256        : $sha256"
Write-Host "=============================================================" -ForegroundColor Green
