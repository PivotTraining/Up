#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Start Axis — launches Ollama + OpenJarvis
# ──────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[AXIS]${NC} $1"; }
warn() { echo -e "${YELLOW}[AXIS]${NC} $1"; }

AXIS_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Load environment variables
if [ -f "$AXIS_DIR/.env" ]; then
    set -a
    source "$AXIS_DIR/.env"
    set +a
    info "Environment loaded from .env"
else
    warn "No .env file found — running with defaults only."
    warn "Copy .env.example to .env and add your API keys."
fi

# Ensure Ollama is running
if ! pgrep -x "ollama" &>/dev/null; then
    warn "Starting Ollama service..."
    ollama serve &>/dev/null &
    sleep 3
fi
info "Ollama service: running"

# Verify model is available
if ollama list 2>/dev/null | grep -q "qwen3:8b"; then
    info "Model qwen3:8b: ready"
else
    warn "Model qwen3:8b not found — pulling now..."
    ollama pull qwen3:8b
fi

# Launch Axis via OpenJarvis CLI
info "Starting Axis..."
echo ""
cd "$AXIS_DIR"
exec uv run jarvis ask \
    --config "$AXIS_DIR/configs/axis.toml" \
    --persona "$AXIS_DIR/personas/axis.md" \
    --agent native_react
