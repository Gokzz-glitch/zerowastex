require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BIN_TOTAL_HEIGHT_CM = 150;

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'zer0wastex-ingest', timestamp: new Date().toISOString() });
});

// ─── ESP32 Ingest ─────────────────────────────────────────────────────────────
/**
 * POST /api/ingest/esp32
 * Receives sensor telemetry from an ESP32 smart bin.
 * Body: { bin_id, distance_cm, weight_kg }
 */
app.post('/api/ingest/esp32', async (req, res) => {
  try {
    const { bin_id, distance_cm, weight_kg } = req.body;

    if (!bin_id || distance_cm === undefined || weight_kg === undefined) {
      return res.status(400).json({
        error: 'Missing required payload fields: bin_id, distance_cm, weight_kg',
      });
    }

    // Calculate fill percentage (0% empty → 100% full)
    let fillPercentage = ((BIN_TOTAL_HEIGHT_CM - distance_cm) / BIN_TOTAL_HEIGHT_CM) * 100;
    fillPercentage = Math.max(0, Math.min(100, fillPercentage));

    const needsCollection = fillPercentage >= 90;

    const { error } = await supabase
      .from('Smart_Bin_Status')
      .upsert(
        {
          bin_id,
          current_weight_kg: weight_kg,
          fill_level_percentage: Math.round(fillPercentage),
          last_updated: new Date().toISOString(),
          needs_collection: needsCollection,
        },
        { onConflict: 'bin_id' }
      );

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: 'Database update failed' });
    }

    if (needsCollection) {
      console.log(`🚨 ALERT: Bin ${bin_id} at ${Math.round(fillPercentage)}% — flagged for collection.`);
      // TODO: Trigger TSP routing engine notification
    }

    res.status(200).json({
      status: 'success',
      fill_level_percentage: Math.round(fillPercentage),
      needs_collection: needsCollection,
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ IoT Ingestion service running on port ${PORT}`);
});
