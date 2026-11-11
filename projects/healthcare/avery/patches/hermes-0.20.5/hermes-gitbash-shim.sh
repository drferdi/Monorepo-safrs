#!/bin/sh
# Shim Git Bash untuk `hermes` — venv Windows hanya punya hermes.cmd yang tidak di-resolve bash.
# Avery FIX-06, 2026-08-23. Sumber: projects/healthcare/avery/patches/hermes-0.20.5/hermes-gitbash-shim.sh
exec "C:/Users/drfer/.hermes-web-ui/desktop-runtime/hermes/0.20.4/win-x64/python/venv/Scripts/python.exe" -m hermes_cli.main "$@"
