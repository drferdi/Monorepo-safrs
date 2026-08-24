<#
.SYNOPSIS
    Memulihkan tata letak runtime native Hermes (junction ke runtime/) secara fail-closed.

.DESCRIPTION
    Pelengkap verify-runtime-junctions.ps1. Skrip itu memperbaiki junction satu
    per satu; skrip ini memeriksa SELURUH prasyarat lebih dulu dan menolak
    bertindak bila satu saja tidak terpenuhi:

      1. runtime/ ada dan memuat lima subdirektori target.
      2. Tidak ada proses Hermes Studio / gateway / bridge yang berjalan.
      3. Setiap lokasi link yang bukan junction memuat berkas (bukan kosong),
         supaya tidak ada data yang hilang saat dipindahkan.

    Tanpa -Execute skrip hanya melaporkan rencana. Direktori nyata hasil
    installer tidak pernah dihapus: disimpan sebagai <nama>.pre-junction-<stempel>.

.PARAMETER Execute
    Lakukan pemulihan. Tanpa flag ini: dry-run.

.PARAMETER Stamp
    Akhiran direktori cadangan. Default: yyyyMMdd-HHmmss.

.EXAMPLE
    pwsh -NoProfile -File scripts/restore-native-runtime-layout.ps1
    pwsh -NoProfile -File scripts/restore-native-runtime-layout.ps1 -Execute
#>
[CmdletBinding()]
param(
    [switch] $Execute,
    [string] $Stamp = (Get-Date -Format 'yyyyMMdd-HHmmss')
)

$ErrorActionPreference = 'Stop'
$mode = if ($Execute) { 'EKSEKUSI' } else { 'DRY-RUN' }
Write-Host "Mode: $mode" -ForegroundColor Cyan

$runtimeRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'runtime'
. (Join-Path $PSScriptRoot 'lib\common.ps1')
$links = Get-AveryRuntimeLinks -RuntimeRoot $runtimeRoot

# --- Prasyarat, semua harus lolos ---------------------------------------------
$blockers = @()
if (-not (Test-Path -LiteralPath $runtimeRoot)) { $blockers += "runtime/ tidak ditemukan: $runtimeRoot" }
foreach ($l in $links) {
    if (-not (Test-Path -LiteralPath $l.Target)) { $blockers += "target tidak ada: $($l.Target)" }
}
$busy = Get-HermesBusyProcess
if ($busy.Count -gt 0) { $blockers += "$($busy.Count) proses Hermes masih berjalan" }

$plan = @()
foreach ($l in $links) {
    if (-not (Test-Path -LiteralPath $l.Link)) {
        $plan += @{ Aksi = 'BUAT-JUNCTION'; Link = $l.Link; Target = $l.Target }
        continue
    }
    $item = Get-Item -LiteralPath $l.Link -Force
    if ($item.LinkType -eq 'Junction') {
        if ((@($item.Target)[0]) -eq $l.Target) { $plan += @{ Aksi = 'OK'; Link = $l.Link; Target = $l.Target } }
        else { $plan += @{ Aksi = 'ARAHKAN-ULANG'; Link = $l.Link; Target = $l.Target } }
    } else {
        $n = (Get-ChildItem -LiteralPath $l.Link -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object).Count
        if ($n -eq 0) { $blockers += "direktori nyata kosong, tidak jelas asalnya: $($l.Link)" }
        $plan += @{ Aksi = 'PINDAHKAN-LALU-JUNCTION'; Link = $l.Link; Target = $l.Target; Berkas = $n }
    }
}

Write-Host ''
foreach ($p in $plan) { Write-Host ("  {0,-24} {1}" -f $p.Aksi, $p.Link) }

if ($blockers.Count -gt 0) {
    Write-Host ''
    Write-Host 'DITOLAK - prasyarat tidak terpenuhi:' -ForegroundColor Red
    $blockers | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    exit 2
}
if (-not $Execute) {
    Write-Host ''
    Write-Host 'Dry-run selesai. Tambahkan -Execute untuk memulihkan.' -ForegroundColor Yellow
    exit 0
}

# --- Eksekusi ----------------------------------------------------------------
foreach ($p in $plan) {
    if ($p.Aksi -eq 'OK') { continue }
    if ($p.Aksi -eq 'ARAHKAN-ULANG') {
        # Salah arah: cukup buang tautannya, isi target tidak tersentuh.
        [IO.Directory]::Delete($p.Link)
    }
    if ($p.Aksi -eq 'PINDAHKAN-LALU-JUNCTION') {
        Write-Host "menyalin $($p.Link) -> $($p.Target)"
        $null = robocopy $p.Link $p.Target /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /NFL /NDL /NP /NJH /NJS /MT:16
        if ($LASTEXITCODE -ge 8) { throw "robocopy gagal (rc=$LASTEXITCODE) untuk $($p.Link)" }
        $keep = "$($p.Link).pre-junction-$Stamp"
        Rename-Item -LiteralPath $p.Link -NewName (Split-Path $keep -Leaf)
        Write-Host "  direktori lama disimpan: $keep"
    }
    $null = New-Item -ItemType Junction -Path $p.Link -Target $p.Target
    Write-Host ("  junction {0} -> {1}" -f $p.Link, $p.Target) -ForegroundColor Green
}
Write-Host ''
Write-Host 'Selesai. Jalankan scripts/verify-runtime-junctions.ps1 untuk konfirmasi.'
