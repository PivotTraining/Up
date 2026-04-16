#!/usr/bin/env python3
"""
Axis Phase 1 Smoke Test — validates the core voice loop.

Tests:
  1. Ollama connectivity and model availability
  2. Text query → local model → response
  3. ElevenLabs TTS (if API key configured)
  4. Memory lane classification

Run: cd axis && uv run python scripts/test_voice_loop.py
"""

from __future__ import annotations

import os
import sys

# Add the axis directory to path so we can import local modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_ollama_connectivity() -> bool:
    """Test 1: Can we reach Ollama?"""
    print("\n── Test 1: Ollama Connectivity ──")
    try:
        import httpx
        resp = httpx.get("http://localhost:11434/api/tags", timeout=10.0)
        resp.raise_for_status()
        models = [m["name"] for m in resp.json().get("models", [])]
        print(f"  Connected. Available models: {models}")
        if any("qwen3" in m for m in models):
            print("  qwen3:8b found.")
            return True
        else:
            print("  WARNING: qwen3:8b not found. Run: ollama pull qwen3:8b")
            return False
    except Exception as e:
        print(f"  FAILED: {e}")
        print("  Is Ollama running? Start it with: ollama serve")
        return False


def test_local_inference() -> bool:
    """Test 2: Can the local model generate a response?"""
    print("\n── Test 2: Local Inference ──")
    try:
        import httpx
        resp = httpx.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen3:8b",
                "prompt": "In one sentence, what is Axis?",
                "stream": False,
            },
            timeout=120.0,
        )
        resp.raise_for_status()
        response_text = resp.json().get("response", "")
        print(f"  Model responded: {response_text[:200]}")
        return bool(response_text)
    except Exception as e:
        print(f"  FAILED: {e}")
        return False


def test_elevenlabs_tts() -> bool:
    """Test 3: Can ElevenLabs synthesize speech?"""
    print("\n── Test 3: ElevenLabs TTS ──")
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "")

    if not api_key:
        print("  SKIPPED: ELEVENLABS_API_KEY not set.")
        return True  # Not a failure, just not configured yet

    if not voice_id:
        print("  SKIPPED: ELEVENLABS_VOICE_ID not set.")
        return True

    try:
        from speech.elevenlabs_tts import ElevenLabsTTSBackend

        backend = ElevenLabsTTSBackend(api_key=api_key, voice_id=voice_id)
        if not backend.health():
            print("  FAILED: Backend health check failed.")
            return False

        result = backend.synthesize("Testing Axis voice loop. All systems online, Boss.")
        print(f"  Synthesized {len(result.audio)} bytes of audio ({result.format}).")

        # Save test audio
        test_path = os.path.expanduser("~/.axis/test_output.mp3")
        os.makedirs(os.path.dirname(test_path), exist_ok=True)
        with open(test_path, "wb") as f:
            f.write(result.audio)
        print(f"  Audio saved to: {test_path}")
        return True
    except Exception as e:
        print(f"  FAILED: {e}")
        return False


def test_memory_lanes() -> bool:
    """Test 4: Does the memory lane classifier work?"""
    print("\n── Test 4: Memory Lane Classification ──")
    try:
        from memory.lanes import classify_lane, can_use_cloud, MemoryLane

        tests = [
            ("How is Caleb doing in school?", [MemoryLane.FAMILY]),
            ("What's the status of PressureIQ?", [MemoryLane.PRODUCT]),
            ("Send the Tomie Lenear follow-up", [MemoryLane.BUSINESS]),
            ("Pull today's devotion scripture", [MemoryLane.FAITH]),
            ("How's my energy this week?", [MemoryLane.SELF]),
        ]

        all_passed = True
        for query, expected in tests:
            result = classify_lane(query)
            passed = all(lane in result for lane in expected)
            cloud_ok = can_use_cloud(result)
            status = "PASS" if passed else "FAIL"
            print(f"  [{status}] '{query}' -> {[l.value for l in result]} (cloud: {cloud_ok})")
            if not passed:
                all_passed = False

        return all_passed
    except Exception as e:
        print(f"  FAILED: {e}")
        return False


def main() -> None:
    print("=" * 50)
    print("  AXIS Phase 1 — Smoke Test")
    print("=" * 50)

    # Load .env if present
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        from dotenv import load_dotenv
        load_dotenv(env_path)

    results = {
        "Ollama Connectivity": test_ollama_connectivity(),
        "Local Inference": test_local_inference(),
        "ElevenLabs TTS": test_elevenlabs_tts(),
        "Memory Lanes": test_memory_lanes(),
    }

    print("\n" + "=" * 50)
    print("  RESULTS")
    print("=" * 50)
    for name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")

    failed = sum(1 for p in results.values() if not p)
    if failed:
        print(f"\n  {failed} test(s) failed.")
        sys.exit(1)
    else:
        print("\n  All tests passed. Axis Phase 1 is operational.")
        sys.exit(0)


if __name__ == "__main__":
    main()
