@echo off
title Start Sentra MANTRA Server
cd /d "%~dp0"
if "%MARIADB_ROOT_PASSWORD%"=="" (
  echo Set MARIADB_ROOT_PASSWORD before starting the dev container services.
  pause
  exit /b 1
)
echo Starting Sentra MANTRA dev container services...
docker compose -f ".devcontainer\docker-compose.yml" up -d
if errorlevel 1 (
  echo.
  echo Failed to start Docker services. Make sure Docker Desktop is running.
  pause
  exit /b 1
)
echo.
echo Starting Frappe Bench inside the container...
echo Open http://localhost:8000 after the server finishes starting.
echo.
docker compose -f ".devcontainer\docker-compose.yml" exec frappe bash -lc "cd /workspace && bench start"
pause
