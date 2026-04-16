"""
Axis Memory Seed Script — Phase 2

Populates the Supabase memory store with initial Pivot context
so Axis already knows the world when it first turns on.

Run: cd axis && uv run python memory/seed.py

Seeding is idempotent — each record carries a source tag of
'seed_v1'. Running twice won't create duplicates because the
script checks for existing seed records before inserting.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from memory.lanes import MemoryLane
from memory.supabase_backend import AxisMemoryBackend, MemoryRecord

SEED_SOURCE = "seed_v1"


# ─────────────────────────────────────────────────────────────────────────────
# SEED DATA
# Organized by lane. Keep entries concise — these are context anchors,
# not full documents. Full docs get indexed in Phase 6 (Vault indexing).
# ─────────────────────────────────────────────────────────────────────────────

FAMILY_SEEDS = [
    "Jazmine Davis is Chris's wife and co-founder of Pivot Training & Development.",
    "Caleb Davis is Chris's son, 13 years old, plays basketball, attends school in the Cleveland area.",
    "Jaxon Davis is Chris's son.",
    "Major Davis is Chris's son.",
    "Family devotionals happen at the dinner table. Chris leads them. Key themes: identity, purpose, resilience.",
    "Caleb's basketball calendar is a priority. Game days and practice schedules should surface proactively.",
]

BUSINESS_SEEDS = [
    "Pivot Training & Development is Chris's company. Core offerings: mental health workshops, L&D programs, organizational training.",
    "Active enterprise clients include Johnson and Johnson, CMSD (Cleveland Metropolitan School District), Head Start, Boys and Girls Club, and CUNY.",
    "Tomie Lenear is a Director at UC Berkeley. Live business contact. A pitch is in flight — follow up is a high priority.",
    "DBHDD certification is in progress. This is a credentialing milestone for Georgia Department of Behavioral Health.",
    "School outreach pipeline: cold calls to school districts and principals for workshop engagements. OutreachIQ manages the sequence.",
    "Workshop pricing tiers range from $3,500 (single session) to $250,000 (enterprise annual engagement).",
    "Speaker fee structure: Chris speaks on mental health, resilience, and performance psychology. Fees negotiated per engagement.",
    "Pivot GitHub organization is at github.com/PivotTraining. All IQ product repos live there.",
]

PRODUCT_SEEDS = [
    "PressureIQ: mental health assessment tool. Measures pressure modes and stress responses. Deployed and in-market. Uses promo codes for distribution.",
    "SignalIQ: revenue intelligence platform. Built on Next.js and Supabase. Full scaffold deployed.",
    "OutreachIQ: school and enterprise outreach automation. Wraps Microsoft Graph API for email sequences. Active and deployed.",
    "CompatibleIQ: compatibility profiling tool. Live in-market. Exposes profile lookup and compatibility check API.",
    "ComplianceIQ: compliance and regulatory training product. In development.",
    "BurnoutIQ: burnout risk assessment and prevention tool. In development.",
    "DrillIQ: basketball skills training platform. Full tech spec complete. Aimed at youth players and coaches.",
    "CourtIQ: basketball gameplay and analytics product. Prototype built — canvas-based game with gesture recognition in the Up repo.",
    "ChristianIQ: faith-integrated mental health and personal development tool. In planning.",
    "BalanceIQ: work-life balance and energy management tool. In planning.",
    "All IQ products share a common architecture philosophy: assessment → insight → action. Axis is the connective layer that makes them callable via voice.",
]

FAITH_SEEDS = [
    "Chris delivers a daily family devotion. Format: opening scripture, etymology or word study, cross-reference, personal story or illustration, closing component.",
    "In-progress project: a modern Bible adaptation in NLT-style tone that reflects Black American cultural experience.",
    "Key recurring devotional themes: identity in Christ, stewardship, resilience, fatherhood, calling and vocation.",
    "Scripture tracking: Axis should flag when a passage or theme has been used recently to prevent repetition.",
    "Devotion archive should accumulate over time and become a searchable resource for sermon prep and content creation.",
]

SELF_SEEDS = [
    "Chris is pursuing a doctoral degree. Research focus intersects organizational psychology and technology-mediated mental health.",
    "Options trading strategy: Premium Collector approach. Defined-risk, high-probability setups. Not a gambler — a strategist.",
    "Energy management matters. Chris operates at peak in the morning. Afternoons are for execution, not creation.",
    "Health flag: like any operator running multiple ventures, stress load is real. Axis should surface rest cues when usage patterns suggest overextension.",
    "Chris is an avid reader. Reading list spans psychology, theology, business strategy, and Black intellectual tradition.",
    "Voice notes and scattered thoughts should be captured and tagged into the appropriate lane automatically.",
    "Core identity anchors: father, husband, founder, psychologist, believer, operator.",
]

ALL_SEEDS: dict[MemoryLane, list[str]] = {
    MemoryLane.FAMILY:   FAMILY_SEEDS,
    MemoryLane.BUSINESS: BUSINESS_SEEDS,
    MemoryLane.PRODUCT:  PRODUCT_SEEDS,
    MemoryLane.FAITH:    FAITH_SEEDS,
    MemoryLane.SELF:     SELF_SEEDS,
}


def already_seeded(backend: AxisMemoryBackend) -> bool:
    """Check whether seed_v1 records already exist."""
    result = (
        backend._client.table("axis_memories")
        .select("id", count="exact")
        .eq("source", SEED_SOURCE)
        .limit(1)
        .execute()
    )
    return (result.count or 0) > 0


def run_seed(backend: AxisMemoryBackend, force: bool = False) -> None:
    if already_seeded(backend) and not force:
        print("Seed records already present. Use --force to re-seed.")
        return

    total = sum(len(v) for v in ALL_SEEDS.values())
    written = 0

    for lane, entries in ALL_SEEDS.items():
        print(f"\n  Seeding {lane.value} lane ({len(entries)} records)...")
        for content in entries:
            record = MemoryRecord(
                lane=lane,
                content=content,
                source=SEED_SOURCE,
            )
            backend.write(record)
            written += 1
            print(f"    [{written}/{total}] {content[:72]}{'...' if len(content) > 72 else ''}")

    print(f"\n  Done. {written} seed records written across {len(ALL_SEEDS)} lanes.")


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Seed Axis memory with initial Pivot context.")
    parser.add_argument("--force", action="store_true", help="Re-seed even if records exist.")
    args = parser.parse_args()

    print("=" * 50)
    print("  Axis Memory Seed — Phase 2")
    print("=" * 50)

    try:
        backend = AxisMemoryBackend()
    except RuntimeError as e:
        print(f"\n  ERROR: {e}")
        print("  Make sure SUPABASE_URL and SUPABASE_KEY are in axis/.env")
        sys.exit(1)

    print("\n  Connected to Supabase.")
    print("  Generating embeddings via Ollama nomic-embed-text...")
    print("  (First run is slow — subsequent writes are fast)\n")

    run_seed(backend, force=args.force)


if __name__ == "__main__":
    main()
