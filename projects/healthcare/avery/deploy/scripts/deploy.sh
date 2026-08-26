#!/usr/bin/env bash
# deploy.sh - Alur deploy produksi Avery: code -> build -> validasi -> backup
# -> deploy -> health -> smoke test.
#
# Dijalankan di VPS setelah `git pull` di /opt/avery/app. Skrip ini TIDAK
# menarik kode; itu tanggung jawab operator (lihat docs/deployment/HOSTINGER_VPS.md).
#
# Opsi:
#   --skip-backup   lewati langkah backup.sh sebelum deploy (default: jalan).
set -euo pipefail

AVERY_APP_DIR="${AVERY_APP_DIR:-/opt/avery/app}"
AVERY_COMPOSE_FILE="${AVERY_COMPOSE_FILE:-${AVERY_APP_DIR}/deploy/docker-compose.prod.yml}"
AVERY_ENV_FILE="${AVERY_ENV_FILE:-/opt/avery/config/avery.env}"
AVERY_KEY_FILE="${AVERY_KEY_FILE:-/opt/avery/config/backup.key}"
AVERY_STATE_DIR="${AVERY_STATE_DIR:-/opt/avery/state}"
AVERY_LOG_DIR="${AVERY_LOG_DIR:-/opt/avery/logs}"
AVERY_DEPLOY_TIMEOUT="${AVERY_DEPLOY_TIMEOUT:-300}"
AVERY_DOCKERFILE="${AVERY_DOCKERFILE:-${AVERY_APP_DIR}/deploy/Dockerfile.avery}"
AVERY_IMAGE_TAG="${AVERY_IMAGE_TAG:-avery-hermes:v2026.8.19-fix02}"
AVERY_BACKUP_SCRIPT="${AVERY_BACKUP_SCRIPT:-${AVERY_APP_DIR}/deploy/backup/backup.sh}"
AVERY_SMOKE_SCRIPT="${AVERY_SMOKE_SCRIPT:-${AVERY_APP_DIR}/deploy/scripts/smoke-test.sh}"

CONTAINER_NAME="avery-gateway"
SKIP_BACKUP=0

for arg in "$@"; do
  case "$arg" in
    --skip-backup)
      SKIP_BACKUP=1
      ;;
    *)
      echo "ERROR: opsi tidak dikenal: $arg" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$AVERY_STATE_DIR" "$AVERY_LOG_DIR"
LOG_FILE="${AVERY_LOG_DIR}/deploy.log"

log() {
  # $1=pesan
  local line
  line="$(date -Iseconds) $1"
  echo "$line" | tee -a "$LOG_FILE"
}

log_err() {
  echo "ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# --- 1. prereq --------------------------------------------------------------

log "1/8 prereq check"

if ! command -v docker >/dev/null 2>&1; then
  log_err "docker tidak ditemukan"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  log_err "docker compose plugin tidak ditemukan"
  exit 1
fi

if [ ! -f "$AVERY_COMPOSE_FILE" ]; then
  log_err "file compose tidak ditemukan: $AVERY_COMPOSE_FILE"
  exit 1
fi

if [ ! -f "$AVERY_ENV_FILE" ]; then
  log_err "env file tidak ditemukan: $AVERY_ENV_FILE"
  exit 1
fi

ENV_PERM="$(stat -c '%a' "$AVERY_ENV_FILE" 2>/dev/null || stat -f '%OLp' "$AVERY_ENV_FILE" 2>/dev/null || echo '')"
if [ "$ENV_PERM" != "600" ]; then
  log "WARN: permission env file bukan 600 (terdeteksi: ${ENV_PERM:-unknown})"
fi

if [ ! -f "$AVERY_KEY_FILE" ]; then
  log_err "backup.key tidak ditemukan: $AVERY_KEY_FILE"
  exit 1
fi

# --- 2. validasi compose -----------------------------------------------------

log "2/8 validasi compose config"

if ! docker compose -f "$AVERY_COMPOSE_FILE" config --quiet; then
  log_err "validasi compose gagal"
  exit 1
fi

# --- 3. catat image berjalan saat ini (untuk rollback) ----------------------

log "3/8 catat image sebelumnya untuk rollback"

PREVIOUS_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)"
if [ -n "$PREVIOUS_IMAGE" ]; then
  echo "$PREVIOUS_IMAGE" > "${AVERY_STATE_DIR}/previous_image"
  log "image sebelumnya: $PREVIOUS_IMAGE (disimpan di ${AVERY_STATE_DIR}/previous_image)"
else
  log "tidak ada container $CONTAINER_NAME berjalan, tidak ada image sebelumnya untuk dicatat"
fi

# --- 4. backup ----------------------------------------------------------------

if [ "$SKIP_BACKUP" -eq 1 ]; then
  log "4/8 backup dilewati (--skip-backup)"
else
  log "4/8 menjalankan backup.sh"
  if ! "$AVERY_BACKUP_SCRIPT"; then
    log_err "backup gagal, deploy dihentikan"
    exit 1
  fi
fi

# --- 5. build overlay -----------------------------------------------------------

log "5/8 build image overlay $AVERY_IMAGE_TAG"

if ! docker build -f "$AVERY_DOCKERFILE" -t "$AVERY_IMAGE_TAG" "$AVERY_APP_DIR"; then
  log_err "build image gagal"
  exit 1
fi

# --- 6. up --------------------------------------------------------------------

log "6/8 docker compose up -d"

if ! docker compose -f "$AVERY_COMPOSE_FILE" up -d --remove-orphans; then
  log_err "docker compose up gagal"
  exit 1
fi

# --- 7. tunggu healthy -----------------------------------------------------------

log "7/8 menunggu health check (timeout ${AVERY_DEPLOY_TIMEOUT}s)"

ELAPSED=0
HEALTHY=0
while [ "$ELAPSED" -lt "$AVERY_DEPLOY_TIMEOUT" ]; do
  STATUS="$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo 'unknown')"
  if [ "$STATUS" = "healthy" ]; then
    HEALTHY=1
    break
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

if [ "$HEALTHY" -ne 1 ]; then
  log_err "timeout menunggu container healthy setelah ${AVERY_DEPLOY_TIMEOUT}s"
  docker logs --tail 50 "$CONTAINER_NAME" || true
  log_err "saran: jalankan deploy/scripts/rollback.sh untuk kembali ke image sebelumnya"
  exit 1
fi

log "container $CONTAINER_NAME healthy"

# --- 8. smoke test otomatis ------------------------------------------------------

log "8/8 menjalankan smoke test otomatis"

if ! "$AVERY_SMOKE_SCRIPT" --auto-only; then
  log_err "smoke test otomatis gagal, periksa output di atas"
  exit 1
fi

log "deploy selesai"
