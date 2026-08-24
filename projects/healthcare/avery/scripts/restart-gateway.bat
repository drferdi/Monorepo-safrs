@echo off
setlocal enabledelayedexpansion

rem ---------------------------------------------------------------------------
rem Restart the Hermes gateway for the "avery" profile on Windows.
rem
rem CATATAN: jalur kanonik kini scripts/restart-gateway.ps1 (dry-run default,
rem -Execute untuk bertindak). Berkas .bat ini dipertahankan untuk pemanggil
rem lama; logikanya setara jalur -Execute tanpa dry-run.
rem
rem Why this script exists: the whatsapp-bridge child process can survive a
rem gateway restart. The orphan keeps holding TCP port 3000 and the WhatsApp
rem session directory. The next gateway then attaches to that stale bridge
rem instead of spawning its own, so bridge-level environment changes never take
rem effect; worse, if the gateway dies the orphan keeps accepting messages with
rem nobody consuming them and they vanish without a log line. In some versions
rem the held port also makes the next gateway conclude WhatsApp is unpaired and
rem exit with code 78.
rem
rem A gateway does NOT respawn a bridge that dies underneath it. Killing only
rem the bridge leaves WhatsApp silent until the gateway itself is restarted --
rem which is exactly what this script does.
rem
rem Note on the CLI: `hermes-studio.cmd cli` forwards its arguments through a
rem Node wrapper that rejects `--profile` ("bad option: --profile"). The Python
rem entry point accepts it, but only BEFORE the subcommand. This script calls
rem the bundled Python directly, the same way the login-item launcher does.
rem
rem Usage:  restart-gateway.bat [profile]
rem Default profile is "avery".
rem ---------------------------------------------------------------------------

set "PROFILE=%~1"
if "%PROFILE%"=="" set "PROFILE=avery"

set "HERMES_ROOT=%USERPROFILE%\.hermes-web-ui\desktop-runtime\hermes"
if not exist "%HERMES_ROOT%" (
    echo [ERROR] Hermes runtime not found: %HERMES_ROOT%
    exit /b 127
)

rem Pick the highest installed runtime version.
set "PYEXE="
for /f "delims=" %%V in ('dir /b /ad /on "%HERMES_ROOT%" 2^>nul') do (
    if exist "%HERMES_ROOT%\%%V\win-x64\python\venv\Scripts\python.exe" (
        set "PYEXE=%HERMES_ROOT%\%%V\win-x64\python\venv\Scripts\python.exe"
        set "PYVER=%%V"
    )
)
if not defined PYEXE (
    echo [ERROR] No bundled Python found under %HERMES_ROOT%
    exit /b 127
)
echo Runtime: %PYVER%

set "PROFILE_HOME=%USERPROFILE%\.hermes\profiles\%PROFILE%"
if not exist "%PROFILE_HOME%\config.yaml" (
    echo [ERROR] Profile not found: %PROFILE_HOME%
    exit /b 2
)

echo.
echo === [1/5] Stopping gateway (profile: %PROFILE%) ===
"%PYEXE%" -m hermes_cli.main --profile %PROFILE% gateway stop

echo.
echo === [2/5] Waiting for child processes to exit ===
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo.
echo === [3/5] Removing orphaned whatsapp-bridge processes ===
rem After a stop, any surviving bridge is by definition an orphan. Match on
rem node.exe only so this never matches the PowerShell that runs the check.
powershell -NoProfile -Command ^
  "$o = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*whatsapp-bridge*bridge.js*' };" ^
  "if (-not $o) { Write-Host '  No orphaned bridge found.'; exit 0 };" ^
  "foreach ($p in $o) { Write-Host ('  Killing PID {0}' -f $p.ProcessId); Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }"

echo.
echo === [4/5] Starting gateway ===
rem Prefer the login-item launcher: it sets HERMES_HOME, PYTHONPATH, VIRTUAL_ENV
rem and the working directory exactly the way the installed service does.
set "LAUNCHER=%PROFILE_HOME%\gateway-service\Hermes_Gateway_%PROFILE%.vbs"
if exist "%LAUNCHER%" (
    echo   via login-item launcher
    wscript.exe "%LAUNCHER%"
) else (
    echo   via detached gateway run --replace
    set "HERMES_HOME=%PROFILE_HOME%"
    start "" /b "%PYEXE%" -m hermes_cli.main --profile %PROFILE% gateway run --replace
)

echo.
echo === [5/5] Waiting for the WhatsApp bridge to connect ===
powershell -NoProfile -Command ^
  "$ok = $false;" ^
  "foreach ($i in 1..40) {" ^
  "  try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 3 -ErrorAction Stop } catch { $r = $null };" ^
  "  if ($r -and $r.status -eq 'connected') { Write-Host ('  bridge connected after {0}s' -f $i); $ok = $true; break };" ^
  "  Start-Sleep -Seconds 1" ^
  "};" ^
  "if (-not $ok) { Write-Host '  bridge did NOT reach connected state - check logs/gateway.log'; exit 1 }"

echo.
echo === Status ===
"%PYEXE%" -m hermes_cli.main --profile %PROFILE% gateway status

echo.
echo Port 3000 owner:
powershell -NoProfile -Command ^
  "$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue;" ^
  "if ($c) { $c | Select-Object LocalPort,OwningProcess | Format-Table -AutoSize | Out-String | Write-Host } else { Write-Host '  nothing listening on 3000' }"

endlocal
