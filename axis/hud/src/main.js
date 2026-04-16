/**
 * Axis HUD — Frontend Logic
 * Vanilla JS connecting the Tauri overlay to the Python API bridge.
 */

const API_BASE = "http://127.0.0.1:7900";
const MAX_MESSAGES = 6; // keep last 3 exchanges (2 bubbles each)

// ── Tauri window import (graceful fallback) ─────────────────────────────────
let appWindow = null;
try {
  const tauriWindow = await import("@tauri-apps/api/window");
  appWindow = tauriWindow.appWindow ?? tauriWindow.getCurrentWindow?.() ?? null;
} catch {
  // Running in a plain browser — no Tauri context
}

// ── DOM refs ────────────────────────────────────────────────────────────────
const voiceDot = document.getElementById("voiceDot");
const greetingText = document.getElementById("greetingText");
const timeText = document.getElementById("timeText");
const responseArea = document.getElementById("responseArea");
const queryInput = document.getElementById("queryInput");
const sendBtn = document.getElementById("sendBtn");
const modelName = document.getElementById("modelName");

const btnMorningBrief = document.getElementById("btnMorningBrief");
const btnSchoolCall = document.getElementById("btnSchoolCall");
const btnDevotion = document.getElementById("btnDevotion");
const btnComposeEmail = document.getElementById("btnComposeEmail");

// ── Voice WebSocket ─────────────────────────────────────────────────────────
let voiceWs = null;

function connectVoiceWS() {
  try {
    voiceWs = new WebSocket(`ws://127.0.0.1:7900/ws/voice`);

    voiceWs.onopen = () => {
      console.log("[Axis] Voice WebSocket connected");
    };

    voiceWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event) setVoiceState(msg.event);
      } catch {
        // ignore bad messages
      }
    };

    voiceWs.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(connectVoiceWS, 3000);
    };

    voiceWs.onerror = () => {
      voiceWs.close();
    };
  } catch {
    setTimeout(connectVoiceWS, 5000);
  }
}

function setVoiceState(state) {
  const valid = ["idle", "wake", "listening", "thinking", "speaking"];
  if (valid.includes(state)) {
    voiceDot.dataset.state = state;
    voiceDot.title = `Voice: ${state}`;
  }
}

// ── Time / Greeting ─────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning, Boss";
  if (h < 17) return "Good afternoon, Boss";
  return "Good evening, Boss";
}

function updateTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  timeText.textContent = `${h12}:${minutes} ${ampm}`;
  greetingText.textContent = getGreeting();
}

// ── Status check ────────────────────────────────────────────────────────────
async function checkStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    modelName.textContent = data.model ?? "unknown";
  } catch {
    modelName.textContent = "offline";
    appendMessage(
      "axis",
      "Axis offline — run start.sh"
    );
  }
}

// ── Message helpers ─────────────────────────────────────────────────────────
function clearEmptyState() {
  const empty = responseArea.querySelector(".empty-state");
  if (empty) empty.remove();
}

function pruneMessages() {
  const messages = responseArea.querySelectorAll(".message");
  while (messages.length > MAX_MESSAGES) {
    messages[0].remove();
  }
}

function appendMessage(role, text) {
  clearEmptyState();

  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  const label = document.createElement("span");
  label.className = "message-role";
  label.textContent = role === "user" ? "You" : "Axis";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  responseArea.appendChild(wrapper);

  pruneMessages();
  responseArea.scrollTop = responseArea.scrollHeight;
}

function showLoading() {
  clearEmptyState();
  const loader = document.createElement("div");
  loader.className = "message axis";
  loader.id = "loadingBubble";

  const dots = document.createElement("div");
  dots.className = "loading-bubble";
  for (let i = 0; i < 3; i++) {
    const d = document.createElement("div");
    d.className = "loading-dot";
    dots.appendChild(d);
  }

  loader.appendChild(dots);
  responseArea.appendChild(loader);
  responseArea.scrollTop = responseArea.scrollHeight;
}

function hideLoading() {
  const loader = document.getElementById("loadingBubble");
  if (loader) loader.remove();
}

// ── Query ───────────────────────────────────────────────────────────────────
async function sendQuery(text, lane = null) {
  if (!text || !text.trim()) return;

  appendMessage("user", text.trim());
  showLoading();
  setVoiceState("thinking");
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: text.trim(), lane }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    hideLoading();
    appendMessage("axis", data.response);
    setVoiceState("idle");
  } catch (err) {
    hideLoading();
    appendMessage("axis", `Error: ${err.message}. Is Axis running?`);
    setVoiceState("idle");
  } finally {
    sendBtn.disabled = false;
  }
}

// ── Morning Brief ───────────────────────────────────────────────────────────
async function getMorningBrief() {
  clearEmptyState();
  showLoading();
  setVoiceState("thinking");
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/brief`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    hideLoading();
    appendMessage("axis", data.brief);
    setVoiceState("idle");
  } catch (err) {
    hideLoading();
    appendMessage("axis", `Brief failed: ${err.message}. Is Axis running?`);
    setVoiceState("idle");
  } finally {
    sendBtn.disabled = false;
  }
}

// ── Input handling ──────────────────────────────────────────────────────────
function handleSend() {
  const text = queryInput.value.trim();
  if (!text) return;
  queryInput.value = "";
  sendQuery(text);
}

queryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

sendBtn.addEventListener("click", handleSend);

// ── Quick action buttons ────────────────────────────────────────────────────
btnMorningBrief.addEventListener("click", () => getMorningBrief());

btnSchoolCall.addEventListener("click", () =>
  sendQuery(
    "Generate a school outreach call opener for a Texas middle school principal using the general script"
  )
);

btnDevotion.addEventListener("click", () =>
  sendQuery("Generate today's devotion")
);

btnComposeEmail.addEventListener("click", () => {
  queryInput.placeholder = "Who do you want to email and about what?";
  queryInput.focus();
});

// ── Init ────────────────────────────────────────────────────────────────────
updateTime();
setInterval(updateTime, 1000);
checkStatus();
connectVoiceWS();
