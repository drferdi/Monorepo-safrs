#!/usr/bin/env bash
# status.sh - Ringkasan status operasional Avery untuk operator (bukan endpoint publik).
#
# Mencetak tabel teks ringkas mengenai runtime, WhatsApp, scheduler, state
# persisten, disk, backup terakhir, versi image, dan uptime. Tidak pernah
# mencetak nomor telepon, JID, atau isi kredensial.
set -euo pipefail

AVERY_DATA_DIR="${AVERY_DATA_DIR:-/opt/avery/data}"
AVERY_BACKUP_DIR="${AVERY_BACKUP_DIR:-/opt/avery/backups}"
AVERY_KEY_FILE="${AVERY_KEY_FILE:-/opt/avery/config/backup.key}"
AVERY_LOG_DIR="${AVERY_LOG_DIR:-/opt/avery/logs}"
AVERY_STATE_DIR="${AVERY_STATE_DIR:-/opt/avery/state}"
AVERY_COMPOSE_FILE="${AVERY_COMPOSE_FILE:-/opt/avery/app/deploy/docker-compose.prod.yml}"

CONTAINER_NAME="avery-gateway"

WORST=0 # 0=OK 1=WARN 2=FAIL
bump() {
  # $1 = 1 (warn) atau 2 (fail)
  if [ "$1" -gt "$WORST" ]; then
    WORST="$1"
  fi
}

row() {
  printf '%-22s %s\n' "$1" "$2"
}

echo "=== Avery status ==="

# --- Avery runtime ---------------------------------------------------------

RUNTIME_STATE="$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$CONTAINER_NAME" 2>/dev/null || true)"

if [ -z "$RUNTIME_STATE" ]; then
  row "Avery runtime:" "FAIL (container tidak ditemukan)"
  bump 2
  CONTAINER_STATUS="missing"
  CONTAINER_HEALTH=""
else
  CONTAINER_STATUS="$(printf '%s\n' "$RUNTIME_STATE" | awk '{print $1}')"
  CONTAINER_HEALTH="$(printf '%s\n' "$RUNTIME_STATE" | awk '{print $2}')"
  if [ "$CONTAINER_STATUS" = "running" ] && { [ -z "$CONTAINER_HEALTH" ] || [ "$CONTAINER_HEALTH" = "healthy" ]; }; then
    row "Avery runtime:" "OK (status=$CONTAINER_STATUS health=${CONTAINER_HEALTH:-n/a})"
  else
    row "Avery runtime:" "FAIL (status=$CONTAINER_STATUS health=${CONTAINER_HEALTH:-n/a})"
    bump 2
  fi
fi

# --- WhatsApp ---------------------------------------------------------------

if [ "$CONTAINER_STATUS" = "running" ]; then
  WA_RESULT="$(docker exec "$CONTAINER_NAME" python3 -c '
import urllib.request, sys
try:
    with urllib.request.urlopen("http://127.0.0.1:3000/health", timeout=5) as r:
        body = r.read().decode("utf-8", "replace")
        # Cocokkan dengan tanda kutip pembuka supaya "disconnected" tidak lolos.
        sys.exit(0 if "\"connected\"" in body else 1)
except Exception:
    sys.exit(1)
' 2>/dev/null && echo "ok" || echo "fail")"

  if [ "$WA_RESULT" = "ok" ]; then
    row "WhatsApp:" "CONNECTED"
  else
    row "WhatsApp:" "DISCONNECTED"
    bump 2
  fi
else
  row "WhatsApp:" "DISCONNECTED (container tidak berjalan)"
  bump 2
fi

# --- Scheduler ----------------------------------------------------------------

HEARTBEAT_FILE="${AVERY_DATA_DIR}/profiles/avery/cron/ticker_heartbeat"

if [ -f "$HEARTBEAT_FILE" ]; then
  HB_MTIME="$(stat -c '%Y' "$HEARTBEAT_FILE" 2>/dev/null || stat -f '%m' "$HEARTBEAT_FILE" 2>/dev/null || echo 0)"
  NOW_EPOCH="$(date +%s)"
  AGE_MIN="$(( (NOW_EPOCH - HB_MTIME) / 60 ))"

  if [ "$AGE_MIN" -lt 30 ]; then
    row "Scheduler:" "OK (heartbeat ${AGE_MIN}m lalu)"
  elif [ "$AGE_MIN" -lt 120 ]; then
    row "Scheduler:" "WARN (heartbeat ${AGE_MIN}m lalu)"
    bump 1
  else
    row "Scheduler:" "FAIL (heartbeat ${AGE_MIN}m lalu)"
    bump 2
  fi
else
  row "Scheduler:" "FAIL (heartbeat tidak ditemukan)"
  bump 2
fi

# --- Persistent state -----------------------------------------------------------

STATE_DB="${AVERY_DATA_DIR}/profiles/avery/state.db"
CREDS_FILE="${AVERY_DATA_DIR}/profiles/avery/platforms/whatsapp/session/creds.json"

if [ -s "$STATE_DB" ] && [ -f "$CREDS_FILE" ]; then
  row "Persistent state:" "OK"
else
  row "Persistent state:" "FAIL (state.db atau session creds tidak lengkap)"
  bump 2
fi

# --- Disk -------------------------------------------------------------------------

DISK_LINE="$(df -P /opt/avery 2>/dev/null | tail -n 1 || true)"
if [ -n "$DISK_LINE" ]; then
  DISK_PCT="$(printf '%s\n' "$DISK_LINE" | awk '{print $5}' | tr -d '%')"
  if [ -n "$DISK_PCT" ] && [ "$DISK_PCT" -gt 85 ]; then
    row "Disk:" "WARNING (${DISK_PCT}% terpakai)"
    bump 1
  else
    row "Disk:" "OK (${DISK_PCT:-n/a}% terpakai)"
  fi
else
  row "Disk:" "WARNING (tidak bisa membaca df /opt/avery)"
  bump 1
fi

# --- Last backup --------------------------------------------------------------------

LATEST_BACKUP="$(ls -1t "$AVERY_BACKUP_DIR"/avery-data-*.tar.gz.gpg 2>/dev/null | head -n 1 || true)"

if [ -n "$LATEST_BACKUP" ]; then
  BACKUP_MTIME="$(stat -c '%Y' "$LATEST_BACKUP" 2>/dev/null || stat -f '%m' "$LATEST_BACKUP" 2>/dev/null || echo 0)"
  NOW_EPOCH="$(date +%s)"
  AGE_HOURS="$(( (NOW_EPOCH - BACKUP_MTIME) / 3600 ))"
  BACKUP_NAME="$(basename "$LATEST_BACKUP")"

  if [ "$AGE_HOURS" -gt 26 ]; then
    row "Last backup:" "WARN ($BACKUP_NAME, ${AGE_HOURS}h lalu)"
    bump 1
  else
    row "Last backup:" "OK ($BACKUP_NAME, ${AGE_HOURS}h lalu)"
  fi
else
  row "Last backup:" "WARN (tidak ada arsip backup)"
  bump 1
fi

# --- Version ------------------------------------------------------------------------

IMAGE="$(docker inspect -f '{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)"
PATCH_LABEL="$(docker inspect -f '{{index .Config.Labels "org.sentra.avery.patch"}}' "$CONTAINER_NAME" 2>/dev/null || true)"

if [ -n "$IMAGE" ]; then
  if [ -n "$PATCH_LABEL" ] && [ "$PATCH_LABEL" != "<no value>" ]; then
    row "Version:" "$IMAGE (patch: $PATCH_LABEL)"
  else
    row "Version:" "$IMAGE"
  fi
else
  row "Version:" "n/a"
fi

# --- Uptime -------------------------------------------------------------------------

STARTED_AT="$(docker inspect -f '{{.State.StartedAt}}' "$CONTAINER_NAME" 2>/dev/null || true)"

if [ -n "$STARTED_AT" ]; then
  row "Uptime since:" "$STARTED_AT"
else
  row "Uptime since:" "n/a"
fi

exit "$WORST"
