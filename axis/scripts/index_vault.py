"""
Axis Vault Indexer CLI

Scans configured paths, embeds documents via nomic-embed-text,
and stores them in Supabase for semantic retrieval.

Usage:
    cd axis && uv run python scripts/index_vault.py
    cd axis && uv run python scripts/index_vault.py --dry-run
    cd axis && uv run python scripts/index_vault.py --paths ~/Downloads ~/Documents

Run the Supabase migration first:
    Paste axis/migrations/002_vault_index.sql into Supabase SQL editor
"""

from __future__ import annotations

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from vault.indexer import VaultIndexer
from vault.scanner import DEFAULT_SCAN_PATHS


def main() -> None:
    parser = argparse.ArgumentParser(description="Index Vault documents into Axis memory.")
    parser.add_argument("--paths", nargs="*", help="Override scan paths")
    parser.add_argument("--dry-run", action="store_true", help="Scan without writing to Supabase")
    parser.add_argument("--quiet", action="store_true", help="Suppress per-file output")
    args = parser.parse_args()

    print("=" * 55)
    print("  Axis Vault Indexer")
    print("=" * 55)

    paths = args.paths or DEFAULT_SCAN_PATHS
    print(f"\n  Scanning {len(paths)} path(s):")
    for p in paths:
        print(f"    {p}")

    if args.dry_run:
        print("\n  DRY RUN — no data will be written to Supabase.")

    print(f"\n  Embedding model: nomic-embed-text (local Ollama)")
    print(f"  Storage: Supabase axis_memories table\n")

    start = time.time()
    try:
        indexer = VaultIndexer(
            scan_paths=paths,
            dry_run=args.dry_run,
        )
    except RuntimeError as e:
        print(f"  ERROR: {e}")
        sys.exit(1)

    stats = indexer.run(verbose=not args.quiet)
    elapsed = time.time() - start

    print("\n" + "=" * 55)
    print("  RESULTS")
    print("=" * 55)
    print(f"  Files scanned:  {stats.files_scanned}")
    print(f"  Files indexed:  {stats.files_indexed}")
    print(f"  Files skipped:  {stats.files_skipped}")
    print(f"  Chunks written: {stats.chunks_written}")
    print(f"  Errors:         {stats.errors}")
    print(f"  Time:           {elapsed:.1f}s")

    if stats.files_indexed > 0:
        print(f"\n  Done. Axis can now search {stats.chunks_written} document chunks.")
    else:
        print("\n  Nothing new to index.")


if __name__ == "__main__":
    main()
