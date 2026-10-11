# Creates android/upload-keystore.jks for Play upload signing.
# Requires JDK keytool on PATH.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$AndroidDir = Join-Path $Root "android"
$KeystorePath = Join-Path $AndroidDir "upload-keystore.jks"
$PropsPath = Join-Path $AndroidDir "key.properties"

if (Test-Path $KeystorePath) {
    Write-Error "Keystore already exists: $KeystorePath"
}

$Alias = if ($env:LAYAMEET_KEY_ALIAS) { $env:LAYAMEET_KEY_ALIAS } else { "layameet" }
$StorePass = $env:LAYAMEET_STORE_PASSWORD
$KeyPass = $env:LAYAMEET_KEY_PASSWORD

if (-not $StorePass) {
    $secure = Read-Host "Store password" -AsSecureString
    $StorePass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}
if (-not $KeyPass) {
    $KeyPass = $StorePass
}

Write-Host "Generating upload keystore at $KeystorePath ..."
& keytool -genkeypair -v `
    -keystore $KeystorePath `
    -storetype JKS `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -alias $Alias `
    -storepass $StorePass `
    -keypass $KeyPass `
    -dname "CN=Laya Meet, OU=Mobile, O=Laya Meet, L=Unknown, ST=Unknown, C=US"

@"
storePassword=$StorePass
keyPassword=$KeyPass
keyAlias=$Alias
storeFile=upload-keystore.jks
"@ | Set-Content -Path $PropsPath -Encoding UTF8

Write-Host "Wrote $PropsPath (gitignored)."
Write-Host "Back up upload-keystore.jks + passwords in a secure vault. Losing them blocks Play updates."
