#!/usr/bin/env bash
# One-time preparation of an Ubuntu 24.04 server (2 vCPU, 4 GB RAM) for the Sentrapedia closed beta. Safe on a
# server shared with other apps: it adds packages, swap, a settings file and a deploy key, and changes nothing else.
# Run as root: sudo bash setup-server.sh. Safe to run again. See deploy/beta/README.md.
set -euo pipefail

apt-get update
apt-get install -y ca-certificates curl git git-lfs docker.io
systemctl enable --now docker
git lfs install --system

# The image build (Next.js plus the 1.2 GB TheOracle model) needs more than 4 GB of memory at its peak.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# No firewall change here: the server may be shared (medboard uses Caddy on 80/443). The app listens on loopback only
# and is reached through Cloudflare Tunnel, so it needs no open port.

install -d -m 700 /etc/sentrapedia
if [ ! -f /etc/sentrapedia/beta.env ]; then
  cat > /etc/sentrapedia/beta.env <<'ENV'
GEMINI_API_KEY=
SENTRAPEDIA_PUBLIC_ORIGIN=https://beta.sentrapedia.com
AADI_MAX_CONCURRENT=3
ENV
  chmod 600 /etc/sentrapedia/beta.env
fi

if [ ! -f /root/.ssh/sentrapedia_deploy ]; then
  install -d -m 700 /root/.ssh
  ssh-keygen -t ed25519 -N "" -C "sentrapedia-beta-server" -f /root/.ssh/sentrapedia_deploy
fi
echo
echo "Next: add this key as a READ-ONLY deploy key at github.com/drferdi/Sentrapedia -> Settings -> Deploy keys:"
cat /root/.ssh/sentrapedia_deploy.pub
echo
echo "Then put the Gemini key in /etc/sentrapedia/beta.env (GEMINI_API_KEY=...)."
