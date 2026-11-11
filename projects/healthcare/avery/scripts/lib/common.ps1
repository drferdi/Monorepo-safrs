<#
.SYNOPSIS
    Fungsi bersama untuk skrip operasional Avery. Dot-source, jangan eksekusi.

.DESCRIPTION
    Satu sumber untuk tiga hal yang sebelumnya terduplikasi antar skrip:

      Get-AveryRuntimeLinks   tabel junction lokasi-native -> runtime/
                              (dipakai verify-runtime-junctions,
                              restore-native-runtime-layout, dan rename-capsule).
                              Datanya hidup di scripts/runtime-links.json --
                              fungsi ini hanya membaca dan mengekspansi;
                              tidak ada path mesin di kode.
      Get-OrphanBridge        proses whatsapp-bridge (node.exe + bridge.js)
      Get-HermesBusyProcess   proses Hermes apa pun yang memegang berkas runtime

    Resolusi direktori profil SENGAJA tidak ada di sini: health-check.ps1
    (anchor config.yaml) dan check-unregistered-groups.ps1 (anchor direktori
    sesi WhatsApp) memakai anchor berbeda dengan alasan masing-masing.
#>

# Sengaja TANPA Set-StrictMode: berkas ini di-dot-source ke scope pemanggil,
# sehingga mengeset mode di sini berarti mengubah semantik seluruh skrip
# pemanggil yang tidak ditulis di bawah strict mode.

function Get-AveryRuntimeLinks {
    # Membaca scripts/runtime-links.json (di samping runtime/, di bawah akar
    # capsule) dan mengembalikan @{ Link; Target } yang sudah diekspansi.
    # Fail-closed: JSON hilang, tabel kosong, atau entri tanpa link/target
    # adalah kesalahan, bukan no-op -- pemanggilnya skrip pemulihan.
    param([Parameter(Mandatory)] [string] $RuntimeRoot)

    $jsonPath = Join-Path (Split-Path $RuntimeRoot -Parent) 'scripts\runtime-links.json'
    if (-not (Test-Path -LiteralPath $jsonPath)) { throw "Tabel junction tidak ditemukan: $jsonPath" }
    $data = [IO.File]::ReadAllText($jsonPath) | ConvertFrom-Json
    if (-not $data.links -or @($data.links).Count -eq 0) { throw "Tabel junction kosong: $jsonPath" }

    @($data.links) | ForEach-Object {
        if (-not $_.link -or -not $_.target) { throw "Entri tanpa link/target di $jsonPath" }
        @{
            Link   = [Environment]::ExpandEnvironmentVariables($_.link)
            Target = Join-Path $RuntimeRoot $_.target
        }
    }
}

function Get-OrphanBridge {
    # Hanya node.exe yang menjalankan bridge.js, supaya tidak pernah mengenai
    # PowerShell yang sedang memeriksa. Koma depan memaksa hasil tetap array
    # meski nol atau satu elemen (PowerShell 5.1).
    , @(Get-CimInstance Win32_Process | Where-Object {
        $_.Name -eq 'node.exe' -and $_.CommandLine -like '*whatsapp-bridge*bridge.js*'
    })
}

function Get-HermesBusyProcess {
    , @(Get-CimInstance Win32_Process | Where-Object {
        $_.Name -eq 'Hermes Studio.exe' -or
        ($_.CommandLine -match 'hermes-web-ui.desktop-runtime|whatsapp-bridge' -and
         $_.Name -notmatch 'powershell|pwsh|bash|conhost')
    })
}
