#!/usr/bin/env bash

set -Eeuo pipefail

readonly DOWNLOAD_BASE="https://raw.githubusercontent.com/drferdii/sentrabot/main/infra/compose"
readonly COMPOSE_FILE="docker-compose.images.yml"
readonly ENV_EXAMPLE=".env.images.example"
readonly ENV_FILE=".env"

prepare_only=false
if [[ "${1:-}" == "--prepare-only" && $# -eq 1 ]]; then
  prepare_only=true
elif [[ $# -ne 0 ]]; then
  echo "Usage: bash install-images.sh [--prepare-only]" >&2
  exit 2
fi

temporary_file=""
cleanup() {
  if [[ -n "$temporary_file" ]]; then
    rm -f -- "$temporary_file"
  fi
}
trap cleanup EXIT

fail() {
  echo "Sentra Bot setup failed: $*" >&2
  exit 1
}

for command_name in curl docker openssl; do
  command -v "$command_name" >/dev/null 2>&1 || fail "'$command_name' is required."
done

docker compose version >/dev/null 2>&1 || fail "the Docker Compose plugin is required."

download() {
  local filename="$1"

  temporary_file=$(mktemp "./${filename}.tmp.XXXXXX")
  if ! curl -fsSL "${DOWNLOAD_BASE}/${filename}" -o "$temporary_file"; then
    fail "could not download ${filename}."
  fi
  mv -- "$temporary_file" "$filename"
  temporary_file=""
}

create_env() {
  umask 077
  temporary_file=$(mktemp "./${ENV_FILE}.tmp.XXXXXX")

  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      "POSTGRES_PASSWORD=")
        printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 16)"
        ;;
      "BETTER_AUTH_SECRET=")
        printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -hex 32)"
        ;;
      "ENCRYPTION_KEY=")
        printf 'ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)"
        ;;
      "SCREEN_PROXY_SECRET=")
        printf 'SCREEN_PROXY_SECRET=%s\n' "$(openssl rand -hex 32)"
        ;;
      "SANDBOX_SUPERVISOR_TOKEN=")
        printf 'SANDBOX_SUPERVISOR_TOKEN=%s\n' "$(openssl rand -hex 32)"
        ;;
      *)
        printf '%s\n' "$line"
        ;;
    esac
  done < "$ENV_EXAMPLE" > "$temporary_file"

  chmod 600 "$temporary_file"
  mv -- "$temporary_file" "$ENV_FILE"
  temporary_file=""
  echo "Created .env with random secrets."
}

validate_required_secrets() {
  if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -f - config --environment <<'YAML' | awk '
    BEGIN {
      required["POSTGRES_PASSWORD"] = 1
      required["BETTER_AUTH_SECRET"] = 1
      required["ENCRYPTION_KEY"] = 1
      required["SCREEN_PROXY_SECRET"] = 1
      required["SANDBOX_SUPERVISOR_TOKEN"] = 1
    }
    {
      name = $0
      sub(/=.*/, "", name)
      if (!(name in required)) next
      seen[name]++

      value = $0
      sub(/^[^=]*=/, "", value)
      gsub(/[[:space:]]/, "", value)
      if (value != "") nonempty[name]++
    }
    END {
      for (name in required) {
        if (seen[name] != 1 || nonempty[name] != 1) exit 1
      }
    }
  '
services:
  api:
    environment:
      _SENTRABOT_VALIDATE_POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
      _SENTRABOT_VALIDATE_BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?Set BETTER_AUTH_SECRET in .env}
      _SENTRABOT_VALIDATE_ENCRYPTION_KEY: ${ENCRYPTION_KEY:?Set ENCRYPTION_KEY in .env}
      _SENTRABOT_VALIDATE_SCREEN_PROXY_SECRET: ${SCREEN_PROXY_SECRET:?Set SCREEN_PROXY_SECRET in .env}
      _SENTRABOT_VALIDATE_SANDBOX_SUPERVISOR_TOKEN: ${SANDBOX_SUPERVISOR_TOKEN:?Set SANDBOX_SUPERVISOR_TOKEN in .env}
YAML
  then
    fail "set every required secret in .env to a non-empty value."
  fi
}

download "$COMPOSE_FILE"
download "$ENV_EXAMPLE"

if [[ -e "$ENV_FILE" ]]; then
  echo "Keeping existing .env."
else
  create_env
fi

validate_required_secrets

if [[ "$prepare_only" == true ]]; then
  echo "Sentra Bot files are ready. Edit .env, then run: bash install-images.sh"
  exit 0
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo "Sentra Bot is starting at http://127.0.0.1:5173"
