REM Architected and built by codieverse+.
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SIDELAB v0.1.0 — Clinical AI

set "APP_DIR=%~dp0"
set "VENV_PYTHON=%APP_DIR%.venv\Scripts\python.exe"
set "APP_ENTRY=%APP_DIR%sidelab_tui.py"
set "PYTHON_EXE="

REM ============================================================
REM Auto-setup: hanya berjalan jika .venv belum ada atau rusak
REM ============================================================
set "NEED_SETUP=0"
if not exist "%VENV_PYTHON%" set "NEED_SETUP=1"
if "%NEED_SETUP%"=="0" (
    "%VENV_PYTHON%" --version >nul 2>&1
    if errorlevel 1 set "NEED_SETUP=1"
)

if "%NEED_SETUP%"=="1" (
    call :setup
    if errorlevel 1 goto :fail
)

set "PYTHON_EXE=%VENV_PYTHON%"

REM ============================================================
REM Main loop — reconnect setelah sesi selesai
REM ============================================================
:reconnect
cls
"%PYTHON_EXE%" "%APP_ENTRY%"

if errorlevel 1 (
    echo.
    echo  SIDELAB gagal dijalankan.
    echo  Untuk diagnosis: tools\diagnose.bat
    echo.
    pause
    exit /b 1
)

echo.
set /p "RECONNECT=Kasus baru? (Y/N): "
if /i "!RECONNECT!"=="Y" goto :reconnect

echo.
echo  Goodbye — terima kasih telah menggunakan SIDELAB.
pause
exit /b 0


REM ============================================================
:setup
REM Setup pertama kali — otomatis, tanpa interaksi
REM ============================================================
echo.
echo  ============================================================
echo    SIDELAB v0.1.0 — Setup Pertama Kali
echo  ============================================================
echo.

REM [1] Python
set "SETUP_PY="
where python >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do (
        echo  [1] Python %%v ditemukan.
        set "SETUP_PY=python"
    )
) else (
    echo  [1] Python tidak ditemukan. Menginstall via winget...
    winget install --id Python.Python.3.12 -e --silent --accept-source-agreements --accept-package-agreements >nul 2>&1
    for /f "skip=2 tokens=3*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%a %%b"
    set "PATH=!PATH!;!USR_PATH!"
    where python >nul 2>&1
    if errorlevel 1 (
        echo.
        echo  GAGAL: Python tidak bisa diinstall otomatis.
        echo  Install manual dari https://python.org/downloads
        echo  Centang "Add Python to PATH", lalu jalankan ulang SIDELAB.bat.
        pause
        exit /b 1
    )
    set "SETUP_PY=python"
    echo  [1] Python berhasil diinstall.
)

REM [2] Virtual environment + dependensi
echo  [2] Menyiapkan virtual environment...
if not exist "%APP_DIR%.venv\Scripts\python.exe" (
    !SETUP_PY! -m venv "%APP_DIR%.venv"
    if errorlevel 1 (
        echo  GAGAL membuat .venv. Periksa izin folder.
        pause & exit /b 1
    )
)
"%APP_DIR%.venv\Scripts\pip" install -q --upgrade pip
"%APP_DIR%.venv\Scripts\pip" install -q -r "%APP_DIR%requirements.txt"
if errorlevel 1 (
    echo  GAGAL install dependensi. Periksa koneksi internet.
    pause & exit /b 1
)
echo  [2] Dependensi OK.

REM [3] Ollama (opsional — hanya untuk mode local offline)
echo  [3] Memeriksa Ollama...
set "OLLAMA_EXE="
where ollama >nul 2>&1
if not errorlevel 1 ( for /f %%p in ('where ollama') do set "OLLAMA_EXE=%%p" )
if not defined OLLAMA_EXE (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    )
)
if defined OLLAMA_EXE (
    powershell -NoProfile -Command "try { Invoke-RestMethod 'http://localhost:11434/api/version' -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if errorlevel 1 ( start "" "!OLLAMA_EXE!" serve & timeout /t 5 /nobreak >nul )
    "!OLLAMA_EXE!" pull nomic-embed-text >nul 2>&1
    echo  [3] Ollama OK.
) else (
    echo  [3] Ollama tidak ditemukan — mode local tidak aktif.
    echo      Cloud backend (DeepSeek, OpenAI, dll) tetap berjalan normal.
)

REM [4] Fastembed model
echo  [4] Menyiapkan fastembed model (~50 MB, sekali saja)...
"%APP_DIR%.venv\Scripts\python" -c "from fastembed import TextEmbedding; TextEmbedding('nomic-ai/nomic-embed-text-v1.5')" >nul 2>&1
echo  [4] Fastembed OK.

REM [5] Shortcut Desktop
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$sh = New-Object -ComObject WScript.Shell; $lnk = $sh.CreateShortcut([System.IO.Path]::Combine($sh.SpecialFolders('Desktop'), 'SIDELAB.lnk')); $lnk.TargetPath = '%APP_DIR%SIDELAB.bat'; $lnk.WorkingDirectory = '%APP_DIR%'; $lnk.Description = 'SIDELAB v0.1.0 Clinical AI'; $lnk.Save()" >nul 2>&1
echo  [5] Shortcut Desktop OK.

echo.
echo  ============================================================
echo    Setup selesai. Melanjutkan ke SIDELAB...
echo  ============================================================
echo.
timeout /t 2 /nobreak >nul
exit /b 0

:fail
echo.
echo  Setup gagal. Coba jalankan tools\diagnose.bat untuk diagnosis.
pause
exit /b 1
