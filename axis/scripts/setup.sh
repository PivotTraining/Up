#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Axis Phase 1 Setup Script
# Idempotent — safe to run multiple times
# ──────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[AXIS]${NC} $1"; }
warn()  { echo -e "${YELLOW}[AXIS]${NC} $1"; }
error() { echo -e "${RED}[AXIS]${NC} $1"; }

AXIS_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── 1. Homebrew ──────────────────────────────
if command -v brew &>/dev/null; then
    info "Homebrew already installed."
else
    warn "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    info "Homebrew installed."
fi

# ── 2. Python 3.12 ──────────────────────────
if python3 --version 2>&1 | grep -q "3.1[2-9]"; then
    info "Python 3.12+ already installed: $(python3 --version)"
else
    warn "Installing Python 3.12..."
    brew install python@3.12
    info "Python 3.12 installed."
fi

# ── 3. Rust toolchain ───────────────────────
if command -v rustc &>/dev/null; then
    info "Rust already installed: $(rustc --version)"
else
    warn "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    info "Rust installed."
fi

# ── 4. uv package manager ───────────────────
if command -v uv &>/dev/null; then
    info "uv already installed: $(uv --version)"
else
    warn "Installing uv..."
    brew install uv
    info "uv installed."
fi

# ── 5. Ollama ────────────────────────────────
if command -v ollama &>/dev/null; then
    info "Ollama already installed."
else
    warn "Installing Ollama..."
    brew install ollama
    info "Ollama installed."
fi

# ── 6. Start Ollama (if not running) ────────
if ! pgrep -x "ollama" &>/dev/null; then
    warn "Starting Ollama service..."
    ollama serve &>/dev/null &
    sleep 3
    info "Ollama service started."
else
    info "Ollama service already running."
fi

# ── 7. Pull models ──────────────────────────
info "Pulling qwen3:8b (this may take a few minutes on first run)..."
ollama pull qwen3:8b

info "Pulling nomic-embed-text for embeddings..."
ollama pull nomic-embed-text

# ── 8. Install Axis Python dependencies ─────
info "Installing Axis Python dependencies..."
cd "$AXIS_DIR"
uv sync

# ── 9. Build OpenJarvis Rust extension ──────
info "Building OpenJarvis Rust extension..."
uv run maturin develop -m rust/crates/openjarvis-python/Cargo.toml 2>/dev/null || {
    warn "Rust extension build skipped — may not be required for Phase 1."
}

# ── 10. Create local data directory ─────────
mkdir -p "$HOME/.axis"
info "Local data directory: ~/.axis"

# ── Done ─────────────────────────────────────
echo ""
info "=========================================="
info "  Axis Phase 1 setup complete."
info "=========================================="
echo ""
info "Next steps:"
info "  1. Copy axis/.env.example to axis/.env and fill in your API keys"
info "  2. Run: bash axis/scripts/start.sh"
info "  3. Test: cd axis && uv run python scripts/test_voice_loop.py"
echo ""
