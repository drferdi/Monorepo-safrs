#Requires -Version 5.1
# Gerbang CI lokal untuk kapsul Avery.
# Menjalankan: (1) unit test, (2) scan data sensitif, (3) grep anti-Medisync.
# Pemakaian: pwsh -NoProfile -File scripts/ci-checks.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
Push-Location $repo
try {
    $gagal = $false

    # 1. Unit test Python (paket avery_outbound + smoke evidence).
    Write-Host '== 1/3 Unit test ==' -ForegroundColor Cyan
    $env:PYTHONPATH = Join-Path $repo 'src'
    python -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) { $gagal = $true }

    # 2. Scan pola sensitif pada file teks yang dilacak kapsul.
    #    Sumber pola: scripts/sync-profile-to-repo.ps1 ($polaSensitif).
    Write-Host '== 2/3 Scan data sensitif ==' -ForegroundColor Cyan
    $polaSensitif = @(
        @{ Nama = 'nomor Indonesia'; Pola = '\b628\d{8,12}\b' },
        @{ Nama = 'JID LID';         Pola = '\b\d{14}@lid\b' },
        @{ Nama = 'JID grup';        Pola = '\b1203634\d{10}@g\.us\b' },
        @{ Nama = 'kunci OpenRouter'; Pola = 'sk-or-v1-[A-Za-z0-9]{8,}' },
        @{ Nama = 'kunci OpenAI';    Pola = 'sk-proj-[A-Za-z0-9]{8,}' }
    )
    $folderPindai = @('docs', 'deploy', 'ai', 'src', 'console', 'capabilities.json')
    # Fixture test sengaja memuat nomor dummy; folder tests tidak dipindai.
    # Enumerasi dibatasi folder sumber agar tidak menyentuh runtime/ (3+ GB, junction rusak).
    foreach ($target in $folderPindai) {
        $berkas = if (Test-Path $target -PathType Container) {
            Get-ChildItem -Recurse -File -Path $target -ErrorAction SilentlyContinue
        } else {
            @(Get-Item $target -ErrorAction SilentlyContinue)
        }
        foreach ($b in $berkas) {
            $isi = Get-Content -LiteralPath $b.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $isi) { continue }
            foreach ($p in $polaSensitif) {
                if ($isi -match $p.Pola) {
                    Write-Host "  DLP GAGAL: $($p.Nama) di $($b.FullName)" -ForegroundColor Red
                    $gagal = $true
                }
            }
        }
    }

    # 3. Anti-regrési rename: "Medisync" hanya boleh di berkas historis.
    Write-Host '== 3/3 Grep anti-Medisync ==' -ForegroundColor Cyan
    $diizinkan = @(
        'CHANGELOG.md',
        'scripts\rename-capsule.ps1',
        'scripts\rename-capsule.bat',
        'docs\tech-debt-2026-08-24.md',
        'docs\superpowers',
        'docs\5-superpowers'
    )
    $folderPindai = @('docs', 'deploy', 'ai', 'src', 'console')
    $kandidat = foreach ($t in $folderPindai) {
        if (Test-Path $t -PathType Container) {
            Get-ChildItem -Recurse -File -Path $t -Include *.md,*.json,*.yaml,*.yml,*.ps1,*.py,*.js,*.example -ErrorAction SilentlyContinue
        } elseif (Test-Path $t) {
            Get-Item $t
        }
    }
    foreach ($b in $kandidat) {
        # PowerShell 5.1 tidak punya [IO.Path]::GetRelativePath (hanya .NET Core).
        $rel = $b.FullName.Substring($repo.Length).TrimStart('\')
        $dilarangScan = $false
        foreach ($ok in $diizinkan) {
            if ($rel -eq $ok -or $rel.StartsWith($ok)) { $dilarangScan = $true; break }
        }
        if ($dilarangScan) { continue }
        if ((Select-String -LiteralPath $b.FullName -Pattern 'Medisync' -Quiet)) {
            Write-Host "  RENAME GAGAL: sisa 'Medisync' di $rel" -ForegroundColor Red
            $gagal = $true
        }
    }

    if ($gagal) {
        Write-Host 'CI checks GAGAL.' -ForegroundColor Red
        exit 1
    }
    Write-Host 'CI checks LOLOS (test + DLP + rename).' -ForegroundColor Green
    exit 0
}
finally {
    Pop-Location
}
