REM Architected and built by codieverse+.
@echo off
chcp 65001 >nul
title SIDELAB v0.1.0 — Diagnostik

echo ============================================================
echo  SIDELAB v0.1.0 — Diagnostik Otomatis
echo ============================================================
echo.

REM [1] Python
echo [1] Memeriksa Python...
where python >nul 2>&1
if errorlevel 1 (
    echo     GAGAL: Python tidak ditemukan di PATH.
) else (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo     OK: %%v
)

REM [2] Virtual environment
echo.
echo [2] Memeriksa virtual environment...
if exist "%~dp0..\venv\Scripts\python.exe" (
    "%~dp0..\venv\Scripts\python.exe" --version >nul 2>&1
    if errorlevel 1 (
        echo     RUSAK: .venv ditemukan tetapi Python-nya tidak berjalan.
    ) else (
        echo     OK: .venv sehat.
    )
) else (
    echo     TIDAK ADA: .venv belum dibuat.
    echo     Jalankan SIDELAB.bat untuk setup otomatis.
)

REM [3] File aplikasi
echo.
echo [3] Memeriksa file aplikasi...
if exist "%~dp0..\sidelab_tui.py" (
    echo     OK: sidelab_tui.py ditemukan.
) else (
    echo     GAGAL: sidelab_tui.py tidak ditemukan.
)
if exist "%~dp0..\SIDELAB.bat" (
    echo     OK: SIDELAB.bat ditemukan.
) else (
    echo     GAGAL: SIDELAB.bat tidak ditemukan.
)

REM [4] Konfigurasi .env
echo.
echo [4] Memeriksa konfigurasi...
if exist "%~dp0..\.env" (
    echo     OK: .env ditemukan.
) else (
    echo     TIDAK ADA: .env belum dibuat.
    echo     Salin .env.example ke .env dan isi API key.
)

REM [5] Ollama
echo.
echo [5] Memeriksa Ollama...
where ollama >nul 2>&1
if errorlevel 1 (
    echo     INFO: Ollama tidak ditemukan — mode local tidak aktif.
    echo     Cloud backend tetap berjalan jika API key sudah diisi.
) else (
    echo     OK: Ollama ditemukan.
    powershell -NoProfile -Command "try { Invoke-RestMethod 'http://localhost:11434/api/version' -TimeoutSec 3 | Out-Null; Write-Host '     OK: Ollama service berjalan.' } catch { Write-Host '     INFO: Ollama terinstall tapi service belum berjalan.' }"
)

echo.
echo ============================================================
echo  Diagnostik selesai.
echo  Jika ada masalah, jalankan SIDELAB.bat untuk setup ulang.
echo ============================================================
echo.
pause
