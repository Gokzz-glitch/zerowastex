import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MOCK_COMMUNITIES = [
  { locality_id: '1', locality_name: 'T. Nagar',         aggregated_cleanliness_rating: 82.4, total_drops: 1240 },
  { locality_id: '2', locality_name: 'Anna Nagar',        aggregated_cleanliness_rating: 78.9, total_drops: 980 },
  { locality_id: '3', locality_name: 'Adyar',             aggregated_cleanliness_rating: 76.2, total_drops: 871 },
  { locality_id: '4', locality_name: 'Velachery',         aggregated_cleanliness_rating: 65.5, total_drops: 643 },
  { locality_id: '5', locality_name: 'Perambur',          aggregated_cleanliness_rating: 58.1, total_drops: 520 },
  { locality_id: '6', locality_name: 'Sholinganallur',    aggregated_cleanliness_rating: 48.0, total_drops: 302 },
]

function ratingColor(rating) {
  if (rating >= 75) return 'var(--accent-green)'
  if (rating >= 55) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}

function ratingStars(rating) {
  const full = Math.round(rating / 20)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

function ratingLabel(rating) {
  if (rating >= 80) return { text: 'Excellent', cls: 'green' }
  if (rating >= 65) return { text: 'Good', cls: 'green' }
  if (rating >= 50) return { text: 'Moderate', cls: 'amber' }
  return { text: 'Needs Work', cls: 'red' }
}

export default function Community() {
  const [communities, setCommunities] = useState(MOCK_COMMUNITIES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCommunity() {
      const { data, error } = await supabase
        .from('Community_Rating_Board')
        .select('*')
        .order('aggregated_cleanliness_rating', { ascending: false })

      if (!error && data?.length > 0) setCommunities(data)
      setLoading(false)
    }
    fetchCommunity()
  }, [])

  const cityAvg = communities.length
    ? (communities.reduce((s, c) => s + c.aggregated_cleanliness_rating, 0) / communities.length).toFixed(1)
    : 0

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1>🏘️ Community Rating Board</h1>
        <p>Locality cleanliness scores — aggregated from citizen drop events and AI quality checks</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏙️</div>
          <div className="stat-value">{communities.length}</div>
          <div className="stat-label">Localities Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💯</div>
          <div className="stat-value" style={{ color: ratingColor(Number(cityAvg)) }}>{cityAvg}</div>
          <div className="stat-label">City Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🗑️</div>
          <div className="stat-value">{communities.reduce((s, c) => s + c.total_drops, 0).toLocaleString()}</div>
          <div className="stat-label">Total Drop Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-value" style={{ fontSize: 16, paddingTop: 8 }}>{communities[0]?.locality_name ?? '—'}</div>
          <div className="stat-label">Top Locality</div>
        </div>
      </div>

      {loading
        ? <div className="loading-center"><div className="loading-ring" /></div>
        : (
          <div className="community-grid">
            {communities.map((c, i) => {
              const label = ratingLabel(c.aggregated_cleanliness_rating)
              return (
                <div
                  key={c.locality_id}
                  className="community-card fade-up"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="community-name">{c.locality_name}</div>
                    <span className={`pill ${label.cls}`}>{label.text}</span>
                  </div>

                  <div
                    className="community-rating"
                    style={{ color: ratingColor(c.aggregated_cleanliness_rating) }}
                  >
                    {Number(c.aggregated_cleanliness_rating).toFixed(1)}
                  </div>

                  <div
                    className="rating-stars"
                    style={{ color: ratingColor(c.aggregated_cleanliness_rating) }}
                  >
                    {ratingStars(c.aggregated_cleanliness_rating)}
                  </div>

                  <div className="gauge-bar">
                    <div
                      className={`gauge-fill ${
                        c.aggregated_cleanliness_rating >= 75 ? 'low' :
                        c.aggregated_cleanliness_rating >= 50 ? 'medium' : 'high'
                      }`}
                      style={{ width: `${c.aggregated_cleanliness_rating}%` }}
                    />
                  </div>

                  <div className="community-meta">
                    🗑️ {c.total_drops.toLocaleString()} drop events recorded
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}
