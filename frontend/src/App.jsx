import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import LiveMap from './pages/LiveMap'
import Leaderboard from './pages/Leaderboard'
import Community from './pages/Community'
import Admin from './pages/Admin'
import MrfDashboard from './pages/MrfDashboard'

export default function App() {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<MrfDashboard />} />
          <Route path="/live-map" element={<LiveMap />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/community" element={<Community />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}
