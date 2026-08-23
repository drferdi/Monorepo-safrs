<#
.SYNOPSIS
    Menyalin SOUL.md dan skill bercakupan dari repositori profil Avery ke profil runtime,
    dengan verifikasi SHA-256 sebelum dan sesudah salin.

.DESCRIPTION
    Arah salin adalah kebalikan dari sync-profile-to-repo.ps1: dari `ai/profiles/<profil>/`
    (repositori, sumber kebenaran setelah diedit) ke `runtime/hermes-home/profiles/<profil>/`
    (yang benar-benar dibaca oleh Hermes saat berjalan).

    Cakupan salin HANYA:
      - SOUL.md
      - skills/<nama>/**  untuk setiap <nama> yang tercantum di custom-skills.json milik repo

    Tidak pernah menyalin berkas di luar cakupan itu, dan tidak pernah menghapus apa pun
    di sisi runtime.

    Untuk setiap berkas dalam cakupan: hash SHA-256 sumber dan target dibandingkan.
    - Sama                -> dilewati.
    - Beda atau tidak ada  -> (hanya dengan -Execute) target lama dicadangkan ke
                              `<target>.pre-push-<yyyyMMdd-HHmm>.bak` (bila target ada),
                              lalu sumber disalin, lalu hash target dihitung ulang dan
                              WAJIB sama dengan hash sumber. Bila tidak, skrip berhenti
                              dengan kode keluar 4.

    DEFAULT (tanpa -Execute) adalah mode uji-coba (dry-run): skrip hanya melaporkan berkas
    mana yang identik dan mana yang berbeda, tanpa menyalin atau mencadangkan apa pun.

    Nama skill yang tercantum di manifest tetapi pohonnya tidak ditemukan di repositori
    dilaporkan dan skrip berhenti dengan kode keluar 5.

.PARAMETER RepoProfile
    Direktori profil sumber (repositori). Default: <capsule>\ai\profiles\avery.

.PARAMETER RuntimeProfile
    Direktori profil target (runtime). Default: <capsule>\runtime\hermes-home\profiles\avery.

.PARAMETER Execute
    Benar-benar menyalin. Tanpa switch ini skrip hanya melaporkan (dry-run).

.EXAMPLE
    powershell -NoProfile -File scripts\push-profile-to-runtime.ps1
    powershell -NoProfile -File scripts\push-profile-to-runtime.ps1 -Execute
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string] $RepoProfile    = '',
    [string] $RuntimeProfile = '',
    [switch] $Execute
)

$ErrorActionPreference = 'Stop'

$capsuleRoot = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
if ([string]::IsNullOrWhiteSpace($RepoProfile))    { $RepoProfile    = Join-Path $capsuleRoot 'ai\profiles\avery' }
if ([string]::IsNullOrWhiteSpace($RuntimeProfile)) { $RuntimeProfile = Join-Path $capsuleRoot 'runtime\hermes-home\profiles\avery' }

if (-not (Test-Path -LiteralPath $RepoProfile)) { throw "Profil repositori tidak ditemukan: $RepoProfile" }
if (-not (Test-Path -LiteralPath $RuntimeProfile)) { throw "Profil runtime tidak ditemukan: $RuntimeProfile" }

$manifestPath = Join-Path $RepoProfile 'custom-skills.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Manifest tidak ditemukan: $manifestPath" }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$skillManifest = @($manifest.skills)
if ($skillManifest.Count -eq 0) { throw "Manifest $manifestPath tidak memuat satu pun skill" }

# Nama di manifest yang pohonnya tidak ada di repositori -> gagal keras.
$hilangDiRepo = @()
foreach ($nama in $skillManifest) {
    $p = Join-Path $RepoProfile "skills\$nama"
    if (-not (Test-Path -LiteralPath $p)) { $hilangDiRepo += $nama }
}
if ($hilangDiRepo.Count -gt 0) {
    Write-Host ""
    Write-Host "Nama skill ada di manifest tetapi tidak ditemukan di repositori:" -ForegroundColor Red
    $hilangDiRepo | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    exit 5
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmm'

$sama = 0
$disalin = 0
$gagal = 0
$berbeda = New-Object System.Collections.Generic.List[string]

function Push-Sumber($namaSumber) {
    $src = Join-Path $RepoProfile $namaSumber
    if (-not (Test-Path -LiteralPath $src)) { Write-Host "  lewati $namaSumber (tidak ada di repositori)" -ForegroundColor DarkGray; return }

    $berkas = if ((Get-Item -LiteralPath $src).PSIsContainer) {
        Get-ChildItem -LiteralPath $src -Recurse -File -Force
    } else { @(Get-Item -LiteralPath $src) }

    foreach ($f in $berkas) {
        $rel = $f.FullName.Substring($RepoProfile.Length).TrimStart('\')
        $dst = Join-Path $RuntimeProfile $rel

        $hSrc = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
        $hDstAda = Test-Path -LiteralPath $dst
        $hDst = if ($hDstAda) { (Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash } else { $null }

        if ($hDstAda -and $hDst -eq $hSrc) {
            $script:sama++
            continue
        }

        $berbeda.Add($rel)

        if (-not $Execute) { continue }
        if (-not $PSCmdlet.ShouldProcess($dst, "Salin dari $($f.FullName)")) { continue }

        try {
            if ($hDstAda) {
                $bak = "$dst.pre-push-$stamp.bak"
                Copy-Item -LiteralPath $dst -Destination $bak -Force
            }
            $null = New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force
            Copy-Item -LiteralPath $f.FullName -Destination $dst -Force
            $hDstBaru = (Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash
            if ($hDstBaru -ne $hSrc) {
                Write-Host "  GAGAL verifikasi hash setelah salin: $rel" -ForegroundColor Red
                $script:gagal++
                continue
            }
            $script:disalin++
            Write-Host "  disalin: $rel" -ForegroundColor Green
        } catch {
            Write-Host ("  GAGAL menyalin {0}: {1}" -f $rel, $_.Exception.Message) -ForegroundColor Red
            $script:gagal++
        }
    }
}

Write-Host ""
Write-Host "Push profil '$RepoProfile' -> '$RuntimeProfile'" -ForegroundColor Cyan
if (-not $Execute) { Write-Host "  MODE: dry-run (tambahkan -Execute untuk benar-benar menyalin)" -ForegroundColor Yellow }
Write-Host ""

Push-Sumber 'SOUL.md'
foreach ($nama in $skillManifest) { Push-Sumber (Join-Path 'skills' $nama) }

Write-Host ""
if (-not $Execute) {
    Write-Host "Berbeda dari runtime ($($berbeda.Count) berkas):" -ForegroundColor Yellow
    $berbeda | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host ""
}

Write-Host "Sama     : $sama berkas" -ForegroundColor DarkGray
Write-Host "Disalin  : $disalin berkas" -ForegroundColor Green
Write-Host "Gagal    : $gagal berkas" -ForegroundColor $(if ($gagal -gt 0) { 'Red' } else { 'DarkGray' })

if ($gagal -gt 0) { exit 4 }
