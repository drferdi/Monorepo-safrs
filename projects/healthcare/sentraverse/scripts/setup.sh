#!/usr/bin/env bash
# Drferdi's vision, brought to life.
# setup.sh — Developer environment bootstrap script
#
# Usage: bash scripts/setup.sh

set -euo pipefail

echo "==> Sentra AI — Developer Setup"
echo ""

# Check Node.js version
NODE_MAJOR=$(node --version | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "ERROR: Node.js 22+ is required. Current version: $(node --version)"
  echo "Install via: https://nodejs.org/en/download/ or use nvm"
  exit 1
fi
echo "  Node.js $(node --version) — OK"

# Check npm
echo "  npm $(npm --version) — OK"

# Install dependencies
echo ""
echo "==> Installing dependencies..."
npm ci

echo ""
echo "==> Setup complete!"
echo ""
echo "Start the dev server:"
echo "  npm run dev"
echo ""
echo "Production build:"
echo "  npm run build && npm run start"
echo ""
echo "Lint:"
echo "  npm run lint"
