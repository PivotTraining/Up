"""
Axis SignalIQ Skill

SignalIQ is a revenue intelligence platform built on Next.js + Supabase.
It surfaces business signals, opportunity flags, and revenue intelligence.

Supported actions:
  status          : deployment status + recent activity
  query           : run a revenue intelligence query
  brief           : generate an intelligence brief for a topic
  opportunities   : surface flagged opportunities
  pipeline        : business pipeline signal summary

Required env vars:
  SIGNALIQ_URL            — deployed app URL
  SIGNALIQ_SUPABASE_URL   — SignalIQ Supabase project URL
  SIGNALIQ_SUPABASE_KEY   — SignalIQ Supabase service role key

─────────────────────────────────────────────────────────────────────
WIRING STATUS: Interface defined. Wire once SignalIQ API surface
is documented or the codebase is accessible.
─────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import os
import sys
from typing import Any, Optional

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:
    from supabase import create_client
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False


def _get_supabase():
    if not _SUPABASE_AVAILABLE:
        raise RuntimeError("supabase package required")
    url = os.environ.get("SIGNALIQ_SUPABASE_URL", "")
    key = os.environ.get("SIGNALIQ_SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError("Set SIGNALIQ_SUPABASE_URL and SIGNALIQ_SUPABASE_KEY in axis/.env")
    return create_client(url, key)


class SignalIQSkill:
    """
    Axis skill wrapper for SignalIQ revenue intelligence.
    Direct Supabase reads + HTTP API for queries.
    """

    name = "signaliq"
    description = (
        "Query SignalIQ revenue intelligence. "
        "Actions: status, query, brief, opportunities, pipeline."
    )

    def __init__(self) -> None:
        self._base = os.environ.get("SIGNALIQ_URL", "").rstrip("/")
        self._api_key = os.environ.get("SIGNALIQ_API_KEY", "")

    def _configured(self) -> bool:
        return bool(self._base)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}

    def _get(self, path: str, params: Optional[dict] = None) -> dict:
        resp = httpx.get(
            f"{self._base}{path}",
            headers=self._headers(),
            params=params or {},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()

    def status(self) -> str:
        if not self._configured():
            return "SignalIQ not configured — add SIGNALIQ_URL to axis/.env"
        return "SignalIQ is deployed. Add SIGNALIQ_API_KEY to pull live intelligence."

    def query(self, question: str) -> str:
        """Run a natural language revenue intelligence query."""
        if not self._configured():
            return "SignalIQ not configured."
        # TODO: wire to real endpoint
        # data = self._get("/api/query", params={"q": question})
        return f"SignalIQ query not yet wired. Question was: {question}"

    def brief(self, topic: str = "") -> str:
        """Generate an intelligence brief on a topic."""
        if not self._configured():
            return "SignalIQ not configured."
        # TODO: wire to real endpoint
        return f"SignalIQ intelligence brief not yet wired. Topic: {topic}"

    def opportunities(self) -> str:
        """Surface flagged business opportunities."""
        if not self._configured():
            return "SignalIQ not configured."
        # TODO: query opportunities table directly via Supabase
        # db = _get_supabase()
        # result = db.table("opportunities").select("*").eq("status", "flagged").limit(10).execute()
        return "SignalIQ opportunities not yet wired — see signaliq.py TODO"

    def run(self, action: str = "status", **kwargs: Any) -> str:
        if action == "status":
            return self.status()
        if action == "query":
            return self.query(kwargs.get("question", kwargs.get("query", "")))
        if action == "brief":
            return self.brief(kwargs.get("topic", ""))
        if action == "opportunities":
            return self.opportunities()
        if action == "pipeline":
            return self.query("What is the current pipeline signal?")
        return f"Unknown SignalIQ action: {action}"
