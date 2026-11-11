#!/usr/bin/env bash
# rollback.sh - Kembalikan container avery-gateway ke image sebelumnya.
#
# PENTING: rollback ini HANYA mengganti image container. Ia TIDAK me-restore
# data (state.db, sesi WhatsApp, jobs.json). Jika masalah disebabkan oleh
# data yang korup/berubah, restore data adalah keputusan operator TERPISAH
# lewat deploy/backup/restore.sh -- hati-hati, restore bisa menimpa data baru
# dengan data lama (lihat docs/deployment/BACKUP_RESTORE.md).
set -euo pipefail

AVERY_APP_DIR="${AVERY_APP_DIR:-/opt/avery/app}"
AVERY_COMPOSE_FILE="${AVERY_COMPOSE_FILE:-${AVERY_APP_DIR}/deploy/docker-compose.prod.yml}"
AVERY_STATE_DIR="${AVERY_STATE_DIR:-/opt/avery/state}"
AVERY_LOG_DIR="${AVERY_LOG_DIR:-/opt/avery/logs}"
AVERY_DEPLOY_TIMEOUT="${AVERY_DEPLOY_TIMEOUT:-300}"

CONTAINER_NAME="avery-gateway"
PREVIOUS_IMAGE_FILE="${AVERY_STATE_DIR}/previous_image"

mkdir -p "$AVERY_LOG_DIR"
LOG_FILE="${AVERY_LOG_DIR}/deploy.log"

log() {
  local line
  line="$(date -Iseconds) $1"
  echo "$line" | tee -a "$LOG_FILE"
}

log_err() {
  echo "ERROR: $*" | tee -a "$LOG_FILE" >&2
}

if [ ! -f "$PREVIOUS_IMAGE_FILE" ]; then
  log_err "tidak ada catatan image sebelumnya: $PREVIOUS_IMAGE_FILE. Rollback tidak bisa dilakukan otomatis."
  exit 1
fi

PREVIOUS_IMAGE="$(cat "$PREVIOUS_IMAGE_FILE")"
if [ -z "$PREVIOUS_IMAGE" ]; then
  log_err "isi $PREVIOUS_IMAGE_FILE kosong. Rollback tidak bisa dilakukan otomatis."
  exit 1
fi

log "rollback ke image sebelumnya: $PREVIOUS_IMAGE"
log "CATATAN: rollback image TIDAK me-restore data. Restore data (jika perlu) adalah langkah terpisah lewat restore.sh."

if ! HERMES_IMAGE="$PREVIOUS_IMAGE" docker compose -f "$AVERY_COMPOSE_FILE" up -d; then
  log_err "docker compose up dengan image sebelumnya gagal"
  exit 1
fi

log "menunggu health check (timeout ${AVERY_DEPLOY_TIMEOUT}s)"

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
  log_err "timeout menunggu container healthy setelah rollback (${AVERY_DEPLOY_TIMEOUT}s)"
  docker logs --tail 50 "$CONTAINER_NAME" || true
  exit 1
fi

log "rollback selesai, container $CONTAINER_NAME healthy dengan image $PREVIOUS_IMAGE"
