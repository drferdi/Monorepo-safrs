<#
.SYNOPSIS
    Mengganti nama capsule di monorepo tanpa memutus runtime Hermes.

.DESCRIPTION
    Mengganti nama folder capsule tidak bisa dilakukan dengan `git mv` saja.
    Runtime Hermes berada fisik di dalam capsule (`runtime/`), dan lima lokasi
    di luar repositori menunjuk ke sana lewat directory junction. Bila folder
    di-rename lebih dulu, kelima junction putus dan agen mati.

    Urutan yang benar, dan yang dijalankan skrip ini:

      1. Hentikan Hermes sampai port 3000 dan 8748 bebas.
      2. Lepas junction yang menunjuk ke capsule — isi runtime tidak tersentuh.
      3. `git mv` folder, sehingga riwayat git terjaga.
      4. Pasang ulang junction ke path baru.
      5. Perbarui penyebutan nama lama di berkas repositori.
      6. Nyalakan gateway dan verifikasi.

    Setiap langkah diperiksa. Bila satu gagal, skrip berhenti sebelum merusak
    langkah berikutnya.

.PARAMETER OldName
    Nama folder capsule sekarang, contoh: medisync

.PARAMETER NewName
    Nama folder capsule yang dituju, contoh: avery

.PARAMETER Domain
    Domain di bawah `projects/`. Default: healthcare

.PARAMETER Profile
    Nama profil Hermes untuk verifikasi akhir. Default: avery

.PARAMETER WhatIf
    Tampilkan rencana tanpa mengubah apa pun.

.EXAMPLE
    .\rename-capsule.ps1 -OldName medisync -NewName avery
    .\rename-capsule.ps1 -OldName medisync -NewName avery -WhatIf
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $OldName,
    [Parameter(Mandatory = $true)] [string] $NewName,
    [string] $Domain  = 'healthcare',
    [string] $Profile = 'avery',
    [switch] $WhatIf
)

$ErrorActionPreference = 'Stop'

function Tulis($t, $c = 'Gray') { Write-Host $t -ForegroundColor $c }
function Langkah($n, $judul) { Tulis ""; Tulis "=== [$n/6] $judul ===" Cyan }
function Berhenti($pesan) { Tulis ""; Tulis "GAGAL: $pesan" Red; Tulis "Tidak ada langkah berikutnya yang dijalankan." Red; exit 1 }

# --- resolusi path -----------------------------------------------------------
$repoRoot = (git -C $PSScriptRoot rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { Berhenti "Tidak berada di dalam repositori git." }
$repoRoot = $repoRoot.Trim() -replace '/', '\'

$oldPath = Join-Path $repoRoot "projects\$Domain\$OldName"
$newPath = Join-Path $repoRoot "projects\$Domain\$NewName"

Tulis ""
Tulis "==========================================================" Cyan
Tulis "  Ganti nama capsule" Cyan
Tulis "==========================================================" Cyan
Tulis "  dari : projects\$Domain\$OldName" White
Tulis "  ke   : projects\$Domain\$NewName" White
if ($WhatIf) { Tulis "  MODE : WhatIf — tidak ada yang diubah" Yellow }
Tulis ""

if (-not (Test-Path -LiteralPath $oldPath)) { Berhenti "Capsule asal tidak ditemukan: $oldPath" }
if (Test-Path -LiteralPath $newPath)        { Berhenti "Nama tujuan sudah dipakai: $newPath" }

$kotor = git -C $repoRoot status --porcelain
if ($kotor -and -not $WhatIf) {
    Tulis "Working tree tidak bersih:" Yellow
    $kotor | Select-Object -First 8 | ForEach-Object { Tulis "   $_" DarkGray }
    Tulis ""
    Tulis "Rename menyentuh banyak berkas sekaligus. Commit atau stash dulu agar" Yellow
    Tulis "hasilnya mudah ditinjau dan mudah dibatalkan." Yellow
    $tetap = Read-Host "Lanjutkan tetap? (ketik LANJUT)"
    if ($tetap -ne 'LANJUT') { Tulis "Dibatalkan." Yellow; exit 0 }
}

# --- kandidat junction -------------------------------------------------------
# Sumber tunggal: scripts/runtime-links.json via common.ps1. Hanya sisi Link
# yang dipakai; Target diambil dari junction nyata di bawah ini.
. (Join-Path $PSScriptRoot 'lib\common.ps1')
$kandidat = @(Get-AveryRuntimeLinks -RuntimeRoot (Join-Path $oldPath 'runtime') | ForEach-Object { $_.Link })

$junction = @()
foreach ($p in $kandidat) {
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $i = Get-Item -LiteralPath $p -Force
    if ($i.LinkType -ne 'Junction') { continue }
    $target = @($i.Target)[0]
    if ($target -like "$oldPath*") {
        $junction += [pscustomobject]@{ Link = $p; Target = $target; TargetBaru = $target.Replace($oldPath, $newPath) }
    }
}

Tulis "Junction yang menunjuk ke capsule ini: $($junction.Count)" White
$junction | ForEach-Object { Tulis ("   {0}" -f (Split-Path $_.Link -Leaf)) DarkGray }

if ($WhatIf) {
    Tulis ""
    Tulis "Berkas yang memuat '$OldName':" White
    git -C $repoRoot grep -l -- $OldName 2>$null | Where-Object { $_ -notlike "*runtime/*" } | ForEach-Object { Tulis "   $_" DarkGray }
    Tulis ""
    Tulis "WhatIf selesai. Tidak ada yang diubah." Yellow
    exit 0
}

Tulis ""
$ya = Read-Host "Jalankan? Agen akan mati selama proses. (ketik YA)"
if ($ya -ne 'YA') { Tulis "Dibatalkan." Yellow; exit 0 }

# --- 1. hentikan Hermes ------------------------------------------------------
Langkah 1 "Hentikan Hermes"

Get-Process -Name "Hermes Studio" -ErrorAction SilentlyContinue | ForEach-Object { $null = $_.CloseMainWindow() }
Start-Sleep -Seconds 4
Get-Process -Name "Hermes Studio" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process |
    Where-Object { ($_.CommandLine -match 'hermes-web-ui.desktop-runtime|whatsapp-bridge|hermes_bridge') -and $_.Name -notmatch 'powershell|bash|conhost' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 4

foreach ($port in 3000, 8748) {
    $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($c) { Berhenti "Port $port masih dipakai pid $($c.OwningProcess). Tutup dulu, jangan lanjut." }
    Tulis "  port $port bebas" Green
}

# --- 2. lepas junction -------------------------------------------------------
Langkah 2 "Lepas junction"
if ($junction.Count -eq 0) { Tulis "  tidak ada junction ke capsule ini" DarkGray }
foreach ($j in $junction) {
    [IO.Directory]::Delete($j.Link)
    Tulis ("  dilepas: {0}" -f (Split-Path $j.Link -Leaf)) Green
}

# --- 3. git mv ---------------------------------------------------------------
Langkah 3 "Ganti nama folder"
git -C $repoRoot mv "projects/$Domain/$OldName" "projects/$Domain/$NewName"
if ($LASTEXITCODE -ne 0) {
    Tulis "  git mv gagal — memasang ulang junction ke path lama" Yellow
    foreach ($j in $junction) { $null = New-Item -ItemType Junction -Path $j.Link -Target $j.Target -ErrorAction SilentlyContinue }
    Berhenti "git mv gagal. Junction dipulihkan ke path lama."
}
if (-not (Test-Path -LiteralPath $newPath)) { Berhenti "Folder tujuan tidak muncul setelah git mv." }
Tulis "  folder pindah, riwayat git terjaga" Green

# --- 4. pasang ulang junction ------------------------------------------------
Langkah 4 "Pasang ulang junction ke path baru"
foreach ($j in $junction) {
    if (-not (Test-Path -LiteralPath $j.TargetBaru)) { Berhenti "Target baru tidak ada: $($j.TargetBaru)" }
    $null = New-Item -ItemType Junction -Path $j.Link -Target $j.TargetBaru
    $i = Get-Item -LiteralPath $j.Link -Force
    if ($i.LinkType -ne 'Junction') { Berhenti "Gagal membuat junction: $($j.Link)" }
    Tulis ("  {0,-24} -> {1}" -f (Split-Path $j.Link -Leaf), (@($i.Target)[0])) Green
}

# --- 5. perbarui referensi ---------------------------------------------------
Langkah 5 "Perbarui penyebutan '$OldName' di repositori"

$berkas = git -C $repoRoot grep -l -- $OldName 2>$null | Where-Object { $_ -notlike "*runtime/*" }
$totalGanti = 0
foreach ($rel in $berkas) {
    $abs = Join-Path $repoRoot ($rel -replace '/', '\')
    if (-not (Test-Path -LiteralPath $abs)) { continue }
    $isi = Get-Content -LiteralPath $abs -Raw
    $n = ([regex]::Matches($isi, [regex]::Escape($OldName))).Count
    if ($n -eq 0) { continue }
    $baru = $isi -replace "\b$([regex]::Escape($OldName))\b", $NewName
    Set-Content -LiteralPath $abs -Value $baru -Encoding utf8 -NoNewline
    Tulis ("  {0}: {1} penyebutan" -f $rel, $n) Green
    $totalGanti += $n
}
Tulis "  total: $totalGanti penyebutan diganti" White

# JSON yang tersentuh harus tetap sah.
foreach ($rel in ($berkas | Where-Object { $_ -like "*.json" })) {
    $abs = Join-Path $repoRoot ($rel -replace '/', '\')
    try { $null = Get-Content -LiteralPath $abs -Raw | ConvertFrom-Json; Tulis "  JSON sah: $rel" DarkGray }
    catch { Berhenti "JSON rusak setelah penggantian: $rel" }
}

# --- 6. nyalakan dan verifikasi ---------------------------------------------
Langkah 6 "Nyalakan dan verifikasi"

$restart = Join-Path $newPath "scripts\restart-gateway.bat"
if (Test-Path -LiteralPath $restart) {
    cmd /c "`"$restart`"" | Out-Null
} else {
    Tulis "  restart-gateway.bat tidak ada — nyalakan manual" Yellow
}

$sehat = $false
foreach ($i in 1..40) {
    try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 3 -ErrorAction Stop } catch { $r = $null }
    if ($r -and $r.status -eq 'connected') { Tulis "  bridge connected setelah ${i}s" Green; $sehat = $true; break }
    Start-Sleep -Seconds 1
}

$sisa = git -C $repoRoot grep -l -- $OldName 2>$null | Where-Object { $_ -notlike "*runtime/*" }
if ($sisa) { Tulis "  MASIH ADA penyebutan '$OldName':" Yellow; $sisa | ForEach-Object { Tulis "     $_" Yellow } }
else { Tulis "  nol penyebutan '$OldName' tersisa" Green }

Tulis ""
if (-not $sehat) {
    Tulis "Bridge belum connected. Periksa runtime/hermes-home/profiles/$Profile/logs/gateway.log" Red
    exit 1
}

Tulis "==========================================================" Green
Tulis "  Selesai. Capsule kini bernama '$NewName'." Green
Tulis "==========================================================" Green
Tulis ""
Tulis "Yang perlu diingat:" Yellow
Tulis "  - Prefix subtree berubah. Push berikutnya memakai" DarkGray
Tulis "    --prefix=projects/$Domain/$NewName" DarkGray
Tulis "  - Perubahan belum di-commit. Periksa `git status` lalu commit." DarkGray
Tulis "  - Kirim satu pesan WhatsApp untuk membuktikan agen benar-benar hidup;" DarkGray
Tulis "    bridge connected bukan bukti balasan sampai." DarkGray
Tulis ""
