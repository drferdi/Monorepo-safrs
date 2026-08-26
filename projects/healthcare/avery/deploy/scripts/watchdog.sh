#!/usr/bin/env bash
# watchdog.sh - Pantau kesehatan container avery-gateway.
#
# Gateway TIDAK me-respawn bridge Baileys yang mati, jadi Avery bisa bisu
# tanpa alarm. Skrip ini dijalankan cron host tiap 2 menit untuk
# mendeteksi status unhealthy dan restart container dengan cooldown, agar
# tidak restart loop tanpa henti.
#
# Skrip ini TIDAK menghidupkan container dari keadaan mati/exited -- itu
# tanggung jawab proses deploy, bukan watchdog.
set -euo pipefail

AVERY_DATA_DIR="${AVERY_DATA_DIR:-/opt/avery/data}"
AVERY_BACKUP_DIR="${AVERY_BACKUP_DIR:-/opt/avery/backups}"
AVERY_KEY_FILE="${AVERY_KEY_FILE:-/opt/avery/config/backup.key}"
AVERY_LOG_DIR="${AVERY_LOG_DIR:-/opt/avery/logs}"
AVERY_STATE_DIR="${AVERY_STATE_DIR:-/opt/avery/state}"
AVERY_COMPOSE_FILE="${AVERY_COMPOSE_FILE:-/opt/avery/app/deploy/docker-compose.prod.yml}"
AVERY_WATCHDOG_COOLDOWN_MIN="${AVERY_WATCHDOG_COOLDOWN_MIN:-10}"
AVERY_ALERT_CMD="${AVERY_ALERT_CMD:-}"

CONTAINER_NAME="avery-gateway"
PAUSE_FILE="${AVERY_STATE_DIR}/watchdog.pause"
LAST_RESTART_FILE="${AVERY_STATE_DIR}/watchdog.last-restart"
LOG_FILE="${AVERY_LOG_DIR}/watchdog.log"

mkdir -p "$AVERY_STATE_DIR" "$AVERY_LOG_DIR"

log_line() {
  # $1=level $2=pesan
  printf '%s [%s] %s\n' "$(date +%Y-%m-%dT%H:%M:%S%:z)" "$1" "$2" >> "$LOG_FILE"
}

send_alert() {
  # Best-effort, jangan gagalkan skrip jika alert command error.
  if [ -n "$AVERY_ALERT_CMD" ]; then
    "$AVERY_ALERT_CMD" "$1" >/dev/null 2>&1 || true
  fi
}

if [ -f "$PAUSE_FILE" ]; then
  log_line "INFO" "watchdog dijeda (pause file ada), skip pengecekan"
  exit 0
fi

INSPECT_OUTPUT="$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$CONTAINER_NAME" 2>/dev/null || true)"

if [ -z "$INSPECT_OUTPUT" ]; then
  log_line "ERROR" "container $CONTAINER_NAME tidak ditemukan"
  send_alert "avery-gateway: container tidak ditemukan"
  exit 1
fi

CONTAINER_STATUS="$(printf '%s\n' "$INSPECT_OUTPUT" | awk '{print $1}')"
CONTAINER_HEALTH="$(printf '%s\n' "$INSPECT_OUTPUT" | awk '{print $2}')"

if [ "$CONTAINER_STATUS" = "exited" ]; then
  log_line "ERROR" "container $CONTAINER_NAME dalam status exited"
  send_alert "avery-gateway: container exited"
  exit 1
fi

if [ "$CONTAINER_HEALTH" = "unhealthy" ]; then
  NOW_EPOCH="$(date +%s)"
  COOLDOWN_SEC="$((AVERY_WATCHDOG_COOLDOWN_MIN * 60))"

  LAST_RESTART_EPOCH=0
  if [ -f "$LAST_RESTART_FILE" ]; then
    LAST_RESTART_EPOCH="$(stat -c '%Y' "$LAST_RESTART_FILE" 2>/dev/null || stat -f '%m' "$LAST_RESTART_FILE" 2>/dev/null || echo 0)"
  fi

  ELAPSED="$((NOW_EPOCH - LAST_RESTART_EPOCH))"

  if [ "$ELAPSED" -ge "$COOLDOWN_SEC" ]; then
    docker restart "$CONTAINER_NAME" >/dev/null 2>&1 || true
    touch "$LAST_RESTART_FILE"
    log_line "WARN" "container $CONTAINER_NAME unhealthy, restart dijalankan"
    send_alert "avery-gateway: unhealthy, restart dijalankan"
  else
    log_line "INFO" "container $CONTAINER_NAME unhealthy, dalam cooldown (${ELAPSED}s/${COOLDOWN_SEC}s)"
  fi
fi

exit 0
