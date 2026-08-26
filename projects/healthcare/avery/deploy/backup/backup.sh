#!/usr/bin/env bash
# backup.sh - Backup terenkripsi konsisten dari data Avery (HERMES_HOME).
#
# Alur: prereq check -> stop container avery-gateway (untuk konsistensi SQLite)
# -> tar+gpg data dir -> start ulang container -> verifikasi arsip -> prune retensi
# -> catat log ringkas.
#
# Opsi:
#   --no-stop   backup online tanpa stop container (darurat), konsistensi SQLite
#               TIDAK dijamin.
set -euo pipefail

AVERY_DATA_DIR="${AVERY_DATA_DIR:-/opt/avery/data}"
AVERY_BACKUP_DIR="${AVERY_BACKUP_DIR:-/opt/avery/backups}"
AVERY_KEY_FILE="${AVERY_KEY_FILE:-/opt/avery/config/backup.key}"
AVERY_LOG_DIR="${AVERY_LOG_DIR:-/opt/avery/logs}"
AVERY_STATE_DIR="${AVERY_STATE_DIR:-/opt/avery/state}"
AVERY_COMPOSE_FILE="${AVERY_COMPOSE_FILE:-/opt/avery/app/deploy/docker-compose.prod.yml}"
AVERY_BACKUP_RETENTION="${AVERY_BACKUP_RETENTION:-14}"

CONTAINER_NAME="avery-gateway"
NO_STOP=0

for arg in "$@"; do
  case "$arg" in
    --no-stop)
      NO_STOP=1
      ;;
    *)
      echo "ERROR: opsi tidak dikenal: $arg" >&2
      exit 1
      ;;
  esac
done

log_err() {
  echo "ERROR: $*" >&2
}

# --- prereq check ---------------------------------------------------------

if [ ! -d "$AVERY_DATA_DIR" ]; then
  log_err "direktori data tidak ditemukan: $AVERY_DATA_DIR"
  exit 1
fi

if [ ! -f "$AVERY_KEY_FILE" ]; then
  log_err "key file tidak ditemukan: $AVERY_KEY_FILE"
  exit 1
fi

if [ ! -s "$AVERY_KEY_FILE" ]; then
  log_err "key file kosong: $AVERY_KEY_FILE"
  exit 1
fi

KEY_PERM="$(stat -c '%a' "$AVERY_KEY_FILE" 2>/dev/null || stat -f '%OLp' "$AVERY_KEY_FILE" 2>/dev/null || echo '')"
if [ "$KEY_PERM" != "600" ]; then
  echo "WARN: permission key file bukan 600 (terdeteksi: ${KEY_PERM:-unknown})" >&2
fi

if ! command -v gpg >/dev/null 2>&1; then
  log_err "gpg tidak tersedia"
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  log_err "tar tidak tersedia"
  exit 1
fi

mkdir -p "$AVERY_BACKUP_DIR" "$AVERY_LOG_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="avery-data-${STAMP}.tar.gz.gpg"
ARCHIVE_PATH="${AVERY_BACKUP_DIR}/${ARCHIVE_NAME}"

# --- stop/start container -------------------------------------------------

CONTAINER_STOPPED_BY_SCRIPT=0

stop_container() {
  if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    docker stop "$CONTAINER_NAME" >/dev/null
    CONTAINER_STOPPED_BY_SCRIPT=1
  else
    log_err "container $CONTAINER_NAME tidak ditemukan, lanjut tanpa stop"
  fi
}

start_container_if_needed() {
  if [ "$CONTAINER_STOPPED_BY_SCRIPT" -eq 1 ]; then
    docker start "$CONTAINER_NAME" >/dev/null 2>&1 || log_err "gagal menghidupkan ulang container $CONTAINER_NAME"
  fi
}

trap start_container_if_needed EXIT

if [ "$NO_STOP" -eq 1 ]; then
  echo "WARN: --no-stop dipakai, backup online tanpa stop container. Konsistensi SQLite TIDAK dijamin." >&2
else
  stop_container
fi

# --- buat arsip terenkripsi ------------------------------------------------

if ! tar -czf - -C "$AVERY_DATA_DIR" \
    --exclude='./cache' \
    --exclude='./logs' \
    --exclude='./lazy-packages' \
    . \
  | gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-file "$AVERY_KEY_FILE" \
    -o "$ARCHIVE_PATH"; then
  log_err "gagal membuat arsip backup"
  rm -f "$ARCHIVE_PATH"
  exit 1
fi

# start ulang container sesegera mungkin setelah arsip terbentuk
start_container_if_needed
CONTAINER_STOPPED_BY_SCRIPT=0
trap - EXIT

# --- verifikasi arsip -------------------------------------------------------

ENTRY_COUNT="$(gpg --batch --yes --decrypt --passphrase-file "$AVERY_KEY_FILE" "$ARCHIVE_PATH" 2>/dev/null | tar -tz | wc -l)"

if [ -z "$ENTRY_COUNT" ] || [ "$ENTRY_COUNT" -eq 0 ]; then
  log_err "verifikasi arsip gagal atau arsip kosong: $ARCHIVE_PATH"
  exit 1
fi

ARCHIVE_SIZE="$(stat -c '%s' "$ARCHIVE_PATH" 2>/dev/null || stat -f '%z' "$ARCHIVE_PATH" 2>/dev/null || echo 'unknown')"

# --- prune retensi -----------------------------------------------------------

mapfile -t OLD_ARCHIVES < <(ls -1t "$AVERY_BACKUP_DIR"/avery-data-*.tar.gz.gpg 2>/dev/null | tail -n +"$((AVERY_BACKUP_RETENTION + 1))")
for old in "${OLD_ARCHIVES[@]:-}"; do
  [ -n "$old" ] || continue
  rm -f "$old"
done

# --- log ringkas --------------------------------------------------------------

LOG_LINE="$(date -Iseconds) archive=${ARCHIVE_NAME} size=${ARCHIVE_SIZE} entries=${ENTRY_COUNT}"
echo "$LOG_LINE" >> "${AVERY_LOG_DIR}/backup.log"
echo "$LOG_LINE"
