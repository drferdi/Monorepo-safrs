<#
.SYNOPSIS
    Fungsi bersama untuk skrip operasional Avery. Dot-source, jangan eksekusi.

.DESCRIPTION
    Satu sumber untuk tiga hal yang sebelumnya terduplikasi antar skrip:

      Get-AveryRuntimeLinks   tabel junction lokasi-native -> runtime/
                              (dipakai verify-runtime-junctions dan
                              restore-native-runtime-layout; dua salinan tabel
                              pernah berisiko saling menyimpang)
      Get-OrphanBridge        proses whatsapp-bridge (node.exe + bridge.js)
      Get-HermesBusyProcess   proses Hermes apa pun yang memegang berkas runtime

    Resolusi direktori profil SENGAJA tidak ada di sini: health-check.ps1
    (anchor config.yaml) dan check-unregistered-groups.ps1 (anchor direktori
    sesi WhatsApp) memakai anchor berbeda dengan alasan masing-masing.
#>

Set-StrictMode -Version Latest

function Get-AveryRuntimeLinks {
    param([Parameter(Mandatory)] [string] $RuntimeRoot)
    @(
        @{ Link = Join-Path $env:USERPROFILE '.hermes';                Target = Join-Path $RuntimeRoot 'hermes-home' }
        @{ Link = Join-Path $env:USERPROFILE '.hermes-web-ui';         Target = Join-Path $RuntimeRoot 'hermes-web-ui' }
        @{ Link = Join-Path $env:APPDATA     'hermes-studio';          Target = Join-Path $RuntimeRoot 'appdata-roaming' }
        @{ Link = Join-Path $env:LOCALAPPDATA 'hermes-studio-updater'; Target = Join-Path $RuntimeRoot 'updater' }
        @{ Link = 'D:\Devops\abyss-monorepo\apps\healthcare\hoamanagement\Hermes Studio'; Target = Join-Path $RuntimeRoot 'hermes-studio' }
    )
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
