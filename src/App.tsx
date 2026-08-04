import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import PublicDashboard from './pages/PublicDashboard'
import AdminPage from './pages/AdminPage'

function Nav() {
  const loc = useLocation()
  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-yellow-400 text-lg">$10K → $100K TCG Challenge</span>
      <Link
        to="/"
        className={`text-sm ${loc.pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Dashboard
      </Link>
      <Link
        to="/admin"
        className={`text-sm ${loc.pathname === '/admin' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Admin
      </Link>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/tcg-10k-challenge-frontend">
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<PublicDashboard />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
