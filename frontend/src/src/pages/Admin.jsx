import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MOCK_EVENTS = Array.from({ length: 8 }, (_, i) => ({
  event_id: `evt-${i}`,
  username: ['priya_r', 'karthik_m', 'ananya_s', 'rajan_v'][i % 4],
  bin_id: `bin-${(i % 3) + 1}-0000`,
  payload_weight_kg: (2.5 + i * 1.3).toFixed(1),
  ai_quality_score: [72, 88, 45, 91, 60, 77, 53, 84][i],
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
}))

function qualityPill(score) {
  if (score === null || score === undefined) return <span className="pill blue">Pending</span>
  if (score >= 75) return <span className="pill green">✅ {score}</span>
  if (score >= 50) return <span className="pill amber">⚠️ {score}</span>
  return <span className="pill red">❌ {score}</span>
}

export default function Admin() {
  const [events, setEvents] = useState(MOCK_EVENTS)
  const [bins, setBins] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function fetchData() {
      const [{ data: evts }, { data: binsData }] = await Promise.all([
        supabase
          .from('Trash_Drop_Event')
          .select('*, Users(username)')
          .order('timestamp', { ascending: false })
          .limit(50),
        supabase
          .from('Smart_Bin_Status')
          .select('*')
          .order('fill_level_percentage', { ascending: false }),
      ])

      if (evts?.length > 0) {
        setEvents(evts.map(e => ({ ...e, username: e.Users?.username ?? 'Anonymous' })))
      }
      if (binsData?.length > 0) setBins(binsData)
      setLoading(false)
    }
    fetchData()
  }, [])

  const alertBins = bins.filter(b => b.needs_collection)
  const displayEvents = filter === 'all' ? events : events.filter(e => Number(e.ai_quality_score) < 50)

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1>⚙️ Admin Panel</h1>
        <p>Manage bins, review drop events, and monitor system health</p>
      </div>

      {/* Alert Banner */}
      {alertBins.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          animation: 'pulse 2s infinite',
        }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <strong style={{ color: 'var(--accent-red)' }}>
              {alertBins.length} bin{alertBins.length > 1 ? 's' : ''} need immediate collection
            </strong>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {alertBins.map(b => `#${b.bin_id.slice(0,8)} (${b.fill_level_percentage}%)`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{events.length}</div>
          <div className="stat-label">Drop Events (last 50)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🗑️</div>
          <div className="stat-value">{bins.length}</div>
          <div className="stat-label">Registered Bins</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-value" style={{ color: alertBins.length > 0 ? 'var(--accent-red)' : 'inherit' }}>
            {alertBins.length}
          </div>
          <div className="stat-label">Bins at Capacity</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
            {events.filter(e => Number(e.ai_quality_score) < 50).length}
          </div>
          <div className="stat-label">Low Quality Drops</div>
        </div>
      </div>

      {/* Bin Table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Bin Status Table</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Bin ID</th>
                <th>Fill %</th>
                <th>Weight (kg)</th>
                <th>Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {(bins.length > 0 ? bins : Array.from({length:4},(_,i)=>({
                bin_id:`mock-${i}`, fill_level_percentage:[91,67,23,45][i],
                current_weight_kg:[55,32,10,19][i], needs_collection:[true,false,false,false][i],
                last_updated: new Date().toISOString(),
              }))).map(bin => (
                <tr key={bin.bin_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>#{bin.bin_id.slice(0,8)}</td>
                  <td>
                    <span style={{ color: bin.fill_level_percentage >= 90 ? 'var(--accent-red)' : bin.fill_level_percentage >= 60 ? 'var(--accent-amber)' : 'var(--accent-green)', fontWeight: 700 }}>
                      {bin.fill_level_percentage}%
                    </span>
                  </td>
                  <td>{bin.current_weight_kg} kg</td>
                  <td>
                    {bin.needs_collection
                      ? <span className="pill red">🚨 Collect Now</span>
                      : <span className="pill green">✅ OK</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {new Date(bin.last_updated).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Events Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Recent Drop Events</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>All</button>
            <button className={`btn ${filter === 'low' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('low')}>Low Quality</button>
          </div>
        </div>
        {loading
          ? <div className="loading-center"><div className="loading-ring" /></div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Bin</th>
                    <th>Weight</th>
                    <th>AI Score</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {displayEvents.map(evt => (
                    <tr key={evt.event_id}>
                      <td>{evt.username}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{String(evt.bin_id).slice(0,8)}</td>
                      <td>{evt.payload_weight_kg} kg</td>
                      <td>{qualityPill(evt.ai_quality_score)}</td>
                      <td style={{ fontSize: 12 }}>{new Date(evt.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  )
}
