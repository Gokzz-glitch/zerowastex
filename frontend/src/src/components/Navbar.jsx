import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',            icon: '🗺️',  label: 'Live Map'     },
  { to: '/leaderboard', icon: '🏆',  label: 'Leaderboard'  },
  { to: '/community',   icon: '🏘️',  label: 'Community'    },
  { to: '/admin',       icon: '⚙️',  label: 'Admin'        },
]

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <span>♻️</span> Zer0wasteX
      </div>

      {links.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}

      <div className="navbar-footer">
        <div>Zer0wasteX v1.0</div>
        <div style={{ marginTop: 4, color: 'var(--accent-green)', fontSize: 11 }}>● Live</div>
      </div>
    </nav>
  )
}
