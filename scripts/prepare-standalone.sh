#!/usr/bin/env bash
set -e

STANDALONE=".next/standalone"
FLAT=".next/standalone-flat"

SERVER_JS=$(find "$STANDALONE" -name "server.js" -maxdepth 5 | head -1)
if [ -z "$SERVER_JS" ]; then
  echo "[ERROR] server.js not found in standalone output"
  exit 1
fi

PROJECT_DIR=$(dirname "$SERVER_JS")

rm -rf "$FLAT"
cp -r "$PROJECT_DIR" "$FLAT"

mkdir -p "$FLAT/.next/static"
cp -r .next/static/* "$FLAT/.next/static/" 2>/dev/null || true

mkdir -p "$FLAT/public"
cp -r public/* "$FLAT/public/" 2>/dev/null || true

# Rename node_modules so .gitignore won't cause electron-builder to skip it
if [ -d "$FLAT/node_modules" ]; then
  mv "$FLAT/node_modules" "$FLAT/_node_modules"
  echo "[OK] Renamed node_modules → _node_modules"
fi

# Remove directories that shouldn't be bundled
rm -rf "$FLAT/dist-electron" "$FLAT/electron" "$FLAT/scripts" "$FLAT/.cursor"

echo "[OK] Standalone output prepared at $FLAT"
