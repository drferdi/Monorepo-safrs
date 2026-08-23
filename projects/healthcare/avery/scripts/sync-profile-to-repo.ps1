<#
.SYNOPSIS
    Menyalin bagian profil Avery yang layak diversi dari runtime ke `ai/profiles/<profil>/`.

.DESCRIPTION
    Instalasi Hermes berada di `runtime/`, yang seluruhnya masuk .gitignore karena
    memuat kredensial, sesi WhatsApp, basis data, dan binary. Akibatnya skill dan
    persona yang hidup di sana tidak terversi — bila runtime hilang, semuanya hilang.

    Skrip ini menyalin yang layak diversi:
      - skills/**/*    (instruksi, referensi, template)
      - SOUL.md        (persona)

    Dan menolak apa pun yang tidak boleh masuk repositori, sesuai `AGENTS.md`
    proyek ini: kredensial, sesi WhatsApp, basis data runtime, catatan memori,
    berkas .env terisi, dan konfigurasi yang sudah berisi nilai sebenarnya.

    PAGAR TAMBAHAN: repositori ini publik. Setiap berkas dipindai untuk nomor
    telepon Indonesia, JID WhatsApp, dan pola kunci API. Berkas yang terkena
    TIDAK disalin, dan namanya dilaporkan supaya bisa diredaksi lebih dulu.

.PARAMETER Profile
    Nama profil Hermes. Default: avery.

.PARAMETER WhatIf
    Tampilkan yang akan terjadi tanpa menyalin apa pun.

.EXAMPLE
    pwsh -File scripts/sync-profile-to-repo.ps1
    pwsh -File scripts/sync-profile-to-repo.ps1 -WhatIf
#>
[CmdletBinding()]
param(
    [string] $Profile = 'avery',
    [switch] $WhatIf
)

$ErrorActionPreference = 'Stop'

$repoRoot   = Split-Path $PSScriptRoot -Parent
$runtimeDir = Join-Path $repoRoot "runtime\hermes-home\profiles\$Profile"
$targetDir  = Join-Path $repoRoot "ai\profiles\$Profile"

if (-not (Test-Path -LiteralPath $runtimeDir)) { throw "Profil runtime tidak ditemukan: $runtimeDir" }
$null = New-Item -ItemType Directory -Path $targetDir -Force

# Berkas yang tidak boleh masuk repositori apa pun isinya.
$namaTerlarang = @(
    'auth.json', 'creds.json', '.env', 'config.yaml',
    '*.db', '*.db-shm', '*.db-wal', '*.sqlite', '*.sqlite3',
    '*.pem', '*.key', '*.lock',
    # Keadaan runtime pengelola skill — berubah tiap sesi, bukan konfigurasi.
    '.bundled_manifest', '.curator_state', '.usage.json',
    '.webui-managed-skills.json', '.skills_prompt_snapshot.json'
)
# Direktori yang tidak pernah disalin.
$dirTerlarang = @('platforms', 'sessions', 'state', 'logs', 'memories', 'pending', 'cache', 'cron', 'workspace', '.hub')

# Pola data yang tidak boleh terpublikasi.
$polaSensitif = @(
    @{ Nama = 'nomor Indonesia'; Pola = '\b628\d{8,12}\b' },
    @{ Nama = 'JID LID';         Pola = '\b\d{14}@lid\b' },
    @{ Nama = 'JID grup';        Pola = '\b1203634\d{10}@g\.us\b' },
    @{ Nama = 'kunci OpenRouter'; Pola = 'sk-or-v1-[A-Za-z0-9]{8,}' },
    @{ Nama = 'kunci OpenAI';    Pola = 'sk-proj-[A-Za-z0-9]{8,}' }
)

function Uji-Sensitif($path) {
    try { $isi = Get-Content -LiteralPath $path -Raw -ErrorAction Stop } catch { return $null }
    if (-not $isi) { return $null }
    foreach ($p in $polaSensitif) {
        if ($isi -match $p.Pola) { return "$($p.Nama): $($Matches[0])" }
    }
    return $null
}

$disalin = 0; $dilewati = 0; $ditahan = @()

function Sinkron-Sumber($namaSumber) {
    $src = Join-Path $runtimeDir $namaSumber
    if (-not (Test-Path -LiteralPath $src)) { Write-Host "  lewati $namaSumber (tidak ada)" -ForegroundColor DarkGray; return }

    $berkas = if ((Get-Item -LiteralPath $src).PSIsContainer) {
        Get-ChildItem -LiteralPath $src -Recurse -File -Force
    } else { @(Get-Item -LiteralPath $src) }

    foreach ($f in $berkas) {
        $rel = $f.FullName.Substring($runtimeDir.Length).TrimStart('\')
        $bagian = $rel -split '\\'

        if ($bagian | Where-Object { $dirTerlarang -contains $_ }) { $script:dilewati++; continue }
        $terlarang = $false
        foreach ($pola in $namaTerlarang) { if ($f.Name -like $pola) { $terlarang = $true; break } }
        if ($terlarang) { $script:dilewati++; continue }

        $temuan = Uji-Sensitif $f.FullName
        if ($temuan) { $script:ditahan += [pscustomobject]@{ Berkas = $rel; Temuan = $temuan }; continue }

        $dst = Join-Path $targetDir $rel
        if ($WhatIf) { Write-Host "  [WhatIf] $rel" -ForegroundColor DarkGray; $script:disalin++; continue }
        $null = New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force
        Copy-Item -LiteralPath $f.FullName -Destination $dst -Force
        $script:disalin++
    }
}

Write-Host ""
Write-Host "Sinkronisasi profil '$Profile'" -ForegroundColor Cyan
Write-Host "  dari : $runtimeDir" -ForegroundColor DarkGray
Write-Host "  ke   : $targetDir" -ForegroundColor DarkGray
Write-Host ""

Sinkron-Sumber 'skills'
Sinkron-Sumber 'SOUL.md'

Write-Host ""
Write-Host "Disalin  : $disalin berkas" -ForegroundColor Green
Write-Host "Dilewati : $dilewati berkas (kredensial, basis data, atau direktori runtime)" -ForegroundColor DarkGray

if ($ditahan.Count -gt 0) {
    Write-Host ""
    Write-Host "DITAHAN — $($ditahan.Count) berkas memuat data yang tidak boleh terpublikasi:" -ForegroundColor Red
    $ditahan | ForEach-Object { Write-Host ("   {0}`n      {1}" -f $_.Berkas, $_.Temuan) -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Redaksi nilainya di berkas sumber lalu jalankan ulang." -ForegroundColor Yellow
    Write-Host "Nilai sebenarnya tempatnya di config.yaml runtime atau memori agen, bukan di repositori." -ForegroundColor DarkGray
    exit 1
}

Write-Host ""
Write-Host "Tidak ada berkas yang tertahan." -ForegroundColor Green
Write-Host "Periksa `git status`, lalu commit bila hasilnya sesuai." -ForegroundColor DarkGray
