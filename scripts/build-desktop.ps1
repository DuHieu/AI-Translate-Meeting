<#
  Build + ky so installer LayaMeet Desktop day du.
  Tauri patch exe SAU khi ky nen lam mat chu ky cua layameet-desktop.exe; script nay ky lai exe
  sau khi patch roi dong goi lai installer bang makensis va ky installer.

  Can bien moi truong chung chi (xem sign-file.ps1): LAYAMEET_CERT_THUMBPRINT hoac LAYAMEET_CERT_PFX.
  Dung: .\scripts\build-desktop.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot\.."
$tauri = "$root\apps\desktop\src-tauri"
$rel = "$tauri\target\release"
$sign = "$PSScriptRoot\sign-file.ps1"

Push-Location $tauri
try { npx --yes "@tauri-apps/cli@2" build --bundles nsis; if ($LASTEXITCODE) { throw 'tauri build that bai' } }
finally { Pop-Location }

& $sign "$rel\layameet-desktop.exe"
$nsisDir = "$rel\nsis\x64"
$out = "$nsisDir\nsis-output.exe"
Remove-Item $out -ErrorAction SilentlyContinue
$makensis = "$env:LOCALAPPDATA\tauri\NSIS\makensis.exe"
& $makensis "$nsisDir\installer.nsi"
if ($LASTEXITCODE) { throw 'makensis that bai' }

$final = Get-ChildItem "$rel\bundle\nsis\*-setup.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item $out $final.FullName -Force
& $sign $final.FullName
Get-FileHash $final.FullName -Algorithm SHA256 | ForEach-Object { "$($final.Name)  SHA-256: $($_.Hash)" }
