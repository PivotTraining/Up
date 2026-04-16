"""
Axis Cloud Router — Local vs Cloud Escalation Logic

Decides whether a query should be handled by the local Ollama model
(qwen3:8b) or escalated to the Claude API (claude-sonnet-4-5).

The spec's routing rules:
  Family lane  → LOCAL ONLY. Never touches the cloud.
  Self lane    → LOCAL ONLY. Never touches the cloud.
  Faith lane   → LOCAL DEFAULT. Cloud allowed only if user overrides.
  Business     → CLOUD ALLOWED when complexity warrants.
  Product      → CLOUD ALLOWED when complexity warrants.

Escalation triggers (any one is enough to route to cloud):
  1. Complexity signal — query patterns that exceed local model capability
  2. Length signal — input exceeds token threshold for reliable local response
  3. Explicit override — user says "think hard", "really analyze", etc.
  4. Document mode — long-form drafting, proposal, strategic analysis
  5. Privacy gate passes — no LOCAL_ONLY lanes in the query

Local model handles everything else — fast, free, private.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional

# ── Models ────────────────────────────────────────────────────────────────────

LOCAL_MODEL  = "qwen3:8b"
CLOUD_MODEL  = "claude-sonnet-4-5"      # latest Sonnet via Anthropic API

# Token thresholds (rough character estimates — 1 token ≈ 4 chars)
LOCAL_CONTEXT_LIMIT  = 6_000    # chars; qwen3:8b comfortable range
ESCALATION_THRESHOLD = 4_000    # chars; above this, prefer cloud for long tasks


class RoutingDecision(str, Enum):
    LOCAL = "local"
    CLOUD = "cloud"
    BLOCKED = "blocked"   # LOCAL_ONLY lane — cloud explicitly not allowed


@dataclass
class RouteResult:
    decision: RoutingDecision
    model: str
    reason: str
    sanitized_query: Optional[str] = None  # set when privacy guard ran

    @property
    def is_local(self) -> bool:
        return self.decision == RoutingDecision.LOCAL

    @property
    def is_cloud(self) -> bool:
        return self.decision == RoutingDecision.CLOUD

    def __str__(self) -> str:
        return f"[{self.decision.value.upper()}] {self.model} — {self.reason}"


# ── Complexity signals ────────────────────────────────────────────────────────
# Patterns that suggest the query needs Claude's reasoning capability

_COMPLEXITY_PATTERNS = [
    # Strategic / analytical asks
    re.compile(
        r"\b(strateg|analyz|analy[sz]e|deep.?dive|break.?down|comprehensiv|"
        r"thorough|in.?depth|research|compare|contrast|evaluate|assess)\b",
        re.I,
    ),
    # Long-form drafting
    re.compile(
        r"\b(draft|write|compose|proposal|report|deck|presentation|"
        r"document|outline|letter|memo|brief|summary)\b",
        re.I,
    ),
    # Complex reasoning
    re.compile(
        r"\b(why|how come|explain|reason|implication|consequence|"
        r"tradeoff|trade-off|pros.and.cons|should i|recommend)\b",
        re.I,
    ),
    # Explicit escalation
    re.compile(
        r"\b(think hard|really analyze|full analysis|take your time|"
        r"use claude|use the cloud|big brain)\b",
        re.I,
    ),
]

_LOCAL_SIGNALS = [
    # Quick lookups — local is fine
    re.compile(
        r"\b(what time|when is|how many|list|show me|check|status|"
        r"quick|brief|summary of today|today's|tomorrow's)\b",
        re.I,
    ),
]


# ── Privacy-aware lane rules ──────────────────────────────────────────────────

# Import lazily to avoid circular imports
def _get_lane_configs():
    from memory.lanes import LANE_CONFIGS, PrivacyLevel, MemoryLane
    return LANE_CONFIGS, PrivacyLevel, MemoryLane


# ── Router ────────────────────────────────────────────────────────────────────

class AxisCloudRouter:
    """
    Routing engine for Axis. Called before every LLM inference.

    Usage:
        router = AxisCloudRouter()
        result = router.route(query, lanes=classify_lane(query))
        # result.model is passed to the OpenJarvis engine
    """

    def __init__(
        self,
        cloud_enabled: bool = True,
        faith_lane_cloud: bool = False,   # configurable — spec says local default
    ) -> None:
        self._cloud_enabled = cloud_enabled and bool(
            os.environ.get("ANTHROPIC_API_KEY", "")
        )
        self._faith_lane_cloud = faith_lane_cloud

    @property
    def cloud_available(self) -> bool:
        return self._cloud_enabled

    def route(
        self,
        query: str,
        lanes: Optional[list] = None,
        context_length: int = 0,
    ) -> RouteResult:
        """
        Core routing decision. Returns a RouteResult with model + reason.

        Args:
            query:          The user's query text
            lanes:          Memory lanes classified for this query
            context_length: Total chars of context being passed (memory + tools)
        """
        from memory.lanes import PrivacyLevel, MemoryLane

        # ── Step 1: Privacy gate ──────────────────────────────────────────
        if lanes:
            for lane in lanes:
                try:
                    LANE_CONFIGS, _, _ = _get_lane_configs()
                    config = LANE_CONFIGS[lane]
                    if config.privacy == PrivacyLevel.LOCAL_ONLY:
                        return RouteResult(
                            decision=RoutingDecision.LOCAL,
                            model=LOCAL_MODEL,
                            reason=f"{lane.value} lane is LOCAL_ONLY — stays on device",
                        )
                    if config.privacy == PrivacyLevel.LOCAL_DEFAULT:
                        if lane == MemoryLane.FAITH and not self._faith_lane_cloud:
                            return RouteResult(
                                decision=RoutingDecision.LOCAL,
                                model=LOCAL_MODEL,
                                reason="Faith lane defaults to local (set faith_lane_cloud=True to override)",
                            )
                except Exception:
                    pass

        # ── Step 2: Cloud not available → always local ────────────────────
        if not self._cloud_enabled:
            return RouteResult(
                decision=RoutingDecision.LOCAL,
                model=LOCAL_MODEL,
                reason="Cloud not configured (ANTHROPIC_API_KEY not set)",
            )

        # ── Step 3: Quick-lookup signal → local ───────────────────────────
        for pattern in _LOCAL_SIGNALS:
            if pattern.search(query):
                # Only short queries qualify — a "quick" ask with lots of context
                # still might benefit from cloud
                if (len(query) + context_length) < 1_500:
                    return RouteResult(
                        decision=RoutingDecision.LOCAL,
                        model=LOCAL_MODEL,
                        reason="Quick lookup — local model sufficient",
                    )

        # ── Step 4: Complexity signal → cloud ────────────────────────────
        for pattern in _COMPLEXITY_PATTERNS:
            if pattern.search(query):
                return RouteResult(
                    decision=RoutingDecision.CLOUD,
                    model=CLOUD_MODEL,
                    reason=f"Complexity signal detected — escalating to Claude",
                )

        # ── Step 5: Length threshold → cloud ─────────────────────────────
        total_length = len(query) + context_length
        if total_length > ESCALATION_THRESHOLD:
            return RouteResult(
                decision=RoutingDecision.CLOUD,
                model=CLOUD_MODEL,
                reason=f"Input length {total_length:,} chars exceeds local threshold",
            )

        # ── Default: local ────────────────────────────────────────────────
        return RouteResult(
            decision=RoutingDecision.LOCAL,
            model=LOCAL_MODEL,
            reason="Standard query — local model handles it",
        )

    def explain(self, query: str, lanes: Optional[list] = None) -> str:
        """Human-readable routing explanation for debugging."""
        result = self.route(query, lanes=lanes)
        return str(result)
