require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'zer0wastex-api', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// BINS
// ─────────────────────────────────────────────

/**
 * GET /api/bins
 * Returns all smart bin statuses ordered by fill level (fullest first).
 */
app.get('/api/bins', async (req, res) => {
  const { data, error } = await supabase
    .from('Smart_Bin_Status')
    .select('*')
    .order('fill_level_percentage', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ bins: data });
});

/**
 * GET /api/bins/:id
 * Returns a single bin's current status.
 */
app.get('/api/bins/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('Smart_Bin_Status')
    .select('*')
    .eq('bin_id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Bin not found' });
  res.json({ bin: data });
});

/**
 * GET /api/bins/alerts
 * Returns only bins that need collection (fill >= 90%).
 */
app.get('/api/bins/alerts', async (req, res) => {
  const { data, error } = await supabase
    .from('Smart_Bin_Status')
    .select('*')
    .eq('needs_collection', true)
    .order('fill_level_percentage', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ alerts: data, count: data.length });
});

// ─────────────────────────────────────────────
// TRASH DROP EVENTS
// ─────────────────────────────────────────────

/**
 * POST /api/drop-event
 * Records a citizen trash-drop event and awards gamification points.
 * Body: { user_id, bin_id, drop_location: {lat, lng}, payload_weight_kg, ai_quality_score, live_photo_url, locality_id }
 */
app.post('/api/drop-event', async (req, res) => {
  const { user_id, bin_id, drop_location, payload_weight_kg, ai_quality_score, live_photo_url, locality_id } = req.body;

  if (!user_id || !bin_id || !drop_location || payload_weight_kg === undefined || !live_photo_url) {
    return res.status(400).json({ error: 'Missing required fields: user_id, bin_id, drop_location, payload_weight_kg, live_photo_url' });
  }

  const geoPoint = `POINT(${drop_location.lng} ${drop_location.lat})`;

  // 1. Insert drop event
  const { data: event, error: eventError } = await supabase
    .from('Trash_Drop_Event')
    .insert({
      user_id,
      bin_id,
      drop_location: geoPoint,
      payload_weight_kg,
      ai_quality_score: ai_quality_score ?? null,
      live_photo_url,
      locality_id: locality_id ?? null,
    })
    .select()
    .single();

  if (eventError) return res.status(500).json({ error: eventError.message });

  // 2. Calculate points: base 10 + quality bonus + weight bonus
  const basePoints = 10;
  const qualityBonus = ai_quality_score ? Math.floor(ai_quality_score / 10) : 0;
  const weightBonus = Math.floor(payload_weight_kg * 2);
  const totalPoints = basePoints + qualityBonus + weightBonus;

  // 3. Insert into Points_Ledger
  await supabase.from('Points_Ledger').insert({
    user_id,
    event_id: event.event_id,
    points_awarded: totalPoints,
    reason: `Drop event — quality: ${ai_quality_score ?? 'N/A'}, weight: ${payload_weight_kg}kg`,
  });

  // 4. Increment user total_points
  await supabase.rpc('increment_user_points', { uid: user_id, delta: totalPoints });

  // 5. Update Community_Rating_Board if locality provided
  if (locality_id && ai_quality_score !== undefined) {
    await supabase.rpc('update_community_rating', {
      loc_id: locality_id,
      new_score: ai_quality_score,
    });
  }

  res.status(201).json({
    message: 'Drop event recorded',
    event_id: event.event_id,
    points_awarded: totalPoints,
  });
});

/**
 * GET /api/drop-events
 * Returns recent drop events (last 50).
 */
app.get('/api/drop-events', async (req, res) => {
  const { data, error } = await supabase
    .from('Trash_Drop_Event')
    .select('*, Users(username)')
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ events: data });
});

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────

/**
 * GET /api/leaderboard
 * Returns top citizens ranked by total_points.
 */
app.get('/api/leaderboard', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  const { data, error } = await supabase
    .from('Users')
    .select('user_id, username, total_points, created_at')
    .order('total_points', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  const ranked = data.map((user, idx) => ({ rank: idx + 1, ...user }));
  res.json({ leaderboard: ranked });
});

// ─────────────────────────────────────────────
// COMMUNITY RATING BOARD
// ─────────────────────────────────────────────

/**
 * GET /api/community
 * Returns community locality ratings sorted by cleanliness score.
 */
app.get('/api/community', async (req, res) => {
  const { data, error } = await supabase
    .from('Community_Rating_Board')
    .select('*')
    .order('aggregated_cleanliness_rating', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ communities: data });
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Zer0wasteX REST API running on http://localhost:${PORT}`);
});
