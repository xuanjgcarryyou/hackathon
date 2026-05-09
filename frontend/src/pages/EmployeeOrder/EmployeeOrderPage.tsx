import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'
import type { Restaurant } from '../../types'

function getThisWeekMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export default function EmployeeOrderPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selected, setSelected] = useState('')
  const [useCircular, setUseCircular] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ co2e: number; packaging: number } | null>(null)

  useEffect(() => {
    api.getRestaurants().then(r => {
      setRestaurants(r.data)
      setSelected(r.data[0]?.id || '')
    })
  }, [])

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    const restaurant = restaurants.find(r => r.id === selected)
    if (!restaurant) return

    setLoading(true)
    setError('')
    try {
      const { data } = await api.createWeeklyOrder({
        restaurantId: selected,
        vendorId: restaurant.vendorId,
        estimatedCount: 1,
        weekStart: getThisWeekMonday(),
      })
      setResult({
        co2e: data.estimatedCo2eSaved ?? 0.06,
        packaging: data.estimatedReducedPackaging ?? 1,
      })
    } catch {
      setError('訂餐失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const selectedRestaurant = restaurants.find(r => r.id === selected)

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">訂餐成功！</h2>
            <p className="text-gray-500 text-sm mb-6">
              {selectedRestaurant?.name} · 本週午餐已確認
            </p>

            {useCircular && (
              <div className="bg-green-50 rounded-xl p-4 space-y-3 text-left">
                <p className="text-sm font-semibold text-green-800 text-center mb-3">🌍 您本次的環保貢獻</p>
                <div className="flex justify-around">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{result.co2e.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">kg CO₂e 減量</p>
                  </div>
                  <div className="w-px bg-green-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{result.packaging}</p>
                    <p className="text-xs text-gray-500 mt-1">件一次性包材省去</p>
                  </div>
                  <div className="w-px bg-green-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">♻️</p>
                    <p className="text-xs text-gray-500 mt-1">循環容器使用</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setResult(null)}
              className="mt-6 text-sm text-green-600 hover:underline"
            >
              繼續點餐
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">員工點餐</h1>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <form onSubmit={handleOrder} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">選擇餐廳</label>
              <div className="space-y-2">
                {restaurants.map(r => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${
                      selected === r.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="radio" name="restaurant" value={r.id}
                      checked={selected === r.id} onChange={() => setSelected(r.id)}
                      className="accent-green-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-500">NT$ {r.pricePerMeal} / 份</p>
                    </div>
                    {r.supportsCircular && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                        ♻️ 環保容器
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 bg-green-50 rounded-xl cursor-pointer border border-green-200">
              <input
                type="checkbox" checked={useCircular}
                onChange={e => setUseCircular(e.target.checked)}
                className="accent-green-600 w-4 h-4"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">使用循環環保容器</p>
                <p className="text-xs text-gray-500">減少一次性包材，每份約省 0.06 kg CO₂e</p>
              </div>
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !selected}
              className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '送出中...' : '確認訂餐'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
