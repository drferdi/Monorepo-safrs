REM Architected and built by codieverse+.
@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title SIDELAB v0.1.0 — Performance Test

set "APP_DIR=%~dp0..\"
set "VENV_PYTHON=%APP_DIR%.venv\Scripts\python.exe"
set "PYTHON_EXE="

if exist "%VENV_PYTHON%" (
    "%VENV_PYTHON%" --version >nul 2>&1
    if not errorlevel 1 set "PYTHON_EXE=%VENV_PYTHON%"
)
if not defined PYTHON_EXE (
    where python >nul 2>&1
    if not errorlevel 1 set "PYTHON_EXE=python"
)
if not defined PYTHON_EXE (
    echo Python tidak ditemukan. Jalankan SIDELAB.bat terlebih dahulu.
    pause & exit /b 1
)

echo.
echo ============================================================
echo  SIDELAB v0.1.0 — Performance Auto-Test
echo  20 Skenario Puskesmas
echo ============================================================
echo.

"%PYTHON_EXE%" "%APP_DIR%run_perf.py" %*
if errorlevel 1 ( echo. & echo Performance test gagal. & pause & exit /b 1 )

echo.
set /p "REPORT=Tampilkan report terbaru? (Y/N): "
if /i "!REPORT!"=="Y" "%PYTHON_EXE%" "%APP_DIR%tests\performance\reporter.py"

echo.
pause
endlocal
