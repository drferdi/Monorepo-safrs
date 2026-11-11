REM Architected and built by codieverse+.
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SIDELAB v0.1.0 — Clinical AI

set "APP_DIR=%~dp0"
set "VENV_PYTHON=%APP_DIR%.venv\Scripts\python.exe"
set "EMBEDDED_PYTHON=%APP_DIR%runtime\python\python.exe"
set "APP_ENTRY=%APP_DIR%sidelab_tui.py"
set "PYTHON_EXE="
set "VENV_STALE="

REM ============================================================
REM [1] Validasi .venv — bukan hanya cek file ada, tapi benar-benar jalan
REM ============================================================
if exist "%VENV_PYTHON%" (
    "%VENV_PYTHON%" --version >nul 2>&1
    if errorlevel 1 (
        echo  Virtual environment di .venv terdeteksi tetapi rusak ^(stale^).
        set "VENV_STALE=1"
    ) else (
        set "PYTHON_EXE=%VENV_PYTHON%"
    )
) else (
    echo  Virtual environment .venv tidak ditemukan.
    set "VENV_STALE=1"
)

REM ============================================================
REM [2] Fallback: Python bawaan (embedded runtime dari installer)
REM ============================================================
if not defined PYTHON_EXE (
    if exist "%EMBEDDED_PYTHON%" (
        "%EMBEDDED_PYTHON%" --version >nul 2>&1
        if not errorlevel 1 (
            echo  Fallback: menggunakan Python bawaan dari paket installer.
            set "PYTHON_EXE=%EMBEDDED_PYTHON%"
        )
    )
)

REM ============================================================
REM [3] Fallback: Python sistem dari PATH
REM ============================================================
if not defined PYTHON_EXE (
    where python >nul 2>&1
    if not errorlevel 1 (
        echo  Fallback: menggunakan Python sistem dari PATH.
        set "PYTHON_EXE=python"
    )
)

REM ============================================================
REM [4] Semua jalur gagal — panduan pemulihan eksplisit
REM ============================================================
if not defined PYTHON_EXE (
    echo.
    echo  Semua jalur runtime gagal. SIDELAB tidak dapat dimulai.
    echo.
    echo  Langkah pemulihan:
    echo    1. Jalankan diagnose-sidelab.bat untuk diagnosis otomatis.
    echo    2. Jalankan install.bat untuk membangun ulang environment.
    echo    3. Atau jalankan ulang installer resmi SIDELAB.
    echo    4. Install Python 3.12 manual dari https://python.org/downloads
    echo       ^(centang "Add Python to PATH"^), lalu jalankan ulang run.bat.
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM [5] Pengumuman runtime yang dipakai
REM ============================================================
if defined VENV_STALE (
    echo  Runtime aktif: %PYTHON_EXE% ^(fallback dari .venv yang rusak^)
    echo  Saran: jalankan install.bat dari installer untuk memperbaiki .venv,
    echo  atau jalankan diagnose-sidelab.bat untuk diagnosis.
) else (
    echo  Runtime aktif: %PYTHON_EXE%
)

REM ============================================================
REM Main loop — reconnect setelah sesi selesai
REM ============================================================
:reconnect
cls
"%PYTHON_EXE%" "%APP_ENTRY%"

if errorlevel 1 (
    echo.
    echo  SIDELAB gagal dijalankan.
    echo.
    echo  Langkah pemulihan:
    echo    1. Jalankan diagnose-sidelab.bat untuk diagnosis otomatis.
    echo    2. Jalankan install.bat untuk membangun ulang environment.
    echo    3. Periksa koneksi internet dan file .env Anda.
    echo.
    pause
    exit /b 1
)

echo.
echo  Session ended.
set /p "RECONNECT=Kasus baru? (Y/N): "
if /i "!RECONNECT!"=="Y" goto :reconnect

echo.
echo  Goodbye — terima kasih telah menggunakan SIDELAB.
pause
exit /b 0
