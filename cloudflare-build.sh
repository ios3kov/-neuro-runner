#!/usr/bin/env bash
set -euo pipefail

TMP_B64="$(mktemp)"
TMP_ARCHIVE="$(mktemp --suffix=.tar.xz)"

cat source/source.part* > "$TMP_B64"
base64 -d "$TMP_B64" > "$TMP_ARCHIVE"
tar -xJf "$TMP_ARCHIVE" -C .

rm -rf source
rm -f .github/workflows/bootstrap-source.yml
rm -f "$TMP_B64" "$TMP_ARCHIVE"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run typecheck
npm run build
