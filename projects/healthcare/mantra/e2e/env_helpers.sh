#!/usr/bin/env bash
# Load selected keys from /workspace/.env without exporting the whole file.
# Does not print values.

_e2e_env_get() {
  local key="$1"
  local file="${E2E_ENV_FILE:-/workspace/.env}"
  local line val
  [[ -f "$file" ]] || return 0
  line=$(grep -E "^${key}=" "$file" | tail -n 1) || true
  [[ -n "${line}" ]] || return 0
  val="${line#*=}"
  # Strip matching single/double quotes around the value.
  if [[ "${val}" =~ ^\"(.*)\"$ ]]; then
    val="${BASH_REMATCH[1]}"
  elif [[ "${val}" =~ ^\'(.*)\'$ ]]; then
    val="${BASH_REMATCH[1]}"
  fi
  printf '%s' "${val}"
}

_e2e_require_distinct_passwords() {
  if [[ -z "${MANTRA_ADMIN_PASSWORD:-}" || -z "${MANTRA_E2E_PASSWORD:-}" ]]; then
    echo "MANTRA_ADMIN_PASSWORD dan MANTRA_E2E_PASSWORD wajib diisi; gunakan dua password berbeda." >&2
    return 1
  fi
  if [[ "${MANTRA_ADMIN_PASSWORD}" == "${MANTRA_E2E_PASSWORD}" ]]; then
    echo "MANTRA_ADMIN_PASSWORD dan MANTRA_E2E_PASSWORD harus berbeda." >&2
    return 1
  fi
}
