export default function BinCard({ bin }) {
  const fill = bin.fill_level_percentage ?? 0
  const weight = bin.current_weight_kg ?? 0

  const level = fill >= 90 ? 'high' : fill >= 60 ? 'medium' : 'low'
  const badge = fill >= 90 ? 'CRITICAL' : fill >= 60 ? 'WARNING' : 'OK'
  const badgeClass = fill >= 90 ? 'critical' : fill >= 60 ? 'warning' : 'ok'

  const color =
    fill >= 90 ? 'var(--accent-red)' :
    fill >= 60 ? 'var(--accent-amber)' :
    'var(--accent-green)'

  const shortId = bin.bin_id?.slice(0, 8) ?? 'unknown'
  const updated = bin.last_updated
    ? new Date(bin.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className={`bin-card${fill >= 90 ? ' alert' : ''} fade-up`}>
      <div className="bin-header">
        <span className="bin-id">#{shortId}</span>
        <span className={`bin-badge ${badgeClass}`}>{badge}</span>
      </div>

      <div className="bin-percentage" style={{ color }}>
        {fill}<span style={{ fontSize: 18, color: 'var(--text-muted)' }}>%</span>
      </div>

      <div className="gauge-bar">
        <div
          className={`gauge-fill ${level}`}
          style={{ width: `${fill}%` }}
        />
      </div>

      <div className="bin-meta">
        <span>⚖️ {weight} kg</span>
        <span>🕐 {updated}</span>
      </div>
    </div>
  )
}
