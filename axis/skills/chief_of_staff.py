"""
Axis Chief of Staff — Morning Brief Assembler

Builds Chris's daily focus brief by pulling from three sources:
  1. Calendar (today + tomorrow preview)
  2. Email (unread from real people)
  3. Memory (recent Business lane — open items, pipeline, deadlines)

The brief is formatted for voice delivery — no markdown, no bullets,
no headers. Structured as a conversation, not a status report.

Usage:
    cd axis && uv run python skills/chief_of_staff.py

Or from within a conversation:
    "Axis, give me the morning brief"
    "What do I have today?"
    "What's on the agenda?"
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from skills.calendar_skill import CalendarSkill
from skills.email_skill import EmailSkill


class ChiefOfStaff:
    """
    Assembles and delivers the Axis morning brief.

    The brief has three sections:
      1. Opening + date anchor
      2. Calendar — today's events, tomorrow preview if light day
      3. Email triage — unread from real people only
      4. Close — one actionable priority or encouragement

    All output is voice-ready: plain prose, no markdown.
    """

    def __init__(self) -> None:
        self._calendar = CalendarSkill()
        self._email = EmailSkill()

    def generate(self, include_memory: bool = False) -> str:
        """
        Build the full morning brief string.

        include_memory: if True and Supabase is configured, pulls recent
        Business lane items (open pipeline, upcoming deadlines).
        """
        sections: list[str] = []

        # ── Opening ──────────────────────────────────────────────────────
        now = datetime.now()
        day_name = now.strftime("%A")
        date_str = now.strftime("%B %d, %Y")
        hour = now.hour
        location = os.environ.get("AXIS_LOCATION", "Atlanta, Georgia")

        if hour < 12:
            greeting = "Good morning"
        elif hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"

        sections.append(f"{greeting}, Boss. It's {day_name}, {date_str}. You're in {location}.")

        # ── Calendar ─────────────────────────────────────────────────────
        today_result = self._calendar.run("today")
        if today_result.error:
            sections.append("Calendar isn't connected yet — run the auth script to wire it in.")
        elif not today_result.events:
            sections.append("Calendar is clear today. Good day to push on deep work.")
            # Preview tomorrow if today is empty
            tomorrow_result = self._calendar.run("tomorrow")
            if tomorrow_result.events:
                sections.append(f"Tomorrow has {len(tomorrow_result.events)} event{'s' if len(tomorrow_result.events) != 1 else ''}:")
                for e in tomorrow_result.events[:3]:
                    sections.append(f"  {e.to_brief_line()}")
        else:
            count = len(today_result.events)
            sections.append(f"You have {count} thing{'s' if count != 1 else ''} on the calendar today:")
            for e in today_result.events:
                sections.append(f"  {e.to_brief_line()}")

        # ── Email ─────────────────────────────────────────────────────────
        email_result = self._email.run("unread", limit=15)
        if email_result.error:
            sections.append("Email isn't connected yet.")
        elif not email_result.messages:
            sections.append("Inbox is clear. No unread messages from real people.")
        else:
            msgs = email_result.messages
            sections.append(
                f"{'One unread message' if len(msgs) == 1 else f'{len(msgs)} unread messages'} "
                f"worth your attention:"
            )
            for msg in msgs[:4]:  # cap at 4 for voice
                sections.append(f"  {msg.to_brief_line()}")
                if msg.body_preview:
                    preview = msg.body_preview[:100].replace("\n", " ").strip()
                    if preview:
                        sections.append(f"    They say: {preview}")
            if len(msgs) > 4:
                sections.append(f"  Plus {len(msgs) - 4} more in the inbox.")

        # ── Memory context (optional, Phase 2+) ──────────────────────────
        if include_memory:
            try:
                from memory.supabase_backend import AxisMemoryBackend
                from memory.lanes import MemoryLane
                backend = AxisMemoryBackend()
                recent = backend.recent(lane=MemoryLane.BUSINESS, hours=72, limit=5)
                if recent:
                    sections.append("A few things on the business front worth keeping top of mind:")
                    for r in recent[:3]:
                        sections.append(f"  {r.content[:120]}")
            except Exception:
                pass  # Memory not configured yet — skip silently

        # ── Close ─────────────────────────────────────────────────────────
        sections.append(_closing_line(now))

        return "\n".join(sections)

    def print_brief(self) -> None:
        print(self.generate(include_memory=True))


def _closing_line(now: datetime) -> str:
    """A single closing line — actionable or grounding, never generic."""
    hour = now.hour
    weekday = now.weekday()  # 0=Monday

    if weekday == 0:  # Monday
        return "New week. Set the tone today — everything else follows from how Monday lands."
    if weekday == 4:  # Friday
        return "End of week. Good day to close open loops before the weekend."
    if weekday >= 5:  # Weekend
        return "It's the weekend, Boss. Rest is part of the work."
    if hour < 9:
        return "Early start. Use the quiet hours — they're the most expensive real estate in your day."
    if hour >= 17:
        return "Wrap it up clean. How you end the day sets up how you start the next one."
    return "Stay in your lane today. Focus beats volume every time."


if __name__ == "__main__":
    cos = ChiefOfStaff()
    cos.print_brief()
