# Starts Med Assist WXT dev server on a stable port for Chrome unpacked reloads.
param(
  [int]$Port = 3011,
  [switch]$Restart
)

$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')
Set-Location -LiteralPath $projectRoot

$outputDir = Join-Path $projectRoot '.output\chrome-mv3-dev'

Write-Host 'Med Assist dev server' -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host "Port:    $Port"
Write-Host "Output:  $outputDir"
Write-Host ''

$listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -gt 0) {
  $owners = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  $processes = @(
    foreach ($ownerPid in $owners) {
      Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction SilentlyContinue
    }
  )

  $medAssistWxt = @($processes | Where-Object {
    $_.CommandLine -match 'med-assist' -and $_.CommandLine -match 'wxt'
  })

  if ($medAssistWxt.Count -gt 0) {
    if ($Restart) {
      foreach ($proc in $medAssistWxt) {
        Write-Host "Stopping existing Med Assist WXT process $($proc.ProcessId)..." -ForegroundColor Yellow
        Stop-Process -Id $proc.ProcessId -Force
      }
      Start-Sleep -Seconds 1
    } else {
      Write-Host "Med Assist WXT already appears to be running on port $Port." -ForegroundColor Green
      Write-Host 'Use -Restart to stop it and start a fresh dev server.'
      Write-Host ''
      Write-Host 'Chrome reload path:'
      Write-Host "  $outputDir"
      exit 0
    }
  } else {
    Write-Error "Port $Port is already used by another process. Choose another port or stop that app first."
  }
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  Write-Error 'npm.cmd was not found on PATH.'
}

Write-Host 'Starting WXT through package script...' -ForegroundColor Cyan
Write-Host "Command: npm run dev -- --port $Port"
Write-Host ''
Write-Host 'After the first build finishes, load or reload this unpacked extension in Chrome:'
Write-Host "  $outputDir"
Write-Host ''

& npm.cmd run dev -- --port $Port
