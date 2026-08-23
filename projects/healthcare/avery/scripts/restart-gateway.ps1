<#
.SYNOPSIS
    Memulai ulang gateway Hermes untuk satu profil, dengan dry-run sebagai default.

.DESCRIPTION
    Padanan PowerShell dari restart-gateway.bat dan jalur kanonik sejak 2026-08-23.
    Tanpa -Execute, skrip hanya MELAPORKAN apa yang akan dilakukan: path Python
    bundled yang dipilih, launcher yang akan dipakai, dan proses bridge yatim
    yang akan dihentikan. Tidak ada proses yang disentuh.

    Alasan skrip ini ada: proses anak whatsapp-bridge bisa bertahan setelah
    gateway berhenti, memegang port 3000 dan direktori sesi. Gateway berikutnya
    menempel ke bridge basi itu, sehingga perubahan konfigurasi tidak pernah
    berlaku. Lihat komentar di restart-gateway.bat untuk riwayat lengkapnya.

.PARAMETER Profile
    Nama profil Hermes. Default: avery.

.PARAMETER Execute
    Benar-benar hentikan, bersihkan bridge yatim, dan mulai ulang gateway.
    Tanpa flag ini: dry-run.

.EXAMPLE
    pwsh -NoProfile -File scripts/restart-gateway.ps1
    pwsh -NoProfile -File scripts/restart-gateway.ps1 -Execute
#>
[CmdletBinding()]
param(
    [string] $Profile = 'avery',
    [switch] $Execute
)

$ErrorActionPreference = 'Stop'
$mode = if ($Execute) { 'EKSEKUSI' } else { 'DRY-RUN' }
Write-Host "Mode: $mode (profil: $Profile)" -ForegroundColor Cyan

# --- Pemeriksaan path, fail-closed -------------------------------------------
$hermesRoot = Join-Path $env:USERPROFILE '.hermes-web-ui\desktop-runtime\hermes'
if (-not (Test-Path -LiteralPath $hermesRoot)) {
    Write-Host "[ERROR] Runtime Hermes tidak ditemukan: $hermesRoot" -ForegroundColor Red
    exit 127
}

$pyexe = $null; $pyver = $null
Get-ChildItem -LiteralPath $hermesRoot -Directory | Sort-Object Name | ForEach-Object {
    $cand = Join-Path $_.FullName 'win-x64\python\venv\Scripts\python.exe'
    if (Test-Path -LiteralPath $cand) { $pyexe = $cand; $pyver = $_.Name }
}
if (-not $pyexe) {
    Write-Host "[ERROR] Python bundled tidak ditemukan di $hermesRoot" -ForegroundColor Red
    exit 127
}
Write-Host "Runtime : $pyver"

$profileHome = Join-Path $env:USERPROFILE ".hermes\profiles\$Profile"
if (-not (Test-Path -LiteralPath (Join-Path $profileHome 'config.yaml'))) {
    Write-Host "[ERROR] Profil tidak ditemukan: $profileHome" -ForegroundColor Red
    exit 2
}

$launcher    = Join-Path $profileHome "gateway-service\Hermes_Gateway_$Profile.vbs"
$viaLauncher = Test-Path -LiteralPath $launcher
if ($viaLauncher) { Write-Host "Start   : login-item launcher $launcher" }
else              { Write-Host "Start   : gateway run --replace (detached)" }

# Bridge yatim: hanya node.exe yang menjalankan bridge.js, agar tidak pernah
# mengenai PowerShell yang sedang memeriksa.
function Get-OrphanBridge {
    # Koma depan memaksa hasil tetap array meski nol atau satu elemen (PS 5.1).
    , @(Get-CimInstance Win32_Process | Where-Object {
        $_.Name -eq 'node.exe' -and $_.CommandLine -like '*whatsapp-bridge*bridge.js*'
    })
}
$orphans = Get-OrphanBridge
Write-Host ("Bridge  : {0} proses whatsapp-bridge terdeteksi" -f $orphans.Count)

if (-not $Execute) {
    Write-Host ''
    Write-Host 'Dry-run selesai. Tidak ada proses yang disentuh. Tambahkan -Execute untuk menjalankan.' -ForegroundColor Yellow
    exit 0
}

# --- Eksekusi ----------------------------------------------------------------
Write-Host ''; Write-Host '=== [1/4] Menghentikan gateway ==='
& $pyexe -m hermes_cli.main --profile $Profile gateway stop
Start-Sleep -Seconds 3

Write-Host ''; Write-Host '=== [2/4] Membersihkan bridge yatim ==='
$orphans = Get-OrphanBridge
if ($orphans.Count -eq 0) { Write-Host '  tidak ada bridge yatim' }
foreach ($p in $orphans) {
    Write-Host ("  menghentikan PID {0}" -f $p.ProcessId)
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host ''; Write-Host '=== [3/4] Memulai gateway ==='
if ($viaLauncher) {
    wscript.exe $launcher
} else {
    $env:HERMES_HOME = $profileHome
    Start-Process -FilePath $pyexe -ArgumentList @('-m', 'hermes_cli.main', '--profile', $Profile, 'gateway', 'run', '--replace') -WindowStyle Hidden
}

Write-Host ''; Write-Host '=== [4/4] Menunggu bridge terhubung ==='
$ok = $false
foreach ($i in 1..40) {
    try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 3 -ErrorAction Stop } catch { $r = $null }
    if ($r -and $r.status -eq 'connected') { Write-Host ("  bridge terhubung setelah {0}s" -f $i); $ok = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ok) {
    Write-Host '  bridge TIDAK mencapai status connected - periksa logs/gateway.log' -ForegroundColor Red
    exit 1
}

& $pyexe -m hermes_cli.main --profile $Profile gateway status
exit 0
