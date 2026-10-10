@echo off
setlocal EnableExtensions

set "CAPSULE=%~dp0."

if not exist "%CAPSULE%\package.json" (
  echo [ERROR] Capsule Retriever tidak ditemukan: %CAPSULE%
  pause
  exit /b 1
)

pushd "%CAPSULE%"

:: Rebuild bila belum ada build
if not exist "dist-electron\desktop\bootstrap.js" (
  echo Mengompilasi Retriever Desktop...
  call pnpm run desktop:build
  if errorlevel 1 goto :failure
)

:: Bersihkan instance electron lama jika ada
powershell -NoProfile -Command "Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*retriever*' } | Stop-Process -Force"

:: Jalankan langsung native electron.exe (pure GUI, zero hanging cmd window)
set "ELECTRON_EXE=%CAPSULE%\node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON_EXE%" (
  set "ELECTRON_EXE=electron"
)

start "" "%ELECTRON_EXE%" "%CAPSULE%\dist-electron\desktop\bootstrap.js"

popd
exit /b 0

:failure
set "EXIT_CODE=%ERRORLEVEL%"
popd
echo [ERROR] Retriever tidak dapat dijalankan. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%
