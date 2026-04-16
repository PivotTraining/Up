"""
Axis HUD API Server

FastAPI bridge between the Tauri HUD frontend and the Axis Python backend.
Runs on 127.0.0.1:7900.

Endpoints:
  GET  /status          — health check + model info
  POST /query           — send a query to Axis (Ollama local)
  GET  /brief           — generate the Chief of Staff morning brief
  WS   /ws/voice        — voice state broadcast (wake/listening/thinking/speaking/idle)
"""

import asyncio
import json
import os
import sys

import httpx
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure axis parent directory is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = FastAPI(title="Axis HUD API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:*", "tauri://localhost", "http://127.0.0.1:*"],
    allow_origin_regex=r"http://localhost:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen3:8b"

# Connected WebSocket clients for voice state broadcast
voice_clients: list[WebSocket] = []


# --- Models ---

class QueryRequest(BaseModel):
    query: str
    lane: str | None = None


# --- Endpoints ---

@app.get("/status")
async def status():
    return {"status": "online", "model": MODEL, "version": "0.1.0"}


@app.post("/query")
async def query(request: QueryRequest):
    payload = {
        "model": MODEL,
        "prompt": request.query,
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(OLLAMA_URL, json=payload)
        resp.raise_for_status()
        data = resp.json()
    response_text = data.get("response", "")
    return {
        "response": response_text,
        "model": MODEL,
        "lane": request.lane or "general",
    }


@app.get("/brief")
async def brief():
    from skills.chief_of_staff import ChiefOfStaff
    cos = ChiefOfStaff()
    brief_text = await asyncio.to_thread(cos.generate)
    return {"brief": brief_text}


@app.websocket("/ws/voice")
async def voice_ws(websocket: WebSocket):
    await websocket.accept()
    voice_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Broadcast to all connected clients
            dead = []
            for client in voice_clients:
                if client is websocket:
                    continue
                try:
                    await client.send_text(json.dumps(message))
                except Exception:
                    dead.append(client)
            for d in dead:
                voice_clients.remove(d)
    except WebSocketDisconnect:
        voice_clients.remove(websocket)


# --- Entry point ---

if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=7900, reload=False)
