#!/usr/bin/env bash
# Axis HUD Launcher
# Starts the Python API bridge + Tauri HUD overlay
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AXIS_DIR="$SCRIPT_DIR/.."
HUD_DIR="$AXIS_DIR/hud"

# ── Start the API server in the background ───────────────────────────────────
echo "[Axis] Starting API server on 127.0.0.1:7900…"
cd "$AXIS_DIR"
uv run python -m server.api &
API_PID=$!
echo "[Axis] API server PID: $API_PID"

# ── Kill API on exit ─────────────────────────────────────────────────────────
trap 'echo "[Axis] Shutting down API server (PID $API_PID)…"; kill "$API_PID" 2>/dev/null; exit' EXIT INT TERM

# ── Wait for server to be ready ──────────────────────────────────────────────
echo "[Axis] Waiting for server to start…"
sleep 2

# ── Launch HUD ───────────────────────────────────────────────────────────────
if [ -d "$HUD_DIR/src-tauri" ]; then
  echo "[Axis] Launching Tauri HUD…"
  cd "$HUD_DIR"
  npm run dev
else
  echo ""
  echo "[Axis] HUD not built yet — run:"
  echo "  cd axis/hud && npm install && npm run build"
  echo ""
  echo "[Axis] API server is running at http://127.0.0.1:7900"
  echo "       Press Ctrl+C to stop."
  # Keep alive so trap fires on Ctrl+C
  wait "$API_PID"
fi
