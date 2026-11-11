@echo off
setlocal

rem ---------------------------------------------------------------------------
rem Ganti nama capsule di monorepo tanpa memutus runtime Hermes.
rem
rem Kenapa perlu skrip, bukan "git mv" biasa: runtime Hermes berada fisik di
rem dalam capsule (runtime\), dan lima lokasi di luar repositori menunjuk ke
rem sana lewat directory junction. Bila folder di-rename lebih dulu, kelima
rem junction putus dan agen mati.
rem
rem Urutan yang dijalankan:
rem   1. Hentikan Hermes sampai port 3000 dan 8748 bebas
rem   2. Lepas junction yang menunjuk ke capsule; isi runtime tidak tersentuh
rem   3. git mv folder, sehingga riwayat git terjaga
rem   4. Pasang ulang junction ke path baru
rem   5. Perbarui penyebutan nama lama di berkas repositori
rem   6. Nyalakan gateway dan verifikasi
rem
rem Setiap langkah diperiksa. Bila satu gagal, skrip berhenti sebelum merusak
rem langkah berikutnya. Bila git mv gagal, junction dipulihkan ke path lama.
rem
rem CATATAN: berkas ini sengaja ASCII murni. Karakter non-ASCII di baris rem
rem membuat cmd salah membaca berkas dan skrip gagal dengan galat aneh
rem seperti "'ocal' is not recognized".
rem
rem Pemakaian:
rem   rename-capsule.bat <nama-lama> <nama-baru> [domain] [--whatif]
rem
rem Contoh:
rem   rename-capsule.bat medisync avery
rem   rename-capsule.bat medisync avery healthcare --whatif
rem ---------------------------------------------------------------------------

set "OLDNAME=%~1"
set "NEWNAME=%~2"
set "DOMAIN=%~3"
set "FLAG=%~4"

if "%OLDNAME%"=="" goto usage
if "%NEWNAME%"=="" goto usage

rem Argumen ketiga boleh berupa domain atau langsung --whatif.
if /i "%DOMAIN%"=="--whatif" (
    set "FLAG=--whatif"
    set "DOMAIN="
)
if "%DOMAIN%"=="" set "DOMAIN=healthcare"

set "PS1=%~dp0rename-capsule.ps1"
if not exist "%PS1%" (
    echo [ERROR] rename-capsule.ps1 tidak ditemukan di sebelah berkas ini:
    echo         %PS1%
    exit /b 127
)

set "WHATIF="
if /i "%FLAG%"=="--whatif" set "WHATIF=-WhatIf"

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -OldName "%OLDNAME%" -NewName "%NEWNAME%" -Domain "%DOMAIN%" %WHATIF%
set "RC=%ERRORLEVEL%"
endlocal & exit /b %RC%

:usage
echo.
echo Ganti nama capsule tanpa memutus runtime Hermes.
echo.
echo   rename-capsule.bat ^<nama-lama^> ^<nama-baru^> [domain] [--whatif]
echo.
echo   nama-lama   nama folder capsule sekarang, contoh: medisync
echo   nama-baru   nama folder yang dituju, contoh: avery
echo   domain      domain di bawah projects\, default: healthcare
echo   --whatif    tampilkan rencana tanpa mengubah apa pun
echo.
echo Contoh:
echo   rename-capsule.bat medisync avery
echo   rename-capsule.bat medisync avery healthcare --whatif
echo.
exit /b 2
