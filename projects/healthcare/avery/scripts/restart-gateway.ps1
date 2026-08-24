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

.PARAMETER EvidenceOut
    Path opsional untuk menulis blok "Effective config" (6 baris, UTF-8 tanpa BOM)
    sebagai bukti verifikasi, selain dicetak ke konsol.

.PARAMETER ProfileHomeOverride
    HANYA untuk pengujian: mem-override lokasi profileHome (folder yang memuat
    config.yaml) alih-alih $env:USERPROFILE\.hermes\profiles\<Profile>. Jangan
    dipakai pada operasi produksi normal.

.EXAMPLE
    pwsh -NoProfile -File scripts/restart-gateway.ps1
    pwsh -NoProfile -File scripts/restart-gateway.ps1 -Execute
    pwsh -NoProfile -File scripts/restart-gateway.ps1 -EvidenceOut C:\temp\effective-config.txt
#>
[CmdletBinding()]
param(
    [string] $Profile = 'avery',
    [switch] $Execute,
    [string] $EvidenceOut,
    [string] $ProfileHomeOverride
)

$ErrorActionPreference = 'Stop'
$mode = if ($Execute) { 'EKSEKUSI' } else { 'DRY-RUN' }
Write-Host "Mode: $mode (profil: $Profile)" -ForegroundColor Cyan

# --- [Pra-cek] Pencegahan Deviasi: Verifikasi Junction & Sinkronisasi Profil --
Write-Host ''
Write-Host '=== [Pra-cek 1] Integritas junction runtime ==='
$verifyJunctionsScript = Join-Path $PSScriptRoot 'verify-runtime-junctions.ps1'
if (Test-Path -LiteralPath $verifyJunctionsScript) {
    if ($Execute) {
        & $verifyJunctionsScript -Fix
    } else {
        & $verifyJunctionsScript
    }
}

Write-Host ''
Write-Host '=== [Pra-cek 2] Sinkronisasi profil repo -> runtime ==='
$pushProfileScript = Join-Path $PSScriptRoot 'push-profile-to-runtime.ps1'
if (Test-Path -LiteralPath $pushProfileScript) {
    if ($Execute) {
        & $pushProfileScript -Execute
    } else {
        & $pushProfileScript
    }
}

Write-Host ''
Write-Host '=== [Pra-cek 3] Housekeeping sesi & batasan token ==='
$housekeepingScript = Join-Path $PSScriptRoot 'session-housekeeping.ps1'
if (Test-Path -LiteralPath $housekeepingScript) {
    if ($Execute) {
        & $housekeepingScript -Profile $Profile -Execute
    } else {
        & $housekeepingScript -Profile $Profile
    }
}

# --- Pra-cek config fail-closed -----------------------------------------------
# Berjalan pada mode DRY-RUN maupun EKSEKUSI, sebelum proses apa pun disentuh.
# Tidak pernah mencetak nilai JID - hanya nomor baris dan jenis pelanggaran.
function Test-ConfigFailClosed {
    param([Parameter(Mandatory)] [string] $ConfigPath)

    if (-not (Test-Path -LiteralPath $ConfigPath)) {
        Write-Host "[ERROR] Berkas config tidak ditemukan untuk pra-cek: $ConfigPath" -ForegroundColor Red
        exit 2
    }

    $lines = Get-Content -LiteralPath $ConfigPath
    $violations = New-Object System.Collections.Generic.List[string]
    $lineNo = 0
    foreach ($line in $lines) {
        $lineNo++
        if ($line -match '(?i)placeholder|changeme|xxxx|<jid>|<id>') {
            $violations.Add("baris ${lineNo}: token placeholder terdeteksi")
        }
        foreach ($m in [regex]::Matches($line, '\S+@g\.us')) {
            $tok = $m.Value.Trim('"', "'")
            if ($tok -notmatch '^\d{10,20}@g\.us$') {
                $violations.Add("baris ${lineNo}: JID grup (@g.us) tidak valid")
            }
        }
        foreach ($m in [regex]::Matches($line, '\S+@(lid|s\.whatsapp\.net)')) {
            $tok = $m.Value.Trim('"', "'")
            if ($tok -notmatch '^\d{8,20}@(lid|s\.whatsapp\.net)$') {
                $violations.Add("baris ${lineNo}: JID personal (@lid/@s.whatsapp.net) tidak valid")
            }
        }
    }

    if ($violations.Count -gt 0) {
        Write-Host '[ERROR] Pra-cek config gagal (fail-closed). Pelanggaran:' -ForegroundColor Red
        foreach ($v in $violations) { Write-Host "  - $v" -ForegroundColor Red }
        exit 2
    }
    Write-Host 'Pra-cek config: lulus (tidak ada placeholder/JID tidak valid)' -ForegroundColor Green
}

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
# Direktori yang memuat paket hermes_cli (induk dari venv), untuk Push-Location
# saat memanggil `config get` / `tools --summary`.
$pythonDir = Split-Path (Split-Path (Split-Path $pyexe -Parent) -Parent) -Parent

$profileHome = if ($ProfileHomeOverride) { $ProfileHomeOverride } else { Join-Path $env:USERPROFILE ".hermes\profiles\$Profile" }
if (-not (Test-Path -LiteralPath (Join-Path $profileHome 'config.yaml'))) {
    Write-Host "[ERROR] Profil tidak ditemukan: $profileHome" -ForegroundColor Red
    exit 2
}

Test-ConfigFailClosed -ConfigPath (Join-Path $profileHome 'config.yaml')

$launcher    = Join-Path $profileHome "gateway-service\Hermes_Gateway_$Profile.vbs"
$viaLauncher = Test-Path -LiteralPath $launcher
if ($viaLauncher) { Write-Host "Start   : login-item launcher $launcher" }
else              { Write-Host "Start   : gateway run --replace (detached)" }

. (Join-Path $PSScriptRoot 'lib\common.ps1')
$orphans = Get-OrphanBridge
Write-Host ("Bridge  : {0} proses whatsapp-bridge terdeteksi" -f $orphans.Count)

# --- Effective config: dibaca via hermes_cli, tidak pernah menyertakan JID ---
function Get-CliValue {
    param([Parameter(Mandatory)] [string] $Key)
    try {
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        $out = & $pyexe -m hermes_cli.main --profile $Profile config get $Key 2>$null
        # Bukti verifikasi harus jujur: kegagalan CLI ditandai eksplisit,
        # tidak boleh tampak sebagai nilai kosong yang sah.
        if ($LASTEXITCODE -ne 0) { return "[CLI-GAGAL:$Key]" }
        $lastLine = $out | Where-Object { $_ -and ($_.ToString().Trim() -ne '') } | Select-Object -Last 1
        if ($null -eq $lastLine) { '' } else { $lastLine.ToString().Trim() }
    } catch {
        "[CLI-GAGAL:$Key]"
    } finally {
        $ErrorActionPreference = $prevEAP
    }
}

function Get-CliToolsetSummary {
    try {
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        $out = & $pyexe -m hermes_cli.main --profile $Profile tools --summary 2>$null
        if ($LASTEXITCODE -ne 0) { return '[CLI-GAGAL:tools]' }
        $lines = $out | Where-Object { $_ -match 'cli|whatsapp' }
        $sanitized = $lines | ForEach-Object { ($_.ToString() -replace '\S*@\S+', '<ID>').Trim() }
        $sanitized -join '; '
    } catch {
        '[CLI-GAGAL:tools]'
    } finally {
        $ErrorActionPreference = $prevEAP
    }
}

function Get-EffectiveConfigBlock {
    Push-Location -LiteralPath $pythonDir
    try {
        $provider = Get-CliValue -Key 'model.provider'
        $model = Get-CliValue -Key 'model.default'
        $toolset = Get-CliToolsetSummary
        $configVersion = Get-CliValue -Key '_config_version'
    } finally {
        Pop-Location
    }
    $configSource = (Resolve-Path -LiteralPath (Join-Path $profileHome 'config.yaml')).Path
    @(
        "profile=$Profile"
        "provider=$provider"
        "model=$model"
        "toolset=$toolset"
        "config_source=$configSource"
        "config_version=$configVersion"
    ) -join "`n"
}

function Write-EffectiveConfigBlock {
    $block = Get-EffectiveConfigBlock
    Write-Host ''
    Write-Host '=== Effective config ==='
    Write-Host $block
    if ($EvidenceOut) {
        $enc = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($EvidenceOut, $block, $enc)
    }
}

if (-not $Execute) {
    Write-EffectiveConfigBlock
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
    $null = ([wmiclass]'win32_process').Create("wscript.exe `"$launcher`"")
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

Write-EffectiveConfigBlock
exit 0
