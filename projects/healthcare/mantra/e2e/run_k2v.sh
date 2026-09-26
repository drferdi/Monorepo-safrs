#!/usr/bin/env bash
# K2v visual verification — loads passwords from .env without printing values.
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
if [[ -z "${MANTRA_ADMIN_PASSWORD:-}" ]]; then
  echo "MANTRA_ADMIN_PASSWORD required for K2v." >&2
  exit 1
fi
cd /workspace/e2e
if [[ ! -d node_modules ]]; then
  npm install
  npx playwright install --with-deps chromium
fi
mkdir -p test-results ../docs/progress/assets/k2v
exec npx playwright test --config=playwright.k2v.config.ts "$@"
