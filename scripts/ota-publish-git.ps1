# OTA build + publish script for public Git repo (Git-based hot update)
param(
  [string]$Repo = "https://github.com/crazedev04/farmadolores.git",
  [string]$Branch = "main",
  [string]$BundlePath = "ota/android/main.jsbundle",
  [string]$AssetsPath = "ota/android",
  [string]$TempDir = "",
  [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")

if ([string]::IsNullOrWhiteSpace($TempDir)) {
  $TempDir = Join-Path $env:TEMP "farmadolores_ota_public"
}

Write-Host "Using temp repo: $TempDir"

if (-not (Test-Path (Join-Path $TempDir ".git"))) {
  if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
  Write-Host "Cloning public repo..."
  git clone --branch $Branch $Repo $TempDir | Out-Host
} else {
  Write-Host "Updating public repo..."
  git -C $TempDir fetch origin | Out-Host
  git -C $TempDir checkout $Branch | Out-Host
  git -C $TempDir reset --hard ("origin/" + $Branch) | Out-Host
  git -C $TempDir clean -fd | Out-Host
}

$bundleOutput = Join-Path $TempDir $BundlePath
$assetsOutput = Join-Path $TempDir $AssetsPath
$bundleDir = Split-Path $bundleOutput
if (Test-Path $bundleDir) {
  Get-ChildItem -Path $bundleDir -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
} else {
  New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null
}
New-Item -ItemType Directory -Path $assetsOutput -Force | Out-Null

Write-Host "Generating bundle..."
& npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output "$bundleOutput" --assets-dest "$assetsOutput" | Out-Host

Write-Host "Staging changes..."
git -C $TempDir add (Split-Path $BundlePath) | Out-Host
git -C $TempDir add -f $BundlePath | Out-Host

$changes = git -C $TempDir status --porcelain
if (-not $changes) {
  Write-Host "No changes to push."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
  $CommitMessage = "ota(android): update " + (Get-Date -Format "yyyy-MM-dd HH:mm")
}

$userEmail = git -C $TempDir config user.email
if ([string]::IsNullOrWhiteSpace($userEmail)) {
  git -C $TempDir config user.email "ota-bot@local"
}
$userName = git -C $TempDir config user.name
if ([string]::IsNullOrWhiteSpace($userName)) {
  git -C $TempDir config user.name "OTA Bot"
}

git -C $TempDir commit -m "$CommitMessage" | Out-Host
git -C $TempDir push origin $Branch | Out-Host

Write-Host "Done! Published to $Repo ($Branch)"
