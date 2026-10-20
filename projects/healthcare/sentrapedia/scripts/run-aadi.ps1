param([switch]$ValidateOnly)
$ErrorActionPreference='Stop'
$capsuleRoot=Split-Path $PSScriptRoot -Parent
$mode=if($ValidateOnly) { 'check' } else { 'dev' }
& node (Join-Path $capsuleRoot 'scripts/run-system.mjs') $mode
exit $LASTEXITCODE
