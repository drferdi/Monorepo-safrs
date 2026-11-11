#!/usr/bin/env bash
# Seed E2E users. Requires MANTRA_E2E_PASSWORD (no fallback to admin password).
set -euo pipefail
cd /workspace
# shellcheck disable=SC1091
source /workspace/e2e/env_helpers.sh
if [[ -z "${MANTRA_ADMIN_PASSWORD:-}" ]]; then
  MANTRA_ADMIN_PASSWORD="$(_e2e_env_get MANTRA_ADMIN_PASSWORD)"
  export MANTRA_ADMIN_PASSWORD
fi
if [[ -z "${MANTRA_E2E_PASSWORD:-}" ]]; then
  MANTRA_E2E_PASSWORD="$(_e2e_env_get MANTRA_E2E_PASSWORD)"
  export MANTRA_E2E_PASSWORD
fi
_e2e_require_distinct_passwords || exit 1
exec ./env/bin/python e2e/run_setup.py
