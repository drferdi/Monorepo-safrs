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
    pnpm run desktop:build
  }

  $electronExe = Join-Path $CapsuleRoot 'node_modules\electron\dist\electron.exe'
  $entryPoint = Join-Path $CapsuleRoot 'dist-electron\desktop\bootstrap.js'

  Start-Process -FilePath $electronExe -ArgumentList "`"$entryPoint`""
}
finally {
  Pop-Location
}
