# OTA build + upload script for Firebase Storage
param(
  [string]$Bucket = "farma-61e96.appspot.com",
  [string]$Folder = "ota",
  [string]$Version = "",
  [string]$MinAppVersion = "",
  [string]$MaxAppVersion = "",
  [int]$OtaVersion = 0,
  [string]$Notes = ""
)

$ErrorActionPreference = "Stop"

$Folder = ([string]$Folder).Trim()
$Bucket = ([string]$Bucket).Trim()
if ([string]::IsNullOrWhiteSpace($Folder)) { $Folder = "ota" }
if ([string]::IsNullOrWhiteSpace($Bucket)) { $Bucket = "farma-61e96.appspot.com" }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")
$packagePath = Join-Path $root "package.json"
if ([string]::IsNullOrWhiteSpace($Version) -and (Test-Path $packagePath)) {
  try {
    $pkg = Get-Content $packagePath -Raw | ConvertFrom-Json
    if ($pkg.version) {
      $Version = [string]$pkg.version
    }
  } catch {
    # ignore
  }
}
if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = "1.0.0"
}
$MinAppVersion = ([string]$MinAppVersion).Trim()
$MaxAppVersion = ([string]$MaxAppVersion).Trim()
if ([string]::IsNullOrWhiteSpace($MinAppVersion)) { $MinAppVersion = $Version }
if ([string]::IsNullOrWhiteSpace($MaxAppVersion)) { $MaxAppVersion = $Version }

if ([string]::IsNullOrWhiteSpace($Notes)) {
  $Notes = Read-Host "Notas del hotfix"
}
if ($OtaVersion -le 0) {
  $OtaVersion = [int](Read-Host "OtaVersion (numero)")
  if (-not $OtaVersion) { $OtaVersion = 1 }
}
if ([string]::IsNullOrWhiteSpace($MinAppVersion) -or $MinAppVersion -eq $Version) {
  $inputMin = Read-Host "Min App Version (enter = package.json)"
  if (-not [string]::IsNullOrWhiteSpace($inputMin)) { $MinAppVersion = $inputMin.Trim() }
}
if ([string]::IsNullOrWhiteSpace($MaxAppVersion) -or $MaxAppVersion -eq $Version) {
  $inputMax = Read-Host "Max App Version (enter = package.json)"
  if (-not [string]::IsNullOrWhiteSpace($inputMax)) { $MaxAppVersion = $inputMax.Trim() }
}
$otaDir = Join-Path $root "ota"
$buildDir = Join-Path $root ("ota_build_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Path $buildDir | Out-Null

Write-Host "Generating bundle..."
& npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output "$buildDir\index.android.bundle" --assets-dest "$buildDir" | Out-Host

Write-Host "Zipping..."
$zipFileName = "update_ota_$Version`_ota$OtaVersion.zip"
$zipPath = Join-Path $buildDir $zipFileName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$buildDir\index.android.bundle", "$buildDir\drawable*" -DestinationPath $zipPath

$safeFolder = $Folder
if ([string]::IsNullOrWhiteSpace($safeFolder)) { $safeFolder = "ota" }
$zipUrl = "https://firebasestorage.googleapis.com/v0/b/$Bucket/o/$safeFolder%2Fupdate_ota_$Version`_ota$OtaVersion.zip?alt=media"
$manifestUrl = "https://firebasestorage.googleapis.com/v0/b/$Bucket/o/$safeFolder%2Fmanifest.json?alt=media"

$manifest = @{
  otaVersion = $OtaVersion
  url = $zipUrl
  hotfix = $true
  minAppVersion = $MinAppVersion
  maxAppVersion = $MaxAppVersion
  targetMajor = [int]$Version.Split('.')[0]
  targetMinor = [int]$Version.Split('.')[1]
  notes = $Notes
}
$manifestPath = Join-Path $buildDir "manifest.json"
$manifestJson = $manifest | ConvertTo-Json -Depth 5
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, $utf8NoBom)

function Upload-StorageFile {
  param(
    [string]$LocalPath,
    [string]$RemotePath
  )
  $gcloudCmd = Get-Command gcloud -ErrorAction SilentlyContinue
  if (-not $gcloudCmd) {
    try {
      $gcloudPath = (& where.exe gcloud 2>$null | Select-Object -First 1)
      if ($gcloudPath) { $gcloudCmd = $gcloudPath }
    } catch {
      # ignore
    }
  }
  if (-not $gcloudCmd) {
    $gcloudDefault = @(
      "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
      "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.ps1",
      "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
      "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.ps1"
    )
    foreach ($path in $gcloudDefault) {
      if ($path -and (Test-Path $path)) { $gcloudCmd = $path; break }
    }
  }
  if ($gcloudCmd) {
    & $gcloudCmd storage cp "$LocalPath" "$RemotePath" | Out-Host
    if ($LASTEXITCODE -eq 0) { return $true }
    Write-Host "gcloud failed, trying gsutil..."
  }

  $gsutilCmd = Get-Command gsutil -ErrorAction SilentlyContinue
  if (-not $gsutilCmd) {
    try {
      $gsutilPath = (& where.exe gsutil 2>$null | Select-Object -First 1)
      if ($gsutilPath) { $gsutilCmd = $gsutilPath }
    } catch {
      # ignore
    }
  }
  if (-not $gsutilCmd) {
    $gsutilDefault = @(
      "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd",
      "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.ps1",
      "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd",
      "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.ps1"
    )
    foreach ($path in $gsutilDefault) {
      if ($path -and (Test-Path $path)) { $gsutilCmd = $path; break }
    }
  }
  if ($gsutilCmd) {
    & $gsutilCmd cp "$LocalPath" "$RemotePath" | Out-Host
    if ($LASTEXITCODE -eq 0) { return $true }
    Write-Host "gsutil failed."
    return $false
  }
  Write-Host "No gsutil or gcloud found. Upload manually to: $RemotePath"
  return $false
}

Write-Host "Uploading to Firebase Storage..."
$zipRemote = "gs://$Bucket/$Folder/android_hotfix_$OtaVersion.zip"
$manifestRemote = "gs://$Bucket/$Folder/manifest.json"
$zipRemote = "gs://$Bucket/$Folder/update_ota_$Version`_ota$OtaVersion.zip"
Upload-StorageFile -LocalPath "$zipPath" -RemotePath "$zipRemote" | Out-Host
Upload-StorageFile -LocalPath "$manifestPath" -RemotePath "$manifestRemote" | Out-Host

try {
  if (Test-Path $otaDir) {
    Get-ChildItem -Path $otaDir -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
  } else {
    New-Item -ItemType Directory -Path $otaDir | Out-Null
  }
  Copy-Item -Path $zipPath -Destination (Join-Path $otaDir $zipFileName) -Force
  Copy-Item -Path $manifestPath -Destination (Join-Path $otaDir "manifest.json") -Force
} catch {
  Write-Host "Warning: could not copy artifacts to $otaDir (maybe locked)."
}

Write-Host "Done!"
Write-Host "Manifest URL: $manifestUrl"
Write-Host "Zip URL: $zipUrl"
