import { useEffect, useState } from 'react'
import LeaderboardRow from '../components/LeaderboardRow'
import { supabase } from '../lib/supabase'

const MOCK_USERS = [
  { user_id: '1', username: 'priya_r',      total_points: 4820 },
  { user_id: '2', username: 'karthik_m',    total_points: 3910 },
  { user_id: '3', username: 'ananya_s',     total_points: 3540 },
  { user_id: '4', username: 'rajan_v',      total_points: 2760 },
  { user_id: '5', username: 'deepika_k',    total_points: 2410 },
  { user_id: '6', username: 'suresh_g',     total_points: 1980 },
  { user_id: '7', username: 'meena_p',      total_points: 1720 },
  { user_id: '8', username: 'arjun_t',      total_points: 1430 },
  { user_id: '9', username: 'kavitha_n',    total_points: 1190 },
  { user_id: '10', username: 'vijay_b',     total_points: 940  },
]

export default function Leaderboard() {
  const [users, setUsers] = useState(MOCK_USERS)
  const [loading, setLoading] = useState(true)
  const [topUser, setTopUser] = useState(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from('Users')
        .select('user_id, username, total_points')
        .order('total_points', { ascending: false })
        .limit(20)

      if (!error && data?.length > 0) {
        setUsers(data)
        setTopUser(data[0])
      } else {
        setTopUser(MOCK_USERS[0])
      }
      setLoading(false)
    }
    fetchLeaderboard()

    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Users' }, () => {
        fetchLeaderboard()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const top3 = users.slice(0, 3)
  const rest = users.slice(3)

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1>🏆 Citizen Leaderboard</h1>
        <p>Top waste warriors ranked by eco-points — drops, quality scores & weight bonuses</p>
      </div>

      {/* Podium */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Top Citizens — This Month</div>
        <div style={{
          display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-end',
          padding: '24px 0', flexWrap: 'wrap',
        }}>
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((u, i) => {
            const isFirst = i === 1
            const medals = ['🥈', '🥇', '🥉']
            const heights = [120, 160, 100]
            const colors = ['#94a3b8', '#fbbf24', '#d27346']
            return (
              <div key={u.user_id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                animation: `fadeUp 0.5s ease ${i * 0.1}s both`,
              }}>
                <div style={{ fontSize: 32 }}>{medals[i]}</div>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: `radial-gradient(circle, ${colors[i]}aa, ${colors[i]}44)`,
                  border: `3px solid ${colors[i]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 800, color: '#fff',
                  boxShadow: `0 0 20px ${colors[i]}55`,
                }}>
                  {u.username?.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{u.username}</div>
                <div style={{
                  width: 90,
                  height: heights[i],
                  background: `linear-gradient(to top, ${colors[i]}55, ${colors[i]}11)`,
                  border: `1px solid ${colors[i]}55`,
                  borderRadius: '10px 10px 0 0',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  paddingTop: 12,
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
                  color: colors[i],
                }}>
                  {u.total_points?.toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Full list */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Full Rankings</div>
        {loading
          ? <div className="loading-center"><div className="loading-ring" /></div>
          : (
            <div className="leaderboard-list">
              {users.map((u, i) => (
                <LeaderboardRow key={u.user_id} rank={i + 1} {...u} />
              ))}
            </div>
          )
        }
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
        Points = Base 10 + Quality bonus (score/10) + Weight bonus (kg × 2) per drop event
      </p>
    </div>
  )
}
