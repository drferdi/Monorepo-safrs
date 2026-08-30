<#
.SYNOPSIS
    Memeriksa — dan opsional memulihkan — directory junction yang menautkan lokasi
    Hermes bawaan ke `runtime/` di dalam proyek ini.

.DESCRIPTION
    Instalasi Hermes berada fisik di `runtime/`. Lokasi lama di `C:` dan di
    `abyss-monorepo` hanyalah junction yang menunjuk ke sana, sehingga seluruh
    path absolut lama tetap bekerja tanpa perlu ditulis ulang.

    Installer NSIS Hermes Studio TIDAK menghormati junction. Saat memasang versi
    baru ia mengosongkan isi target lewat junction, menghapus junction-nya, lalu
    menulis instalasi sebagai direktori nyata di lokasi lama. Akibatnya setiap
    update mengembalikan folder aplikasi ke luar proyek dan mengosongkan
    `runtime/hermes-studio`.

    Jalankan skrip ini setiap selesai memperbarui Hermes Studio. Dengan `-Fix`,
    isi direktori nyata dipindahkan kembali ke `runtime/` lalu junction dipasang
    ulang. Direktori lama disimpan sebagai `<nama>.pre-junction-<stempel>` dan
    tidak pernah dihapus otomatis.

.PARAMETER Fix
    Perbaiki tautan yang rusak. Tanpa flag ini skrip hanya melaporkan.

.PARAMETER Stamp
    Akhiran untuk direktori cadangan saat -Fix. Default: yyyyMMdd-HHmmss.

.EXAMPLE
    pwsh -File scripts/verify-runtime-junctions.ps1
    pwsh -File scripts/verify-runtime-junctions.ps1 -Fix
#>
[CmdletBinding()]
param(
    [switch] $Fix,
    [string] $Stamp = (Get-Date -Format 'yyyyMMdd-HHmmss')
)

$ErrorActionPreference = 'Stop'

$runtimeRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'runtime'
if (-not (Test-Path -LiteralPath $runtimeRoot)) { throw "Direktori runtime tidak ditemukan: $runtimeRoot" }

. (Join-Path $PSScriptRoot 'lib\common.ps1')
$links = Get-AveryRuntimeLinks -RuntimeRoot $runtimeRoot

$broken = @()

foreach ($l in $links) {
    $link = $l.Link; $target = $l.Target
    if (-not (Test-Path -LiteralPath $link)) {
        Write-Host ("  HILANG    {0}" -f $link) -ForegroundColor Red
        $broken += $l
        continue
    }
    $item = Get-Item -LiteralPath $link -Force
    if ($item.LinkType -eq 'Junction') {
        $actual = @($item.Target)[0]
        if ($actual -eq $target) {
            Write-Host ("  OK        {0}" -f $link) -ForegroundColor Green
        } else {
            Write-Host ("  SALAH ARAH {0}`n              -> {1}" -f $link, $actual) -ForegroundColor Yellow
            $broken += $l
        }
    } else {
        $n = (Get-ChildItem -LiteralPath $link -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Host ("  BUKAN JUNCTION {0}  ({1} berkas — kemungkinan hasil installer)" -f $link, $n) -ForegroundColor Yellow
        $broken += $l
    }
}

if ($broken.Count -eq 0) {
    Write-Host ''
    Write-Host 'Semua junction sehat.' -ForegroundColor Green
    return
}

Write-Host ''
Write-Host ("{0} tautan bermasalah." -f $broken.Count) -ForegroundColor Red

if (-not $Fix) {
    Write-Host 'Jalankan ulang dengan -Fix untuk memulihkan.'
    Write-Host 'Start Avery tidak dihentikan. Perbaiki junction hanya saat gateway dan Studio sudah mati.'
    return
}

# Pastikan tidak ada proses Hermes yang memegang berkas.
$busy = Get-HermesBusyProcess
if ($busy) {
    Write-Host ''
    Write-Host ("{0} proses Hermes masih berjalan. Tutup Hermes Studio dan hentikan gateway dulu." -f @($busy).Count) -ForegroundColor Red
    exit 2
}

foreach ($l in $broken) {
    $link = $l.Link; $target = $l.Target
    Write-Host ''
    Write-Host ("memperbaiki {0}" -f $link)

    if (Test-Path -LiteralPath $link) {
        $item = Get-Item -LiteralPath $link -Force
        if ($item.LinkType -eq 'Junction') {
            # Salah arah: cukup buang tautannya, isi target tidak tersentuh.
            [IO.Directory]::Delete($link)
        } else {
            # Direktori nyata hasil installer: pindahkan isinya ke runtime/.
            if (-not (Test-Path -LiteralPath $target)) { $null = New-Item -ItemType Directory -Path $target -Force }
            Write-Host '  menyalin isi ke runtime/...'
            $null = robocopy $link $target /MIR /COPY:DAT /DCOPY:DAT /R:1 /W:1 /NFL /NDL /NP /NJH /NJS /MT:16
            if ($LASTEXITCODE -ge 8) { throw "robocopy gagal (rc=$LASTEXITCODE) untuk $link" }
            $keep = "$link.pre-junction-$Stamp"
            Rename-Item -LiteralPath $link -NewName (Split-Path $keep -Leaf)
            Write-Host ("  direktori lama disimpan: {0}" -f $keep)
        }
    }

    $null = New-Item -ItemType Junction -Path $link -Target $target
    $check = Get-Item -LiteralPath $link -Force
    Write-Host ("  {0} -> {1}" -f $check.LinkType, (@($check.Target)[0])) -ForegroundColor Green
}

Write-Host ''
Write-Host 'Selesai. Jalankan scripts/restart-gateway.bat, lalu hapus direktori .pre-junction-* setelah yakin stabil.'
