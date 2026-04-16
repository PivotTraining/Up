"""
Axis PressureIQ Skill

PressureIQ measures pressure modes and stress responses.
Deployed and in-market. Promo codes used for distribution.

Supported actions:
  status          : current deployment status + metrics
  assess          : trigger a new assessment for a user
  result          : look up a user's latest assessment result
  trend           : historical pressure mode trends for a user
  summary         : aggregate summary across all assessments

Required env vars:
  PRESSUREIQ_URL         — deployed app URL
  PRESSUREIQ_API_KEY     — service key for Axis → PressureIQ calls

─────────────────────────────────────────────────────────────────────
WIRING STATUS: Interface defined. Endpoints confirmed once
PressureIQ API documentation is available.
To wire: fill in the HTTP calls in each method below, using
self._get() and self._post() helpers with real endpoint paths.
─────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Pressure mode definitions ─────────────────────────────────────────────────
# Based on the PressureIQ framework (Chris's model)

PRESSURE_MODES = {
    "performer":  "High output, high stress — pushing through at cost",
    "protector":  "Defensive posture — managing risk, reducing exposure",
    "processor":  "Internal — needs space to think before acting",
    "provider":   "Caretaker mode — prioritizing others over self",
    "pursuer":    "Driven, goal-locked — may miss signals around them",
}


@dataclass
class AssessmentResult:
    user_id: str
    user_name: str
    pressure_mode: str
    score: Optional[float] = None
    completed_at: Optional[str] = None
    insights: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    def to_brief(self) -> str:
        if self.error:
            return f"PressureIQ result unavailable: {self.error}"
        mode_desc = PRESSURE_MODES.get(self.pressure_mode.lower(), self.pressure_mode)
        lines = [f"{self.user_name} is showing a {self.pressure_mode} pressure mode."]
        lines.append(f"  That means: {mode_desc}.")
        if self.insights:
            lines.append(f"  Key insight: {self.insights[0]}")
        return "\n".join(lines)


@dataclass
class TrendResult:
    user_id: str
    user_name: str
    history: list[dict[str, Any]] = field(default_factory=list)
    dominant_mode: str = ""
    error: Optional[str] = None

    def to_brief(self) -> str:
        if self.error:
            return f"PressureIQ trend unavailable: {self.error}"
        if not self.history:
            return f"No historical data found for {self.user_name}."
        count = len(self.history)
        lines = [f"{self.user_name} has {count} assessments on record."]
        if self.dominant_mode:
            lines.append(f"  Dominant mode: {self.dominant_mode}.")
        # Show last 3 shifts
        for entry in self.history[-3:]:
            mode = entry.get("pressure_mode", "unknown")
            date = entry.get("completed_at", "")[:10]
            lines.append(f"  {date}: {mode}")
        return "\n".join(lines)


class PressureIQSkill:
    """
    Axis skill wrapper for PressureIQ.
    Interface is fully defined — wire HTTP calls once API docs are available.
    """

    name = "pressureiq"
    description = (
        "Query PressureIQ mental health assessments. "
        "Actions: status, assess, result, trend, summary. "
        "Provide user_id or user_name to scope to a specific person."
    )

    def __init__(self) -> None:
        self._base = os.environ.get("PRESSUREIQ_URL", "").rstrip("/")
        self._api_key = os.environ.get("PRESSUREIQ_API_KEY", "")

    def _configured(self) -> bool:
        return bool(self._base and self._api_key)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}"}

    def _get(self, path: str, params: Optional[dict] = None) -> dict:
        resp = httpx.get(
            f"{self._base}{path}",
            headers=self._headers(),
            params=params or {},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, body: dict) -> dict:
        resp = httpx.post(
            f"{self._base}{path}",
            headers=self._headers(),
            json=body,
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()

    # ── Actions ───────────────────────────────────────────────────────────────

    def get_status(self) -> str:
        """Deployment status and high-level metrics."""
        if not self._configured():
            return "PressureIQ not configured — add PRESSUREIQ_URL and PRESSUREIQ_API_KEY to axis/.env"
        # TODO: wire to real endpoint once API docs available
        # data = self._get("/api/status")
        return "PressureIQ is live and in-market. Configure PRESSUREIQ_API_KEY to pull live metrics."

    def get_result(self, user_id: str = "", user_name: str = "") -> AssessmentResult:
        """Fetch the latest assessment result for a user."""
        if not self._configured():
            return AssessmentResult(
                user_id=user_id,
                user_name=user_name or user_id,
                pressure_mode="unknown",
                error="PressureIQ not configured",
            )
        # TODO: wire to real endpoint
        # data = self._get(f"/api/assessments/latest", params={"user_id": user_id})
        return AssessmentResult(
            user_id=user_id,
            user_name=user_name or user_id,
            pressure_mode="unknown",
            error="Endpoint not yet wired — see pressureiq.py TODO",
        )

    def get_trend(self, user_id: str = "", user_name: str = "") -> TrendResult:
        """Historical pressure mode trend for a user."""
        if not self._configured():
            return TrendResult(
                user_id=user_id,
                user_name=user_name or user_id,
                error="PressureIQ not configured",
            )
        # TODO: wire to real endpoint
        return TrendResult(
            user_id=user_id,
            user_name=user_name or user_id,
            error="Endpoint not yet wired — see pressureiq.py TODO",
        )

    def trigger_assessment(self, user_email: str, promo_code: str = "") -> str:
        """Trigger a new assessment for a user (sends invite)."""
        if not self._configured():
            return "PressureIQ not configured."
        # TODO: wire to real endpoint
        # self._post("/api/assessments/trigger", {"email": user_email, "promo_code": promo_code})
        return f"Assessment trigger not yet wired. Target: {user_email}"

    def run(self, action: str = "status", **kwargs: Any) -> str:
        if action == "status":
            return self.get_status()
        if action == "result":
            return self.get_result(
                user_id=kwargs.get("user_id", ""),
                user_name=kwargs.get("user_name", ""),
            ).to_brief()
        if action == "trend":
            return self.get_trend(
                user_id=kwargs.get("user_id", ""),
                user_name=kwargs.get("user_name", ""),
            ).to_brief()
        if action == "assess":
            return self.trigger_assessment(
                user_email=kwargs.get("email", ""),
                promo_code=kwargs.get("promo_code", ""),
            )
        return f"Unknown PressureIQ action: {action}"
