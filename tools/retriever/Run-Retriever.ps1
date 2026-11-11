[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$CapsuleRoot = $PSScriptRoot

if (-not (Test-Path -LiteralPath (Join-Path $CapsuleRoot 'package.json'))) {
  throw "Capsule Retriever tidak ditemukan di $CapsuleRoot"
}

Push-Location $CapsuleRoot
try {
  if (-not (Test-Path -LiteralPath (Join-Path $CapsuleRoot 'dist-electron\desktop\bootstrap.js'))) {
    Write-Host "Mengompilasi Retriever Desktop..." -ForegroundColor Cyan
    node --run desktop:build
    if ($LASTEXITCODE -ne 0) {
      throw "Build Retriever gagal. Exit code: $LASTEXITCODE"
    }
  }

  $electronExe = Join-Path $CapsuleRoot 'node_modules\electron\dist\electron.exe'
  $entryPoint = Join-Path $CapsuleRoot 'dist-electron\desktop\bootstrap.js'

  if (-not (Test-Path -LiteralPath $electronExe)) {
    Write-Host "Menyiapkan Electron lokal Retriever..." -ForegroundColor Cyan
    node (Join-Path $CapsuleRoot 'node_modules\electron\install.js')
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $electronExe)) {
      throw "Electron lokal Retriever belum tersedia. Jalankan install dependency dari $CapsuleRoot."
    }
  }

  Start-Process -FilePath $electronExe -ArgumentList "`"$entryPoint`"" -WorkingDirectory $CapsuleRoot -WindowStyle Hidden
}
finally {
  Pop-Location
}
