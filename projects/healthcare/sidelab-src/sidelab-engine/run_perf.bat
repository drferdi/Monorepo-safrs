REM Architected and built by codieverse+.
@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title SIDELAB Performance Test

REM ========================================
REM Konfigurasi path
REM ========================================
set "APP_DIR=%~dp0"
set "VENV_PYTHON=%APP_DIR%.venv\Scripts\python.exe"
set "PYTHON_EXE="
set "VENV_STALE="

REM ========================================
REM Step 1 ^- Validasi .venv Python
REM ========================================
if exist "%VENV_PYTHON%" (
    "%VENV_PYTHON%" --version >nul 2>&1
    if errorlevel 1 (
        set "VENV_STALE=1"
    ) else (
        set "PYTHON_EXE=%VENV_PYTHON%"
    )
) else (
    set "VENV_STALE=1"
)

REM ========================================
REM Fallback: Python sistem dari PATH
REM ========================================
if not defined PYTHON_EXE (
    where python >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=python"
    )
)

REM ========================================
REM Tidak ada Python sama sekali
REM ========================================
if not defined PYTHON_EXE (
    echo.
    echo Python tidak ditemukan. Jalankan install.bat terlebih dahulu.
    pause
    exit /b 1
)

echo.
echo =========================================
echo  SIDELAB Performance Auto-Test
echo  20 Skenario Puskesmas
echo =========================================
echo.

REM ========================================
REM Default: jalankan run_perf.py
REM ========================================
"%PYTHON_EXE%" "%APP_DIR%run_perf.py" %*

if errorlevel 1 (
    echo.
    echo Performance test gagal.
    pause
    exit /b 1
)

echo.
set /p "REPORT=Tampilkan report terbaru? (Y/N): "
if /i "!REPORT!"=="Y" (
    "%PYTHON_EXE%" "%APP_DIR%tests\performance\reporter.py"
)

echo.
pause
endlocal
