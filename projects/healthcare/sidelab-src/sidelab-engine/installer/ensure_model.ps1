# Designed and constructed by codieverse+.
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot,
    [string]$ModelName = "medgemma:4b"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$cmd = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $cmd) {
    throw "ollama command tidak tersedia saat memastikan model."
}

$listOutput = & $cmd.Source list | Out-String
if ($listOutput -notmatch [regex]::Escape($ModelName)) {
    Write-Host "Downloading $ModelName ..." -ForegroundColor Yellow
    & $cmd.Source pull $ModelName
}

Write-Host "$ModelName ready." -ForegroundColor Green
