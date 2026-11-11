@echo off
setlocal
cd /d %~dp0\..
echo =======================================================
echo   AVERY HERMES GATEWAY - START WITH DRIFT PREVENTION
echo =======================================================
echo.
powershell.exe -ExecutionPolicy Bypass -NoProfile -File %~dp0restart-gateway.ps1 -Execute
echo.
echo Menjalankan Hermes Studio (lokasi dari scripts\runtime-links.json)...
rem Lokasi fisik Studio dibaca dari tabel junction satu-satunya; path legacy
rem tidak lagi di-hardcode di sini. Fail-closed bila entri/target tidak ada.
powershell.exe -NoProfile -Command ^
  "$links = Get-Content -LiteralPath 'scripts\runtime-links.json' -Raw | ConvertFrom-Json;" ^
  "$entry = $links.links | Where-Object { $_.target -eq 'hermes-studio' };" ^
  "if (-not $entry) { Write-Host '[ERROR] Entri hermes-studio tidak ada di runtime-links.json'; exit 2 };" ^
  "$studioExe = Join-Path (Join-Path 'runtime' $entry.target) 'Hermes Studio.exe';" ^
  "if (-not (Test-Path -LiteralPath $studioExe)) {" ^
  "  $native = [Environment]::ExpandEnvironmentVariables([string]$entry.link);" ^
  "  $studioExe = Join-Path $native 'Hermes Studio.exe';" ^
  "  Write-Host ('runtime/hermes-studio kosong; memakai lokasi installer: {0}' -f $studioExe)" ^
  "};" ^
  "if (-not (Test-Path -LiteralPath $studioExe)) { Write-Host ('[ERROR] Hermes Studio.exe tidak ditemukan: {0}' -f $studioExe); exit 2 };" ^
  "Start-Process -FilePath $studioExe"
if errorlevel 1 goto :fail
echo.
pause
exit /b 0
:fail
echo.
echo Gagal memulai Hermes Studio. Perbaiki junction lalu ulangi.
pause
exit /b 1
