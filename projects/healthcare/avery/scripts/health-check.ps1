<#
.SYNOPSIS
    Memeriksa kesehatan runtime Avery dan mengeluarkan JSON tersanitasi.

.DESCRIPTION
    Hanya membaca: keberadaan direktori profil, config.yaml, status bridge di
    port 3000 (endpoint /health), dan usia gateway.log. Tidak pernah membaca
    .env, creds.json, sesi WhatsApp, atau basis data; tidak pernah mencetak
    nomor telepon, JID, maupun kunci.

    Kode keluar:
      0  sehat      - profil ada dan bridge melapor 'connected'
      1  degradasi  - profil ada, bridge tidak terhubung atau log basi
      2  gagal      - profil atau config.yaml tidak ditemukan

.PARAMETER Profile
    Nama profil Hermes. Default: avery.

.PARAMETER BridgeUrl
    Alamat bridge WhatsApp. Default: http://127.0.0.1:3000

.PARAMETER LogStaleMinutes
    Batas usia gateway.log sebelum dianggap basi. Default: 60.

.EXAMPLE
    pwsh -NoProfile -File scripts/health-check.ps1
#>
[CmdletBinding()]
param(
    [string] $Profile = 'avery',
    [string] $BridgeUrl = 'http://127.0.0.1:3000',
    [int]    $LogStaleMinutes = 60
)

$ErrorActionPreference = 'Stop'

# Resolusi profil: HERMES_HOME bisa akar .hermes atau langsung direktori profil.
# Bentuk profil dicoba lebih dulu; akar .hermes juga punya config.yaml sendiri
# sehingga kalau didahulukan akan salah pilih.
$candidates = @()
if ($env:HERMES_HOME) {
    $candidates += (Join-Path $env:HERMES_HOME "profiles\$Profile")
    $candidates += $env:HERMES_HOME
}
$candidates += (Join-Path $env:USERPROFILE ".hermes\profiles\$Profile")
$profileHome = $candidates | Where-Object {
    (Test-Path -LiteralPath (Join-Path $_ 'config.yaml')) -and (Split-Path $_ -Leaf) -eq $Profile
} | Select-Object -First 1

$report = [ordered]@{
    profile       = $Profile
    checked_at    = (Get-Date).ToUniversalTime().ToString('o')
    profile_found = [bool] $profileHome
    config_found  = $false
    bridge_status = 'unknown'
    log_age_min   = $null
    ingress_60m   = $null
    status        = 'fail'
    exit_code     = 2
}

if (-not $profileHome) {
    $report | ConvertTo-Json -Compress | Write-Output
    exit 2
}
$report.config_found = $true

try {
    $r = Invoke-RestMethod -Uri "$BridgeUrl/health" -TimeoutSec 3 -ErrorAction Stop
    $report.bridge_status = if ($r.status) { [string] $r.status } else { 'no-status' }
} catch {
    $report.bridge_status = 'unreachable'
}

$log = Join-Path $profileHome 'logs\gateway.log'
if (Test-Path -LiteralPath $log) {
    $age = (Get-Date) - (Get-Item -LiteralPath $log).LastWriteTime
    $report.log_age_min = [math]::Round($age.TotalMinutes, 1)

    # Ringkasan reason code ingress WhatsApp 60 menit terakhir (patch FIX-02).
    # Hanya menghitung kode; chat id di log sudah diredaksi dan tidak disalin.
    $since = (Get-Date).AddMinutes(-60)
    $counts = [ordered]@{}
    foreach ($line in (Get-Content -LiteralPath $log -Tail 4000)) {
        if ($line -notmatch '^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ .* ingress (drop|accept) reason=([A-Z_]+)') { continue }
        try { $ts = [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd HH:mm:ss', $null) } catch { continue }
        if ($ts -lt $since) { continue }
        $code = $Matches[3]
        if ($counts.Contains($code)) { $counts[$code] = $counts[$code] + 1 } else { $counts[$code] = 1 }
    }
    $report.ingress_60m = $counts
}

$healthy = ($report.bridge_status -eq 'connected') -and
           ($null -ne $report.log_age_min) -and ($report.log_age_min -le $LogStaleMinutes)
if ($healthy) { $report.status = 'ok'; $report.exit_code = 0 }
else          { $report.status = 'degraded'; $report.exit_code = 1 }

$report | ConvertTo-Json -Compress | Write-Output
exit $report.exit_code
