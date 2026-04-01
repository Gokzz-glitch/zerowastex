export default function LeaderboardRow({ rank, username, total_points, style }) {
  const rankClass =
    rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'normal'

  const rankEmoji =
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '??'

  return (
    <div className="lb-row" style={{ animationDelay: `${rank * 0.05}s`, ...style }}>
      <div className={`lb-rank ${rankClass}`}>{rankEmoji}</div>
      <div className="lb-avatar">{initials}</div>
      <div className="lb-username">{username ?? 'Anonymous'}</div>
      <div style={{ textAlign: 'right' }}>
        <div className="lb-points">{total_points?.toLocaleString() ?? 0}</div>
        <div className="lb-points-label">pts</div>
      </div>
    </div>
  )
}
