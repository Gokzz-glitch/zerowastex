import { useEffect, useState } from 'react'
import MapView from '../components/MapView'
import BinCard from '../components/BinCard'
import { supabase } from '../lib/supabase'

// Seed mock bins for when Supabase isn't connected yet
const MOCK_BINS = Array.from({ length: 6 }, (_, i) => ({
  bin_id: `mock-bin-${i + 1}-000000000000`,
  fill_level_percentage: [23, 67, 91, 45, 88, 12][i],
  current_weight_kg: [12.4, 34.1, 58.9, 20.3, 51.2, 8.7][i],
  needs_collection: [false, false, true, false, true, false][i],
  last_updated: new Date().toISOString(),
}))

export default function LiveMap() {
  const [bins, setBins] = useState(MOCK_BINS)
  const [loading, setLoading] = useState(true)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    async function fetchBins() {
      const { data, error } = await supabase
        .from('Smart_Bin_Status')
        .select('*')
        .order('fill_level_percentage', { ascending: false })

      if (!error && data?.length > 0) {
        setBins(data)
      }
      setLoading(false)
    }
    fetchBins()

    // Real-time subscription
    const channel = supabase
      .channel('smart-bins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Smart_Bin_Status' }, () => {
        fetchBins()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    setAlertCount(bins.filter(b => b.needs_collection).length)
  }, [bins])

  const totalBins = bins.length
  const avgFill = bins.length
    ? Math.round(bins.reduce((s, b) => s + (b.fill_level_percentage ?? 0), 0) / bins.length)
    : 0

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1>🗺️ Live Bin Map</h1>
        <p>Real-time fill levels across all smart bins — updated via IoT telemetry</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🗑️</div>
          <div className="stat-value">{totalBins}</div>
          <div className="stat-label">Total Bins</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{avgFill}%</div>
          <div className="stat-label">Average Fill</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-value" style={{ color: alertCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {alertCount}
          </div>
          <div className="stat-label">Need Collection</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{totalBins - alertCount}</div>
          <div className="stat-label">Bins OK</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Chennai Smart Bin Network</div>
        <MapView bins={bins} />
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>All Bins — Status Grid</div>
        {loading ? (
          <div className="loading-center"><div className="loading-ring" /></div>
        ) : (
          <div className="bin-grid">
            {bins.map(bin => <BinCard key={bin.bin_id} bin={bin} />)}
          </div>
        )}
      </div>
    </div>
  )
}
