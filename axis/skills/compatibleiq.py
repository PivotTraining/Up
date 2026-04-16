"""
Axis CompatibleIQ Skill

CompatibleIQ is a compatibility profiling tool — live in-market.
Exposes profile lookup, compatibility checks, and shadow profile insights.

Supported actions:
  profile         : look up a user's compatibility profile
  check           : run a compatibility check between two profiles
  shadow          : surface shadow profile insights for a user
  status          : deployment status

Required env vars:
  COMPATIBLEIQ_URL        — deployed app URL
  COMPATIBLEIQ_API_KEY    — API key for Axis calls

─────────────────────────────────────────────────────────────────────
WIRING STATUS: Interface defined. Wire once CompatibleIQ API
surface is documented.
─────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@dataclass
class CompatibilityProfile:
    user_id: str
    user_name: str
    profile_type: str = ""
    strengths: list[str] = field(default_factory=list)
    blind_spots: list[str] = field(default_factory=list)
    shadow_insight: str = ""
    raw: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    def to_brief(self) -> str:
        if self.error:
            return f"CompatibleIQ profile unavailable: {self.error}"
        lines = [f"{self.user_name}'s compatibility profile: {self.profile_type}."]
        if self.strengths:
            lines.append(f"  Strengths: {', '.join(self.strengths[:3])}")
        if self.blind_spots:
            lines.append(f"  Watch out for: {self.blind_spots[0]}")
        if self.shadow_insight:
            lines.append(f"  Shadow insight: {self.shadow_insight}")
        return "\n".join(lines)


@dataclass
class CompatibilityCheckResult:
    user_a: str
    user_b: str
    score: Optional[float] = None
    summary: str = ""
    recommendations: list[str] = field(default_factory=list)
    error: Optional[str] = None

    def to_brief(self) -> str:
        if self.error:
            return f"Compatibility check unavailable: {self.error}"
        score_str = f" (score: {self.score:.0%})" if self.score is not None else ""
        lines = [f"Compatibility between {self.user_a} and {self.user_b}{score_str}."]
        if self.summary:
            lines.append(f"  {self.summary}")
        if self.recommendations:
            lines.append(f"  Recommendation: {self.recommendations[0]}")
        return "\n".join(lines)


class CompatibleIQSkill:
    """Axis skill wrapper for CompatibleIQ."""

    name = "compatibleiq"
    description = (
        "Query CompatibleIQ profiles and compatibility checks. "
        "Actions: profile, check, shadow, status. "
        "For profile: provide user_id or user_name. "
        "For check: provide user_a and user_b."
    )

    def __init__(self) -> None:
        self._base = os.environ.get("COMPATIBLEIQ_URL", "").rstrip("/")
        self._api_key = os.environ.get("COMPATIBLEIQ_API_KEY", "")

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

    def get_profile(self, user_id: str = "", user_name: str = "") -> CompatibilityProfile:
        if not self._configured():
            return CompatibilityProfile(
                user_id=user_id,
                user_name=user_name or user_id,
                error="CompatibleIQ not configured — add COMPATIBLEIQ_URL and COMPATIBLEIQ_API_KEY",
            )
        # TODO: wire to real endpoint
        # data = self._get(f"/api/profiles/{user_id}")
        return CompatibilityProfile(
            user_id=user_id,
            user_name=user_name or user_id,
            error="Endpoint not yet wired — see compatibleiq.py TODO",
        )

    def check_compatibility(self, user_a: str, user_b: str) -> CompatibilityCheckResult:
        if not self._configured():
            return CompatibilityCheckResult(
                user_a=user_a,
                user_b=user_b,
                error="CompatibleIQ not configured",
            )
        # TODO: wire to real endpoint
        # data = self._get("/api/check", params={"a": user_a, "b": user_b})
        return CompatibilityCheckResult(
            user_a=user_a,
            user_b=user_b,
            error="Endpoint not yet wired — see compatibleiq.py TODO",
        )

    def get_shadow_insight(self, user_id: str = "", user_name: str = "") -> str:
        if not self._configured():
            return "CompatibleIQ not configured."
        # TODO: wire to real endpoint
        return f"Shadow profile for {user_name or user_id} not yet wired — see compatibleiq.py TODO"

    def run(self, action: str = "status", **kwargs: Any) -> str:
        if action == "status":
            if not self._configured():
                return "CompatibleIQ not configured — add COMPATIBLEIQ_URL and COMPATIBLEIQ_API_KEY to axis/.env"
            return "CompatibleIQ is live in-market. API wiring pending."
        if action == "profile":
            return self.get_profile(
                user_id=kwargs.get("user_id", ""),
                user_name=kwargs.get("user_name", ""),
            ).to_brief()
        if action == "check":
            return self.check_compatibility(
                user_a=kwargs.get("user_a", ""),
                user_b=kwargs.get("user_b", ""),
            ).to_brief()
        if action == "shadow":
            return self.get_shadow_insight(
                user_id=kwargs.get("user_id", ""),
                user_name=kwargs.get("user_name", ""),
            )
        return f"Unknown CompatibleIQ action: {action}"
