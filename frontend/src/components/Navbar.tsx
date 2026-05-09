import { Link, useNavigate } from 'react-router-dom'
import { wsClient } from '../api/ws'

export default function Navbar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const role: string = user.role || 'employee'

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    wsClient.disconnect()
    navigate('/login')
  }

  return (
    <nav className="bg-green-700 text-white px-6 py-3 flex items-center justify-between">
      <span className="text-lg font-bold">🌿 循環午餐管理平台</span>
      <div className="flex gap-4 text-sm items-center">
        {role === 'admin' && (
          <>
            <Link to="/dashboard" className="hover:underline">平台概覽</Link>
            <Link to="/vendor-applications" className="hover:underline">廠商審核</Link>
            <Link to="/scan" className="hover:underline">QR 回收</Link>
            <Link to="/esg" className="hover:underline">ESG 報表</Link>
            <Link to="/vendor-showcase" className="hover:underline">廠商生態</Link>
            <Link to="/ai-agent" className="hover:underline">AI 大使</Link>
          </>
        )}
        {role === 'manager' && (
          <>
            <Link to="/company-admin" className="hover:underline">選擇餐廳</Link>
            <Link to="/esg" className="hover:underline">ESG 報表</Link>
            <Link to="/ai-agent" className="hover:underline">AI 大使</Link>
          </>
        )}
        {role === 'employee' && (
          <>
            <Link to="/order" className="hover:underline">本週訂餐</Link>
            <Link to="/scan" className="hover:underline">QR 回收</Link>
          </>
        )}
        <button onClick={logout} className="hover:underline text-green-200">登出</button>
      </div>
    </nav>
  )
}
