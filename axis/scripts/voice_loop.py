"""
Axis Voice Loop

Push-to-talk voice interface:
  SPACE  — hold to record, release to send
  Q      — quit
  B      — morning brief (no recording needed)

Pipeline:
  Mic → faster-whisper (STT) → jarvis (LLM) → ElevenLabs (TTS) → speakers

Requires: sounddevice, faster_whisper, elevenlabs, numpy, scipy
"""

from __future__ import annotations

import os
import sys
import queue
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import sounddevice as sd
from scipy.io import wavfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ── Config ────────────────────────────────────────────────────────────────────

SAMPLE_RATE   = 16000
CHANNELS      = 1
DTYPE         = "int16"
WHISPER_MODEL = "base.en"   # base.en = fast, accurate for English
OLLAMA_URL    = "http://localhost:11434/api/generate"
LLM_MODEL     = "qwen3:8b"

# ── Colours ───────────────────────────────────────────────────────────────────

PURPLE = "\033[95m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
GREY   = "\033[90m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def _log(label: str, msg: str, colour: str = GREY) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{GREY}[{ts}]{RESET} {colour}{BOLD}{label}{RESET} {msg}")


# ── STT ───────────────────────────────────────────────────────────────────────

def _load_whisper():
    from faster_whisper import WhisperModel
    _log("AXIS", f"Loading Whisper {WHISPER_MODEL}…", CYAN)
    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    _log("AXIS", "Whisper ready.", CYAN)
    return model


def _transcribe(model, audio_path: str) -> str:
    segments, _ = model.transcribe(audio_path, beam_size=5, language="en")
    text = " ".join(s.text for s in segments).strip()
    return text


# ── LLM ───────────────────────────────────────────────────────────────────────

_conversation: list[dict] = []


def _build_system_prompt() -> str:
    persona_path = Path(__file__).parent.parent / "personas" / "axis.md"
    persona = persona_path.read_text() if persona_path.exists() else ""
    now = datetime.now()
    location = os.environ.get("AXIS_LOCATION", "Atlanta, Georgia")
    date_ctx = now.strftime("%A, %B %d, %Y at %I:%M %p")
    return (
        f"{persona}\n\n"
        f"Current date and time: {date_ctx}\n"
        f"Current location: {location}\n\n"
        "You are in voice mode. Keep responses concise and conversational — "
        "1-3 sentences max unless asked for something detailed. "
        "No markdown, no bullet points, no headers. Plain spoken English only."
    )


def _query_llm(user_text: str) -> str:
    import httpx

    _conversation.append({"role": "user", "content": user_text})

    # Build prompt with conversation history
    history = ""
    for turn in _conversation[-6:]:  # last 3 exchanges
        role = "You" if turn["role"] == "user" else "Axis"
        history += f"{role}: {turn['content']}\n"

    full_prompt = (
        f"[SYSTEM]\n{_build_system_prompt()}\n\n"
        f"[CONVERSATION]\n{history}\nAxis:"
    )

    try:
        resp = httpx.post(
            OLLAMA_URL,
            json={"model": LLM_MODEL, "prompt": full_prompt, "stream": False},
            timeout=60.0,
        )
        resp.raise_for_status()
        answer = resp.json().get("response", "").strip()
    except Exception as e:
        answer = f"I ran into an issue: {e}"

    _conversation.append({"role": "assistant", "content": answer})
    return answer


# ── TTS ───────────────────────────────────────────────────────────────────────

def _speak(text: str) -> None:
    try:
        from elevenlabs import ElevenLabs, VoiceSettings, play
        api_key  = os.environ.get("ELEVENLABS_API_KEY", "")
        voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "")
        if not api_key or not voice_id:
            print(f"\n{PURPLE}Axis:{RESET} {text}\n")
            return
        client = ElevenLabs(api_key=api_key)
        audio = client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id="eleven_turbo_v2_5",
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.85,
                style=0.2,
                use_speaker_boost=True,
            ),
        )
        print(f"\n{PURPLE}Axis:{RESET} {text}\n")
        play(audio)
    except Exception as e:
        print(f"\n{PURPLE}Axis:{RESET} {text}")
        _log("TTS", f"playback error: {e}", YELLOW)


# ── Morning brief ─────────────────────────────────────────────────────────────

def _morning_brief() -> None:
    _log("AXIS", "Generating morning brief…", CYAN)
    try:
        from skills.chief_of_staff import ChiefOfStaff
        brief = ChiefOfStaff().generate(include_memory=True)
    except Exception as e:
        brief = f"Couldn't generate the brief right now: {e}"
    _speak(brief)


# ── Recording ─────────────────────────────────────────────────────────────────

def _record_until_release() -> np.ndarray:
    """Record while SPACE is held. Returns int16 numpy array."""
    frames: list[np.ndarray] = []
    recording = threading.Event()
    recording.set()

    def _callback(indata, frame_count, time_info, status):
        if recording.is_set():
            frames.append(indata.copy())

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype=DTYPE,
        callback=_callback,
    ):
        _log("REC", "Recording… release SPACE to send.", GREEN)
        try:
            import tty, termios
            fd = sys.stdin.fileno()
            old = termios.tcgetattr(fd)
            tty.setraw(fd)
            try:
                while True:
                    ch = sys.stdin.read(1)
                    if ch == " " or ch == "\r" or ch == "\n":
                        break
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old)
        except Exception:
            input()  # fallback: wait for Enter
        recording.clear()

    if not frames:
        return np.array([], dtype=np.int16)
    return np.concatenate(frames, axis=0).flatten()


# ── Main loop ─────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"\n{PURPLE}{BOLD}{'═' * 50}{RESET}")
    print(f"{PURPLE}{BOLD}  AXIS — Voice Mode{RESET}")
    print(f"{PURPLE}{BOLD}{'═' * 50}{RESET}")
    print(f"{GREY}  SPACE  → hold to record, release to send{RESET}")
    print(f"{GREY}  B      → morning brief{RESET}")
    print(f"{GREY}  Q      → quit{RESET}")
    print(f"{PURPLE}{BOLD}{'═' * 50}{RESET}\n")

    whisper = _load_whisper()

    location = os.environ.get("AXIS_LOCATION", "Atlanta, Georgia")
    now = datetime.now().strftime("%A, %B %d, %Y")
    _speak(f"Axis is live. {now}. {location}. What do you need, Boss?")

    while True:
        print(f"{CYAN}[{datetime.now().strftime('%H:%M')}]{RESET} {GREY}SPACE to talk · B for brief · Q to quit{RESET} ", end="", flush=True)

        try:
            import tty, termios
            fd = sys.stdin.fileno()
            old = termios.tcgetattr(fd)
            tty.setraw(fd)
            try:
                ch = sys.stdin.read(1)
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old)
        except Exception:
            ch = input()

        print()  # newline after key

        if ch.lower() == "q":
            _speak("Shutting down. Take care, Boss.")
            break

        if ch.lower() == "b":
            _morning_brief()
            continue

        if ch == " ":
            audio = _record_until_release()
            if len(audio) < SAMPLE_RATE * 0.5:  # less than 0.5s — skip
                _log("AXIS", "Too short — try again.", YELLOW)
                continue

            # Save to temp wav
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                wav_path = f.name
            wavfile.write(wav_path, SAMPLE_RATE, audio)

            # Transcribe
            _log("STT", "Transcribing…", CYAN)
            text = _transcribe(whisper, wav_path)
            os.unlink(wav_path)

            if not text:
                _log("AXIS", "Didn't catch that — try again.", YELLOW)
                continue

            print(f"{GREEN}{BOLD}You:{RESET} {text}")

            # Query LLM
            _log("LLM", "Thinking…", CYAN)
            answer = _query_llm(text)

            # Speak
            _speak(answer)


if __name__ == "__main__":
    main()
