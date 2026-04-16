"""
Axis IQ Router — Intent-to-Tool Dispatcher

When Axis receives a voice command, this router classifies the intent
and dispatches to the correct IQ skill. The agent calls this as a
single entry point rather than knowing which skill to call directly.

Two-stage classification (from the spec):
  1. Intent type: question | command | creative | reflection
  2. IQ product: which tool handles this, and what action within it

Examples:
  "Check the status of CompatibleIQ"
      → product=compatibleiq, action=status

  "Send the Tomie Lenear follow-up"
      → product=outreachiq, action=contact, search="Tomie Lenear"
        then outreachiq, action=pipeline to check campaign status

  "What stress mode is Caleb showing?"
      → product=pressureiq, action=result, user_name="Caleb"

  "What's the OutreachIQ pipeline look like?"
      → product=outreachiq, action=pipeline

  "Pull the latest specs for DrillIQ"
      → product=memory, lane=product (not an IQ tool — answered from memory)
"""

from __future__ import annotations

import re
import sys
import os
from dataclasses import dataclass
from typing import Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from skills.outreachiq import OutreachIQSkill
from skills.pressureiq import PressureIQSkill
from skills.signaliq import SignalIQSkill
from skills.compatibleiq import CompatibleIQSkill


# ── Routing table ─────────────────────────────────────────────────────────────
# Maps (product_keyword, action_pattern) → (skill, action)

_PRODUCT_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\boutreach\b|\boutreachiq\b|\bcampaign\b|\bcontact\b|\bpipeline\b|\bsequence\b|\bsend.+email\b", re.I), "outreachiq"),
    (re.compile(r"\bpressure\b|\bpressureiq\b|\bstress\b|\bpressure.mode\b|\bassessment\b", re.I), "pressureiq"),
    (re.compile(r"\bsignal\b|\bsignaliq\b|\brevenue.intel\b|\bopportunit\b|\bintelligence.brief\b", re.I), "signaliq"),
    (re.compile(r"\bcompat\b|\bcompatibleiq\b|\bprofile\b|\bshadow.profile\b|\bcompatib", re.I), "compatibleiq"),
]

_ACTION_PATTERNS: dict[str, list[tuple[re.Pattern, str]]] = {
    "outreachiq": [
        (re.compile(r"\bpipeline\b|\bstatus\b|\bcampaigns\b", re.I), "pipeline"),
        (re.compile(r"\bcontact\b|\blook.up\b|\bfind\b|\bwho.is\b", re.I), "contact"),
        (re.compile(r"\badd\b|\bcreate.contact\b|\bnew.contact\b", re.I), "add_contact"),
        (re.compile(r"\blog\b|\bhistory\b|\bsent\b", re.I), "logs"),
        (re.compile(r"\bstats\b|\bhow.many\b|\bcount\b|\bdaily\b", re.I), "send_stats"),
    ],
    "pressureiq": [
        (re.compile(r"\btrend\b|\bhistor\b|\bover.time\b", re.I), "trend"),
        (re.compile(r"\bresult\b|\bmode\b|\bshow\b|\bscoring\b|\blatest\b", re.I), "result"),
        (re.compile(r"\btrigger\b|\bsend.assess\b|\bstart.assess\b", re.I), "assess"),
        (re.compile(r"\bstatus\b|\bdeployed\b", re.I), "status"),
    ],
    "signaliq": [
        (re.compile(r"\bopportunit\b|\bflagged\b", re.I), "opportunities"),
        (re.compile(r"\bbrief\b|\bsummar\b|\bintell\b", re.I), "brief"),
        (re.compile(r"\bpipeline\b|\brevenue\b", re.I), "pipeline"),
        (re.compile(r"\bstatus\b", re.I), "status"),
    ],
    "compatibleiq": [
        (re.compile(r"\bshadow\b", re.I), "shadow"),
        (re.compile(r"\bcheck\b|\bcompare\b|\bbetween\b", re.I), "check"),
        (re.compile(r"\bprofile\b|\bwho.is\b", re.I), "profile"),
        (re.compile(r"\bstatus\b", re.I), "status"),
    ],
}


@dataclass
class RouteResult:
    product: str
    action: str
    kwargs: dict[str, Any]
    response: str
    routed: bool = True


class IQRouter:
    """
    Single entry point for all IQ product queries.
    Instantiates each skill lazily — only loads what's needed.
    """

    def __init__(self) -> None:
        self._skills: dict[str, Any] = {}

    def _get_skill(self, product: str):
        if product not in self._skills:
            if product == "outreachiq":
                self._skills[product] = OutreachIQSkill()
            elif product == "pressureiq":
                self._skills[product] = PressureIQSkill()
            elif product == "signaliq":
                self._skills[product] = SignalIQSkill()
            elif product == "compatibleiq":
                self._skills[product] = CompatibleIQSkill()
        return self._skills.get(product)

    def classify(self, query: str) -> tuple[str, str, dict[str, Any]]:
        """
        Classify a query into (product, action, kwargs).
        Returns ("unknown", "status", {}) if no match found.
        """
        # Step 1: identify product
        product = "unknown"
        for pattern, name in _PRODUCT_PATTERNS:
            if pattern.search(query):
                product = name
                break

        if product == "unknown":
            return ("unknown", "status", {})

        # Step 2: identify action within that product
        action = "status"  # safe default
        for pattern, action_name in _ACTION_PATTERNS.get(product, []):
            if pattern.search(query):
                action = action_name
                break

        # Step 3: extract kwargs (names, emails, etc.)
        kwargs = _extract_kwargs(query, product, action)

        return (product, action, kwargs)

    def route(self, query: str) -> RouteResult:
        """Classify and execute the appropriate IQ skill."""
        product, action, kwargs = self.classify(query)

        if product == "unknown":
            return RouteResult(
                product="unknown",
                action="status",
                kwargs={},
                response="I couldn't tell which IQ product that's about, Boss. Be more specific — OutreachIQ, PressureIQ, SignalIQ, or CompatibleIQ.",
                routed=False,
            )

        skill = self._get_skill(product)
        if skill is None:
            return RouteResult(
                product=product,
                action=action,
                kwargs=kwargs,
                response=f"{product} skill not available.",
                routed=False,
            )

        try:
            response = skill.run(action=action, **kwargs)
        except Exception as e:
            response = f"{product} error: {e}"

        return RouteResult(
            product=product,
            action=action,
            kwargs=kwargs,
            response=response,
        )

    def all_status(self) -> str:
        """Quick health check across all IQ skills."""
        lines = ["IQ Suite Status:"]
        for product in ["outreachiq", "pressureiq", "signaliq", "compatibleiq"]:
            skill = self._get_skill(product)
            try:
                result = skill.run(action="status")
                # Trim to one line for the overview
                first_line = result.split("\n")[0][:80]
                lines.append(f"  {product}: {first_line}")
            except Exception as e:
                lines.append(f"  {product}: error — {e}")
        return "\n".join(lines)


# ── Kwarg extraction helpers ──────────────────────────────────────────────────

_NAME_PATTERN = re.compile(
    r"\b([A-Z][a-z]+ [A-Z][a-z]+)\b"  # "First Last" capitalized names
)
_EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}")


def _extract_kwargs(query: str, product: str, action: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {}

    # Extract email addresses
    emails = _EMAIL_PATTERN.findall(query)
    if emails:
        kwargs["email"] = emails[0]
        if len(emails) > 1:
            kwargs["email_b"] = emails[1]

    # Extract capitalized names
    names = _NAME_PATTERN.findall(query)
    if names:
        if action in ("contact", "result", "trend", "profile", "shadow"):
            kwargs["user_name"] = names[0]
            kwargs["search"] = names[0]
        if action == "check" and len(names) >= 2:
            kwargs["user_a"] = names[0]
            kwargs["user_b"] = names[1]

    # Extract topic for brief action
    if action == "brief":
        # Everything after "brief on" or "brief about"
        m = re.search(r"brief (?:on|about) (.+)", query, re.I)
        if m:
            kwargs["topic"] = m.group(1).strip()

    return kwargs
