# Designed and constructed by codieverse+.
param(
    [switch]$SkipWheelhouse,
    [switch]$SkipCompile,
    [string]$PythonEmbedZipPath,
    [string]$GetPipPath,
    [string]$OllamaInstallerPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Resolve-Iscc {
    $cmd = Get-Command ISCC -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
        "${env:LOCALAPPDATA}\Programs\Inno Setup 6\ISCC.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Assert-FileExists([string]$Path, [string]$Hint) {
    if (-not (Test-Path $Path)) {
        throw "$Hint`nMissing: $Path"
    }
}

$InstallerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $InstallerDir "..")
$AssetsDir = Join-Path $InstallerDir "assets"
$StagingDir = Join-Path $InstallerDir "_staging"
$StagingAppDir = Join-Path $StagingDir "app"
$StagingBootstrapDir = Join-Path $StagingDir "bootstrap"
$LogsDir = Join-Path $InstallerDir "_logs"
$DistDir = Join-Path $Root "dist"
$WheelhouseDir = Join-Path $InstallerDir "wheelhouse"
$PythonEmbedDir = Join-Path $InstallerDir "python-embed"
$VendorDir = Join-Path $InstallerDir "vendor"
$IssPath = Join-Path $InstallerDir "sidelab.iss"

if (-not $PythonEmbedZipPath) {
    $PythonEmbedZipPath = Join-Path $PythonEmbedDir "python-embed.zip"
}
if (-not $GetPipPath) {
    $GetPipPath = Join-Path $PythonEmbedDir "get-pip.py"
}
if (-not $OllamaInstallerPath) {
    $OllamaInstallerPath = Join-Path $VendorDir "OllamaSetup.exe"
}

New-Item -ItemType Directory -Force -Path $LogsDir, $StagingAppDir, $StagingBootstrapDir, $DistDir | Out-Null

Assert-FileExists (Join-Path $AssetsDir "codieverse.png") "Branding image wajib ada sebelum build installer."
Assert-FileExists (Join-Path $AssetsDir "sidelab.ico") "Icon .ico wajib ada untuk installer dan shortcut desktop."
Assert-FileExists $PythonEmbedZipPath "Python embedded zip belum disiapkan."
Assert-FileExists $GetPipPath "get-pip.py belum disiapkan untuk bootstrap pip di runtime embedded."
Assert-FileExists $IssPath "File Inno Setup script tidak ditemukan."

Write-Step "Preparing staging payload"
if (Test-Path $StagingDir) {
    Remove-Item -Recurse -Force $StagingDir
}
New-Item -ItemType Directory -Force -Path $StagingAppDir, $StagingBootstrapDir | Out-Null

$rootFiles = @(
    "SIDELAB.bat",
    "run.bat",
    "install.bat",
    "diagnose-sidelab.bat",
    "sidelab_tui.py",
    "sidelab.py",
    "pyproject.toml",
    "requirements.txt",
    ".env.example",
    "README-INSTALL.md"
)
$rootDirs = @(
    "sidelab",
    "data",
    "sounds"
)

foreach ($file in $rootFiles) {
    Copy-Item -Force (Join-Path $Root $file) (Join-Path $StagingAppDir $file)
}
foreach ($dir in $rootDirs) {
    Copy-Item -Recurse -Force (Join-Path $Root $dir) (Join-Path $StagingAppDir $dir)
}

Get-ChildItem -Path $StagingAppDir -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $StagingAppDir -Recurse -File -Include "*.pyc","*.pyo" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

$buildManifest = [ordered]@{
    built_at = (Get-Date).ToString("s")
    app_name = "SIDELAB"
    default_backend = "deepseek"
    default_model = "deepseek-v4-flash"
    includes_sound = Test-Path (Join-Path $StagingAppDir "sounds\notif.mp3")
}
$buildManifest | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $StagingAppDir "build-manifest.json")

if (-not $SkipWheelhouse) {
    Write-Step "Refreshing wheelhouse"
    New-Item -ItemType Directory -Force -Path $WheelhouseDir | Out-Null
    py -3 -m pip download -r (Join-Path $Root "requirements.txt") -d $WheelhouseDir
}

$stagedOllamaInstaller = Join-Path $StagingBootstrapDir "OllamaSetup.staged.exe"
if (Test-Path $OllamaInstallerPath) {
    Copy-Item -Force $OllamaInstallerPath $stagedOllamaInstaller
    $OllamaInstallerPath = $stagedOllamaInstaller
}

if ($SkipCompile) {
    Write-Step "Skipping Inno Setup compile as requested"
    exit 0
}

$iscc = Resolve-Iscc
if (-not $iscc) {
    throw "ISCC.exe tidak ditemukan. Install Inno Setup 6 terlebih dahulu untuk membangun SIDELAB-SETUP.exe."
}

Write-Step "Compiling SIDELAB-SETUP.exe"
& $iscc `
    "/DAppSource=$StagingAppDir" `
    "/DPythonEmbedZip=$PythonEmbedZipPath" `
    "/DGetPipPy=$GetPipPath" `
    "/DOllamaInstaller=$OllamaInstallerPath" `
    $IssPath

if ($LASTEXITCODE -ne 0) {
    throw "ISCC compile failed with exit code $LASTEXITCODE."
}

Write-Step "Done"
Write-Host "Output expected in: $DistDir" -ForegroundColor Green
