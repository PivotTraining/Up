"""
Axis Email Skill

Exposes Microsoft Graph email as an OpenJarvis-compatible tool.
Triage-aware — filters out automated senders so the brief stays clean.

Supported actions:
  - unread      : unread emails from real people (default)
  - recent      : emails received in last N hours
  - send        : send an email (requires to, subject, body)
  - draft       : create a draft (requires to, subject, body)
  - read_full   : get full body of a specific message (requires message_id)
"""

from __future__ import annotations

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataclasses import dataclass
from typing import Optional

from connectors.msgraph import MSGraphClient, EmailMessage


@dataclass
class EmailResult:
    messages: list[EmailMessage]
    action: str
    draft_id: Optional[str] = None
    sent: bool = False
    full_body: Optional[str] = None
    error: Optional[str] = None

    def to_brief(self) -> str:
        """
        Voice-ready triage brief.
        Follows the Jarvis persona rule: real people first,
        mention sender name and what they need.
        """
        if self.error:
            return "Email unavailable right now."

        if self.action in ("send", "draft"):
            if self.sent:
                return "Done. Email sent."
            if self.draft_id:
                return "Done. Draft saved to your outbox."
            return "Something went wrong saving the draft."

        if not self.messages:
            return "Inbox is clear. No unread messages from real people."

        lines = [f"You have {len(self.messages)} unread {'message' if len(self.messages) == 1 else 'messages'}:"]
        for msg in self.messages[:5]:  # voice brief: top 5 only
            lines.append(f"  {msg.to_brief_line()}")
        if len(self.messages) > 5:
            lines.append(f"  ...and {len(self.messages) - 5} more.")
        return "\n".join(lines)

    def to_context_block(self) -> str:
        """Format for LLM context injection."""
        if not self.messages or self.error:
            return ""
        lines = ["[EMAIL — UNREAD]"]
        for m in self.messages:
            lines.append(f"  {m.to_brief_line()}")
            if m.body_preview:
                preview = m.body_preview[:120].replace("\n", " ")
                lines.append(f"    Preview: {preview}")
        return "\n".join(lines)


class EmailSkill:
    """
    OpenJarvis-compatible email skill.
    Triage-first: automated senders are filtered by default.
    Send actions require explicit confirmation in the calling context.
    """

    name = "email"
    description = (
        "Read, draft, and send email via Microsoft Graph. "
        "Actions: unread, recent, send, draft, read_full. "
        "For send/draft: provide to (email), subject, body. "
        "For recent: provide hours (int). "
        "For read_full: provide message_id."
    )

    def __init__(self, client: Optional[MSGraphClient] = None) -> None:
        self._client: Optional[MSGraphClient] = client

    def _get_client(self) -> MSGraphClient:
        if self._client is None:
            self._client = MSGraphClient()
        return self._client

    def run(
        self,
        action: str = "unread",
        *,
        to: Optional[str] = None,
        subject: Optional[str] = None,
        body: Optional[str] = None,
        message_id: Optional[str] = None,
        hours: int = 24,
        limit: int = 20,
        real_people_only: bool = True,
    ) -> EmailResult:
        try:
            client = self._get_client()

            if action == "unread":
                messages = client.get_unread_emails(
                    limit=limit,
                    real_people_only=real_people_only,
                )
                return EmailResult(messages=messages, action=action)

            elif action == "recent":
                messages = client.get_recent_emails(hours=hours, limit=limit)
                if real_people_only:
                    messages = [m for m in messages if m.is_from_real_person()]
                return EmailResult(messages=messages, action=action)

            elif action == "send":
                if not to or not subject or not body:
                    return EmailResult(
                        messages=[],
                        action=action,
                        error="send requires: to, subject, body",
                    )
                client.send_email(to=to, subject=subject, body=body)
                return EmailResult(messages=[], action=action, sent=True)

            elif action == "draft":
                if not to or not subject or not body:
                    return EmailResult(
                        messages=[],
                        action=action,
                        error="draft requires: to, subject, body",
                    )
                draft_id = client.create_draft(to=to, subject=subject, body=body)
                return EmailResult(messages=[], action=action, draft_id=draft_id)

            elif action == "read_full":
                if not message_id:
                    return EmailResult(
                        messages=[],
                        action=action,
                        error="read_full requires: message_id",
                    )
                body_content = client.get_email_body(message_id)
                return EmailResult(
                    messages=[],
                    action=action,
                    full_body=body_content,
                )

            else:
                return EmailResult(
                    messages=[],
                    action=action,
                    error=f"Unknown action: {action}",
                )

        except RuntimeError as e:
            if "No valid token" in str(e):
                return EmailResult(
                    messages=[],
                    action=action,
                    error="Microsoft Graph not authenticated. Run: uv run python scripts/auth_msgraph.py",
                )
            return EmailResult(messages=[], action=action, error=str(e))

        except Exception as e:
            return EmailResult(messages=[], action=action, error=str(e))

    def unread_brief(self) -> str:
        return self.run("unread").to_brief()
