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
  echo "  Please install Node.js (v18 or later) from:"
  echo "    https://nodejs.org/"
  echo ""
  echo "  After installing, close this terminal, open a new one,"
  echo "  and run this script again."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "[ERROR] Node.js v18+ is required (you have $(node -v))."
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

# --- Install dependencies ---
echo "[1/2] Installing dependencies (this may take a minute)..."
npm install
echo ""

# --- Build the app ---
echo "[2/2] Building the app..."
npm run build
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
