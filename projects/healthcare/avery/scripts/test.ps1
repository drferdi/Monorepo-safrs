<#
.SYNOPSIS
    Jalankan seluruh test suite stdlib unittest capsule Avery.

.DESCRIPTION
    Mencari interpreter Python (`py -3` lalu `python`, tidak pernah dari
    `runtime/`), mengatur `PYTHONPATH` ke `src`, lalu menjalankan
    `python -m unittest discover -s tests -t .` dari akar capsule.

.EXAMPLE
    pwsh -NoProfile -File scripts/test.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

$python = $null
if (Get-Command 'py' -ErrorAction SilentlyContinue) {
    $python = @('py', '-3')
} elseif (Get-Command 'python' -ErrorAction SilentlyContinue) {
    $python = @('python')
} else {
    Write-Error "Tidak ditemukan interpreter Python ('py -3' atau 'python') di PATH."
    exit 1
}

$env:PYTHONPATH = Join-Path $repoRoot 'src'

$exe = $python[0]
$exeArgs = @()
if ($python.Length -gt 1) { $exeArgs += $python[1..($python.Length - 1)] }
$exeArgs += @('-m', 'unittest', 'discover', '-s', 'tests', '-t', '.', '-v')

& $exe @exeArgs
exit $LASTEXITCODE
