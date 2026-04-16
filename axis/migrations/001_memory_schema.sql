-- ──────────────────────────────────────────────
-- Axis Memory Schema — Migration 001
-- Run this in your Supabase SQL editor
-- ──────────────────────────────────────────────

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Memory Lane Enum ─────────────────────────
CREATE TYPE memory_lane AS ENUM (
    'family',
    'business',
    'product',
    'faith',
    'self'
);

-- ── Core Memory Table ────────────────────────
-- Each row is one memory record — a fact, event,
-- summary, or piece of context in a specific lane.
CREATE TABLE IF NOT EXISTS axis_memories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lane        memory_lane     NOT NULL,
    content     TEXT            NOT NULL,
    -- nomic-embed-text produces 768-dimensional vectors
    embedding   VECTOR(768),
    source      TEXT            DEFAULT 'conversation',
    entity_refs TEXT[]          DEFAULT '{}',
    tags        TEXT[]          DEFAULT '{}',
    metadata    JSONB           DEFAULT '{}',
    created_at  TIMESTAMPTZ     DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     DEFAULT NOW()
);

-- ── Index: vector similarity search per lane ─
CREATE INDEX IF NOT EXISTS axis_memories_embedding_idx
    ON axis_memories
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ── Index: recency lookups ───────────────────
CREATE INDEX IF NOT EXISTS axis_memories_lane_created_idx
    ON axis_memories (lane, created_at DESC);

-- ── Index: entity reference lookups ─────────
CREATE INDEX IF NOT EXISTS axis_memories_entity_refs_idx
    ON axis_memories USING GIN (entity_refs);

-- ── Index: tag lookups ───────────────────────
CREATE INDEX IF NOT EXISTS axis_memories_tags_idx
    ON axis_memories USING GIN (tags);

-- ── Auto-update updated_at ───────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER axis_memories_updated_at
    BEFORE UPDATE ON axis_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────
-- Family and Self lanes get extra RLS policies
-- when multi-user access is added in a future phase.
ALTER TABLE axis_memories ENABLE ROW LEVEL SECURITY;

-- For now: full access (single-user local deployment)
CREATE POLICY "axis_full_access" ON axis_memories
    FOR ALL USING (true);

-- ── Hybrid Search Function ───────────────────
-- Combines semantic similarity + recency + entity match
-- Called from the Python backend with a query embedding.
CREATE OR REPLACE FUNCTION axis_memory_search(
    query_embedding VECTOR(768),
    target_lanes    memory_lane[],
    match_count     INT     DEFAULT 10,
    recency_hours   INT     DEFAULT 48,
    entity_filter   TEXT[]  DEFAULT '{}'
)
RETURNS TABLE (
    id          UUID,
    lane        memory_lane,
    content     TEXT,
    source      TEXT,
    entity_refs TEXT[],
    tags        TEXT[],
    metadata    JSONB,
    created_at  TIMESTAMPTZ,
    similarity  FLOAT,
    recency_boost FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT
        m.id,
        m.lane,
        m.content,
        m.source,
        m.entity_refs,
        m.tags,
        m.metadata,
        m.created_at,
        1 - (m.embedding <=> query_embedding) AS similarity,
        -- Recency boost: 1.0 if within recency window, decays after
        CASE
            WHEN m.created_at > NOW() - (recency_hours || ' hours')::INTERVAL
            THEN 1.0
            ELSE 0.5
        END AS recency_boost
    FROM axis_memories m
    WHERE
        m.lane = ANY(target_lanes)
        AND m.embedding IS NOT NULL
        AND (
            CARDINALITY(entity_filter) = 0
            OR m.entity_refs && entity_filter
        )
    ORDER BY
        -- Weighted score: 70% semantic, 30% recency
        (0.7 * (1 - (m.embedding <=> query_embedding)))
        + (0.3 * CASE
            WHEN m.created_at > NOW() - (recency_hours || ' hours')::INTERVAL
            THEN 1.0 ELSE 0.5
          END) DESC
    LIMIT match_count;
$$;

-- ── View: recent activity per lane ───────────
CREATE OR REPLACE VIEW axis_recent_memories AS
SELECT
    lane,
    content,
    source,
    entity_refs,
    created_at
FROM axis_memories
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ── Confirmation ─────────────────────────────
DO $$
BEGIN
    RAISE NOTICE 'Axis memory schema ready. Run axis/scripts/seed.py to populate initial context.';
END $$;
