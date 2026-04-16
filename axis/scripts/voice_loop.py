"""
Axis Voice Loop — Always Listening

Runs forever. No buttons. Just talk.

Pipeline:
  Mic (continuous) → VAD → faster-whisper → Ollama → ElevenLabs → speakers
  └─ auto-mutes during playback so Axis doesn't hear itself

VAD (Voice Activity Detection):
  - Calibrates ambient noise on startup (1 second)
  - Speech starts when RMS exceeds threshold × 2.5
  - Speech ends after 1.2 seconds of silence
  - Rejects clips shorter than 0.4 seconds (coughs, clicks)

Usage:
    cd axis && uv run python scripts/voice_loop.py

Press Ctrl+C to exit.
"""

from __future__ import annotations

import os
import sys
import io
import time
import queue
import tempfile
import threading
from collections import deque
from datetime import datetime
from pathlib import Path

import numpy as np
import sounddevice as sd
from scipy.io import wavfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ── Config ────────────────────────────────────────────────────────────────────

SAMPLE_RATE       = 16000
CHANNELS          = 1
DTYPE             = np.int16
CHUNK_MS          = 30           # VAD frame size in ms
CHUNK_SIZE        = int(SAMPLE_RATE * CHUNK_MS / 1000)
SILENCE_SECONDS   = 1.2          # pause after which we assume speech ended
SILENCE_CHUNKS    = int(SILENCE_SECONDS * 1000 / CHUNK_MS)
MIN_SPEECH_SEC    = 0.4          # ignore clips shorter than this
VAD_MULTIPLIER    = 2.5          # how many × ambient noise = speech
WAKE_WORDS        = ["axis"]     # say any of these to activate
WAKE_WINDOW_SEC   = 6.0          # seconds to capture command after wake word
WHISPER_MODEL     = "base.en"
LLM_MODEL         = "qwen3:8b"
OLLAMA_URL        = "http://localhost:11434/api/generate"

# ── Terminal colours ──────────────────────────────────────────────────────────

PURPLE = "\033[95m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
GREY   = "\033[90m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def _tag(label: str, colour: str = GREY) -> str:
    ts = datetime.now().strftime("%H:%M:%S")
    return f"{GREY}[{ts}]{RESET} {colour}{BOLD}[{label}]{RESET}"


# ── Shared state ──────────────────────────────────────────────────────────────

_speaking     = threading.Event()   # True while Axis is talking
_audio_queue  = queue.Queue()       # raw audio chunks from mic callback


# ── Whisper ───────────────────────────────────────────────────────────────────

def _load_whisper():
    from faster_whisper import WhisperModel
    print(f"{_tag('AXIS', CYAN)} Loading Whisper {WHISPER_MODEL}…", flush=True)
    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    print(f"{_tag('AXIS', CYAN)} Whisper ready.", flush=True)
    return model


def _transcribe(model, audio: np.ndarray) -> str:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        wav_path = f.name
    wavfile.write(wav_path, SAMPLE_RATE, audio.astype(np.int16))
    segments, _ = model.transcribe(wav_path, beam_size=5, language="en")
    text = " ".join(s.text for s in segments).strip()
    os.unlink(wav_path)
    return text


# ── LLM ───────────────────────────────────────────────────────────────────────

_conversation: list[dict] = []


def _system_prompt() -> str:
    persona_path = Path(__file__).parent.parent / "personas" / "axis.md"
    persona = persona_path.read_text() if persona_path.exists() else ""
    now      = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
    location = os.environ.get("AXIS_LOCATION", "Atlanta, Georgia")
    return (
        f"{persona}\n\n"
        f"Current date and time: {now}\n"
        f"Current location: {location}\n\n"
        "You are in voice mode. Respond in 1–3 natural spoken sentences unless "
        "asked for something detailed. No markdown, no bullets, no headers."
    )


def _query_llm(text: str) -> str:
    import httpx
    _conversation.append({"role": "user", "content": text})
    history = "\n".join(
        f"{'You' if t['role']=='user' else 'Axis'}: {t['content']}"
        for t in _conversation[-8:]
    )
    prompt = f"[SYSTEM]\n{_system_prompt()}\n\n[CONVERSATION]\n{history}\nAxis:"
    try:
        resp = httpx.post(
            OLLAMA_URL,
            json={"model": LLM_MODEL, "prompt": prompt, "stream": False},
            timeout=90.0,
        )
        resp.raise_for_status()
        answer = resp.json().get("response", "").strip()
    except Exception as e:
        answer = f"Hit an error there, Boss: {e}"
    _conversation.append({"role": "assistant", "content": answer})
    return answer


# ── TTS ───────────────────────────────────────────────────────────────────────

def _speak(text: str) -> None:
    """Synthesize text with ElevenLabs and play via sounddevice."""
    _speaking.set()
    print(f"\n{PURPLE}{BOLD}Axis:{RESET} {text}\n", flush=True)
    try:
        api_key  = os.environ.get("ELEVENLABS_API_KEY", "")
        voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "")
        if not api_key or not voice_id:
            time.sleep(1.5)
            _speaking.clear()
            return

        from elevenlabs import ElevenLabs, VoiceSettings
        import soundfile as sf

        client = ElevenLabs(api_key=api_key)
        audio_iter = client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id="eleven_turbo_v2_5",
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.85,
                style=0.2,
                use_speaker_boost=True,
            ),
            output_format="pcm_22050",
        )
        # Collect all chunks
        raw = b"".join(audio_iter)
        audio_np = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        sd.play(audio_np, samplerate=22050)
        sd.wait()
    except Exception as e:
        print(f"{_tag('TTS', YELLOW)} error: {e}", flush=True)
        time.sleep(1.0)
    finally:
        # Brief pause after speaking so mic doesn't catch reverb
        time.sleep(0.3)
        _speaking.clear()


# ── VAD calibration ───────────────────────────────────────────────────────────

def _calibrate_noise() -> float:
    """Record 1 second of ambient audio and return RMS threshold."""
    print(f"{_tag('AXIS', CYAN)} Calibrating ambient noise — be quiet for 1 second…", flush=True)
    frames = []
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype="int16") as stream:
        for _ in range(int(SAMPLE_RATE / CHUNK_SIZE)):
            chunk, _ = stream.read(CHUNK_SIZE)
            frames.append(chunk.copy())
    ambient = np.concatenate(frames).flatten().astype(np.float32)
    rms = float(np.sqrt(np.mean(ambient ** 2)))
    threshold = max(rms * VAD_MULTIPLIER, 200.0)  # floor of 200 to avoid false triggers in silent rooms
    print(f"{_tag('AXIS', CYAN)} Ambient RMS: {rms:.0f} → Speech threshold: {threshold:.0f}", flush=True)
    return threshold


# ── Mic callback ──────────────────────────────────────────────────────────────

def _mic_callback(indata: np.ndarray, frames: int, time_info, status) -> None:
    """Called by sounddevice for every audio chunk. Drops chunks while Axis speaks."""
    if not _speaking.is_set():
        _audio_queue.put(indata.copy())


# ── Wake word check ───────────────────────────────────────────────────────────

def _contains_wake_word(text: str) -> bool:
    low = text.lower()
    return any(w in low for w in WAKE_WORDS)


def _strip_wake_word(text: str) -> str:
    """Remove 'Axis' from the start of a command if present."""
    low = text.lower().strip()
    for w in WAKE_WORDS:
        if low.startswith(w):
            remainder = text[len(w):].strip(" ,.")
            return remainder
    return text


# ── Main listen loop ──────────────────────────────────────────────────────────

def _listen_loop(whisper, threshold: float) -> None:
    """
    Two-phase loop:

    PHASE 1 — Wake word scanning:
      Always recording audio in a rolling window (~3s).
      Every 2.5 seconds, transcribes the window to check for "Axis".
      Cheap and fast — just checking for the wake word.

    PHASE 2 — Command capture:
      Triggered once "Axis" is heard.
      Records until 1.2s of silence, then sends full command to LLM.
      The command may be in the same utterance as the wake word
      ("Axis, what's on my calendar") or spoken right after.
    """
    # Rolling window for wake word detection (~3 seconds of audio)
    WAKE_WINDOW_CHUNKS = int(3.0 * 1000 / CHUNK_MS)
    wake_buffer: deque = deque(maxlen=WAKE_WINDOW_CHUNKS)
    last_wake_check = time.time()
    WAKE_CHECK_INTERVAL = 2.5   # check for wake word every N seconds

    # Command capture state
    capturing     = False
    command_buf: list[np.ndarray] = []
    silent_chunks = 0
    pre_buffer: deque = deque(maxlen=10)

    print(f"{_tag('AXIS', GREEN)} Listening for wake word: say  '{CYAN}Axis{RESET}{GREEN}'…\n", flush=True)

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="int16",
        blocksize=CHUNK_SIZE,
        callback=_mic_callback,
    ):
        while True:
            try:
                chunk = _audio_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            data = chunk.flatten().astype(np.float32)
            rms  = float(np.sqrt(np.mean(data ** 2)))

            # Always fill wake buffer and pre-buffer
            wake_buffer.append(chunk)
            pre_buffer.append(chunk)

            # ── PHASE 1: Wake word scanning ──────────────────────────────
            if not capturing:
                now = time.time()
                if now - last_wake_check >= WAKE_CHECK_INTERVAL and len(wake_buffer) > 5:
                    last_wake_check = now
                    window = np.concatenate(list(wake_buffer)).flatten()
                    # Only transcribe if there was some speech in the window
                    window_rms = float(np.sqrt(np.mean(window.astype(np.float32) ** 2)))
                    if window_rms > threshold * 0.6:
                        snip = _transcribe(whisper, window)
                        if snip:
                            print(f"{GREY}  … {snip}{RESET}", flush=True, end="\r")
                        if _contains_wake_word(snip):
                            print(f"\n{_tag('AXIS', PURPLE)} Wake word detected! Listening for command…", flush=True)
                            _play_chime()
                            capturing     = True
                            command_buf   = list(pre_buffer)  # include audio just before wake
                            silent_chunks = 0
                            wake_buffer.clear()
                continue  # don't fall through to phase 2 on same chunk

            # ── PHASE 2: Command capture ──────────────────────────────────
            command_buf.append(chunk)
            if rms < threshold:
                silent_chunks += 1
            else:
                silent_chunks = 0

            # Enforce max window so it doesn't record forever
            max_chunks = int(WAKE_WINDOW_SEC * 1000 / CHUNK_MS)
            if silent_chunks >= SILENCE_CHUNKS or len(command_buf) >= max_chunks:
                capturing = False
                audio     = np.concatenate(command_buf).flatten()
                duration  = len(audio) / SAMPLE_RATE
                command_buf   = []
                silent_chunks = 0

                if duration < MIN_SPEECH_SEC:
                    print(f"{_tag('AXIS', YELLOW)} Nothing after wake word — listening…\n", flush=True)
                    continue

                print(f"\n{_tag('STT', CYAN)} Transcribing {duration:.1f}s…", flush=True)
                text = _transcribe(whisper, audio)

                if not text or len(text.strip()) < 2:
                    print(f"{_tag('AXIS', YELLOW)} Didn't catch that — listening…\n", flush=True)
                    continue

                # Strip "Axis" from front if it carried through
                command = _strip_wake_word(text)
                if not command:
                    # Just the wake word, no command — ask what they need
                    command = "yes"  # triggers "What do you need?" response

                print(f"{GREEN}{BOLD}You:{RESET} {command}", flush=True)

                low = command.lower()
                if any(w in low for w in ["morning brief", "brief me", "what's on", "whats on", "my day", "calendar"]):
                    _handle_brief()
                else:
                    print(f"{_tag('LLM', CYAN)} Thinking…", flush=True)
                    answer = _query_llm(command)
                    _speak(answer)

                print(f"\n{_tag('AXIS', GREEN)} Listening for  '{CYAN}Axis{RESET}{GREEN}'…\n", flush=True)


# ── Chime ─────────────────────────────────────────────────────────────────────

def _play_chime() -> None:
    """Short two-tone chime to confirm wake word heard."""
    try:
        sr = 22050
        t1 = np.linspace(0, 0.08, int(sr * 0.08), False)
        t2 = np.linspace(0, 0.08, int(sr * 0.08), False)
        tone1 = (np.sin(2 * np.pi * 880 * t1) * 0.3).astype(np.float32)
        tone2 = (np.sin(2 * np.pi * 1100 * t2) * 0.3).astype(np.float32)
        chime = np.concatenate([tone1, np.zeros(int(sr * 0.03), dtype=np.float32), tone2])
        sd.play(chime, samplerate=sr)
        sd.wait()
    except Exception:
        pass


# ── Brief handler ─────────────────────────────────────────────────────────────

def _handle_brief() -> None:
    print(f"{_tag('AXIS', CYAN)} Generating brief…", flush=True)
    try:
        from skills.chief_of_staff import ChiefOfStaff
        brief = ChiefOfStaff().generate(include_memory=True)
    except Exception as e:
        brief = f"Couldn't generate the brief: {e}"
    _speak(brief)


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    print(f"\n{PURPLE}{BOLD}{'═' * 52}{RESET}")
    print(f"{PURPLE}{BOLD}  AXIS  —  Always Listening{RESET}")
    print(f"{PURPLE}{BOLD}{'═' * 52}{RESET}\n")

    whisper   = _load_whisper()
    threshold = _calibrate_noise()

    now      = datetime.now().strftime("%A, %B %d, %Y")
    location = os.environ.get("AXIS_LOCATION", "Atlanta, Georgia")
    _speak(f"Axis is live. {now}, {location}. Say my name to wake me up, Boss.")

    try:
        _listen_loop(whisper, threshold)
    except KeyboardInterrupt:
        _speak("Signing off. Take care, Boss.")
        print(f"\n{GREY}Axis stopped.{RESET}\n")


if __name__ == "__main__":
    main()
