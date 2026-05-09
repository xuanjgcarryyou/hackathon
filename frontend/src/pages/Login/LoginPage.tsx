import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../api/client'
import { wsClient } from '../../api/ws'
import type { UserRecord } from '../../types'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.login(email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      wsClient.connect(data.token)

      const user: UserRecord = data.user
      navigate(
        user.role === 'employee' ? '/order' :
        user.role === 'manager' ? '/company-admin' :
        '/dashboard'
      )
    } catch {
      setError('帳號或密碼錯誤')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-green-700 mb-1 text-center">🌿 循環午餐管理平台</h1>
        <p className="text-sm text-gray-500 text-center mb-6">B2B ESG 容器循環追蹤系統</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="hr@demo.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="demo1234"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
          <p className="font-medium mb-1">Demo 帳號</p>
          <p>hr@demo.com / demo1234 → 平台管理員</p>
          <p>mgr@demo.com / demo1234 → 公司管理員</p>
          <p>emp@demo.com / demo1234 → 員工點餐</p>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/vendor-portal"
            className="text-sm text-green-600 hover:text-green-800 hover:underline"
          >
            🏪 廠商申請加入平台
          </Link>
        </div>
      </div>
    </div>
  )
}
