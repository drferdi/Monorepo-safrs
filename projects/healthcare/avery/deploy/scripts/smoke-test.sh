#!/usr/bin/env bash
# smoke-test.sh - Verifikasi Avery setelah deploy/rollback/restart.
#
# Bagian OTOMATIS: cek teknis (container, health, WA bridge, cron, state.db,
# disk). Exit non-nol bila salah satu gagal.
# Bagian MANUAL: checklist bernomor untuk operator + Chief (perilaku nyata
# WhatsApp/cron yang tidak bisa diverifikasi mesin, sesuai misi §16).
#
# Opsi:
#   --auto-only   hanya jalankan bagian otomatis, jangan cetak checklist manual
#                 (dipakai oleh deploy.sh sebagai gerbang otomatis).
set -euo pipefail

AVERY_DATA_DIR="${AVERY_DATA_DIR:-/opt/avery/data}"

CONTAINER_NAME="avery-gateway"
AUTO_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --auto-only)
      AUTO_ONLY=1
      ;;
    *)
      echo "ERROR: opsi tidak dikenal: $arg" >&2
      exit 1
      ;;
  esac
done

FAILED=0

pass() {
  echo "PASS: $1"
}

fail() {
  echo "FAIL: $1" >&2
  FAILED=1
}

echo "=== Smoke test otomatis ==="

# 1. container running
STATUS="$(docker inspect --format '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo 'not-found')"
if [ "$STATUS" = "running" ]; then
  pass "container $CONTAINER_NAME running"
else
  fail "container $CONTAINER_NAME status: $STATUS (diharapkan running)"
fi

# 2. health healthy
HEALTH="$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo 'unknown')"
if [ "$HEALTH" = "healthy" ]; then
  pass "health check: healthy"
else
  fail "health check: $HEALTH (diharapkan healthy)"
fi

# 3. WA bridge /health "connected"
WA_HEALTH="$(docker exec "$CONTAINER_NAME" python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:3000/health', timeout=5).read().decode())" 2>/dev/null || echo '')"
# Cocokkan '"connected"' dengan kutip pembuka supaya '"disconnected"' tidak lolos.
if echo "$WA_HEALTH" | grep -q '"connected"'; then
  pass "WA bridge /health mengandung '\"connected\"'"
else
  fail "WA bridge /health tidak mengandung '\"connected\"' (output: ${WA_HEALTH:-kosong})"
fi

# 4. cron list
CRON_EXIT=0
CRON_OUTPUT="$(docker exec "$CONTAINER_NAME" hermes cron list 2>&1)" || CRON_EXIT=$?
if [ "$CRON_EXIT" -eq 0 ]; then
  pass "hermes cron list sukses"
else
  fail "hermes cron list gagal (exit $CRON_EXIT). Output apa adanya: ${CRON_OUTPUT}"
fi

# 5. state.db ada dan > 0 byte
STATE_DB_SIZE="$(docker exec "$CONTAINER_NAME" sh -c 'test -f /opt/data/state.db && stat -c %s /opt/data/state.db' 2>/dev/null || echo '0')"
if [ "${STATE_DB_SIZE:-0}" -gt 0 ] 2>/dev/null; then
  pass "state.db ada, ukuran ${STATE_DB_SIZE} byte"
else
  fail "state.db tidak ditemukan atau 0 byte di dalam container (/opt/data/state.db)"
fi

# 6. disk < 85%
DISK_PCT="$(df -P "$AVERY_DATA_DIR" 2>/dev/null | awk 'NR==2 {gsub("%","",$5); print $5}')"
if [ -n "${DISK_PCT:-}" ] && [ "$DISK_PCT" -lt 85 ] 2>/dev/null; then
  pass "disk usage ${DISK_PCT}% (< 85%)"
else
  fail "disk usage ${DISK_PCT:-tidak diketahui}% (diharapkan < 85%)"
fi

echo "=== Ringkasan otomatis ==="
if [ "$FAILED" -ne 0 ]; then
  echo "SMOKE TEST OTOMATIS GAGAL" >&2
  exit 1
fi
echo "Semua cek otomatis lulus."

if [ "$AUTO_ONLY" -eq 1 ]; then
  exit 0
fi

cat <<'EOF'

=== Checklist MANUAL (operator + Chief) ===
Centang tiap butir setelah diverifikasi dengan mata/tangan sendiri. Semua
harus PASS sebelum deploy dianggap selesai sepenuhnya.

[ ] 1. Kirim pesan WhatsApp masuk dari nomor yang diizinkan -> Avery menerima
       pesan (terlihat di log/aktivitas, bukan hanya bridge connected).
[ ] 2. Avery membalas dengan natural (bukan error, bukan diam).
[ ] 3. Reply/continuity: kirim pesan lanjutan pada thread yang sama -> Avery
       mempertahankan konteks percakapan sebelumnya.
[ ] 4. Voice note (bila fitur aktif): kirim/terima voice note berfungsi
       sebagaimana mestinya.
[ ] 5. Cron/scheduler: pastikan minimal satu job terjadwal benar-benar
       berjalan pada waktunya (bukan hanya "list" sukses).
[ ] 6. INVARIAN KRITIS: pesan hasil cron/terjadwal yang diterima penerima
       HANYA berisi konten manusiawi -- TIDAK ADA jejak cron/tool/error/
       stack trace/nama provider/nama model. Kegagalan internal tidak boleh
       bocor ke penerima.
[ ] 7. Restart container: jalankan `docker restart avery-gateway`, lalu
       ulangi cek otomatis (jalankan skrip ini lagi) -- sesi WhatsApp,
       state, dan cron harus tetap selamat (tidak perlu pairing ulang,
       state.db tetap ada, cron list tetap sukses).
[ ] 8. Reboot VPS penuh (`sudo reboot`): setelah VPS kembali online,
       container harus pulih otomatis (restart policy) tanpa intervensi
       manual, lalu ulangi cek otomatis untuk memastikan sehat.
EOF
