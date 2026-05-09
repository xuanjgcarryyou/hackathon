import { Link, useNavigate } from 'react-router-dom'
import { wsClient } from '../api/ws'

export default function Navbar() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('token')
    wsClient.disconnect()
    navigate('/login')
  }

  return (
    <nav className="bg-green-700 text-white px-6 py-3 flex items-center justify-between">
      <span className="text-lg font-bold">🌿 循環午餐管理平台</span>
      <div className="flex gap-4 text-sm">
        <Link to="/dashboard" className="hover:underline">儀表板</Link>
        <Link to="/scan" className="hover:underline">QR 回收</Link>
        <Link to="/esg" className="hover:underline">ESG 報表</Link>
        <button onClick={logout} className="hover:underline text-green-200">登出</button>
      </div>
    </nav>
  )
}
