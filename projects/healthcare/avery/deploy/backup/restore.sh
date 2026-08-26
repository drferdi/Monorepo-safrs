#!/usr/bin/env bash
# restore.sh - Pulihkan data Avery dari arsip terenkripsi hasil backup.sh.
#
# PERINGATAN: jangan restore data lama di atas data yang lebih baru tanpa
# keputusan operator yang sadar risiko (kompatibilitas skema/sesi WhatsApp
# bisa rusak jika sesi lama menimpa sesi aktif yang lebih baru).
#
# Usage:
#   restore.sh <arsip.tar.gz.gpg> [--verify-only] [--yes]
#
#   --verify-only  dekripsi + tar -tz + laporkan isi arsip, TIDAK menyentuh
#                  data. Cocok untuk uji-restore rutin.
#   --yes          jika container avery-gateway masih berjalan, stop dulu
#                  otomatis alih-alih menolak.
set -euo pipefail

AVERY_DATA_DIR="${AVERY_DATA_DIR:-/opt/avery/data}"
AVERY_BACKUP_DIR="${AVERY_BACKUP_DIR:-/opt/avery/backups}"
AVERY_KEY_FILE="${AVERY_KEY_FILE:-/opt/avery/config/backup.key}"
AVERY_LOG_DIR="${AVERY_LOG_DIR:-/opt/avery/logs}"
AVERY_STATE_DIR="${AVERY_STATE_DIR:-/opt/avery/state}"
AVERY_COMPOSE_FILE="${AVERY_COMPOSE_FILE:-/opt/avery/app/deploy/docker-compose.prod.yml}"

CONTAINER_NAME="avery-gateway"

log_err() {
  echo "ERROR: $*" >&2
}

ARCHIVE_PATH=""
VERIFY_ONLY=0
ASSUME_YES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --verify-only)
      VERIFY_ONLY=1
      ;;
    --yes)
      ASSUME_YES=1
      ;;
    -*)
      log_err "opsi tidak dikenal: $1"
      exit 1
      ;;
    *)
      if [ -n "$ARCHIVE_PATH" ]; then
        log_err "hanya satu arsip yang boleh diberikan"
        exit 1
      fi
      ARCHIVE_PATH="$1"
      ;;
  esac
  shift
done

if [ -z "$ARCHIVE_PATH" ]; then
  log_err "usage: restore.sh <arsip.tar.gz.gpg> [--verify-only] [--yes]"
  exit 1
fi

if [ ! -f "$ARCHIVE_PATH" ]; then
  log_err "arsip tidak ditemukan: $ARCHIVE_PATH"
  exit 1
fi

if [ ! -f "$AVERY_KEY_FILE" ] || [ ! -s "$AVERY_KEY_FILE" ]; then
  log_err "key file tidak ditemukan/kosong: $AVERY_KEY_FILE"
  exit 1
fi

if ! command -v gpg >/dev/null 2>&1; then
  log_err "gpg tidak tersedia"
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  log_err "tar tidak tersedia"
  exit 1
fi

KEY_ENTRIES=(
  "./profiles/avery/platforms/whatsapp/session/creds.json"
  "./profiles/avery/state.db"
  "./profiles/avery/cron/jobs.json"
)

# --- mode verify-only --------------------------------------------------------

if [ "$VERIFY_ONLY" -eq 1 ]; then
  LISTING="$(gpg --batch --yes --decrypt --passphrase-file "$AVERY_KEY_FILE" "$ARCHIVE_PATH" 2>/dev/null | tar -tz)"

  if [ -z "$LISTING" ]; then
    log_err "gagal mendekripsi/membaca arsip: $ARCHIVE_PATH"
    exit 1
  fi

  ENTRY_COUNT="$(printf '%s\n' "$LISTING" | wc -l)"

  echo "Verifikasi arsip: $ARCHIVE_PATH"
  echo "Jumlah entri: $ENTRY_COUNT"

  for key in "${KEY_ENTRIES[@]}"; do
    if printf '%s\n' "$LISTING" | grep -qxF "$key"; then
      echo "  OK   $key"
    else
      echo "  MISS $key"
    fi
  done

  exit 0
fi

# --- mode restore penuh -------------------------------------------------------

CONTAINER_RUNNING=0
if docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q true; then
  CONTAINER_RUNNING=1
fi

if [ "$CONTAINER_RUNNING" -eq 1 ]; then
  if [ "$ASSUME_YES" -eq 1 ]; then
    docker stop "$CONTAINER_NAME" >/dev/null
  else
    log_err "container $CONTAINER_NAME masih berjalan. Stop dulu (docker stop $CONTAINER_NAME) atau jalankan ulang dengan --yes."
    exit 1
  fi
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
STAGING_DIR="${AVERY_STATE_DIR}/restore-staging-${STAMP}"
mkdir -p "$STAGING_DIR"

if ! gpg --batch --yes --decrypt --passphrase-file "$AVERY_KEY_FILE" "$ARCHIVE_PATH" 2>/dev/null \
    | tar -xz -C "$STAGING_DIR"; then
  log_err "gagal mendekripsi/ekstrak arsip ke staging: $STAGING_DIR"
  exit 1
fi

for key in "${KEY_ENTRIES[@]}"; do
  if [ ! -e "${STAGING_DIR}/${key#./}" ]; then
    log_err "sanity check gagal, entri kunci tidak ada di arsip: $key"
    exit 1
  fi
done

PRE_RESTORE_DIR="${AVERY_DATA_DIR}.pre-restore-${STAMP}"

if [ -d "$AVERY_DATA_DIR" ]; then
  mv "$AVERY_DATA_DIR" "$PRE_RESTORE_DIR"
fi

mv "$STAGING_DIR" "$AVERY_DATA_DIR"

docker start "$CONTAINER_NAME" >/dev/null 2>&1 || log_err "gagal menghidupkan container $CONTAINER_NAME setelah restore"

echo "Restore selesai."
echo "Data lama disimpan di: $PRE_RESTORE_DIR (TIDAK dihapus otomatis)"
echo "Verifikasi status dengan: deploy/scripts/status.sh"
echo "Rollback bila diperlukan: hentikan container, tukar balik direktori:"
echo "  mv \"$AVERY_DATA_DIR\" \"${AVERY_DATA_DIR}.failed-restore-${STAMP}\""
echo "  mv \"$PRE_RESTORE_DIR\" \"$AVERY_DATA_DIR\""
echo "  lalu start ulang container avery-gateway"
