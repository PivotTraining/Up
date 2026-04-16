"""
Axis OutreachIQ Skill

Fully wired to the live OutreachIQ Next.js app via:
  - Direct Supabase (service role) for all reads — fast, no cookie needed
  - HTTP session for mutations — create contacts, queue campaigns

Supported actions:
  pipeline      : campaign status overview — active, queued, completed
  contact       : look up a contact by email or name
  contacts      : list recent contacts with optional status filter
  add_contact   : add a new contact to the database
  logs          : recent send log (optionally filter by campaign or email)
  send_stats    : today's send count vs daily limit

Required env vars (from OutreachIQ's .env):
  OUTREACHIQ_URL             — deployed app URL (e.g. https://outreachiq.vercel.app)
  OUTREACHIQ_SUPABASE_URL    — same as OutreachIQ NEXT_PUBLIC_SUPABASE_URL
  OUTREACHIQ_SUPABASE_KEY    — OutreachIQ SUPABASE_SERVICE_ROLE_KEY
  OUTREACHIQ_APP_PASSWORD    — OutreachIQ APP_PASSWORD (for session auth on mutations)
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Optional

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:
    from supabase import create_client, Client as SupabaseClient
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False


# ── Supabase read client ──────────────────────────────────────────────────────

def _get_supabase() -> "SupabaseClient":
    if not _SUPABASE_AVAILABLE:
        raise RuntimeError("supabase package not installed. Run: uv sync")
    url = os.environ.get("OUTREACHIQ_SUPABASE_URL", "")
    key = os.environ.get("OUTREACHIQ_SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError(
            "Set OUTREACHIQ_SUPABASE_URL and OUTREACHIQ_SUPABASE_KEY in axis/.env"
        )
    return create_client(url, key)


# ── Session auth for mutations ────────────────────────────────────────────────

class OutreachIQSession:
    """Manages a login session cookie for OutreachIQ API mutations."""

    def __init__(self) -> None:
        self._base = os.environ.get("OUTREACHIQ_URL", "").rstrip("/")
        self._password = os.environ.get("OUTREACHIQ_APP_PASSWORD", "")
        self._cookie: Optional[str] = None

    def _ensure_login(self) -> str:
        if self._cookie:
            return self._cookie
        if not self._base or not self._password:
            raise RuntimeError(
                "Set OUTREACHIQ_URL and OUTREACHIQ_APP_PASSWORD in axis/.env"
            )
        resp = httpx.post(
            f"{self._base}/api/auth/login",
            json={"password": self._password},
            timeout=15.0,
        )
        resp.raise_for_status()
        # Cookie name: oiq_session
        cookie_header = resp.headers.get("set-cookie", "")
        self._cookie = cookie_header.split(";")[0] if cookie_header else ""
        return self._cookie

    def post(self, path: str, body: dict) -> dict:
        cookie = self._ensure_login()
        resp = httpx.post(
            f"{self._base}{path}",
            json=body,
            headers={"Cookie": cookie},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json() if resp.content else {}

    def get(self, path: str, params: Optional[dict] = None) -> dict:
        cookie = self._ensure_login()
        resp = httpx.get(
            f"{self._base}{path}",
            params=params or {},
            headers={"Cookie": cookie},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class PipelineResult:
    campaigns: list[dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None

    def to_brief(self) -> str:
        if self.error:
            return f"OutreachIQ pipeline unavailable: {self.error}"
        if not self.campaigns:
            return "No active campaigns in OutreachIQ."
        lines = ["Here's the outreach pipeline:"]
        for c in self.campaigns[:6]:
            status = c.get("status", "unknown")
            name = c.get("name", "Unnamed")
            sent = c.get("total_sent", 0)
            total = c.get("total_recipients", 0)
            pct = f"{int(sent/total*100)}%" if total else "—"
            lines.append(f"  {name}: {status} ({sent}/{total} sent, {pct})")
        return "\n".join(lines)


@dataclass
class ContactResult:
    contacts: list[dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None

    def to_brief(self) -> str:
        if self.error:
            return f"Contact lookup failed: {self.error}"
        if not self.contacts:
            return "No contacts found matching that search."
        if len(self.contacts) == 1:
            c = self.contacts[0]
            name = f"{c.get('first_name','')} {c.get('last_name','')}".strip() or c.get('email')
            company = c.get("company", "")
            status = c.get("status", "active")
            return f"{name}{f' at {company}' if company else ''} — status: {status}. Email: {c.get('email','')}"
        lines = [f"{len(self.contacts)} contacts found:"]
        for c in self.contacts[:5]:
            name = f"{c.get('first_name','')} {c.get('last_name','')}".strip() or c.get("email","")
            lines.append(f"  {name} — {c.get('email','')}")
        return "\n".join(lines)


@dataclass
class SendStatsResult:
    sent_today: int = 0
    daily_limit: int = 9000
    error: Optional[str] = None

    def to_brief(self) -> str:
        if self.error:
            return "Send stats unavailable."
        remaining = self.daily_limit - self.sent_today
        pct = int(self.sent_today / self.daily_limit * 100)
        return (
            f"OutreachIQ has sent {self.sent_today:,} emails today "
            f"({pct}% of daily limit). {remaining:,} remaining."
        )


# ── Main skill ────────────────────────────────────────────────────────────────

class OutreachIQSkill:
    """
    Axis skill wrapper for OutreachIQ.

    Reads go directly to Supabase (fast, no session needed).
    Writes use the HTTP session (cookie auth).
    """

    name = "outreachiq"
    description = (
        "Query and manage the OutreachIQ outreach pipeline. "
        "Actions: pipeline, contact, contacts, add_contact, logs, send_stats."
    )

    def __init__(self) -> None:
        self._session = OutreachIQSession()

    def _db(self) -> "SupabaseClient":
        return _get_supabase()

    # ── Reads via Supabase ────────────────────────────────────────────────────

    def pipeline(self, status_filter: Optional[str] = None) -> PipelineResult:
        """Get campaign pipeline overview."""
        try:
            query = (
                self._db().table("campaigns")
                .select("id,name,status,total_recipients,total_sent,total_failed,scheduled_at,completed_at")
                .order("created_at", desc=True)
                .limit(20)
            )
            if status_filter:
                query = query.eq("status", status_filter)
            result = query.execute()
            return PipelineResult(campaigns=result.data or [])
        except Exception as e:
            return PipelineResult(error=str(e))

    def find_contact(self, search: str) -> ContactResult:
        """Look up a contact by email or name fragment."""
        try:
            result = (
                self._db().table("contacts")
                .select("id,email,first_name,last_name,company,title,status,created_at")
                .or_(f"email.ilike.%{search}%,first_name.ilike.%{search}%,last_name.ilike.%{search}%,company.ilike.%{search}%")
                .limit(10)
                .execute()
            )
            return ContactResult(contacts=result.data or [])
        except Exception as e:
            return ContactResult(error=str(e))

    def list_contacts(
        self,
        status: str = "active",
        limit: int = 20,
    ) -> ContactResult:
        """List contacts with optional status filter."""
        try:
            query = (
                self._db().table("contacts")
                .select("id,email,first_name,last_name,company,status,created_at")
                .order("created_at", desc=True)
                .limit(limit)
            )
            if status != "all":
                query = query.eq("status", status)
            result = query.execute()
            return ContactResult(contacts=result.data or [])
        except Exception as e:
            return ContactResult(error=str(e))

    def recent_logs(
        self,
        campaign_id: Optional[str] = None,
        email: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Pull recent send log entries."""
        try:
            query = (
                self._db().table("send_log")
                .select("id,to_email,subject,status,error,sent_at,campaigns(name)")
                .order("sent_at", desc=True)
                .limit(limit)
            )
            if campaign_id:
                query = query.eq("campaign_id", campaign_id)
            if email:
                query = query.ilike("to_email", f"%{email}%")
            return (query.execute().data or [])
        except Exception:
            return []

    def send_stats(self) -> SendStatsResult:
        """Get today's send count vs daily limit."""
        try:
            today = date.today().isoformat()
            result = (
                self._db().table("daily_send_counter")
                .select("count")
                .eq("date", today)
                .maybe_single()
                .execute()
            )
            sent = result.data["count"] if result.data else 0
            limit = int(os.environ.get("OUTREACHIQ_DAILY_LIMIT", "9000"))
            return SendStatsResult(sent_today=sent, daily_limit=limit)
        except Exception as e:
            return SendStatsResult(error=str(e))

    # ── Writes via HTTP session ───────────────────────────────────────────────

    def add_contact(
        self,
        email: str,
        first_name: str = "",
        last_name: str = "",
        company: str = "",
        title: str = "",
        source: str = "axis",
    ) -> dict:
        """Add a new contact to OutreachIQ."""
        try:
            return self._session.post(
                "/api/contacts",
                {
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "company": company,
                    "title": title,
                    "source": source,
                },
            )
        except Exception as e:
            return {"error": str(e)}

    # ── Unified run interface ─────────────────────────────────────────────────

    def run(
        self,
        action: str = "pipeline",
        **kwargs: Any,
    ) -> str:
        """Voice-ready output for any action."""
        if action == "pipeline":
            return self.pipeline(kwargs.get("status")).to_brief()

        if action == "contact":
            search = kwargs.get("search", kwargs.get("name", kwargs.get("email", "")))
            return self.find_contact(search).to_brief()

        if action == "contacts":
            return self.list_contacts(
                status=kwargs.get("status", "active"),
                limit=int(kwargs.get("limit", 20)),
            ).to_brief()

        if action == "add_contact":
            result = self.add_contact(
                email=kwargs["email"],
                first_name=kwargs.get("first_name", ""),
                last_name=kwargs.get("last_name", ""),
                company=kwargs.get("company", ""),
                title=kwargs.get("title", ""),
            )
            if "error" in result:
                return f"Couldn't add contact: {result['error']}"
            return f"Contact added: {kwargs['email']}"

        if action == "logs":
            logs = self.recent_logs(
                campaign_id=kwargs.get("campaign_id"),
                email=kwargs.get("email"),
                limit=int(kwargs.get("limit", 10)),
            )
            if not logs:
                return "No send log entries found."
            lines = [f"{len(logs)} recent sends:"]
            for l in logs[:5]:
                lines.append(f"  {l.get('to_email','')} — {l.get('status','')} ({l.get('sent_at','')[:10]})")
            return "\n".join(lines)

        if action == "send_stats":
            return self.send_stats().to_brief()

        return f"Unknown OutreachIQ action: {action}"
