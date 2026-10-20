require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '512kb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BIN_TOTAL_HEIGHT_CM = Number(process.env.BIN_TOTAL_HEIGHT_CM || 150);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'zer0wastex-ingest', timestamp: new Date().toISOString() });
});

app.post('/api/ingest/esp32', async (req, res) => {
  try {
    const { bin_id, distance_cm, weight_kg } = req.body;

    if (!bin_id || distance_cm === undefined || weight_kg === undefined) {
      return res.status(400).json({
        error: 'Missing required payload fields: bin_id, distance_cm, weight_kg',
      });
    }

    const parsedDistance = Number(distance_cm);
    const parsedWeight = Number(weight_kg);
    if (Number.isNaN(parsedDistance) || Number.isNaN(parsedWeight) || parsedDistance < 0 || parsedWeight < 0) {
      return res.status(400).json({ error: 'distance_cm and weight_kg must be non-negative numbers' });
    }

    let fillPercentage = ((BIN_TOTAL_HEIGHT_CM - parsedDistance) / BIN_TOTAL_HEIGHT_CM) * 100;
    fillPercentage = Math.max(0, Math.min(100, fillPercentage));

    const needsCollection = fillPercentage >= 90;

    const { error } = await supabase
      .from('Smart_Bin_Status')
      .upsert(
        {
          bin_id,
          current_weight_kg: parsedWeight,
          fill_level_percentage: Math.round(fillPercentage),
          last_updated: new Date().toISOString(),
          needs_collection: needsCollection,
          collection_status: needsCollection ? 'pending' : 'normal',
          route_priority: needsCollection ? 'high' : 'low',
          alert_state: needsCollection ? 'critical' : 'normal',
        },
        { onConflict: 'bin_id' }
      );

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: 'Database update failed' });
    }

    res.status(200).json({
      status: 'success',
      fill_level_percentage: Math.round(fillPercentage),
      needs_collection: needsCollection,
      collection_status: needsCollection ? 'pending' : 'normal',
      route_priority: needsCollection ? 'high' : 'low',
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ IoT Ingestion service running on port ${PORT}`);
  });
}

module.exports = { app };
