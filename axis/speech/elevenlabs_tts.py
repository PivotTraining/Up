"""ElevenLabs TTS backend for Axis — cloud-based voice synthesis via ElevenLabs API."""

from __future__ import annotations

import os
from typing import Any, Dict, List

import httpx

from openjarvis.core.registry import TTSRegistry
from openjarvis.speech.tts import TTSBackend, TTSResult

_ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1"


def _elevenlabs_tts_request(
    api_key: str,
    text: str,
    voice_id: str,
    model_id: str = "eleven_multilingual_v2",
    output_format: str = "mp3_44100_128",
    stability: float = 0.5,
    similarity_boost: float = 0.75,
    style: float = 0.0,
) -> bytes:
    """Call the ElevenLabs TTS API and return raw audio bytes."""
    resp = httpx.post(
        f"{_ELEVENLABS_API_BASE}/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": style,
                "use_speaker_boost": True,
            },
        },
        params={"output_format": output_format},
        timeout=120.0,
    )
    resp.raise_for_status()
    return resp.content


def _elevenlabs_list_voices(api_key: str) -> List[Dict[str, Any]]:
    """Fetch available voices from ElevenLabs API."""
    resp = httpx.get(
        f"{_ELEVENLABS_API_BASE}/voices",
        headers={"xi-api-key": api_key},
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json().get("voices", [])


@TTSRegistry.register("elevenlabs")
class ElevenLabsTTSBackend(TTSBackend):
    """ElevenLabs TTS backend — cloud synthesis with custom voice cloning."""

    backend_id = "elevenlabs"

    def __init__(
        self,
        *,
        api_key: str = "",
        voice_id: str = "",
        model_id: str = "eleven_multilingual_v2",
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
    ) -> None:
        self._api_key = api_key or os.environ.get("ELEVENLABS_API_KEY", "")
        self._voice_id = voice_id or os.environ.get("ELEVENLABS_VOICE_ID", "")
        self._model_id = model_id
        self._stability = stability
        self._similarity_boost = similarity_boost
        self._style = style

    def synthesize(
        self,
        text: str,
        *,
        voice_id: str = "",
        speed: float = 1.0,
        output_format: str = "mp3",
    ) -> TTSResult:
        if not self._api_key:
            raise RuntimeError("ELEVENLABS_API_KEY not set")

        resolved_voice = voice_id or self._voice_id
        if not resolved_voice:
            raise RuntimeError(
                "No voice_id provided — set ELEVENLABS_VOICE_ID or pass voice_id"
            )

        # Map simple format names to ElevenLabs output format strings
        format_map = {
            "mp3": "mp3_44100_128",
            "pcm": "pcm_24000",
            "opus": "opus_48000_32",
        }
        el_format = format_map.get(output_format, output_format)

        audio = _elevenlabs_tts_request(
            self._api_key,
            text,
            voice_id=resolved_voice,
            model_id=self._model_id,
            output_format=el_format,
            stability=self._stability,
            similarity_boost=self._similarity_boost,
            style=self._style,
        )

        return TTSResult(
            audio=audio,
            format=output_format,
            voice_id=resolved_voice,
            sample_rate=44100 if "44100" in el_format else 24000,
            metadata={
                "backend": "elevenlabs",
                "model_id": self._model_id,
                "stability": self._stability,
                "similarity_boost": self._similarity_boost,
            },
        )

    def available_voices(self) -> List[str]:
        if not self._api_key:
            return []
        voices = _elevenlabs_list_voices(self._api_key)
        return [v.get("voice_id", "") for v in voices if v.get("voice_id")]

    def health(self) -> bool:
        return bool(self._api_key and self._voice_id)
