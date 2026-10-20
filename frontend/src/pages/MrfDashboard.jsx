import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import MapView from '../components/MapView'

const STAGES = ['intake', 'sorting', 'quality_inspection', 'baling_storage', 'recycler_dispatch']

const FALLBACK_OVERVIEW = {
  metrics: {
    daily_intake_kg: 0,
    throughput_kg: 0,
    recovered_material_kg: 0,
    contamination_rejection_rate: 0,
    storage_capacity_kg: 2000,
    storage_utilization_percent: 0,
    recycler_dispatch_count: 0,
    pending_collections: 0,
    open_alerts: 0,
    inspections_today: 0,
  },
  mode: 'demo',
}

export default function MrfDashboard() {
  const [overview, setOverview] = useState(FALLBACK_OVERVIEW)
  const [bins, setBins] = useState([])
  const [taxonomy, setTaxonomy] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [inspections, setInspections] = useState([])
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [audit, setAudit] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [inspectionForm, setInspectionForm] = useState({
    operator_name: 'demo_operator',
    location_name: 'PWMU Zone A',
    location_lat: 13.0827,
    location_lng: 80.2707,
    material_type: 'mlp_wrapper',
    weight_kg: 5,
    contamination_percent: 12,
    notes: '',
  })

  useEffect(() => {
    async function load() {
      try {
        const [ov, binsRes, tx, wf, inRes] = await Promise.all([
          api.getOverview(),
          api.getBins(),
          api.getTaxonomy(),
          api.getWorkflows(),
          api.getInspections(),
        ])

        setOverview(ov)
        setBins(binsRes.bins || [])
        setTaxonomy(tx.taxonomy || [])
        setWorkflows(wf.records || [])
        setInspections(inRes.records || [])
        if ((wf.records || []).length > 0) {
          const first = wf.records[0]
          setSelectedWorkflow(first.workflow_id)
          const auditRes = await api.getWorkflowAudit(first.workflow_id)
          setAudit(auditRes.audit || [])
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((s) => [s, 0]))
    workflows.forEach((workflow) => {
      if (counts[workflow.stage] !== undefined) counts[workflow.stage] += 1
    })
    return counts
  }, [workflows])

  async function refreshAudit(workflowId) {
    setSelectedWorkflow(workflowId)
    const auditRes = await api.getWorkflowAudit(workflowId)
    setAudit(auditRes.audit || [])
  }

  async function moveWorkflow(workflowId, stage) {
    const status = stage === 'recycler_dispatch' ? 'completed' : 'in_progress'
    await api.updateWorkflowStatus(workflowId, {
      stage,
      status,
      actor: 'dashboard_operator',
      remarks: `Moved to ${stage}`,
    })

    const wf = await api.getWorkflows()
    setWorkflows(wf.records || [])
    await refreshAudit(workflowId)

    const ov = await api.getOverview()
    setOverview(ov)
  }

  async function updateCollection(bin, nextStatus) {
    await api.updateBinCollection(bin.bin_id, {
      collection_status: nextStatus,
      route_priority: nextStatus === 'pending' ? 'high' : 'low',
      pickup_assignment: bin.pickup_assignment || 'demo-truck-1',
      route_code: bin.route_code || 'DEMO-ROUTE',
      alert_state: nextStatus === 'pending' ? 'critical' : 'normal',
    })

    const binsRes = await api.getBins()
    setBins(binsRes.bins || [])
  }

  async function submitInspection(event) {
    event.preventDefault()
    setError('')
    try {
      await api.createInspection(inspectionForm)
      const inRes = await api.getInspections()
      setInspections(inRes.records || [])
      const ov = await api.getOverview()
      setOverview(ov)
      setInspectionForm((prev) => ({ ...prev, notes: '' }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="loading-center"><div className="loading-ring" /></div>
  }

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1>♻️ SIH26259 MRF Dashboard</h1>
        <p>AI-assisted MLP operations for PWMU/MRF with {overview.mode} data mode</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(239,68,68,0.4)' }}>
          <strong style={{ color: 'var(--accent-red)' }}>Error:</strong> {error}
        </div>
      )}

      <div className="stats-grid">
        <Metric icon="📥" label="Daily Intake" value={`${overview.metrics.daily_intake_kg} kg`} />
        <Metric icon="⚙️" label="Throughput" value={`${overview.metrics.throughput_kg} kg`} />
        <Metric icon="📦" label="Recovered" value={`${overview.metrics.recovered_material_kg} kg`} />
        <Metric icon="🧪" label="Contamination" value={`${overview.metrics.contamination_rejection_rate}%`} />
        <Metric icon="🏭" label="Storage" value={`${overview.metrics.storage_utilization_percent}%`} />
        <Metric icon="🚚" label="Dispatches" value={overview.metrics.recycler_dispatch_count} />
        <Metric icon="🗑️" label="Pending Collection" value={overview.metrics.pending_collections} />
        <Metric icon="🚨" label="Open Alerts" value={overview.metrics.open_alerts} />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Collection Map & Smart Bin Priority</div>
        <MapView bins={bins} />
      </div>

      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">MLP Taxonomy (Demo + Heuristic Labels)</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {taxonomy.map((item) => (
              <div key={item.code} className="taxonomy-row">
                <div><strong>{item.label}</strong> <span className="bin-id">({item.code})</span></div>
                <span className={`pill ${item.mlpCandidate ? 'amber' : 'blue'}`}>
                  {item.mlpCandidate ? 'MLP Candidate' : 'General Plastic'}
                </span>
                <span className="pill red" style={{ opacity: item.source.includes('heuristic') ? 1 : 0.45 }}>
                  {item.source.includes('heuristic') ? 'Heuristic / Demo' : 'Model'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Workflow Stage Distribution</div>
          {STAGES.map((stage) => {
            const max = Math.max(...Object.values(stageCounts), 1)
            const width = (stageCounts[stage] / max) * 100
            return (
              <div key={stage} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{stage}</span>
                  <strong>{stageCounts[stage]}</strong>
                </div>
                <div className="gauge-bar">
                  <div className="gauge-fill medium" style={{ width: `${width}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">MRF Workflow Records</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Weight</th>
                <th>Contamination</th>
                <th>Taxonomy</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr key={wf.workflow_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{wf.workflow_id.slice(0, 8)}</td>
                  <td>{wf.stage}</td>
                  <td>{wf.status}</td>
                  <td>{wf.weight_kg} kg</td>
                  <td>{wf.contamination_rate}%</td>
                  <td>{(wf.mlp_taxonomy || []).join(', ') || '—'}</td>
                  <td>
                    <select
                      value={wf.stage}
                      onChange={(event) => moveWorkflow(wf.workflow_id, event.target.value)}
                      style={{
                        background: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 8,
                        padding: '4px 8px',
                      }}
                    >
                      {STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                    </select>
                    <button className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => refreshAudit(wf.workflow_id)}>
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Collection Assignment Updates</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {bins.map((bin) => (
              <div key={bin.bin_id} className="taxonomy-row">
                <div>
                  <div style={{ fontFamily: 'monospace' }}>#{bin.bin_id.slice(0, 8)}</div>
                  <div className="bin-id">{bin.collection_status} · {bin.route_priority}</div>
                </div>
                <button className="btn btn-ghost" onClick={() => updateCollection(bin, 'pending')}>Mark Pending</button>
                <button className="btn btn-ghost" onClick={() => updateCollection(bin, 'collected')}>Mark Collected</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Workflow Audit Trail ({selectedWorkflow ? selectedWorkflow.slice(0, 8) : '—'})</div>
          <div style={{ display: 'grid', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
            {audit.map((item) => (
              <div key={item.audit_id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                <div><strong>{item.stage}</strong> · {item.from_status || 'new'} → {item.to_status}</div>
                <div className="bin-id">By {item.actor || 'system'} at {new Date(item.changed_at).toLocaleString()}</div>
                {item.remarks && <div style={{ marginTop: 4 }}>{item.remarks}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Operator Inspection Upload</div>
          <form onSubmit={submitInspection} style={{ display: 'grid', gap: 10 }}>
            <input className="input" value={inspectionForm.operator_name} onChange={(e) => setInspectionForm((p) => ({ ...p, operator_name: e.target.value }))} placeholder="Operator" required />
            <input className="input" value={inspectionForm.location_name} onChange={(e) => setInspectionForm((p) => ({ ...p, location_name: e.target.value }))} placeholder="Location" required />
            <select className="input" value={inspectionForm.material_type} onChange={(e) => setInspectionForm((p) => ({ ...p, material_type: e.target.value }))}>
              {taxonomy.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
            <input className="input" type="number" min="0" step="0.1" value={inspectionForm.weight_kg} onChange={(e) => setInspectionForm((p) => ({ ...p, weight_kg: Number(e.target.value) }))} placeholder="Weight (kg)" required />
            <input className="input" type="number" min="0" max="100" step="1" value={inspectionForm.contamination_percent} onChange={(e) => setInspectionForm((p) => ({ ...p, contamination_percent: Number(e.target.value) }))} placeholder="Contamination (%)" required />
            <textarea className="input" value={inspectionForm.notes} onChange={(e) => setInspectionForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={3} />
            <button className="btn btn-primary" type="submit">Add Inspection</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Recent Inspection Records</div>
          <div style={{ display: 'grid', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
            {inspections.map((rec) => (
              <div key={rec.inspection_id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                <div><strong>{rec.material_type}</strong> · {rec.weight_kg} kg</div>
                <div className="bin-id">{rec.location_name} · contamination {rec.contamination_percent}%</div>
                <div className="bin-id">{new Date(rec.created_at).toLocaleString()} · {rec.operator_name}</div>
                {rec.notes && <div style={{ marginTop: 4 }}>{rec.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ fontSize: 24 }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
