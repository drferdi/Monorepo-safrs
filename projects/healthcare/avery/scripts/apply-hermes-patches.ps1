#Requires -Version 5.1
<#
.SYNOPSIS
    Terapkan atau batalkan (revert) patch WhatsApp Hermes 0.20.4 vendored
    (ingress reason-codes, lalu outbound safety envelope).

.DESCRIPTION
    Idempoten: mengecek SHA-256 tiap berkas target terhadap manifest sebelum
    bertindak. Jika berkas sudah pada sha256_after, tidak melakukan apa-apa.
    Menggunakan `git apply` untuk menerapkan unified diff. Menyimpan salinan
    asli sebagai `<file>.orig-hermes-0.20.5` sebelum menerapkan patch.

.PARAMETER HermesRoot
    Akar pohon Hermes tempat patch diterapkan (mis. .../win-x64/python).

.PARAMETER Revert
    Batalkan patch: pulihkan berkas dari salinan `.orig-hermes-0.20.5`.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$HermesRoot = "C:\Users\drfer\.hermes-web-ui\desktop-runtime\hermes\0.20.4\win-x64\python",
    [switch]$Revert
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PatchDir = Join-Path $ScriptDir "..\patches\hermes-0.20.5"
$PatchDir = (Resolve-Path $PatchDir).Path
$ManifestPath = Join-Path $PatchDir "manifest.json"

if (-not (Test-Path $ManifestPath)) {
    Write-Error "Manifest tidak ditemukan: $ManifestPath"
    exit 2
}
if (-not (Test-Path $HermesRoot)) {
    Write-Error "HermesRoot tidak ditemukan: $HermesRoot"
    exit 2
}

$Manifest = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json

function Get-FileSha256 {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    # Get-FileHash is a read-only inspection, not a mutation, but under the
    # script's -WhatIf it silently no-ops and returns $null (it honors the
    # ambient $WhatIfPreference internally, and re-scoping that preference
    # variable does not suppress it). Compute the digest directly instead so
    # SHA-256 checks always run, even in -WhatIf mode.
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $bytes = $sha256.ComputeHash($stream)
        }
        finally {
            $stream.Dispose()
        }
    }
    finally {
        $sha256.Dispose()
    }
    return -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

function Resolve-GitExe {
    $candidates = @(
        "C:\Users\drfer\.hermes-web-ui\desktop-runtime\hermes\0.20.4\win-x64\git\cmd\git.exe",
        "C:\Users\drfer\.hermes-web-ui\desktop-runtime\hermes\0.20.4\win-x64\git\bin\git.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    $onPath = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    return $null
}

$GitExe = Resolve-GitExe
if (-not $GitExe) {
    Write-Error "git tidak ditemukan (vendored maupun PATH). Tidak dapat menerapkan patch."
    exit 3
}

$ExitCode = 0

if ($Manifest.patches) {
    $PatchList = @($Manifest.patches)
} else {
    $PatchList = @($Manifest)
}

$LastAfter = @{}
$FirstBefore = @{}
foreach ($spec in $PatchList) {
    foreach ($f in @($spec.files)) {
        $pathKey = [string]$f.path
        if (-not $FirstBefore.ContainsKey($pathKey)) {
            $FirstBefore[$pathKey] = $f.sha256_before.ToLowerInvariant()
        }
        $LastAfter[$pathKey] = $f.sha256_after.ToLowerInvariant()
    }
}

foreach ($spec in $PatchList) {
    $PatchFile = Join-Path $PatchDir $spec.patch
    if (-not (Test-Path $PatchFile)) {
        Write-Error "Patch tidak ditemukan: $PatchFile"
        $ExitCode = 2
        continue
    }
foreach ($entry in @($spec.files)) {
    $relPath = $entry.path
    $shaBefore = $entry.sha256_before.ToLowerInvariant()
    $shaAfter = $entry.sha256_after.ToLowerInvariant()
    $targetPath = Join-Path $HermesRoot $relPath
    $origPath = "$targetPath.orig-hermes-0.20.5"

    if (-not (Test-Path $targetPath)) {
        Write-Warning "[$relPath] berkas target tidak ditemukan, dilewati: $targetPath"
        continue
    }

    $currentSha = Get-FileSha256 -Path $targetPath

    if ($Revert) {
        if ($shaAfter -ne $LastAfter[$relPath]) {
            continue
        }
        $originalSha = $FirstBefore[$relPath]
        if ($currentSha -eq $LastAfter[$relPath]) {
            if (-not (Test-Path $origPath)) {
                Write-Error "[$relPath] SHA=akhir tapi salinan .orig tidak ada, tidak bisa revert."
                $ExitCode = 4
                continue
            }
            if ($PSCmdlet.ShouldProcess($targetPath, "Revert dari $origPath")) {
                Copy-Item -Path $origPath -Destination $targetPath -Force
                $restoredSha = Get-FileSha256 -Path $targetPath
                if ($restoredSha -ne $originalSha) {
                    Write-Error "[$relPath] SHA setelah revert ($restoredSha) tidak cocok sha256_before awal ($originalSha)."
                    $ExitCode = 4
                    continue
                }
                Write-Host "[$relPath] direvert -> SHA=$restoredSha"
            }
        }
        elseif ($currentSha -eq $originalSha) {
            Write-Host "[$relPath] sudah pada versi asli (sha256_before), tidak ada tindakan."
        }
        else {
            Write-Error "[$relPath] SHA saat ini ($currentSha) tidak cocok versi akhir maupun asli; versi Hermes berbeda, tidak direvert."
            $ExitCode = 5
        }
        continue
    }

    # --- Apply mode ---
    if ($currentSha -eq $LastAfter[$relPath]) {
        Write-Host "[$relPath] sudah pada versi akhir, dilewati."
        continue
    }
    if ($currentSha -eq $shaAfter) {
        Write-Host "[$relPath] sudah terpasang (sha256_after cocok), dilewati."
        continue
    }

    if ($currentSha -eq $shaBefore) {
        if ($PSCmdlet.ShouldProcess($targetPath, "Terapkan patch $PatchFile")) {
            if (-not (Test-Path $origPath)) {
                Copy-Item -Path $targetPath -Destination $origPath -Force
            }

            Push-Location $HermesRoot
            try {
                # -c core.autocrlf=false: on Windows, git's global config often has
                # autocrlf=true, which would rewrite the vendored LF sources to
                # CRLF on apply and break the expected sha256_after. --include
                # restricts this multi-file patch to only the hunk for $relPath,
                # so each manifest entry can be applied independently and
                # idempotently even if a sibling file is already patched.
                & $GitExe -c core.autocrlf=false apply --whitespace=nowarn --include="$relPath" "$PatchFile" 2>&1 | Out-String | Write-Verbose
                $applyExit = $LASTEXITCODE
            }
            finally {
                Pop-Location
            }

            if ($applyExit -ne 0) {
                Write-Error "[$relPath] 'git apply' gagal (exit $applyExit). Memulihkan dari .orig."
                Copy-Item -Path $origPath -Destination $targetPath -Force
                $ExitCode = 3
                continue
            }

            $newSha = Get-FileSha256 -Path $targetPath
            if ($newSha -ne $shaAfter) {
                Write-Error "[$relPath] SHA setelah apply ($newSha) tidak cocok sha256_after ($shaAfter). Memulihkan dari .orig."
                Copy-Item -Path $origPath -Destination $targetPath -Force
                $ExitCode = 4
                continue
            }

            Write-Host "[$relPath] terpasang -> SHA=$newSha"
        }
    }
    else {
        Write-Error "[$relPath] SHA saat ini ($currentSha) tidak cocok sha256_before maupun sha256_after; versi Hermes berbeda, patch tidak diterapkan."
        $ExitCode = 5
    }
}
}

exit $ExitCode
