#!/usr/bin/env bash
# Pulls main, fetches its image and restarts the closed-beta container. Run as root on the server:
#   sudo bash /opt/sentrapedia/deploy/beta/update.sh
# Since 2026-10-20 CI builds the image and pushes it to private GHCR, so the server only pulls (no 12-18 minute build
# beside medboard). Other modes:
#   SENTRAPEDIA_BUILD=local            build here as before (CI down, or not logged in to ghcr.io)
#   SENTRAPEDIA_IMAGE_TAG=sha-<commit> roll back to an earlier image; skips git pull (the last five are kept)
set -euo pipefail
cd "$(dirname "$0")/../.."
# Shared server (2026-10-19: beta runs beside medboard, which holds 3000): loopback port 3201, where the Cloudflare
# Tunnel points, and a memory cap, so Sentrapedia stops before it can starve the other app.
HOST_PORT="${SENTRAPEDIA_HOST_PORT:-3201}"
MEMORY="${SENTRAPEDIA_MEMORY:-2500m}"

grep -q '^GEMINI_API_KEY=.\+' /etc/sentrapedia/beta.env || { echo "Set GEMINI_API_KEY in /etc/sentrapedia/beta.env first." >&2; exit 1; }
IMAGE="${SENTRAPEDIA_IMAGE:-ghcr.io/drferdi/sentrapedia-beta}"
if [ -n "${SENTRAPEDIA_IMAGE_TAG:-}" ]; then
  RUN_IMAGE="$IMAGE:$SENTRAPEDIA_IMAGE_TAG"
  docker pull "$RUN_IMAGE" || docker image inspect "$RUN_IMAGE" >/dev/null
elif [ "${SENTRAPEDIA_BUILD:-}" = local ]; then
  git pull --ff-only
  git lfs pull
  RUN_IMAGE=sentrapedia:beta
  docker build -t "$RUN_IMAGE" .
else
  git pull --ff-only
  RUN_IMAGE="$IMAGE:sha-$(git rev-parse HEAD)"
  if ! docker pull "$RUN_IMAGE"; then
    echo "No image $RUN_IMAGE yet: CI may still be building it (Actions tab), or this server is not logged in to ghcr.io" >&2
    echo "(see deploy/beta/README.md). Retry later, or build here: sudo SENTRAPEDIA_BUILD=local bash $0" >&2
    exit 1
  fi
fi
docker rm -f sentrapedia-beta >/dev/null 2>&1 || true
# Loopback only: cloudflared on this server is the only way in (Cloudflare Access checks the email first).
docker run -d --name sentrapedia-beta --restart unless-stopped --memory "$MEMORY" --memory-swap 4g -p "127.0.0.1:$HOST_PORT:3000" --env-file /etc/sentrapedia/beta.env "$RUN_IMAGE"

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$HOST_PORT/api/mira" | grep -q '"reachable":true'; then echo "Sentrapedia beta ($RUN_IMAGE) is up on 127.0.0.1:$HOST_PORT."; docker image prune -f >/dev/null; exit 0; fi
  sleep 5
done
echo "Sentrapedia beta did not become ready within 5 minutes. See: docker logs sentrapedia-beta" >&2
exit 1
