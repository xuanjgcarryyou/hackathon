import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'
import type { Restaurant } from '../../types'

export default function EmployeeOrderPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selected, setSelected] = useState('')
  const [useCircular, setUseCircular] = useState(true)
  const [ordered, setOrdered] = useState(false)

  useEffect(() => {
    api.getRestaurants().then(r => { setRestaurants(r.data); setSelected(r.data[0]?.id || '') })
  }, [])

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    setOrdered(true)
  }

  if (ordered) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto p-6 text-center">
          <div className="bg-white rounded-xl shadow-sm p-10">
            <p className="text-5xl mb-4">🌿</p>
            <h2 className="text-xl font-bold text-green-700 mb-2">訂餐成功！</h2>
            <p className="text-gray-600">您選擇使用環保循環容器，感謝您的貢獻！</p>
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
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form onSubmit={handleOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">選擇餐廳</label>
              <div className="space-y-2">
                {restaurants.map(r => (
                  <label key={r.id} className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer ${selected === r.id ? 'border-green-500 bg-green-50' : ''}`}>
                    <input type="radio" name="restaurant" value={r.id} checked={selected === r.id}
                      onChange={() => setSelected(r.id)} />
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-gray-500">${r.pricePerMeal} / 份</p>
                    </div>
                    {r.supportsCircular && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">環保容器</span>}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useCircular} onChange={e => setUseCircular(e.target.checked)}
                className="accent-green-600" />
              <span className="text-sm">使用循環環保容器（推薦）</span>
            </label>
            <button type="submit"
              className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700">
              確認訂餐
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
