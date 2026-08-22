@echo off
setlocal

rem ---------------------------------------------------------------------------
rem Restart the Hermes gateway for the "avery" profile.
rem
rem Why this script exists: on Windows the whatsapp-bridge child process can
rem survive a gateway restart. The orphan keeps holding TCP port 3000 and the
rem WhatsApp session directory, so the next gateway starts, finds WhatsApp
rem "not paired", and exits with code 78. The sequence below stops the gateway
rem first, then removes any bridge that outlived it, then starts a fresh one.
rem
rem Usage:  restart-hermes-gateway.bat  [profile]
rem Default profile is "avery".
rem ---------------------------------------------------------------------------

set "PROFILE=%~1"
if "%PROFILE%"=="" set "PROFILE=avery"

set "HERMES=%~dp0hermes-studio.cmd"
if not exist "%HERMES%" (
    echo [ERROR] hermes-studio.cmd not found next to this script: %HERMES%
    exit /b 127
)

echo.
echo === [1/4] Stopping gateway (profile: %PROFILE%) ===
call "%HERMES%" cli --profile %PROFILE% gateway stop

echo.
echo === [2/4] Waiting for child processes to exit ===
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo.
echo === [3/4] Removing orphaned whatsapp-bridge processes ===
rem After a clean stop any surviving bridge is by definition an orphan.
powershell -NoProfile -Command ^
  "$orphans = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*whatsapp-bridge*bridge.js*' };" ^
  "if (-not $orphans) { Write-Host '  No orphaned bridge found.'; exit 0 };" ^
  "foreach ($p in $orphans) {" ^
  "  Write-Host ('  Killing PID {0} (started {1})' -f $p.ProcessId, $p.CreationDate);" ^
  "  Start-Process -FilePath 'taskkill.exe' -ArgumentList '/F','/T','/PID',$p.ProcessId -Wait -NoNewWindow" ^
  "}"

echo.
echo === [4/4] Starting gateway ===
call "%HERMES%" cli --profile %PROFILE% gateway start

echo.
echo === Status ===
call "%HERMES%" cli --profile %PROFILE% gateway status

echo.
echo Port 3000 owner:
powershell -NoProfile -Command ^
  "$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue;" ^
  "if ($c) { $c | Select-Object LocalPort,OwningProcess | Format-Table -AutoSize | Out-String | Write-Host } else { Write-Host '  nothing listening on 3000' }"

endlocal
