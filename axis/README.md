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

# 3. Run the smoke test
cd axis && uv run python scripts/test_voice_loop.py

# 4. Start Axis
bash axis/scripts/start.sh
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
| 1 | Local Foundation — OpenJarvis + Ollama + voice loop | **In Progress** |
| 2 | Memory & Persona — Supabase schema + 5 lanes | Planned |
| 3 | Calendar & Email — Microsoft Graph integration | Planned |
| 4 | IQ Tool Wrappers — PressureIQ, SignalIQ, etc. | Planned |
| 5 | Cloud Fallback — Claude API for heavy reasoning | Planned |
| 6 | Vault Indexing & Specialty Tools | Planned |
| 7 | HUD & Polish — Tauri desktop shell | Planned |

---

## Project Structure

```
axis/
  configs/axis.toml        # OpenJarvis configuration
  personas/axis.md          # Custom persona prompt
  speech/elevenlabs_tts.py  # ElevenLabs TTS backend
  memory/lanes.py           # 5-lane memory schema
  skills/                   # IQ product tool wrappers (Phase 4)
  connectors/               # Custom connectors (Phase 3+)
  scripts/
    setup.sh                # One-shot install script
    start.sh                # Launch Axis
    test_voice_loop.py      # Phase 1 smoke test
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
