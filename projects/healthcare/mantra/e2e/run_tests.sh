#!/usr/bin/env bash
# Run Playwright Beranda persona tests inside the bench container.
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
cd /workspace/e2e
if [[ ! -d node_modules ]]; then
  npm install
  npx playwright install --with-deps chromium
fi
exec npx playwright test "$@"
