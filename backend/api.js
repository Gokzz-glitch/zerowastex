require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const hasSupabaseCreds = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const DEMO_MODE = process.env.DEMO_MODE === 'true' || !hasSupabaseCreds;
const supabase = hasSupabaseCreds
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const MLP_TAXONOMY = [
  { code: 'plastic_general', label: 'General Plastic', mlpCandidate: false, source: 'model' },
  { code: 'mlp_sachet', label: 'Sachet', mlpCandidate: true, source: 'heuristic-demo' },
  { code: 'mlp_laminated_pouch', label: 'Laminated Pouch', mlpCandidate: true, source: 'heuristic-demo' },
  { code: 'mlp_wrapper', label: 'Wrapper', mlpCandidate: true, source: 'heuristic-demo' },
  { code: 'mlp_polybag', label: 'Polybag', mlpCandidate: true, source: 'heuristic-demo' },
  { code: 'mlp_contaminated', label: 'Contaminated MLP', mlpCandidate: true, source: 'heuristic-demo' },
];

const seededDemoStore = {
  users: [
    { user_id: '4cd8642a-3bd5-46a9-b915-0e16d2d77f11', username: 'operator_uma', total_points: 1280, created_at: '2026-10-18T06:00:00.000Z' },
    { user_id: 'cb3c8a46-a0ca-4ea4-b2f8-9da5b5f4de78', username: 'citizen_akash', total_points: 920, created_at: '2026-10-17T06:00:00.000Z' },
    { user_id: '9cb6acdb-6f8d-4c86-a7f1-69750943f7a6', username: 'citizen_latha', total_points: 640, created_at: '2026-10-16T06:00:00.000Z' },
  ],
  bins: [
    {
      bin_id: '4eced2c1-1ee0-4cf0-a0ad-2f2f540fd6a7',
      location: { coordinates: [80.2707, 13.0827] },
      current_weight_kg: 34.2,
      fill_level_percentage: 88,
      last_updated: '2026-10-20T05:50:00.000Z',
      needs_collection: false,
      collection_status: 'scheduled',
      pickup_assignment: 'truck-a2',
      route_code: 'CHN-CENTRAL-03',
      route_priority: 'medium',
      alert_state: 'normal',
    },
    {
      bin_id: '3c8f09bd-0544-4d07-9f61-30b87f2dc8ab',
      location: { coordinates: [80.2532, 13.0674] },
      current_weight_kg: 52.8,
      fill_level_percentage: 94,
      last_updated: '2026-10-20T06:02:00.000Z',
      needs_collection: true,
      collection_status: 'pending',
      pickup_assignment: 'truck-a1',
      route_code: 'CHN-SOUTH-02',
      route_priority: 'high',
      alert_state: 'critical',
    },
    {
      bin_id: '2b3642e4-7ab3-4fb4-bf12-f9ca2c530d44',
      location: { coordinates: [80.2881, 13.1016] },
      current_weight_kg: 21.4,
      fill_level_percentage: 45,
      last_updated: '2026-10-20T05:59:00.000Z',
      needs_collection: false,
      collection_status: 'collected',
      pickup_assignment: 'truck-b4',
      route_code: 'CHN-NORTH-01',
      route_priority: 'low',
      alert_state: 'normal',
    },
  ],
  dropEvents: [
    {
      event_id: '58a8f246-f0e7-43f9-93a8-0dd3f82d17e4',
      user_id: 'cb3c8a46-a0ca-4ea4-b2f8-9da5b5f4de78',
      username: 'citizen_akash',
      bin_id: '4eced2c1-1ee0-4cf0-a0ad-2f2f540fd6a7',
      locality_id: '11111111-1111-4111-8111-111111111111',
      payload_weight_kg: 2.6,
      ai_quality_score: 81,
      live_photo_url: 'demo://drop/1.jpg',
      timestamp: '2026-10-20T05:00:00.000Z',
    },
  ],
  communities: [
    {
      locality_id: '11111111-1111-4111-8111-111111111111',
      locality_name: 'T. Nagar',
      aggregated_cleanliness_rating: 82.5,
      total_drops: 421,
      last_updated: '2026-10-20T04:00:00.000Z',
    },
  ],
  workflowRecords: [
    {
      workflow_id: 'd81f3a7c-8a57-4db9-9a54-cf448f7f7446',
      intake_date: '2026-10-20',
      source_bin_id: '3c8f09bd-0544-4d07-9f61-30b87f2dc8ab',
      stage: 'quality_inspection',
      status: 'in_progress',
      weight_kg: 118.6,
      contamination_rate: 12.5,
      recovered_material_kg: 86.2,
      storage_slot: 'BAY-MLP-02',
      notes: 'MLP-rich load with wrappers and pouches',
      mlp_taxonomy: ['mlp_wrapper', 'mlp_laminated_pouch'],
      created_at: '2026-10-20T05:10:00.000Z',
      updated_at: '2026-10-20T05:35:00.000Z',
    },
  ],
  workflowAudit: [
    {
      audit_id: '878f9956-6d03-4d95-8a0c-64e41eb500fa',
      workflow_id: 'd81f3a7c-8a57-4db9-9a54-cf448f7f7446',
      from_status: 'sorting',
      to_status: 'in_progress',
      stage: 'quality_inspection',
      actor: 'operator_uma',
      remarks: 'Manual inspection started',
      changed_at: '2026-10-20T05:35:00.000Z',
    },
  ],
  inspections: [
    {
      inspection_id: 'cb468b61-fbe3-45cd-a5f3-bf17cce1f8f7',
      operator_name: 'operator_uma',
      location_name: 'PWMU Chennai - Gate 2',
      location_lat: 13.079,
      location_lng: 80.272,
      source_type: 'operator_upload',
      material_type: 'mlp_laminated_pouch',
      weight_kg: 14.8,
      contamination_percent: 18,
      image_url: 'demo://inspection/1.jpg',
      notes: 'Visible food residue on 20% packets',
      created_at: '2026-10-20T04:42:00.000Z',
    },
  ],
};

const demoStore = JSON.parse(JSON.stringify(seededDemoStore));

function getNowIso() {
  return new Date().toISOString();
}

function randomId() {
  return cryptoRandomUUID();
}

function cryptoRandomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseNumber(value, fieldName, options = {}) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (options.min !== undefined && n < options.min) {
    throw new Error(`${fieldName} must be >= ${options.min}`);
  }
  if (options.max !== undefined && n > options.max) {
    throw new Error(`${fieldName} must be <= ${options.max}`);
  }
  return n;
}

function ensureText(value, fieldName, maxLen = 200) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
  const v = value.trim();
  if (v.length > maxLen) {
    throw new Error(`${fieldName} must be <= ${maxLen} characters`);
  }
  return v;
}

function normalizeWorkflowPayload(payload) {
  const stage = ensureText(payload.stage, 'stage', 40);
  const status = ensureText(payload.status, 'status', 40);
  const weight_kg = parseNumber(payload.weight_kg, 'weight_kg', { min: 0 });
  const contamination_rate = parseNumber(payload.contamination_rate ?? 0, 'contamination_rate', { min: 0, max: 100 });
  const recovered_material_kg = parseNumber(payload.recovered_material_kg ?? 0, 'recovered_material_kg', { min: 0 });
  const intake_date = ensureText(payload.intake_date, 'intake_date', 20);

  return {
    intake_date,
    source_bin_id: payload.source_bin_id || null,
    stage,
    status,
    weight_kg,
    contamination_rate,
    recovered_material_kg,
    storage_slot: payload.storage_slot ? String(payload.storage_slot).slice(0, 60) : null,
    notes: payload.notes ? String(payload.notes).slice(0, 500) : null,
    mlp_taxonomy: Array.isArray(payload.mlp_taxonomy) ? payload.mlp_taxonomy.filter((x) => typeof x === 'string') : [],
  };
}

function calculateDashboardMetrics({ bins, workflows, inspections }) {
  const dailyIntake = workflows.reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);
  const throughput = workflows
    .filter((item) => item.stage === 'recycler_dispatch' || item.status === 'completed')
    .reduce((sum, item) => sum + Number(item.recovered_material_kg || 0), 0);
  const recoveredMaterial = workflows.reduce((sum, item) => sum + Number(item.recovered_material_kg || 0), 0);
  const contaminationRate = workflows.length
    ? workflows.reduce((sum, item) => sum + Number(item.contamination_rate || 0), 0) / workflows.length
    : 0;
  const storageCapacityKg = 2000;
  const inStorageKg = workflows
    .filter((item) => item.stage === 'baling_storage' || item.stage === 'quality_inspection')
    .reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);

  return {
    daily_intake_kg: Number(dailyIntake.toFixed(2)),
    throughput_kg: Number(throughput.toFixed(2)),
    recovered_material_kg: Number(recoveredMaterial.toFixed(2)),
    contamination_rejection_rate: Number(contaminationRate.toFixed(2)),
    storage_capacity_kg: storageCapacityKg,
    storage_utilization_percent: Number(((inStorageKg / storageCapacityKg) * 100).toFixed(2)),
    recycler_dispatch_count: workflows.filter((item) => item.stage === 'recycler_dispatch').length,
    pending_collections: bins.filter((b) => b.collection_status === 'pending' || b.needs_collection).length,
    open_alerts: bins.filter((b) => b.alert_state === 'critical').length,
    inspections_today: inspections.length,
  };
}

async function fetchBins() {
  if (DEMO_MODE) {
    return demoStore.bins.slice().sort((a, b) => b.fill_level_percentage - a.fill_level_percentage);
  }

  const { data, error } = await supabase
    .from('Smart_Bin_Status')
    .select('*')
    .order('fill_level_percentage', { ascending: false });

  if (error) throw error;
  return data;
}

async function fetchDropEvents() {
  if (DEMO_MODE) {
    return demoStore.dropEvents.slice().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }

  const { data, error } = await supabase
    .from('Trash_Drop_Event')
    .select('*, Users(username)')
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data.map((e) => ({ ...e, username: e.Users?.username }));
}

async function fetchLeaderboard(limit = 20) {
  if (DEMO_MODE) {
    return demoStore.users
      .slice()
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from('Users')
    .select('user_id, username, total_points, created_at')
    .order('total_points', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

async function fetchCommunity() {
  if (DEMO_MODE) {
    return demoStore.communities
      .slice()
      .sort((a, b) => b.aggregated_cleanliness_rating - a.aggregated_cleanliness_rating);
  }

  const { data, error } = await supabase
    .from('Community_Rating_Board')
    .select('*')
    .order('aggregated_cleanliness_rating', { ascending: false });

  if (error) throw error;
  return data;
}

async function fetchWorkflowRecords() {
  if (DEMO_MODE) return demoStore.workflowRecords.slice();
  const { data, error } = await supabase.from('MRF_Workflow_Record').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function fetchWorkflowAudit(workflowId) {
  if (DEMO_MODE) {
    return demoStore.workflowAudit
      .filter((audit) => audit.workflow_id === workflowId)
      .sort((a, b) => (a.changed_at < b.changed_at ? 1 : -1));
  }
  const { data, error } = await supabase
    .from('MRF_Workflow_Audit')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function fetchInspections() {
  if (DEMO_MODE) {
    return demoStore.inspections.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const { data, error } = await supabase
    .from('Material_Inspection_Record')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'zer0wastex-api',
    demo_mode: DEMO_MODE,
    timestamp: getNowIso(),
  });
});

app.get('/api/material-taxonomy', (req, res) => {
  res.json({ taxonomy: MLP_TAXONOMY });
});

app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const [bins, workflows, inspections] = await Promise.all([
      fetchBins(),
      fetchWorkflowRecords(),
      fetchInspections(),
    ]);

    const metrics = calculateDashboardMetrics({ bins, workflows, inspections });
    res.json({
      metrics,
      workflow_stages: ['intake', 'sorting', 'quality_inspection', 'baling_storage', 'recycler_dispatch'],
      mode: DEMO_MODE ? 'demo' : 'supabase',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bins', async (req, res) => {
  try {
    const bins = await fetchBins();
    res.json({ bins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bins/:id', async (req, res) => {
  try {
    const bins = await fetchBins();
    const bin = bins.find((item) => item.bin_id === req.params.id);
    if (!bin) return res.status(404).json({ error: 'Bin not found' });
    res.json({ bin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bins/alerts', async (req, res) => {
  try {
    const bins = await fetchBins();
    const alerts = bins.filter((b) => b.needs_collection || b.alert_state === 'critical');
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/bins/:id/collection', async (req, res) => {
  try {
    const collection_status = ensureText(req.body.collection_status, 'collection_status', 30);
    const route_priority = ensureText(req.body.route_priority || 'medium', 'route_priority', 20);
    const update = {
      collection_status,
      pickup_assignment: req.body.pickup_assignment ? String(req.body.pickup_assignment).slice(0, 80) : null,
      route_code: req.body.route_code ? String(req.body.route_code).slice(0, 60) : null,
      route_priority,
      alert_state: req.body.alert_state ? String(req.body.alert_state).slice(0, 30) : 'normal',
      needs_collection: collection_status === 'pending' || collection_status === 'scheduled',
      last_updated: getNowIso(),
    };

    if (DEMO_MODE) {
      const index = demoStore.bins.findIndex((bin) => bin.bin_id === req.params.id);
      if (index < 0) return res.status(404).json({ error: 'Bin not found' });
      demoStore.bins[index] = { ...demoStore.bins[index], ...update };
      return res.json({ bin: demoStore.bins[index] });
    }

    const { data, error } = await supabase
      .from('Smart_Bin_Status')
      .update(update)
      .eq('bin_id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ bin: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/drop-event', async (req, res) => {
  try {
    const user_id = ensureText(req.body.user_id, 'user_id', 80);
    const bin_id = ensureText(req.body.bin_id, 'bin_id', 80);
    const payload_weight_kg = parseNumber(req.body.payload_weight_kg, 'payload_weight_kg', { min: 0 });
    const live_photo_url = ensureText(req.body.live_photo_url, 'live_photo_url', 500);

    const drop_location = req.body.drop_location;
    if (!drop_location || typeof drop_location.lat !== 'number' || typeof drop_location.lng !== 'number') {
      throw new Error('drop_location must include numeric lat and lng');
    }

    const ai_quality_score = req.body.ai_quality_score === undefined || req.body.ai_quality_score === null
      ? null
      : parseNumber(req.body.ai_quality_score, 'ai_quality_score', { min: 0, max: 100 });

    const basePoints = 10;
    const qualityBonus = ai_quality_score ? Math.floor(ai_quality_score / 10) : 0;
    const weightBonus = Math.floor(payload_weight_kg * 2);
    const totalPoints = basePoints + qualityBonus + weightBonus;

    if (DEMO_MODE) {
      const event_id = randomId();
      const user = demoStore.users.find((u) => u.user_id === user_id);
      const event = {
        event_id,
        user_id,
        username: user?.username || 'anonymous',
        bin_id,
        locality_id: req.body.locality_id || null,
        payload_weight_kg,
        ai_quality_score,
        live_photo_url,
        drop_location,
        timestamp: getNowIso(),
      };
      demoStore.dropEvents.unshift(event);
      if (user) user.total_points += totalPoints;

      return res.status(201).json({ message: 'Drop event recorded', event_id, points_awarded: totalPoints });
    }

    const geoPoint = `POINT(${drop_location.lng} ${drop_location.lat})`;

    const { data: event, error: eventError } = await supabase
      .from('Trash_Drop_Event')
      .insert({
        user_id,
        bin_id,
        drop_location: geoPoint,
        payload_weight_kg,
        ai_quality_score,
        live_photo_url,
        locality_id: req.body.locality_id ?? null,
      })
      .select()
      .single();

    if (eventError) return res.status(500).json({ error: eventError.message });

    await supabase.from('Points_Ledger').insert({
      user_id,
      event_id: event.event_id,
      points_awarded: totalPoints,
      reason: `Drop event — quality: ${ai_quality_score ?? 'N/A'}, weight: ${payload_weight_kg}kg`,
    });

    await supabase.rpc('increment_user_points', { uid: user_id, delta: totalPoints });

    if (req.body.locality_id && ai_quality_score !== null) {
      await supabase.rpc('update_community_rating', {
        loc_id: req.body.locality_id,
        new_score: ai_quality_score,
      });
    }

    res.status(201).json({ message: 'Drop event recorded', event_id: event.event_id, points_awarded: totalPoints });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/drop-events', async (req, res) => {
  try {
    const events = await fetchDropEvents();
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const users = await fetchLeaderboard(limit);
    const leaderboard = users.map((user, idx) => ({ rank: idx + 1, ...user }));
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/community', async (req, res) => {
  try {
    const communities = await fetchCommunity();
    res.json({ communities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflow/records', async (req, res) => {
  try {
    const records = await fetchWorkflowRecords();
    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflow/records', async (req, res) => {
  try {
    const payload = normalizeWorkflowPayload(req.body);
    const now = getNowIso();

    if (DEMO_MODE) {
      const record = {
        workflow_id: randomId(),
        ...payload,
        created_at: now,
        updated_at: now,
      };
      demoStore.workflowRecords.unshift(record);
      demoStore.workflowAudit.unshift({
        audit_id: randomId(),
        workflow_id: record.workflow_id,
        from_status: null,
        to_status: record.status,
        stage: record.stage,
        actor: req.body.actor || 'demo-operator',
        remarks: 'workflow created',
        changed_at: now,
      });
      return res.status(201).json({ record });
    }

    const { data, error } = await supabase
      .from('MRF_Workflow_Record')
      .insert({ ...payload, created_at: now, updated_at: now })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('MRF_Workflow_Audit').insert({
      workflow_id: data.workflow_id,
      from_status: null,
      to_status: data.status,
      stage: data.stage,
      actor: req.body.actor || 'api',
      remarks: 'workflow created',
      changed_at: now,
    });

    res.status(201).json({ record: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/workflow/records/:id/status', async (req, res) => {
  try {
    const stage = ensureText(req.body.stage, 'stage', 40);
    const status = ensureText(req.body.status, 'status', 40);
    const actor = ensureText(req.body.actor || 'operator', 'actor', 80);
    const remarks = req.body.remarks ? String(req.body.remarks).slice(0, 500) : null;
    const now = getNowIso();

    if (DEMO_MODE) {
      const index = demoStore.workflowRecords.findIndex((item) => item.workflow_id === req.params.id);
      if (index < 0) return res.status(404).json({ error: 'Workflow record not found' });

      const current = demoStore.workflowRecords[index];
      const updated = { ...current, stage, status, updated_at: now };
      demoStore.workflowRecords[index] = updated;
      demoStore.workflowAudit.unshift({
        audit_id: randomId(),
        workflow_id: req.params.id,
        from_status: current.status,
        to_status: status,
        stage,
        actor,
        remarks,
        changed_at: now,
      });
      return res.json({ record: updated });
    }

    const { data: current, error: currentError } = await supabase
      .from('MRF_Workflow_Record')
      .select('*')
      .eq('workflow_id', req.params.id)
      .single();

    if (currentError) return res.status(404).json({ error: 'Workflow record not found' });

    const { data, error } = await supabase
      .from('MRF_Workflow_Record')
      .update({ stage, status, updated_at: now })
      .eq('workflow_id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('MRF_Workflow_Audit').insert({
      workflow_id: req.params.id,
      from_status: current.status,
      to_status: status,
      stage,
      actor,
      remarks,
      changed_at: now,
    });

    res.json({ record: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/workflow/records/:id/audit', async (req, res) => {
  try {
    const audit = await fetchWorkflowAudit(req.params.id);
    res.json({ audit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inspections', async (req, res) => {
  try {
    const records = await fetchInspections();
    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inspections', async (req, res) => {
  try {
    const operator_name = ensureText(req.body.operator_name, 'operator_name', 80);
    const location_name = ensureText(req.body.location_name, 'location_name', 120);
    const material_type = ensureText(req.body.material_type, 'material_type', 80);
    const weight_kg = parseNumber(req.body.weight_kg, 'weight_kg', { min: 0 });
    const contamination_percent = parseNumber(req.body.contamination_percent ?? 0, 'contamination_percent', { min: 0, max: 100 });

    const payload = {
      operator_name,
      location_name,
      location_lat: parseNumber(req.body.location_lat, 'location_lat', { min: -90, max: 90 }),
      location_lng: parseNumber(req.body.location_lng, 'location_lng', { min: -180, max: 180 }),
      source_type: req.body.source_type ? String(req.body.source_type).slice(0, 30) : 'operator_upload',
      material_type,
      weight_kg,
      contamination_percent,
      image_url: req.body.image_url ? String(req.body.image_url).slice(0, 500) : null,
      notes: req.body.notes ? String(req.body.notes).slice(0, 500) : null,
      created_at: getNowIso(),
    };

    if (DEMO_MODE) {
      const record = { inspection_id: randomId(), ...payload };
      demoStore.inspections.unshift(record);
      return res.status(201).json({ record });
    }

    const { data, error } = await supabase
      .from('Material_Inspection_Record')
      .insert(payload)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ record: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Zer0wasteX REST API running on http://localhost:${PORT} (${DEMO_MODE ? 'demo-mode' : 'supabase-mode'})`);
  });
}

module.exports = { app, DEMO_MODE, MLP_TAXONOMY, seededDemoStore };
