<#
.SYNOPSIS
    Melaporkan grup WhatsApp yang sudah dikenal sesi tetapi belum terdaftar di config.yaml.

.DESCRIPTION
    Grup yang tidak terdaftar dibuang di gerbang intake tanpa satu baris log pun.
    Gejalanya: agen diam total di grup itu, dan tidak ada apa pun yang bisa dilihat
    di gateway.log. Skrip ini menutup titik buta tersebut.

    Sumber kebenaran "grup yang dikenal" adalah berkas sender-key di direktori sesi
    Baileys — berkas itu lahir begitu bridge menerima pesan grup pertama, jadi ia
    tahu grup yang tidak diketahui config.

    Kenapa tidak memakai `group_policy: open` saja: sejak Hermes 0.20.4 gateway
    menolak start bila dm_policy atau group_policy bernilai `open` tanpa
    WHATSAPP_ALLOW_ALL_USERS. Mengaktifkan flag itu membuat _is_user_authorized
    mengembalikan True untuk siapa pun, di grup maupun DM. Allowlist plus skrip ini
    mempertahankan pengaman tanpa titik buta.

.PARAMETER Profile
    Nama profil Hermes. Default: avery.

.PARAMETER BridgeUrl
    Alamat bridge WhatsApp untuk mengambil nama grup. Default: http://127.0.0.1:3000
    Nama hanya bisa diambil bila gateway sedang berjalan; tanpa itu skrip tetap
    melaporkan JID-nya.

.EXAMPLE
    pwsh -File scripts/check-unregistered-groups.ps1
#>
[CmdletBinding()]
param(
    [string] $Profile = 'avery',
    [string] $BridgeUrl = 'http://127.0.0.1:3000'
)

$ErrorActionPreference = 'Stop'

# HERMES_HOME bisa menunjuk akar `.hermes` atau langsung ke direktori profil.
# Coba kedua bentuk, lalu default ke lokasi profil di bawah home pengguna.
$candidates = @()
if ($env:HERMES_HOME) {
    $candidates += $env:HERMES_HOME
    $candidates += (Join-Path $env:HERMES_HOME "profiles\$Profile")
}
$candidates += (Join-Path $env:USERPROFILE ".hermes\profiles\$Profile")
$candidates += (Join-Path $env:USERPROFILE '.hermes')

$hermesHome = $candidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'platforms\whatsapp\session') } | Select-Object -First 1
if (-not $hermesHome) {
    throw ("Direktori sesi WhatsApp tidak ditemukan. Dicoba:`n  " + ($candidates -join "`n  "))
}

$configPath = Join-Path $hermesHome 'config.yaml'
$sessionDir = Join-Path $hermesHome 'platforms\whatsapp\session'
if (-not (Test-Path -LiteralPath $configPath)) { throw "config.yaml tidak ditemukan: $configPath" }
Write-Host "Profil: $hermesHome" -ForegroundColor DarkGray

# Grup yang dikenal sesi.
$known = Get-ChildItem -LiteralPath $sessionDir -Filter 'sender-key-*@g.us*' -File -ErrorAction SilentlyContinue |
    ForEach-Object { if ($_.Name -match '(\d+@g\.us)') { $Matches[1] } } |
    Sort-Object -Unique

if (-not $known) { Write-Host 'Belum ada grup yang dikenal sesi.' -ForegroundColor Yellow; return }

# Grup yang terdaftar. Dibaca sebagai teks: JID cukup khas sehingga tidak perlu
# parser YAML, dan menghindari ketergantungan modul di mesin bersih.
$configText = Get-Content -LiteralPath $configPath -Raw

$rows = foreach ($jid in $known) {
    $name = '(gateway tidak berjalan)'
    try {
        $r = Invoke-RestMethod -Uri "$BridgeUrl/chat/$jid" -TimeoutSec 8 -ErrorAction Stop
        if ($r.name) { $name = $r.name }
    } catch { }

    [pscustomobject]@{
        Nama            = $name
        JID             = $jid
        Terdaftar       = $configText.Contains($jid)
        BebasSebutNama  = ($configText -split 'free_response_chats:')[1] -match [regex]::Escape($jid)
    }
}

$rows | Sort-Object Terdaftar, Nama | Format-Table -AutoSize

$belum = @($rows | Where-Object { -not $_.Terdaftar })
if ($belum.Count -eq 0) {
    Write-Host 'Semua grup yang dikenal sesi sudah terdaftar.' -ForegroundColor Green
    return
}

Write-Host ''
Write-Host "$($belum.Count) grup belum terdaftar — agen diam total di sana." -ForegroundColor Red
Write-Host 'Tambahkan JID berikut ke KETIGA daftar di config.yaml:'
Write-Host '  whatsapp.group_allow_from                         (gerbang intake)'
Write-Host '  gateway.platforms.whatsapp.extra.group_allowed_chats  (otorisasi anggota)'
Write-Host '  gateway.platforms.whatsapp.extra.free_response_chats  (opsional: tanpa sebut nama)'
Write-Host ''
foreach ($b in $belum) { Write-Host ('  - "{0}"   # {1}' -f $b.JID, $b.Nama) }
Write-Host ''
Write-Host 'Lalu jalankan scripts/restart-gateway.bat.'

exit 1
