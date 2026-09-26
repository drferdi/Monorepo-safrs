# Designed and constructed by codieverse+.
param(
    [switch]$SkipPythonEmbed,
    [switch]$SkipGetPip,
    [switch]$SkipOllama
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$Path) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Download-File([string]$Url, [string]$Destination) {
    if (Test-Path $Destination) {
        Write-Host "Already present: $Destination" -ForegroundColor DarkGray
        return
    }
    Write-Host "Downloading $Url" -ForegroundColor Cyan
    Invoke-WebRequest -Uri $Url -OutFile $Destination
}

$InstallerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonEmbedDir = Join-Path $InstallerDir "python-embed"
$VendorDir = Join-Path $InstallerDir "vendor"

Ensure-Dir $PythonEmbedDir
Ensure-Dir $VendorDir

$pythonEmbedUrl = "https://www.python.org/ftp/python/3.14.4/python-3.14.4-embed-amd64.zip"
$getPipUrl = "https://bootstrap.pypa.io/pip/get-pip.py"
$ollamaInstallerUrl = "https://ollama.com/download/OllamaSetup.exe"

if (-not $SkipPythonEmbed) {
    Download-File -Url $pythonEmbedUrl -Destination (Join-Path $PythonEmbedDir "python-embed.zip")
}

if (-not $SkipGetPip) {
    Download-File -Url $getPipUrl -Destination (Join-Path $PythonEmbedDir "get-pip.py")
}

if (-not $SkipOllama) {
    Download-File -Url $ollamaInstallerUrl -Destination (Join-Path $VendorDir "OllamaSetup.exe")
}

Write-Host "Runtime asset fetch complete." -ForegroundColor Green
