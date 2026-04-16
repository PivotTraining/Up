"""
Axis Supabase Memory Backend

Replaces OpenJarvis's flat MEMORY.md + SQLite with a structured
Supabase + pgvector backend organized across 5 memory lanes.

Hybrid retrieval strategy:
  1. Semantic:    vector similarity search via pgvector (70% weight)
  2. Recency:     anything written in the last 48h gets a boost (30% weight)
  3. Relationship: entity-name filtering for named people / products

Embeddings generated locally via nomic-embed-text through Ollama —
no data ever leaves the machine for embedding.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

import httpx
from supabase import create_client, Client

from .lanes import MemoryLane, LANE_CONFIGS, classify_lane, can_use_cloud

# ── Embedding model ───────────────────────────────────────────────────────────
OLLAMA_BASE = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
EMBED_MODEL = "nomic-embed-text"
EMBED_DIM = 768


def get_embedding(text: str) -> list[float]:
    """Generate a 768-dim embedding via nomic-embed-text on Ollama (local, free)."""
    resp = httpx.post(
        f"{OLLAMA_BASE}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class MemoryRecord:
    lane: MemoryLane
    content: str
    source: str = "conversation"
    entity_refs: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class MemoryResult:
    id: str
    lane: MemoryLane
    content: str
    source: str
    entity_refs: list[str]
    tags: list[str]
    metadata: dict[str, Any]
    created_at: datetime
    similarity: float
    recency_boost: float

    @property
    def score(self) -> float:
        return 0.7 * self.similarity + 0.3 * self.recency_boost


# ── High-signal event detector ────────────────────────────────────────────────

_SIGNAL_PATTERNS = [
    r"\b(remember|save|note that|don't forget)\b",
    r"\b(deadline|due|by [A-Z][a-z]+day|by \w+ \d+)\b",
    r"\b(decided|committed|agreed|promised|will)\b",
    r"\b(new contact|new client|signed|closed)\b",
    r"@\w+",  # mentions
]
_SIGNAL_RE = re.compile("|".join(_SIGNAL_PATTERNS), re.IGNORECASE)

_LENGTH_THRESHOLD = 800  # chars before summary compression kicks in


def should_write_memory(text: str, explicit: bool = False) -> bool:
    """
    Determine whether a conversation turn should be persisted.
    Write rules from the spec:
      1. Explicit save instruction
      2. High-signal event detected
      3. Text exceeds length threshold (triggers summary compression)
    """
    if explicit:
        return True
    if len(text) >= _LENGTH_THRESHOLD:
        return True
    return bool(_SIGNAL_RE.search(text))


# ── Supabase backend ──────────────────────────────────────────────────────────

class AxisMemoryBackend:
    """
    Supabase-backed memory store for Axis.

    Usage:
        memory = AxisMemoryBackend()
        memory.write(MemoryRecord(lane=MemoryLane.BUSINESS, content="Tomie Lenear follow-up sent"))
        results = memory.search("Tomie Lenear", lanes=[MemoryLane.BUSINESS])
    """

    def __init__(
        self,
        supabase_url: str = "",
        supabase_key: str = "",
    ) -> None:
        url = supabase_url or os.environ.get("SUPABASE_URL", "")
        key = supabase_key or os.environ.get("SUPABASE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY must be set. "
                "Add them to axis/.env"
            )
        self._client: Client = create_client(url, key)

    # ── Write ─────────────────────────────────────────────────────────────────

    def write(self, record: MemoryRecord) -> str:
        """
        Persist a memory record. Generates a local embedding before writing.
        Returns the new record's UUID.
        """
        embedding = get_embedding(record.content)
        lane_config = LANE_CONFIGS[record.lane]

        row = {
            "lane": record.lane.value,
            "content": record.content,
            "embedding": embedding,
            "source": record.source,
            "entity_refs": record.entity_refs or _extract_entities(record.content),
            "tags": record.tags or lane_config.tags,
            "metadata": record.metadata,
        }

        result = (
            self._client.table("axis_memories")
            .insert(row)
            .execute()
        )
        return result.data[0]["id"]

    def write_from_text(
        self,
        content: str,
        *,
        lanes: Optional[list[MemoryLane]] = None,
        source: str = "conversation",
        explicit: bool = False,
    ) -> list[str]:
        """
        Convenience method: classify lanes automatically and write if warranted.
        Returns list of record IDs written (empty if nothing was written).
        """
        if not should_write_memory(content, explicit=explicit):
            return []

        resolved_lanes = lanes or classify_lane(content)
        ids = []
        for lane in resolved_lanes:
            record = MemoryRecord(
                lane=lane,
                content=content,
                source=source,
                entity_refs=_extract_entities(content),
            )
            ids.append(self.write(record))
        return ids

    # ── Search ────────────────────────────────────────────────────────────────

    def search(
        self,
        query: str,
        *,
        lanes: Optional[list[MemoryLane]] = None,
        limit: int = 10,
        recency_hours: int = 48,
        entity_filter: Optional[list[str]] = None,
    ) -> list[MemoryResult]:
        """
        Hybrid retrieval: semantic + recency + entity matching.
        Scopes to the provided lanes (auto-classified if not given).
        """
        resolved_lanes = lanes or classify_lane(query)
        query_embedding = get_embedding(query)

        result = self._client.rpc(
            "axis_memory_search",
            {
                "query_embedding": query_embedding,
                "target_lanes": [l.value for l in resolved_lanes],
                "match_count": limit,
                "recency_hours": recency_hours,
                "entity_filter": entity_filter or [],
            },
        ).execute()

        return [_row_to_result(row) for row in (result.data or [])]

    def recent(
        self,
        lane: Optional[MemoryLane] = None,
        hours: int = 48,
        limit: int = 20,
    ) -> list[MemoryResult]:
        """Retrieve the most recent memories, optionally scoped to one lane."""
        query = (
            self._client.table("axis_memories")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if lane:
            query = query.eq("lane", lane.value)

        result = query.execute()
        rows = result.data or []
        return [_row_to_result(r) for r in rows]

    def get_by_entity(self, entity: str, limit: int = 10) -> list[MemoryResult]:
        """Pull all memories that reference a specific named entity."""
        result = (
            self._client.table("axis_memories")
            .select("*")
            .contains("entity_refs", [entity])
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [_row_to_result(r) for r in (result.data or [])]

    # ── Context builder ───────────────────────────────────────────────────────

    def build_context(self, query: str, max_chars: int = 3000) -> str:
        """
        Assemble the memory context block that gets prepended to the LLM prompt.
        Combines semantic search + recency + entity lookups into a single string.
        """
        results = self.search(query, limit=8)
        if not results:
            return ""

        lines = ["[MEMORY CONTEXT]"]
        total = 0
        for r in sorted(results, key=lambda x: x.score, reverse=True):
            entry = f"[{r.lane.value.upper()} | {r.created_at.strftime('%Y-%m-%d')}] {r.content}"
            if total + len(entry) > max_chars:
                break
            lines.append(entry)
            total += len(entry)

        lines.append("[END MEMORY CONTEXT]")
        return "\n".join(lines)

    # ── Privacy guard ─────────────────────────────────────────────────────────

    def sanitize_for_cloud(self, text: str, lanes: list[MemoryLane]) -> str:
        """
        If any lane in the query requires LOCAL_ONLY privacy, redact
        known entity names before sending to a cloud LLM.
        """
        if can_use_cloud(lanes):
            return text

        # Replace Family lane entity names with tokens
        family_entities = LANE_CONFIGS[MemoryLane.FAMILY].entities
        sanitized = text
        for i, name in enumerate(family_entities):
            sanitized = sanitized.replace(name, f"[PERSON_{i+1}]")
        return sanitized


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_entities(text: str) -> list[str]:
    """
    Simple entity extractor — looks for known Pivot entities.
    In Phase 5+, this can be replaced with an NER model.
    """
    known_entities = [
        # Family
        "Jazmine", "Caleb", "Jaxon", "Major",
        # Business
        "Johnson and Johnson", "CMSD", "Head Start",
        "Boys and Girls Club", "CUNY", "Tomie Lenear",
        # Products
        "PressureIQ", "SignalIQ", "OutreachIQ", "CompatibleIQ",
        "ComplianceIQ", "BurnoutIQ", "DrillIQ", "CourtIQ",
        "ChristianIQ", "BalanceIQ",
        # Organization
        "Pivot", "UC Berkeley", "DBHDD",
    ]
    found = [e for e in known_entities if e.lower() in text.lower()]
    return list(dict.fromkeys(found))  # deduplicate, preserve order


def _row_to_result(row: dict[str, Any]) -> MemoryResult:
    return MemoryResult(
        id=row["id"],
        lane=MemoryLane(row["lane"]),
        content=row["content"],
        source=row.get("source", ""),
        entity_refs=row.get("entity_refs") or [],
        tags=row.get("tags") or [],
        metadata=row.get("metadata") or {},
        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
        similarity=float(row.get("similarity", 0.0)),
        recency_boost=float(row.get("recency_boost", 0.5)),
    )
