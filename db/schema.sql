-- Google Photos Retrieval Discovery Engine — SQLite Schema
-- Version: 1.1

-- 1. Evidence Nodes (Atomic unit of raw & classified feedback)
CREATE TABLE IF NOT EXISTS evidence_nodes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Source Traceability
    source_platform     TEXT NOT NULL,       -- 'reddit', 'play_store', 'community', 'manual'
    source_url          TEXT,                -- Original URL for traceability
    source_date         TEXT,                -- ISO date (e.g. '2024-03-15')
    collected_at        TEXT NOT NULL,       -- ISO timestamp
    
    -- Original Content
    original_text       TEXT NOT NULL,       -- Verbatim user statement
    
    -- AI Classification
    relevance           TEXT NOT NULL DEFAULT 'unprocessed',  -- 'relevant' | 'potentially_relevant' | 'not_relevant'
    relevance_reasoning TEXT,
    
    -- Extraction Results (stored as JSON arrays / strings)
    scenario_type       TEXT,            -- 'travel_memory', 'event_memory', etc.
    memory_clues        TEXT,            -- JSON array: what user remembers
    forgotten_info      TEXT,            -- JSON array: what user forgot
    search_queries      TEXT,            -- JSON array: queries tried
    search_methods      TEXT,            -- JSON array: 'keyword', 'scroll', etc.
    failure_type        TEXT,            -- 'semantic_gap', 'missing_metadata', etc.
    failure_detail      TEXT,            -- Description of failure
    workaround          TEXT,            -- What user did instead
    workaround_effort   TEXT,            -- 'low' | 'medium' | 'high' | 'abandoned'
    user_segment        TEXT,            -- Inferred user segment
    
    -- Scoring & Verification
    severity            TEXT DEFAULT 'medium',   -- 'critical' | 'high' | 'medium' | 'low'
    confidence          REAL DEFAULT 0.0,        -- 0.0 to 1.0
    evidence_type       TEXT DEFAULT 'direct_evidence',  -- 'direct_evidence' | 'ai_inference' | 'hypothesis'
    
    -- Opportunity Link
    opportunity_id      INTEGER,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
);

-- 2. Opportunities (Synthesized product opportunity spaces)
CREATE TABLE IF NOT EXISTS opportunities (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL,
    priority              TEXT NOT NULL,       -- 'P0' | 'P1' | 'P2'
    user_problem          TEXT NOT NULL,
    memory_pattern        TEXT,
    missing_information   TEXT,
    failure_point         TEXT,
    typical_workaround    TEXT,
    affected_segments     TEXT,               -- JSON array
    evidence_count        INTEGER DEFAULT 0,
    
    -- Transparent Weighted Scores (0.0 to 1.0)
    frequency_score       REAL DEFAULT 0.0,
    severity_score        REAL DEFAULT 0.0,
    evidence_strength     REAL DEFAULT 0.0,
    user_breadth          REAL DEFAULT 0.0,
    workaround_difficulty REAL DEFAULT 0.0,
    composite_score       REAL DEFAULT 0.0,
    
    confidence            TEXT DEFAULT 'low',  -- 'high' | 'medium' | 'low'
    scoring_methodology   TEXT                 -- Explanatory formula breakdown
);

-- 3. Taxonomy Nodes (Hierarchical failure modes & categorization)
CREATE TABLE IF NOT EXISTS taxonomy_nodes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id       INTEGER,
    code            TEXT NOT NULL UNIQUE,    -- e.g. 'A', 'A.1', 'B', 'C.1'
    label           TEXT NOT NULL,
    description     TEXT,
    evidence_count  INTEGER DEFAULT 0,
    percentage      REAL DEFAULT 0.0,
    FOREIGN KEY (parent_id) REFERENCES taxonomy_nodes(id)
);

-- 4. User Segments (Identified behavioral personas)
CREATE TABLE IF NOT EXISTS user_segments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    label               TEXT NOT NULL UNIQUE,
    description         TEXT,
    typical_memory_type TEXT,                -- JSON array
    dominant_failure    TEXT,
    dominant_workaround TEXT,
    evidence_count      INTEGER DEFAULT 0
);

-- Indexes for Fast Querying & Filtering
CREATE INDEX IF NOT EXISTS idx_evidence_relevance ON evidence_nodes(relevance);
CREATE INDEX IF NOT EXISTS idx_evidence_scenario ON evidence_nodes(scenario_type);
CREATE INDEX IF NOT EXISTS idx_evidence_failure ON evidence_nodes(failure_type);
CREATE INDEX IF NOT EXISTS idx_evidence_severity ON evidence_nodes(severity);
CREATE INDEX IF NOT EXISTS idx_evidence_opportunity ON evidence_nodes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority);
