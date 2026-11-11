REM Architected and built by codieverse+.
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SIDELAB — Install / Rebuild Environment

set "APP_DIR=%~dp0"
set "VENV_DIR=%APP_DIR%.venv"

echo  ============================================================
echo    SIDELAB — Instalasi / Rebuild Environment
echo  ============================================================
echo.

REM [1] Python sumber
set "SETUP_PY="
if exist "%APP_DIR%runtime\python\python.exe" set "SETUP_PY=%APP_DIR%runtime\python\python.exe"
if not defined SETUP_PY (
    where python >nul 2>&1
    if not errorlevel 1 set "SETUP_PY=python"
)
if not defined SETUP_PY (
    echo  GAGAL: Python tidak ditemukan.
    echo  Install Python 3.12 dari https://python.org/downloads
    echo  ^(centang "Add Python to PATH"^), lalu jalankan ulang install.bat.
    pause
    exit /b 1
)
echo  [1] Python ditemukan: %SETUP_PY%

REM [2] Rebuild .venv
echo  [2] Membangun ulang virtual environment...
if exist "%VENV_DIR%" rmdir /s /q "%VENV_DIR%"
"%SETUP_PY%" -m venv "%VENV_DIR%"
if errorlevel 1 (
    echo  GAGAL membuat .venv. Periksa izin folder.
    pause
    exit /b 1
)

REM [3] Dependensi
echo  [3] Menginstall dependensi...
"%VENV_DIR%\Scripts\pip" install -q --upgrade pip
"%VENV_DIR%\Scripts\pip" install -q -r "%APP_DIR%requirements.txt"
if errorlevel 1 (
    echo  GAGAL install dependensi. Periksa koneksi internet.
    pause
    exit /b 1
)
echo  [3] Dependensi OK.

REM [4] Validasi
"%VENV_DIR%\Scripts\python.exe" --version >nul 2>&1
if errorlevel 1 (
    echo  GAGAL: .venv baru tidak valid. Jalankan diagnose-sidelab.bat.
    pause
    exit /b 1
)

echo.
echo  Instalasi selesai. Jalankan run.bat untuk memulai SIDELAB.
pause
exit /b 0
