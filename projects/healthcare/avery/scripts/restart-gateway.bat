@echo off
setlocal
rem ---------------------------------------------------------------------------
rem Restart the Hermes gateway for a given profile (default: avery) on Windows.
rem Jalur kanonik: mendelegasikan langsung ke restart-gateway.ps1 -Execute
rem dengan proteksi junction self-healing, profile sync, dan orphan bridge cleaner.
rem ---------------------------------------------------------------------------

set "PROFILE=%~1"
if "%PROFILE%"=="" set "PROFILE=avery"

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0restart-gateway.ps1" -Profile "%PROFILE%" -Execute
exit /b %ERRORLEVEL%
