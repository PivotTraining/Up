"""
Microsoft Graph API Connector for Axis

Handles OAuth 2.0 authentication and provides a clean interface for:
  - Calendar: read events, find availability
  - Email: read inbox, draft messages, send messages

Uses Device Code Flow — ideal for desktop/local apps because it
requires no redirect URI and works without a browser on the machine
where Axis runs.

Setup (one-time):
    cd axis && uv run python scripts/auth_msgraph.py

After auth, tokens are cached at ~/.axis/msgraph_token.json and
refreshed automatically.

Scopes requested:
    Calendars.ReadWrite
    Mail.ReadWrite
    Mail.Send
    offline_access   ← required for refresh tokens
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

import httpx
import msal

# ── Constants ────────────────────────────────────────────────────────────────

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_CACHE_PATH = Path.home() / ".axis" / "msgraph_token.json"

SCOPES = [
    "Calendars.ReadWrite",
    "Mail.ReadWrite",
    "Mail.Send",
]


# ── Data models ──────────────────────────────────────────────────────────────

class CalendarEvent:
    def __init__(self, raw: dict[str, Any]) -> None:
        self.id: str = raw.get("id", "")
        self.subject: str = raw.get("subject", "(No subject)")
        self.start: datetime = _parse_dt(raw.get("start", {}).get("dateTime", ""))
        self.end: datetime = _parse_dt(raw.get("end", {}).get("dateTime", ""))
        self.location: str = raw.get("location", {}).get("displayName", "")
        self.is_all_day: bool = raw.get("isAllDay", False)
        self.organizer: str = (
            raw.get("organizer", {}).get("emailAddress", {}).get("name", "")
        )
        self.body_preview: str = raw.get("bodyPreview", "")
        self.online_meeting_url: str = raw.get("onlineMeetingUrl") or ""

    def __repr__(self) -> str:
        t = "All day" if self.is_all_day else self.start.strftime("%I:%M %p")
        return f"{t} — {self.subject}"

    def to_brief_line(self) -> str:
        if self.is_all_day:
            return f"All day: {self.subject}"
        start_fmt = self.start.strftime("%-I:%M %p")
        end_fmt = self.end.strftime("%-I:%M %p")
        loc = f" ({self.location})" if self.location else ""
        return f"{start_fmt}–{end_fmt}: {self.subject}{loc}"


class EmailMessage:
    def __init__(self, raw: dict[str, Any]) -> None:
        self.id: str = raw.get("id", "")
        self.subject: str = raw.get("subject", "(No subject)")
        self.sender_name: str = (
            raw.get("from", {}).get("emailAddress", {}).get("name", "Unknown")
        )
        self.sender_email: str = (
            raw.get("from", {}).get("emailAddress", {}).get("address", "")
        )
        self.received_at: datetime = _parse_dt(raw.get("receivedDateTime", ""))
        self.is_read: bool = raw.get("isRead", False)
        self.body_preview: str = raw.get("bodyPreview", "")
        self.importance: str = raw.get("importance", "normal")
        self.has_attachments: bool = raw.get("hasAttachments", False)

    def is_from_real_person(self) -> bool:
        """
        Triage filter — TRUE if this looks like a message from a human,
        not an automated sender, newsletter, or notification.
        """
        automated_patterns = [
            "noreply", "no-reply", "donotreply", "do-not-reply",
            "notifications@", "alerts@", "newsletter", "mailer-daemon",
            "postmaster", "bounce", "unsubscribe",
        ]
        addr = self.sender_email.lower()
        return not any(p in addr for p in automated_patterns)

    def to_brief_line(self) -> str:
        age = _human_age(self.received_at)
        return f"From {self.sender_name} ({age}): {self.subject}"


# ── Auth ──────────────────────────────────────────────────────────────────────

class MSGraphAuth:
    """MSAL-backed token manager using Device Code Flow with persistent cache."""

    def __init__(
        self,
        client_id: str = "",
        tenant_id: str = "common",
        cache_path: Path = TOKEN_CACHE_PATH,
    ) -> None:
        self._client_id = client_id or os.environ.get("MICROSOFT_CLIENT_ID", "")
        self._tenant_id = tenant_id or os.environ.get("MICROSOFT_TENANT_ID") or "common"
        self._cache_path = cache_path
        self._cache = msal.SerializableTokenCache()

        if cache_path.exists():
            self._cache.deserialize(cache_path.read_text())

        self._app = msal.PublicClientApplication(
            client_id=self._client_id,
            authority=f"https://login.microsoftonline.com/{self._tenant_id}",
            token_cache=self._cache,
        )

    def _save_cache(self) -> None:
        if self._cache.has_state_changed:
            self._cache_path.parent.mkdir(parents=True, exist_ok=True)
            self._cache_path.write_text(self._cache.serialize())

    def get_token(self) -> str:
        """Return a valid access token, refreshing silently if possible."""
        accounts = self._app.get_accounts()
        if accounts:
            result = self._app.acquire_token_silent(SCOPES, account=accounts[0])
            if result and "access_token" in result:
                self._save_cache()
                return result["access_token"]

        raise RuntimeError(
            "No valid token found. Run: cd axis && uv run python scripts/auth_msgraph.py"
        )

    def device_code_flow(self) -> str:
        """
        Initiate Device Code Flow — prints the URL and code for the user
        to authenticate in a browser, then returns the access token.
        """
        flow = self._app.initiate_device_flow(scopes=SCOPES)
        if "user_code" not in flow:
            raise RuntimeError(f"Device code flow failed: {flow.get('error_description')}")

        print(f"\n  Visit: {flow['verification_uri']}")
        print(f"  Enter code: {flow['user_code']}\n")

        result = self._app.acquire_token_by_device_flow(flow)
        if "access_token" not in result:
            raise RuntimeError(f"Auth failed: {result.get('error_description')}")

        self._save_cache()
        return result["access_token"]


# ── Graph client ──────────────────────────────────────────────────────────────

class MSGraphClient:
    """
    Axis Microsoft Graph client — calendar and email operations.

    Usage:
        client = MSGraphClient()
        events = client.get_todays_events()
        emails = client.get_unread_emails(limit=10)
    """

    def __init__(self, auth: Optional[MSGraphAuth] = None) -> None:
        self._auth = auth or MSGraphAuth(
            client_id=os.environ.get("MICROSOFT_CLIENT_ID", ""),
            tenant_id=os.environ.get("MICROSOFT_TENANT_ID", "common"),
        )

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._auth.get_token()}",
            "Content-Type": "application/json",
        }

    def _get(self, path: str, params: Optional[dict] = None) -> Any:
        resp = httpx.get(
            f"{GRAPH_BASE}{path}",
            headers=self._headers(),
            params=params or {},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, body: dict) -> Any:
        resp = httpx.post(
            f"{GRAPH_BASE}{path}",
            headers=self._headers(),
            json=body,
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json() if resp.content else {}

    # ── Calendar ──────────────────────────────────────────────────────────────

    def get_events(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 20,
    ) -> list[CalendarEvent]:
        """Fetch calendar events between start and end (defaults to today)."""
        now = datetime.now(timezone.utc)
        start = start or now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = end or start + timedelta(days=1)

        data = self._get(
            "/me/calendarView",
            params={
                "startDateTime": start.isoformat(),
                "endDateTime": end.isoformat(),
                "$orderby": "start/dateTime",
                "$top": limit,
                "$select": "id,subject,start,end,location,isAllDay,organizer,bodyPreview,onlineMeetingUrl",
            },
        )
        return [CalendarEvent(e) for e in data.get("value", [])]

    def get_todays_events(self) -> list[CalendarEvent]:
        return self.get_events()

    def get_tomorrows_events(self) -> list[CalendarEvent]:
        tomorrow = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        return self.get_events(start=tomorrow, end=tomorrow + timedelta(days=1))

    def get_weeks_events(self) -> list[CalendarEvent]:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        return self.get_events(start=today, end=today + timedelta(days=7))

    # ── Email ─────────────────────────────────────────────────────────────────

    def get_unread_emails(
        self,
        limit: int = 20,
        real_people_only: bool = True,
    ) -> list[EmailMessage]:
        """Fetch unread emails from inbox, optionally filtering to real humans only."""
        data = self._get(
            "/me/mailFolders/inbox/messages",
            params={
                "$filter": "isRead eq false",
                "$orderby": "receivedDateTime desc",
                "$top": limit,
                "$select": "id,subject,from,receivedDateTime,isRead,bodyPreview,importance,hasAttachments",
            },
        )
        messages = [EmailMessage(m) for m in data.get("value", [])]
        if real_people_only:
            messages = [m for m in messages if m.is_from_real_person()]
        return messages

    def get_recent_emails(self, hours: int = 24, limit: int = 30) -> list[EmailMessage]:
        since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        data = self._get(
            "/me/mailFolders/inbox/messages",
            params={
                "$filter": f"receivedDateTime ge {since}",
                "$orderby": "receivedDateTime desc",
                "$top": limit,
                "$select": "id,subject,from,receivedDateTime,isRead,bodyPreview,importance,hasAttachments",
            },
        )
        return [EmailMessage(m) for m in data.get("value", [])]

    def get_email_body(self, message_id: str) -> str:
        """Fetch the full body of a specific email."""
        data = self._get(
            f"/me/messages/{message_id}",
            params={"$select": "body"},
        )
        return data.get("body", {}).get("content", "")

    def send_email(
        self,
        to: str | list[str],
        subject: str,
        body: str,
        cc: Optional[str | list[str]] = None,
        save_to_sent: bool = True,
    ) -> None:
        """Send an email via Microsoft Graph."""
        recipients = [to] if isinstance(to, str) else to
        cc_list = ([cc] if isinstance(cc, str) else cc) if cc else []

        message = {
            "message": {
                "subject": subject,
                "body": {"contentType": "Text", "content": body},
                "toRecipients": [
                    {"emailAddress": {"address": addr}} for addr in recipients
                ],
                "ccRecipients": [
                    {"emailAddress": {"address": addr}} for addr in cc_list
                ],
            },
            "saveToSentItems": save_to_sent,
        }
        self._post("/me/sendMail", message)

    def create_draft(
        self,
        to: str,
        subject: str,
        body: str,
    ) -> str:
        """Create a draft email and return its ID."""
        message = {
            "subject": subject,
            "body": {"contentType": "Text", "content": body},
            "toRecipients": [{"emailAddress": {"address": to}}],
        }
        data = self._post("/me/messages", message)
        return data.get("id", "")

    def mark_as_read(self, message_id: str) -> None:
        resp = httpx.patch(
            f"{GRAPH_BASE}/me/messages/{message_id}",
            headers=self._headers(),
            json={"isRead": True},
            timeout=15.0,
        )
        resp.raise_for_status()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_dt(s: str) -> datetime:
    if not s:
        return datetime.now(timezone.utc)
    try:
        # Graph returns UTC without Z sometimes
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except ValueError:
        return datetime.now(timezone.utc)


def _human_age(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    if delta.seconds < 3600:
        return f"{delta.seconds // 60}m ago"
    if delta.days == 0:
        return f"{delta.seconds // 3600}h ago"
    if delta.days == 1:
        return "yesterday"
    return f"{delta.days}d ago"
