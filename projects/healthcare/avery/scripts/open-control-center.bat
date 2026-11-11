@echo off
setlocal
rem ---------------------------------------------------------------------------
rem Avery Sentra - Executive Living Console (Native Electron Desktop App)
rem ---------------------------------------------------------------------------

set "CONSOLE_DIR=D:\DEV\Monorepo\projects\healthcare\avery\console"
set "ELECTRON_EXE=%CONSOLE_DIR%\node_modules\electron\dist\electron.exe"

if exist "%ELECTRON_EXE%" (
    start "" "%ELECTRON_EXE%" "%CONSOLE_DIR%"
) else (
    cd /d "%CONSOLE_DIR%"
    start "" pnpm start
)

exit /b 0
