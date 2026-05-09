import { Link, useNavigate, useLocation } from 'react-router-dom'
import { wsClient } from '../api/ws'

function LeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

interface NavLinkProps {
  to: string
  label: string
  currentPath: string
}

function NavLink({ to, label, currentPath }: NavLinkProps) {
  const isActive = currentPath === to
  return (
    <Link
      to={to}
      className={`px-2 py-1 rounded text-sm transition-colors whitespace-nowrap ${
        isActive
          ? 'bg-white/20 text-white font-semibold'
          : 'text-green-100 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </Link>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const role: string = user.role || 'employee'
  const path = location.pathname

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    wsClient.disconnect()
    navigate('/login')
  }

  return (
    <nav className="bg-green-700 text-white px-4 py-2.5 flex items-center justify-between gap-4">
      <Link to={role === 'admin' ? '/dashboard' : role === 'manager' ? '/company-admin' : '/order'}
        className="flex items-center gap-2 text-white hover:text-green-100 transition-colors flex-shrink-0"
      >
        <LeafIcon />
        <span className="text-base font-bold tracking-tight">循環午餐</span>
      </Link>

      <div className="flex gap-1 text-sm items-center overflow-x-auto scrollbar-none flex-1 justify-end">
        {role === 'admin' && (
          <>
            <NavLink to="/dashboard" label="平台概覽" currentPath={path} />
            <NavLink to="/vendor-applications" label="廠商審核" currentPath={path} />
            <NavLink to="/scan" label="QR 回收" currentPath={path} />
            <NavLink to="/esg" label="ESG 報表" currentPath={path} />
            <NavLink to="/vendor-showcase" label="廠商生態" currentPath={path} />
            <NavLink to="/ai-agent" label="AI 大使" currentPath={path} />
            <NavLink to="/carbon-model" label="碳模型" currentPath={path} />
            <NavLink to="/esg-bi" label="BI 儀表板" currentPath={path} />
          </>
        )}
        {role === 'manager' && (
          <>
            <NavLink to="/company-admin" label="選擇餐廳" currentPath={path} />
            <NavLink to="/esg" label="ESG 報表" currentPath={path} />
            <NavLink to="/ai-agent" label="AI 大使" currentPath={path} />
            <NavLink to="/carbon-model" label="碳模型" currentPath={path} />
            <NavLink to="/esg-bi" label="BI 儀表板" currentPath={path} />
          </>
        )}
        {role === 'employee' && (
          <>
            <NavLink to="/order" label="本週訂餐" currentPath={path} />
            <NavLink to="/scan" label="QR 回收" currentPath={path} />
          </>
        )}
        <button
          onClick={logout}
          className="px-2 py-1 rounded text-sm text-green-200 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap ml-2 flex-shrink-0"
        >
          登出
        </button>
      </div>
    </nav>
  )
}
