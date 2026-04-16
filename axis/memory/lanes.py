"""
Five-lane memory schema for Axis.

Each lane has its own retrieval logic, write rules, and privacy boundary.
This module defines the lane structure and routing rules that sit on top
of OpenJarvis's built-in memory backend.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List


class MemoryLane(str, Enum):
    """The five memory lanes that organize Axis's knowledge."""

    FAMILY = "family"
    BUSINESS = "business"
    PRODUCT = "product"
    FAITH = "faith"
    SELF = "self"


class PrivacyLevel(str, Enum):
    """Where data is allowed to be processed."""

    LOCAL_ONLY = "local_only"       # Never leaves the Mac mini
    LOCAL_DEFAULT = "local_default"  # Local by default, cloud if explicitly overridden
    CLOUD_ALLOWED = "cloud_allowed"  # Can be sent to cloud LLM when needed


@dataclass
class LaneConfig:
    """Configuration for a single memory lane."""

    lane: MemoryLane
    description: str
    privacy: PrivacyLevel
    entities: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)


# ── Lane Definitions ─────────────────────────────────────────────────────────

LANE_CONFIGS: dict[MemoryLane, LaneConfig] = {
    MemoryLane.FAMILY: LaneConfig(
        lane=MemoryLane.FAMILY,
        description=(
            "Jazmine, Caleb, Jaxon, and Major. School schedules, basketball "
            "calendar, mental health flags, conversations to have, gifts, "
            "doctor appointments, devotional themes shared at the dinner table."
        ),
        privacy=PrivacyLevel.LOCAL_ONLY,
        entities=["Jazmine", "Caleb", "Jaxon", "Major"],
        tags=["family", "school", "basketball", "health", "devotional"],
    ),
    MemoryLane.BUSINESS: LaneConfig(
        lane=MemoryLane.BUSINESS,
        description=(
            "Pivot operations. Active client list, pipeline, DBHDD certification "
            "milestones, school outreach call tracker, speaker fee structure, "
            "workshop pricing tiers."
        ),
        privacy=PrivacyLevel.CLOUD_ALLOWED,
        entities=[
            "Johnson and Johnson", "CMSD", "Head Start",
            "Boys and Girls Club", "CUNY", "Tomie Lenear", "UC Berkeley",
        ],
        tags=["business", "pipeline", "clients", "pricing", "outreach", "certification"],
    ),
    MemoryLane.PRODUCT: LaneConfig(
        lane=MemoryLane.PRODUCT,
        description=(
            "The IQ suite. Build status, technical specs, deployment URLs, "
            "GitHub repos under PivotTraining, customer feedback."
        ),
        privacy=PrivacyLevel.CLOUD_ALLOWED,
        entities=[
            "PressureIQ", "SignalIQ", "OutreachIQ", "CompatibleIQ",
            "ComplianceIQ", "BurnoutIQ", "DrillIQ", "CourtIQ",
            "ChristianIQ", "BalanceIQ",
        ],
        tags=["product", "iq-suite", "build", "specs", "deployment"],
    ),
    MemoryLane.FAITH: LaneConfig(
        lane=MemoryLane.FAITH,
        description=(
            "Devotion archive. Every devotion delivered, scripture covered, "
            "etymology referenced, cross-references used, closing component. "
            "Tracks themes to avoid repetition. Holds the in-progress modern "
            "Bible adaptation in NLT-style tone."
        ),
        privacy=PrivacyLevel.LOCAL_DEFAULT,
        entities=[],
        tags=["faith", "devotion", "scripture", "bible", "etymology"],
    ),
    MemoryLane.SELF: LaneConfig(
        lane=MemoryLane.SELF,
        description=(
            "Chris's own state. Energy patterns, health flags, doctoral program "
            "research, options trading notes in Premium Collector style, "
            "reading list, voice notes, what he is wrestling with."
        ),
        privacy=PrivacyLevel.LOCAL_ONLY,
        entities=[],
        tags=["self", "health", "energy", "doctoral", "trading", "reading"],
    ),
}


# ── Write Rules ──────────────────────────────────────────────────────────────

WRITE_TRIGGERS = [
    "Explicit save: Chris says 'remember this' or 'save this'.",
    "High-signal event: new contact, deadline, decision made, commitment given.",
    "Length threshold: conversation exceeds threshold and agent compresses to summary.",
]

# ── Read Rules ───────────────────────────────────────────────────────────────

READ_STRATEGY = {
    "semantic": "Vector search on current question, scoped to relevant lanes.",
    "recency": "Lookup anything within the last 48 hours.",
    "relationship": "Entity lookup if any named entity appears in the question.",
    "merge": "Top retrievals loaded into context before the model sees the prompt.",
}


def classify_lane(query: str) -> list[MemoryLane]:
    """
    Classify which memory lanes a query is relevant to.

    Uses keyword and entity matching as a first pass. In production this
    will be replaced by the agent's intent classifier, but this provides
    a deterministic fallback.
    """
    query_lower = query.lower()
    matched: list[MemoryLane] = []

    for lane, config in LANE_CONFIGS.items():
        # Check entity matches
        for entity in config.entities:
            if entity.lower() in query_lower:
                matched.append(lane)
                break
        else:
            # Check tag matches
            for tag in config.tags:
                if tag in query_lower:
                    matched.append(lane)
                    break

    # Default to Business if nothing matched — most common lane
    return matched if matched else [MemoryLane.BUSINESS]


def can_use_cloud(lanes: list[MemoryLane]) -> bool:
    """Check whether any lane in the query set forbids cloud processing."""
    for lane in lanes:
        config = LANE_CONFIGS[lane]
        if config.privacy == PrivacyLevel.LOCAL_ONLY:
            return False
    return True
