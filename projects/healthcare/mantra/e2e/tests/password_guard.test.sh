#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/../env_helpers.sh"

unset MANTRA_ADMIN_PASSWORD MANTRA_E2E_PASSWORD
if _e2e_require_distinct_passwords; then
  echo "guard accepted missing passwords" >&2
  exit 1
fi

MANTRA_ADMIN_PASSWORD=guard-same
MANTRA_E2E_PASSWORD=guard-same
if _e2e_require_distinct_passwords; then
  echo "guard accepted matching passwords" >&2
  exit 1
fi

MANTRA_ADMIN_PASSWORD=guard-admin
MANTRA_E2E_PASSWORD=guard-e2e
_e2e_require_distinct_passwords
