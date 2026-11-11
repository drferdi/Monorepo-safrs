# Designed and constructed by codieverse+.
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-OllamaExe {
    $cmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
        "$env:ProgramFiles\Ollama\ollama.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Wait-OllamaApi([int]$TimeoutSeconds = 45) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/version" -TimeoutSec 5 | Out-Null
            return $true
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

$InstallRoot = (Resolve-Path $InstallRoot).Path
$BundledInstaller = Join-Path $InstallRoot "bootstrap\vendor\OllamaSetup.exe"
$ollamaExe = Get-OllamaExe

if (-not $ollamaExe) {
    if (Test-Path $BundledInstaller) {
        Write-Host "Installing Ollama..." -ForegroundColor Yellow
        Start-Process -FilePath $BundledInstaller -Wait
        $ollamaExe = Get-OllamaExe
    }
}

if (-not $ollamaExe) {
    throw "Ollama tidak ditemukan. Letakkan OllamaSetup.exe di installer/vendor atau install Ollama secara manual."
}

if (-not (Wait-OllamaApi -TimeoutSeconds 5)) {
    Start-Process -FilePath $ollamaExe | Out-Null
}

if (-not (Wait-OllamaApi -TimeoutSeconds 60)) {
    throw "Service Ollama belum merespons di http://127.0.0.1:11434. Periksa aplikasi Ollama dan ulangi setup."
}

Write-Host "Ollama ready." -ForegroundColor Green
