"""
Axis Vault Indexer — Chunk, Embed, and Store Documents

Takes ScannedFile objects from VaultScanner, chunks them into
~400-token segments with overlap, embeds via nomic-embed-text on
Ollama (local, free), and stores in Supabase axis_memories table
under the most appropriate memory lane.

Lane assignment is heuristic — file path and content keywords
determine which lane a document belongs to.

Idempotent: tracks document fingerprints in axis_vault_index table
to skip unchanged files on re-runs.
"""

from __future__ import annotations

import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from memory.lanes import MemoryLane, LANE_CONFIGS
from vault.scanner import VaultScanner, ScannedFile

# Chunk settings
CHUNK_SIZE    = 1_600   # chars (~400 tokens)
CHUNK_OVERLAP = 200     # chars overlap between chunks

OLLAMA_BASE  = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
EMBED_MODEL  = "nomic-embed-text"


# ── Lane classifier ───────────────────────────────────────────────────────────

_LANE_KEYWORDS: dict[MemoryLane, list[str]] = {
    MemoryLane.BUSINESS: [
        "call script", "outreach", "proposal", "client", "pipeline",
        "workshop", "pitch", "pricing", "invoice", "contract",
        "school", "district", "keynote", "speaking", "sponsor",
        "linkedin", "playbook", "partner",
    ],
    MemoryLane.PRODUCT: [
        "pressureiq", "signaliq", "outreachiq", "compatibleiq",
        "courtiq", "drilliq", "balanceiq", "burnoutiq",
        "compliance", "specification", "spec", "blueprint",
        "api", "deployment", "build",
    ],
    MemoryLane.FAITH: [
        "devotion", "scripture", "sermon", "bible", "psalm",
        "gospel", "prayer", "theology", "faith", "worship",
        "etymology", "hebrew", "greek", "cross-reference",
    ],
    MemoryLane.SELF: [
        "resume", "cv", "dissertation", "doctoral", "thesis",
        "trading", "journal", "personal", "reading list",
    ],
    MemoryLane.FAMILY: [
        "caleb", "jaxon", "major", "jazmine", "family",
        "basketball schedule", "school pickup",
    ],
}


def classify_document_lane(
    path: Path, text: str
) -> MemoryLane:
    """Assign a memory lane based on file path + content keywords."""
    combined = (str(path).lower() + " " + text[:2000].lower())

    scores: dict[MemoryLane, int] = {lane: 0 for lane in MemoryLane}
    for lane, keywords in _LANE_KEYWORDS.items():
        for kw in keywords:
            if kw in combined:
                scores[lane] += 1

    best = max(scores, key=lambda l: scores[l])
    # Default to Business if nothing matched — most docs are business-related
    return best if scores[best] > 0 else MemoryLane.BUSINESS


# ── Chunker ───────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap

    return chunks


# ── Embedding ─────────────────────────────────────────────────────────────────

def embed(text: str) -> list[float]:
    resp = httpx.post(
        f"{OLLAMA_BASE}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=60.0,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]


# ── Indexer ───────────────────────────────────────────────────────────────────

@dataclass
class IndexStats:
    files_scanned: int = 0
    files_skipped: int = 0
    files_indexed: int = 0
    chunks_written: int = 0
    errors: int = 0


class VaultIndexer:
    """
    Full pipeline: scan → classify → chunk → embed → store.

    Usage:
        indexer = VaultIndexer()
        stats = indexer.run()
        print(f"Indexed {stats.files_indexed} files, {stats.chunks_written} chunks")
    """

    def __init__(
        self,
        scan_paths: Optional[list[str]] = None,
        dry_run: bool = False,
    ) -> None:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_KEY", "")
        if not url or not key:
            raise RuntimeError("Set SUPABASE_URL and SUPABASE_KEY in axis/.env")
        self._db = create_client(url, key)
        self._scanner = VaultScanner(paths=scan_paths)
        self._dry_run = dry_run
        self._seen_fingerprints: set[str] = self._load_indexed_fingerprints()

    def _load_indexed_fingerprints(self) -> set[str]:
        """Load fingerprints of already-indexed files."""
        try:
            result = (
                self._db.table("axis_vault_index")
                .select("fingerprint")
                .execute()
            )
            return {row["fingerprint"] for row in (result.data or [])}
        except Exception:
            return set()

    def _record_indexed(self, doc: ScannedFile, lane: MemoryLane, chunks: int) -> None:
        try:
            self._db.table("axis_vault_index").upsert({
                "fingerprint": doc.fingerprint,
                "path": str(doc.path),
                "lane": lane.value,
                "chunks": chunks,
                "indexed_at": "now()",
            }).execute()
        except Exception:
            pass  # Don't fail on tracking errors

    def run(self, verbose: bool = True) -> IndexStats:
        stats = IndexStats()

        for doc in self._scanner.scan():
            stats.files_scanned += 1

            if doc.error:
                stats.errors += 1
                if verbose:
                    print(f"  [ERROR] {doc.relative_label}: {doc.error}")
                continue

            if not doc.text or not doc.text.strip():
                stats.files_skipped += 1
                continue

            # Skip unchanged files
            if doc.fingerprint in self._seen_fingerprints:
                stats.files_skipped += 1
                if verbose:
                    print(f"  [SKIP]  {doc.relative_label} (unchanged)")
                continue

            # Classify lane
            lane = classify_document_lane(doc.path, doc.text)

            # Chunk
            chunks = chunk_text(doc.text)
            if not chunks:
                stats.files_skipped += 1
                continue

            if verbose:
                print(f"  [INDEX] {doc.relative_label} → {lane.value} ({len(chunks)} chunks)")

            if self._dry_run:
                stats.files_indexed += 1
                stats.chunks_written += len(chunks)
                continue

            # Embed + store each chunk
            chunk_count = 0
            for i, chunk in enumerate(chunks):
                try:
                    embedding = embed(chunk)
                    self._db.table("axis_memories").insert({
                        "lane": lane.value,
                        "content": chunk,
                        "embedding": embedding,
                        "source": f"vault:{doc.relative_label}",
                        "entity_refs": [],
                        "tags": [doc.extension.lstrip("."), "vault", lane.value],
                        "metadata": {
                            "file_path": str(doc.path),
                            "chunk_index": i,
                            "total_chunks": len(chunks),
                            "fingerprint": doc.fingerprint,
                        },
                    }).execute()
                    chunk_count += 1
                    time.sleep(0.05)   # gentle rate limit on Ollama
                except Exception as e:
                    if verbose:
                        print(f"    [CHUNK ERROR] chunk {i}: {e}")
                    stats.errors += 1

            self._record_indexed(doc, lane, chunk_count)
            self._seen_fingerprints.add(doc.fingerprint)
            stats.files_indexed += 1
            stats.chunks_written += chunk_count

        return stats
