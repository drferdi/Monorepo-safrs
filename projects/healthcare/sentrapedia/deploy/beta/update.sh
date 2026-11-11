#!/usr/bin/env bash
# Pulls main, fetches its image and restarts the closed-beta container. Run as root on the server:
#   sudo bash /opt/sentrapedia/deploy/beta/update.sh
# Since 2026-10-20 CI builds the image and pushes it to private GHCR, so the server only pulls (no 12-18 minute build
# beside medboard). Other modes:
#   SENTRAPEDIA_BUILD=local            build here as before (CI down, or not logged in to ghcr.io); needs
#                                      /etc/sentrapedia/index.env for the TheOracle index artefact
#   SENTRAPEDIA_IMAGE_TAG=sha-<commit> roll back to an earlier image; skips git pull (the last five are kept)
set -euo pipefail
cd "$(dirname "$0")/../.."
# Shared server (2026-10-19: beta runs beside medboard, which holds 3000): loopback port 3201, where the Cloudflare
# Tunnel points, and a memory cap, so Sentrapedia stops before it can starve the other app.
HOST_PORT="${SENTRAPEDIA_HOST_PORT:-3201}"
MEMORY="${SENTRAPEDIA_MEMORY:-2500m}"

grep -q '^GEMINI_API_KEY=.\+' /etc/sentrapedia/beta.env || { echo "Set GEMINI_API_KEY in /etc/sentrapedia/beta.env first." >&2; exit 1; }
# Without these the app resolves to mode "unavailable" and answers 503 everywhere, which is how 2026-10-26 served a
# shut door instead of failing here. SENTRAPEDIA_AUTH_MODE is required rather than left to its "clerk" default, so
# the mode this server runs in is written down where the keys are.
for key in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY SENTRAPEDIA_AUTH_MODE; do
  grep -q "^$key=.\+" /etc/sentrapedia/beta.env || { echo "Set $key in /etc/sentrapedia/beta.env first (see deploy/beta/README.md)." >&2; exit 1; }
done
IMAGE="${SENTRAPEDIA_IMAGE:-ghcr.io/drferdi/sentrapedia-beta}"
if [ -n "${SENTRAPEDIA_IMAGE_TAG:-}" ]; then
  RUN_IMAGE="$IMAGE:$SENTRAPEDIA_IMAGE_TAG"
  docker pull "$RUN_IMAGE" || docker image inspect "$RUN_IMAGE" >/dev/null
elif [ "${SENTRAPEDIA_BUILD:-}" = local ]; then
  git pull --ff-only
  git lfs pull
  # The generated TheOracle vectors left git on 2026-10-25, and this host has no Node, so the pinned installer
  # runs in the same base image the build uses. /etc/sentrapedia/index.env holds a read-only GitHub token.
  [ -r /etc/sentrapedia/index.env ] || { echo "Put SENTRAPEDIA_INDEX_TOKEN (read access to drferdi/Sentrapedia contents) in /etc/sentrapedia/index.env; see deploy/beta/README.md." >&2; exit 1; }
  docker run --rm -v "$PWD:/app" -w /app --env-file /etc/sentrapedia/index.env node:24-bookworm-slim \
    node scripts/install-theoracle-index.mjs
  RUN_IMAGE=sentrapedia:beta
  # Next.js inlines NEXT_PUBLIC_* at build time, so the publishable key must be present here or Clerk's middleware
  # throws on every request however the runtime environment is set. It is published to browsers, not a secret;
  # CLERK_SECRET_KEY stays a runtime variable and is never a build argument.
  docker build --build-arg "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$(sed -n 's/^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=//p' /etc/sentrapedia/beta.env)" -t "$RUN_IMAGE" .
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
  if curl -fsS "http://127.0.0.1:$HOST_PORT/api/aadi" | grep -q '"reachable":true'; then echo "Sentrapedia beta ($RUN_IMAGE) is up on 127.0.0.1:$HOST_PORT."; docker image prune -f >/dev/null; exit 0; fi
  sleep 5
done
echo "Sentrapedia beta did not become ready within 5 minutes. See: docker logs sentrapedia-beta" >&2
exit 1
