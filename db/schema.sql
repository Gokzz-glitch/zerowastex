-- ============================================================
-- Zer0wasteX — Supabase PostgreSQL Schema
-- Requires: PostGIS extension
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Users (
    user_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    username    TEXT UNIQUE NOT NULL,
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
    needs_collection        BOOLEAN DEFAULT FALSE
);

-- Index for fast routing queries (fetch only full bins)
CREATE INDEX IF NOT EXISTS idx_bin_needs_collection
    ON Smart_Bin_Status(needs_collection)
    WHERE needs_collection = TRUE;

-- ─────────────────────────────────────────────
-- COMMUNITY RATING BOARD
-- (Must be created before Trash_Drop_Event for FK)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Community_Rating_Board (
    locality_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locality_name                TEXT NOT NULL,
    aggregated_cleanliness_rating DECIMAL(5, 2) DEFAULT 0.0,
    total_drops                  INTEGER DEFAULT 0,
    last_updated                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TRASH DROP EVENT
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Trash_Drop_Event (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES Users(user_id) ON DELETE SET NULL,
    bin_id              UUID REFERENCES Smart_Bin_Status(bin_id) ON DELETE SET NULL,
    locality_id         UUID REFERENCES Community_Rating_Board(locality_id) ON DELETE SET NULL,
    drop_location       GEOGRAPHY(POINT) NOT NULL,
    payload_weight_kg   DECIMAL(10, 2) NOT NULL,
    ai_quality_score    INTEGER CHECK (ai_quality_score >= 0 AND ai_quality_score <= 100),
    live_photo_url      TEXT NOT NULL,
    timestamp           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drop_event_user
    ON Trash_Drop_Event(user_id);

CREATE INDEX IF NOT EXISTS idx_drop_event_bin
    ON Trash_Drop_Event(bin_id);

-- ─────────────────────────────────────────────
-- POINTS LEDGER
-- Detailed audit trail of every point transaction.
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
-- HELPER FUNCTIONS (called by the Node.js API)
-- ─────────────────────────────────────────────

-- Atomically add points to a user's total
CREATE OR REPLACE FUNCTION increment_user_points(uid UUID, delta INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE Users SET total_points = total_points + delta WHERE user_id = uid;
END;
$$ LANGUAGE plpgsql;

-- Recalculate rolling average cleanliness rating for a locality
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

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) — Enable in Supabase UI
-- Uncomment after enabling RLS on each table.
-- ─────────────────────────────────────────────

-- ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can read own record"
--     ON Users FOR SELECT USING (auth.uid() = user_id);

-- ALTER TABLE Trash_Drop_Event ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can insert own events"
--     ON Trash_Drop_Event FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Anyone can read events"
--     ON Trash_Drop_Event FOR SELECT USING (true);

-- ALTER TABLE Smart_Bin_Status ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "ESP32 service role can upsert bins" -- handled via service_role key, no policy needed
--     ON Smart_Bin_Status FOR ALL USING (true);

-- ALTER TABLE Community_Rating_Board ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read leaderboard"
--     ON Community_Rating_Board FOR SELECT USING (true);
