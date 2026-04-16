# AXIS

**The Operating System of Pivot**

Local-first, voice-first AI operating layer built on [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) (Stanford SAIL).

---

## Quick Start

```bash
# 1. Run the setup script (installs Homebrew, Python, Rust, Ollama, models)
bash axis/scripts/setup.sh

# 2. Copy and configure environment variables
cp axis/.env.example axis/.env
# Edit axis/.env with your API keys

# 3. Run the smoke test (Phase 1)
cd axis && uv run python scripts/test_voice_loop.py

# 4. Run the Supabase migration (Phase 2)
# → Paste axis/migrations/001_memory_schema.sql into your Supabase SQL editor

# 5. Seed initial Pivot context (Phase 2)
cd axis && uv run python memory/seed.py

# 6. Start Axis (voice loop)
bash axis/scripts/start.sh

# 7. Launch the HUD overlay (Phase 7)
# First-time only: install Rust + Tauri CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install tauri-cli --version "^2.0"
cd axis/hud && npm install

# Then start the HUD (API bridge + Tauri window)
bash axis/scripts/start_hud.sh
```

---

## Architecture

Three custom layers on top of the OpenJarvis five-pillar foundation:

| Layer | What It Does |
|-------|-------------|
| **Memory Schema** | 5 lanes (Family, Business, Product, Faith, Self) with privacy boundaries |
| **IQ Tool Wrapper** | Every IQ product becomes a callable tool via the skill registry |
| **Persona & Voice** | Custom system prompt + ElevenLabs voice clone |

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Local Foundation — OpenJarvis + Ollama + voice loop | ✅ Complete |
| 2 | Memory & Persona — Supabase schema + 5 lanes | ✅ Complete |
| 3 | Calendar & Email — Microsoft Graph integration | ✅ Complete |
| 4 | IQ Tool Wrappers — OutreachIQ, PressureIQ, SignalIQ, CompatibleIQ | ✅ Complete |
| 5 | Cloud Fallback — Claude API for heavy reasoning | ✅ Complete |
| 6 | Vault Indexing & Specialty Tools | ✅ Complete |
| 7 | HUD & Polish — Tauri desktop shell | ✅ Complete |

---

## Project Structure

```
axis/
  configs/axis.toml        # OpenJarvis configuration
  personas/axis.md          # Custom persona prompt
  speech/elevenlabs_tts.py  # ElevenLabs TTS backend
  memory/lanes.py             # 5-lane schema + privacy rules + lane classifier
  memory/supabase_backend.py  # Supabase + pgvector memory backend
  memory/seed.py              # Seeds initial Pivot context into all 5 lanes
  migrations/
    001_memory_schema.sql   # Supabase migration — run in SQL editor
  skills/
    calendar_skill.py       # Calendar read (today/tomorrow/week)
    email_skill.py          # Email triage, draft, send
    chief_of_staff.py       # Morning brief assembler
  scripts/
    auth_msgraph.py         # One-time Microsoft Graph OAuth setup
  skills/
    outreachiq.py           # OutreachIQ — fully wired (Supabase + HTTP)
    pressureiq.py           # PressureIQ — interface ready, wire endpoints
    signaliq.py             # SignalIQ — interface ready, wire endpoints
    compatibleiq.py         # CompatibleIQ — interface ready, wire endpoints
    iq_router.py            # Intent → IQ tool dispatcher
    school_outreach.py      # School outreach call scripts (opener/voicemail/email/objection)
    devotion_generator.py   # Daily devotion generator (5-component format)
    sermon_drafting.py      # Long-form sermon content (Hook → Text → Turn)
  vault/
    scanner.py              # Document discovery + text extraction (docx/pdf/md/txt/csv)
    indexer.py              # Chunk → embed → store pipeline
  intelligence/
    cloud_router.py         # Local vs Claude API routing (privacy-aware)
    privacy_guard.py        # Entity redaction before cloud calls
  migrations/
    001_memory_schema.sql   # Supabase migration — run in SQL editor
    002_vault_index.sql     # Vault idempotency tracking table
  connectors/               # Custom connectors (Phase 3+)
  server/
    api.py                  # FastAPI bridge (port 7900) — /query, /brief, /ws/voice
  hud/
    index.html              # HUD UI (dark overlay, voice indicator, quick actions)
    src/main.js             # Frontend logic — queries API, WebSocket voice state
    src/style.css           # Glass-morphism dark theme
    src-tauri/              # Tauri v2 Rust shell
      src/lib.rs            # Always-on-top window + system tray
      tauri.conf.json       # Window: 380x680, transparent, alwaysOnTop
  scripts/
    setup.sh                # One-shot install script
    start.sh                # Launch Axis (voice loop)
    start_hud.sh            # Launch API server + Tauri HUD
    test_voice_loop.py      # Phase 1 smoke test
    index_vault.py          # Vault indexer CLI (--dry-run, --paths)
```

---

## Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Foundation | OpenJarvis | Five-pillar architecture, swappable engines |
| Local LLM | Ollama + Qwen 3 8B | Runs on Apple Silicon, no API cost |
| Cloud LLM | Claude Sonnet (Phase 5) | Heavy reasoning fallback |
| Voice In | Whisper via Sherpa-ONNX | On-device, no cloud round-trip |
| Voice Out | ElevenLabs | Custom voice cloning |
| Memory | SQLite (Phase 1) / Supabase (Phase 2) | Vector search via pgvector |
| Wake Word | Picovoice Porcupine | Custom wake word training |
| Desktop UI | Tauri (Phase 7) | Lightweight native shell |
