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
  node --run desktop:build
  if errorlevel 1 goto :failure
)

:: Jalankan langsung native electron.exe (pure GUI, zero hanging cmd window)
set "ELECTRON_EXE=%CAPSULE%\node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON_EXE%" (
  echo Menyiapkan Electron lokal Retriever...
  node "%CAPSULE%\node_modules\electron\install.js"
  if errorlevel 1 goto :failure
)

start "" "%ELECTRON_EXE%" "%CAPSULE%\dist-electron\desktop\bootstrap.js"
if errorlevel 1 goto :failure

popd
exit /b 0

:failure
set "EXIT_CODE=%ERRORLEVEL%"
popd
echo [ERROR] Retriever tidak dapat dijalankan. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%
