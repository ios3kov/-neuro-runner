#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js 20+ is required: https://nodejs.org/"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "[NEURO_RUNNER] Installing dependencies..."
  npm install
fi
echo "[NEURO_RUNNER] Starting at http://localhost:3000"
npm run dev
