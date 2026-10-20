-- ============================================================
-- Zer0wasteX — Supabase PostgreSQL Schema
-- Requires: PostGIS extension
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Users (
    user_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    username     TEXT UNIQUE NOT NULL,
    total_points INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────
-- SMART BIN STATUS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Smart_Bin_Status (
    bin_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location                GEOGRAPHY(POINT) NOT NULL,
    current_weight_kg       DECIMAL(10, 2) DEFAULT 0.0,
    fill_level_percentage   INTEGER DEFAULT 0,
    last_updated            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    needs_collection        BOOLEAN DEFAULT FALSE,
    collection_status       TEXT DEFAULT 'normal',
    pickup_assignment       TEXT,
    route_code              TEXT,
    route_priority          TEXT DEFAULT 'low',
    alert_state             TEXT DEFAULT 'normal'
);

ALTER TABLE Smart_Bin_Status ADD COLUMN IF NOT EXISTS collection_status TEXT DEFAULT 'normal';
ALTER TABLE Smart_Bin_Status ADD COLUMN IF NOT EXISTS pickup_assignment TEXT;
ALTER TABLE Smart_Bin_Status ADD COLUMN IF NOT EXISTS route_code TEXT;
ALTER TABLE Smart_Bin_Status ADD COLUMN IF NOT EXISTS route_priority TEXT DEFAULT 'low';
ALTER TABLE Smart_Bin_Status ADD COLUMN IF NOT EXISTS alert_state TEXT DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_bin_needs_collection
    ON Smart_Bin_Status(needs_collection)
    WHERE needs_collection = TRUE;

-- ─────────────────────────────────────────────
-- COMMUNITY RATING BOARD
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Community_Rating_Board (
    locality_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locality_name                 TEXT NOT NULL,
    aggregated_cleanliness_rating DECIMAL(5, 2) DEFAULT 0.0,
    total_drops                   INTEGER DEFAULT 0,
    last_updated                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TRASH DROP EVENT
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Trash_Drop_Event (
    event_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID REFERENCES Users(user_id) ON DELETE SET NULL,
    bin_id             UUID REFERENCES Smart_Bin_Status(bin_id) ON DELETE SET NULL,
    locality_id        UUID REFERENCES Community_Rating_Board(locality_id) ON DELETE SET NULL,
    drop_location      GEOGRAPHY(POINT) NOT NULL,
    payload_weight_kg  DECIMAL(10, 2) NOT NULL,
    ai_quality_score   INTEGER CHECK (ai_quality_score >= 0 AND ai_quality_score <= 100),
    live_photo_url     TEXT NOT NULL,
    timestamp          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drop_event_user
    ON Trash_Drop_Event(user_id);

CREATE INDEX IF NOT EXISTS idx_drop_event_bin
    ON Trash_Drop_Event(bin_id);

-- ─────────────────────────────────────────────
-- POINTS LEDGER
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Points_Ledger (
    ledger_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES Users(user_id) ON DELETE CASCADE,
    event_id        UUID REFERENCES Trash_Drop_Event(event_id) ON DELETE SET NULL,
    points_awarded  INTEGER NOT NULL,
    reason          TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user
    ON Points_Ledger(user_id);

-- ─────────────────────────────────────────────
-- MRF WORKFLOW + OPERATOR INSPECTIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS MRF_Workflow_Record (
    workflow_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_date             DATE NOT NULL,
    source_bin_id           UUID REFERENCES Smart_Bin_Status(bin_id) ON DELETE SET NULL,
    stage                   TEXT NOT NULL,
    status                  TEXT NOT NULL,
    weight_kg               DECIMAL(10, 2) NOT NULL,
    contamination_rate      DECIMAL(5, 2) DEFAULT 0,
    recovered_material_kg   DECIMAL(10, 2) DEFAULT 0,
    storage_slot            TEXT,
    notes                   TEXT,
    mlp_taxonomy            TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS MRF_Workflow_Audit (
    audit_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id     UUID REFERENCES MRF_Workflow_Record(workflow_id) ON DELETE CASCADE,
    from_status     TEXT,
    to_status       TEXT NOT NULL,
    stage           TEXT NOT NULL,
    actor           TEXT,
    remarks         TEXT,
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_stage ON MRF_Workflow_Record(stage);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON MRF_Workflow_Record(status);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_workflow ON MRF_Workflow_Audit(workflow_id);

CREATE TABLE IF NOT EXISTS Material_Inspection_Record (
    inspection_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_name            TEXT NOT NULL,
    source_type              TEXT DEFAULT 'operator_upload',
    location_name            TEXT NOT NULL,
    location_lat             DECIMAL(9, 6) NOT NULL,
    location_lng             DECIMAL(9, 6) NOT NULL,
    material_type            TEXT NOT NULL,
    weight_kg                DECIMAL(10, 2) NOT NULL,
    contamination_percent    DECIMAL(5, 2) DEFAULT 0,
    image_url                TEXT,
    notes                    TEXT,
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_user_points(uid UUID, delta INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE Users SET total_points = total_points + delta WHERE user_id = uid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_community_rating(loc_id UUID, new_score INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE Community_Rating_Board
    SET
        total_drops = total_drops + 1,
        aggregated_cleanliness_rating = (
            (aggregated_cleanliness_rating * total_drops + new_score) / (total_drops + 1)
        ),
        last_updated = NOW()
    WHERE locality_id = loc_id;
END;
$$ LANGUAGE plpgsql;
