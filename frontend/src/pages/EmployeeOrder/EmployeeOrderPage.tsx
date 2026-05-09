import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'

interface WeekSelection {
  restaurantId: string
  restaurantName: string
  vendorId: string
  pricePerMeal: number | null
  supportsCircular: boolean
}

function getThisWeekMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function getThisWeekLabel(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  const friday = new Date(monday)
  friday.setDate(friday.getDate() + 4)
  const fmt = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`
  return `${fmt(monday)} – ${fmt(friday)}`
}

export default function EmployeeOrderPage() {
  const [weekSelection, setWeekSelection] = useState<WeekSelection | null>(null)
  const [notSelected, setNotSelected] = useState(false)
  const [useCircular, setUseCircular] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ co2e: number; packaging: number } | null>(null)

  useEffect(() => {
    api.getCurrentWeekOrder()
      .then(r => {
        if (r.data.selected) {
          setWeekSelection(r.data.selected)
        } else {
          setNotSelected(true)
        }
      })
      .catch(() => setNotSelected(true))
      .finally(() => setLoading(false))
  }, [])

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!weekSelection) return
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.createWeeklyOrder({
        restaurantId: weekSelection.restaurantId,
        vendorId: weekSelection.vendorId,
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
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto p-6 text-center text-gray-400 mt-16">載入中...</div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">訂餐成功！</h2>
            <p className="text-gray-500 text-sm mb-6">
              {weekSelection?.restaurantName} · 本週午餐已確認
            </p>
            {useCircular && (
              <div className="bg-green-50 rounded-xl p-4 text-left">
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
            <button onClick={() => setResult(null)} className="mt-6 text-sm text-green-600 hover:underline">
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (notSelected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-lg font-bold text-gray-600 mb-2">本週餐廳尚未選定</h2>
            <p className="text-gray-400 text-sm">請等待公司管理員選擇本週合作餐廳後再來訂餐</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">本週訂餐</h1>
        <p className="text-sm text-gray-400 mb-6">本週：{getThisWeekLabel()}</p>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* Week's restaurant */}
          <div className="mb-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-medium">本週合作餐廳</p>
            <div className="border-2 border-green-500 bg-green-50 rounded-xl p-4 flex items-center gap-3">
              <span className="text-3xl">🍱</span>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{weekSelection?.restaurantName}</p>
                {weekSelection?.pricePerMeal && (
                  <p className="text-xs text-gray-500">NT$ {weekSelection.pricePerMeal} / 份</p>
                )}
              </div>
              {weekSelection?.supportsCircular && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                  ♻️ 環保容器
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleOrder} className="space-y-5">
            <label className="flex items-center gap-3 p-3 bg-green-50 rounded-xl cursor-pointer border border-green-200">
              <input
                type="checkbox"
                checked={useCircular}
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
              disabled={submitting}
              className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '送出中...' : '確認訂餐'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
