#!/usr/bin/env bash
set -e

echo ""
echo "========================================"
echo "  Life Dashboard — Setup"
echo "========================================"
echo ""

# --- Check Node.js ---
if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js is not installed."
  echo ""
  echo "  Please install Node.js (v20 or later) from:"
  echo "    https://nodejs.org/"
  echo ""
  echo "  After installing, close this terminal, open a new one,"
  echo "  and run this script again."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "[ERROR] Node.js v20+ is required (you have $(node -v))."
  echo "  Please update from: https://nodejs.org/"
  exit 1
fi

echo "[OK] Node.js $(node -v) detected"

# --- Check npm ---
if ! command -v npm &> /dev/null; then
  echo "[ERROR] npm is not installed. It should come with Node.js."
  echo "  Please reinstall Node.js from: https://nodejs.org/"
  exit 1
fi

echo "[OK] npm $(npm -v) detected"
echo ""

# --- Clean stale build cache so module resolution starts from a known state ---
if [ -d ".next" ]; then
  echo "[INFO] Removing stale .next build cache..."
  rm -rf .next
fi

# --- Install dependencies ---
echo "[1/2] Installing dependencies (this may take a minute)..."
if ! npm install; then
  echo ""
  echo "[ERROR] npm install failed."
  echo ""
  echo "  If you see errors about 'node-gyp' or 'better-sqlite3':"
  echo "    - macOS: Install Xcode Command Line Tools:"
  echo "        xcode-select --install"
  echo "    - Linux: Install build essentials:"
  echo "        sudo apt install build-essential python3  (Debian/Ubuntu)"
  echo "        sudo dnf groupinstall 'Development Tools'  (Fedora)"
  echo ""
  echo "  Alternatively, make sure you are using Node.js v20 or v22 LTS"
  echo "  which includes prebuilt native binaries."
  exit 1
fi
echo ""

# Show the installed crypto library version so a regression is visible.
echo "[INFO] Installed @noble/hashes version:"
npm ls @noble/hashes --depth=0 2>/dev/null | grep "@noble/hashes" || true
echo ""

# --- Smoke check: verify the native sqlite binary actually loads ---
# This catches the #1 install failure (better-sqlite3 not built for this Node
# version) before the user hits it at runtime, without spending 1-2 minutes
# on a full `next build` that `npm run dev` discards anyway.
echo "[2/2] Verifying native modules..."
if ! node -e "require('better-sqlite3')(':memory:').close()" 2>/dev/null; then
  echo ""
  echo "[ERROR] better-sqlite3 failed to load."
  echo ""
  echo "  This usually means the native binary was not built for your Node.js"
  echo "  version. Try one of:"
  echo "    - Switch to Node.js v20 or v22 LTS (has prebuilt binaries)"
  echo "    - macOS: xcode-select --install   (then re-run this script)"
  echo "    - Linux: install build-essential / Development Tools"
  exit 1
fi
echo "[OK] better-sqlite3 loaded successfully"
echo ""

echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
echo "  To start the dashboard, run:"
echo ""
echo "    npm run dev"
echo ""
echo "  Then open http://localhost:3000 in your browser."
echo ""
echo "  The database is created automatically on first launch."
echo ""
