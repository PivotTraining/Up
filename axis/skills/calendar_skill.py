"""
Axis Calendar Skill

Exposes Microsoft Graph calendar data as an OpenJarvis-compatible tool.
The agent calls this when it detects calendar-related intent.

Supported actions:
  - today       : today's events
  - tomorrow    : tomorrow's events
  - week        : this week's events
  - range       : events between two datetimes (ISO format)
"""

from __future__ import annotations

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional

from connectors.msgraph import MSGraphClient, CalendarEvent


@dataclass
class CalendarResult:
    events: list[CalendarEvent]
    period_label: str
    error: Optional[str] = None

    def to_brief(self) -> str:
        """Format for Axis voice output — no markdown, spoken aloud."""
        if self.error:
            return f"Calendar unavailable right now."

        if not self.events:
            return f"Nothing on the calendar {self.period_label}."

        lines = [f"Here's what's on the calendar {self.period_label}:"]
        for event in self.events:
            lines.append(f"  {event.to_brief_line()}")
        return "\n".join(lines)

    def to_context_block(self) -> str:
        """Format for memory context injection into LLM prompt."""
        if not self.events or self.error:
            return ""
        lines = [f"[CALENDAR — {self.period_label.upper()}]"]
        for e in self.events:
            lines.append(f"  {e.to_brief_line()}")
        return "\n".join(lines)


class CalendarSkill:
    """
    OpenJarvis-compatible calendar skill.

    The agent invokes this with an action string and optional parameters.
    Returns a CalendarResult that can be formatted for voice or context.
    """

    name = "calendar"
    description = (
        "Read calendar events. Actions: today, tomorrow, week, range. "
        "For 'range', provide start_date and end_date as ISO strings."
    )

    def __init__(self, client: Optional[MSGraphClient] = None) -> None:
        self._client: Optional[MSGraphClient] = client

    def _get_client(self) -> MSGraphClient:
        if self._client is None:
            self._client = MSGraphClient()
        return self._client

    def run(
        self,
        action: str = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> CalendarResult:
        try:
            client = self._get_client()

            if action == "today":
                events = client.get_todays_events()
                label = "today"

            elif action == "tomorrow":
                events = client.get_tomorrows_events()
                label = "tomorrow"

            elif action == "week":
                events = client.get_weeks_events()
                label = "this week"

            elif action == "range" and start_date and end_date:
                start = datetime.fromisoformat(start_date)
                end = datetime.fromisoformat(end_date)
                events = client.get_events(start=start, end=end)
                label = f"from {start.strftime('%b %d')} to {end.strftime('%b %d')}"

            else:
                events = client.get_todays_events()
                label = "today"

            return CalendarResult(events=events, period_label=label)

        except RuntimeError as e:
            if "No valid token" in str(e):
                return CalendarResult(
                    events=[],
                    period_label=action,
                    error="Microsoft Graph not authenticated. Run: uv run python scripts/auth_msgraph.py",
                )
            return CalendarResult(events=[], period_label=action, error=str(e))

        except Exception as e:
            return CalendarResult(events=[], period_label=action, error=str(e))

    def today_brief(self) -> str:
        """Convenience: returns a voice-ready today brief."""
        return self.run("today").to_brief()

    def tomorrow_brief(self) -> str:
        return self.run("tomorrow").to_brief()

    def week_brief(self) -> str:
        return self.run("week").to_brief()
