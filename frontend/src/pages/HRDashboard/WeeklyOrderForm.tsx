import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Restaurant, Vendor } from '../../types'

export default function WeeklyOrderForm() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [count, setCount] = useState(50)
  const [result, setResult] = useState<{ estimatedReducedPackaging: number; estimatedCo2eSaved: number } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getRestaurants().then(r => { setRestaurants(r.data); setRestaurantId(r.data[0]?.id || '') })
    api.getVendors().then(r => { setVendors(r.data); setVendorId(r.data[0]?.id || '') })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const weekStart = new Date().toISOString().split('T')[0]
      const { data } = await api.createWeeklyOrder({ restaurantId, vendorId, estimatedCount: count, weekStart })
      setResult(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">合作餐廳</label>
        <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-400">
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">環保服務商</label>
        <select value={vendorId} onChange={e => setVendorId(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-400">
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">份數</label>
        <input type="number" min={1} value={count} onChange={e => setCount(Number(e.target.value))}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-400" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-green-600 text-white rounded py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
        {loading ? '設定中...' : '設定本週訂餐'}
      </button>
      {result && (
        <div className="bg-green-50 rounded p-3 text-sm text-green-800">
          <p>✅ 預估減少 <strong>{result.estimatedReducedPackaging}</strong> 個一次性餐盒</p>
          <p>🌱 預計 CO₂e 減量 <strong>{result.estimatedCo2eSaved} kg</strong></p>
        </div>
      )}
    </form>
  )
}
