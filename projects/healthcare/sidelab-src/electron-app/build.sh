#!/usr/bin/env bash
# ============================================================
# Build script — produces everything electron-builder needs
# Run from the electron-app/ directory or the project root.
# ============================================================
set -euo pipefail

# Resolve project root regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   CDSS FKTP — Electron Build             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Build React UI ──────────────────────────────────────
echo "▶ [1/3] Building React UI (stride-dashboard)…"
cd "$ROOT"

# BASE_PATH=/ so all assets resolve from root (no /stride-dashboard prefix)
# PORT is required by vite.config but only used for dev server — any value works
PORT=3001 BASE_PATH=/ pnpm --filter @workspace/stride-dashboard build

echo "   ✓ UI built → artifacts/stride-dashboard/dist/public"

# ── 2. Build Express API server ────────────────────────────
echo "▶ [2/3] Building Express API server…"
pnpm --filter @workspace/api-server build
echo "   ✓ API built → artifacts/api-server/dist/index.mjs"

# ── 3. Install electron-app dependencies ───────────────────
echo "▶ [3/3] Installing electron-app dependencies…"
cd "$SCRIPT_DIR"
npm install --prefer-offline 2>&1 | tail -5
echo "   ✓ Done"

echo ""
echo "Build complete. Run 'npm run dist' (or dist:win / dist:mac / dist:linux)"
echo "to produce installers in electron-app/dist-electron/"
echo ""
