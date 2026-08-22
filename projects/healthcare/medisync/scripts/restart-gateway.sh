#!/usr/bin/env bash
# Restart the Hermes gateway for a given profile (default: avery).
#
# Why the ordering matters: the whatsapp-bridge child process can outlive the
# gateway that spawned it. The orphan keeps holding TCP port 3000 and the
# WhatsApp session directory, so the next gateway starts, finds WhatsApp
# "not paired", and exits with code 78. Stop the gateway first, remove any
# bridge that survived, then start a fresh one.
#
# Usage: ./restart-gateway.sh [profile]

set -uo pipefail

PROFILE="${1:-avery}"
HERMES="${HERMES_BIN:-hermes}"

if ! command -v "$HERMES" >/dev/null 2>&1; then
    echo "[ERROR] Hermes CLI not found: $HERMES" >&2
    echo "Set HERMES_BIN to the correct executable and retry." >&2
    exit 127
fi

echo
echo "=== [1/4] Stopping gateway (profile: $PROFILE) ==="
"$HERMES" --profile "$PROFILE" gateway stop || true

echo
echo "=== [2/4] Waiting for child processes to exit ==="
sleep 3

echo
echo "=== [3/4] Removing orphaned whatsapp-bridge processes ==="
# After a clean stop any surviving bridge is by definition an orphan.
orphans="$(pgrep -f 'whatsapp-bridge.*bridge\.js' || true)"
if [ -z "$orphans" ]; then
    echo "  No orphaned bridge found."
else
    for pid in $orphans; do
        echo "  Killing PID $pid"
        kill -9 "$pid" 2>/dev/null || true
    done
fi

echo
echo "=== [4/4] Starting gateway ==="
"$HERMES" --profile "$PROFILE" gateway start

echo
echo "=== Status ==="
"$HERMES" --profile "$PROFILE" gateway status

echo
echo "Port 3000 owner:"
if command -v ss >/dev/null 2>&1; then
    ss -lptn 'sport = :3000' || echo "  nothing listening on 3000"
else
    echo "  ss not available; skipping port check"
fi
