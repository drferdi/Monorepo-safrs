<#
.SYNOPSIS
    Pembersihan otomatis sesi percakapan bengkak, batasan ambang batas token (40.000 tokens),
    penghapusan debug dump sampah, dan optimasi database Hermes (state.db).

.DESCRIPTION
    Menjaga agar sesi WhatsApp DM/Grup tetap ringan, cepat, dan tajam dengan merotasi sesi
    yang melampaui batas token (default: 40.000 token) atau idle > 24 jam.
    Memori kanonis Sentra (MEMORY.md, USER.md) dan data skills tetap 100% aman dan tidak tersentuh.

.PARAMETER Profile
    Nama profil Hermes (default: "avery").

.PARAMETER TokenThreshold
    Batas maksimal token sebelum sesi di-reset secara otomatis (default: 40000).

.PARAMETER MaxAgeHours
    Batas maksimal umur idle sesi dalam jam sebelum dirotasi (default: 24).

.PARAMETER Execute
    Jika dispesifikasikan, lakukan pembersihan aktif. Default adalah simulasi (dry-run).

.EXAMPLE
    .\scripts\session-housekeeping.ps1
    .\scripts\session-housekeeping.ps1 -Execute
    .\scripts\session-housekeeping.ps1 -TokenThreshold 30000 -Execute
#>

[CmdletBinding()]
param(
    [string]$Profile = "avery",
    [int]$TokenThreshold = 40000,
    [int]$MaxAgeHours = 24,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$helperPy  = Join-Path $scriptDir "lib\housekeeping.py"

if (-not (Test-Path $helperPy)) {
    Write-Error "Helper Python tidak ditemukan: $helperPy"
    exit 1
}

# Temukan python executable
$pythonExe = "python"
# Resolusi versi-tertinggi (pola yang sama dengan restart-gateway.ps1): jangan
# hardcode versi runtime agar skrip tidak mati senyap setelah `hermes update`.
$hermesRoot = Join-Path $env:USERPROFILE ".hermes-web-ui\desktop-runtime\hermes"
if (Test-Path -LiteralPath $hermesRoot) {
    $pyexe = $null
    Get-ChildItem -LiteralPath $hermesRoot -Directory | Sort-Object Name | ForEach-Object {
        $cand = Join-Path $_.FullName 'win-x64\python\venv\Scripts\python.exe'
        if (Test-Path -LiteralPath $cand) { $pyexe = $cand }
    }
    if ($pyexe) { $pythonExe = $pyexe }
}

$pyArgs = @(
    "`"$helperPy`"",
    "--profile", "`"$Profile`"",
    "--token-threshold", $TokenThreshold,
    "--max-age-hours", $MaxAgeHours
)

if ($Execute) {
    $pyArgs += "--execute"
}

$cmd = "& `"$pythonExe`" $($pyArgs -join ' ')"
Invoke-Expression $cmd
exit $LASTEXITCODE
