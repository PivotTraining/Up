-- ──────────────────────────────────────────────
-- Axis Vault Index — Migration 002
-- Tracks which files have been indexed to prevent
-- duplicate embeddings on re-runs.
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS axis_vault_index (
    fingerprint   TEXT PRIMARY KEY,
    path          TEXT NOT NULL,
    lane          memory_lane NOT NULL,
    chunks        INT DEFAULT 0,
    indexed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS axis_vault_index_lane_idx
    ON axis_vault_index (lane);

CREATE INDEX IF NOT EXISTS axis_vault_index_indexed_at_idx
    ON axis_vault_index (indexed_at DESC);

DO $$
BEGIN
    RAISE NOTICE 'Vault index table ready.';
END $$;
