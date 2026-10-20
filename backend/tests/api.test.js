process.env.DEMO_MODE = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../api');

test('health endpoint reports API status', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.demo_mode, true);
});

test('dashboard overview returns SIH operational metrics', async () => {
  const res = await request(app).get('/api/dashboard/overview');
  assert.equal(res.status, 200);
  assert.ok(res.body.metrics.daily_intake_kg >= 0);
  assert.ok(Object.hasOwn(res.body.metrics, 'pending_collections'));
});

test('workflow status update creates audit trail in demo mode', async () => {
  const workflowList = await request(app).get('/api/workflow/records');
  const workflowId = workflowList.body.records[0].workflow_id;

  const statusRes = await request(app)
    .patch(`/api/workflow/records/${workflowId}/status`)
    .send({ stage: 'baling_storage', status: 'completed', actor: 'qa_tester', remarks: 'validated route' });

  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.record.stage, 'baling_storage');

  const auditRes = await request(app).get(`/api/workflow/records/${workflowId}/audit`);
  assert.equal(auditRes.status, 200);
  assert.equal(auditRes.body.audit[0].to_status, 'completed');
});

test('inspection endpoint validates and stores operator upload records', async () => {
  const payload = {
    operator_name: 'test_operator',
    location_name: 'MRF Test Zone',
    location_lat: 13.011,
    location_lng: 80.122,
    material_type: 'mlp_polybag',
    weight_kg: 8.2,
    contamination_percent: 14,
    notes: 'demo validation',
  };

  const createRes = await request(app).post('/api/inspections').send(payload);
  assert.equal(createRes.status, 201);

  const listRes = await request(app).get('/api/inspections');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.records[0].operator_name, payload.operator_name);
});
