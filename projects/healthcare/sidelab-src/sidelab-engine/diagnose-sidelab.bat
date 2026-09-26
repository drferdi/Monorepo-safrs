REM Architected and built by codieverse+.
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SIDELAB — Diagnosis

set "APP_DIR=%~dp0"

echo  ============================================================
echo    SIDELAB — Diagnosis Otomatis
echo  ============================================================
echo.

REM [1] Entrypoint TUI
if exist "%APP_DIR%sidelab_tui.py" (
    echo  [OK] Entrypoint sidelab_tui.py ditemukan.
) else (
    echo  [GAGAL] sidelab_tui.py tidak ditemukan di %APP_DIR%.
)

REM [2] Virtual environment
if exist "%APP_DIR%.venv\Scripts\python.exe" (
    "%APP_DIR%.venv\Scripts\python.exe" --version >nul 2>&1
    if errorlevel 1 (
        echo  [GAGAL] .venv ada tetapi rusak. Jalankan install.bat.
    ) else (
        echo  [OK] .venv sehat.
    )
) else (
    echo  [INFO] .venv belum ada. Jalankan install.bat untuk setup.
)

REM [3] Python sistem
where python >nul 2>&1
if errorlevel 1 (
    echo  [GAGAL] Python tidak ditemukan di PATH.
) else (
    echo  [OK] Python sistem tersedia di PATH.
)

REM [4] File konfigurasi
if exist "%APP_DIR%.env" (
    echo  [OK] File .env ditemukan.
) else (
    echo  [INFO] File .env belum ada — salin dari .env.example lalu isi API key.
)

echo.
echo  Diagnosis selesai.
pause
exit /b 0
