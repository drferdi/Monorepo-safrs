#!/usr/bin/env bash
# Pulls main, rebuilds the image and restarts the closed-beta container. Run as root on the server:
#   sudo bash /opt/sentrapedia/deploy/beta/update.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
# Shared server (2026-10-19: beta runs beside medboard): pick a free loopback port and cap memory, so Sentrapedia
# stops before it can starve the other app.
HOST_PORT="${SENTRAPEDIA_HOST_PORT:-3000}"
MEMORY="${SENTRAPEDIA_MEMORY:-2500m}"

grep -q '^GEMINI_API_KEY=.\+' /etc/sentrapedia/beta.env || { echo "Set GEMINI_API_KEY in /etc/sentrapedia/beta.env first." >&2; exit 1; }
git pull --ff-only
git lfs pull
docker build -t sentrapedia:beta .
docker rm -f sentrapedia-beta >/dev/null 2>&1 || true
# Loopback only: cloudflared on this server is the only way in (Cloudflare Access checks the email first).
docker run -d --name sentrapedia-beta --restart unless-stopped --memory "$MEMORY" --memory-swap 4g -p "127.0.0.1:$HOST_PORT:3000" --env-file /etc/sentrapedia/beta.env sentrapedia:beta

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$HOST_PORT/api/mira" | grep -q '"reachable":true'; then echo "Sentrapedia beta is up on 127.0.0.1:$HOST_PORT."; exit 0; fi
  sleep 5
done
echo "Sentrapedia beta did not become ready within 5 minutes. See: docker logs sentrapedia-beta" >&2
exit 1
