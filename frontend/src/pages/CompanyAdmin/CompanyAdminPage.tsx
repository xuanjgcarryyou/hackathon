import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { Restaurant } from '../../types'

const RESTAURANT_VISUAL: Record<string, {
  emoji: string
  gradient: string
  tags: string[]
  category: string
  rating: number
  location: string
}> = {
  'rest-001': { emoji: '🥗', gradient: 'from-green-400 to-emerald-600', tags: ['平價', '葷素皆有', '環保認證'], category: '精緻餐盒', rating: 4.8, location: '台北市信義區' },
  'rest-002': { emoji: '🌿', gradient: 'from-teal-400 to-cyan-600', tags: ['蔬食友善', '環保認證', '野餐系列'], category: '健康永續餐盒', rating: 4.6, location: '台北市松山區' },
  'rest-003': { emoji: '🍱', gradient: 'from-amber-400 to-orange-600', tags: ['蔬食友善', '葷素皆有', '社會公益'], category: '精緻餐盒', rating: 4.7, location: '台北市大安區' },
  'rest-004': { emoji: '🍛', gradient: 'from-blue-400 to-indigo-600', tags: ['平價', '快速配送'], category: '精緻餐盒', rating: 4.5, location: '台北市中山區' },
  'rest-005': { emoji: '🥣', gradient: 'from-purple-400 to-pink-600', tags: ['精緻茶飲', '社會公益'], category: '健康永續餐盒', rating: 4.9, location: '台北市中山區' },
  'rest-006': { emoji: '🫐', gradient: 'from-rose-400 to-red-600', tags: ['蔬食友善', '野餐系列'], category: '健康永續餐盒', rating: 4.4, location: '台北市北投區' },
}

const DEFAULT_VISUAL = {
  emoji: '🍽️',
  gradient: 'from-gray-400 to-gray-600',
  tags: ['一般餐廳'],
  category: '精緻餐盒',
  rating: 4.0,
  location: '台北市',
}

const FILTER_TAGS = ['全部', '平價', '蔬食友善', '葷素皆有', '社會公益', '精緻茶飲', '野餐系列', '環保認證', '快速配送']
const CATEGORIES = ['精緻餐盒', '健康永續餐盒']

type EnrichedRestaurant = Restaurant & {
  emoji: string
  gradient: string
  tags: string[]
  category: string
  rating: number
  location: string
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

function getThisWeekMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export default function CompanyAdminPage() {
  const [restaurants, setRestaurants] = useState<EnrichedRestaurant[]>([])
  const [activeFilter, setActiveFilter] = useState('全部')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const navigate = useNavigate()

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    api.getRestaurants().then(r => {
      const enriched: EnrichedRestaurant[] = r.data.map((rest: Restaurant) => ({
        ...rest,
        ...(RESTAURANT_VISUAL[rest.id] ?? DEFAULT_VISUAL),
      }))
      setRestaurants(enriched)
    })

    api.getCurrentWeekOrder().then(r => {
      if (r.data.selected) setSelectedId(r.data.selected.restaurantId)
    }).catch(() => {})
  }, [])

  const filtered = activeFilter === '全部'
    ? restaurants
    : restaurants.filter(r => r.tags.includes(activeFilter))

  async function handleSelect(restaurant: EnrichedRestaurant) {
    setConfirming(restaurant.id)
    try {
      await api.createWeeklyOrder({
        restaurantId: restaurant.id,
        vendorId: restaurant.vendorId,
        estimatedCount: 50,
        weekStart: getThisWeekMonday(),
      })
    } catch { /* demo: show success anyway */ }
    setSelectedId(restaurant.id)
    setConfirming(null)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const selectedRestaurant = restaurants.find(r => r.id === selectedId)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-700 text-white px-6 py-3 flex items-center justify-between">
        <span className="text-lg font-bold">🌿 循環午餐管理平台</span>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-green-200">公司管理員：{user.name || '管理員'}</span>
          <button onClick={logout} className="hover:underline text-green-200">登出</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">選擇本週合作餐廳</h1>
            <p className="text-gray-500 text-sm mt-1">
              本週：{getThisWeekLabel()} · 目前有 {restaurants.length} 間餐廳可以做選擇！
            </p>
          </div>
          {selectedRestaurant && (
            <div className="bg-green-100 border border-green-300 rounded-xl px-4 py-2 text-sm flex items-center gap-2">
              <span className="text-green-600 font-medium">✓ 本週已選定：</span>
              <span className="font-bold text-green-800">{selectedRestaurant.name}</span>
              <span className="text-lg">{selectedRestaurant.emoji}</span>
            </div>
          )}
        </div>

        {/* Filter tags */}
        <div className="flex gap-2 flex-wrap mb-7">
          {FILTER_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveFilter(tag)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === tag
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400 hover:text-green-600'
              }`}
            >
              {tag === '全部' ? `# ${tag}分組` : `# ${tag}`}
            </button>
          ))}
        </div>

        {/* Restaurant sections by category */}
        {CATEGORIES.map(category => {
          const inCategory = filtered.filter(r => r.category === category)
          if (inCategory.length === 0) return null
          return (
            <div key={category} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-800">{category}</h2>
                <span className="text-sm text-gray-400 cursor-pointer hover:text-green-600">
                  查看更多{category} →
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {inCategory.map(restaurant => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    isSelected={restaurant.id === selectedId}
                    isConfirming={confirming === restaurant.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RestaurantCard({
  restaurant,
  isSelected,
  isConfirming,
  onSelect,
}: {
  restaurant: EnrichedRestaurant
  isSelected: boolean
  isConfirming: boolean
  onSelect: (r: EnrichedRestaurant) => void
}) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border-2 ${
      isSelected ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent'
    }`}>
      {/* Photo area */}
      <div className={`h-36 bg-gradient-to-br ${restaurant.gradient} flex items-center justify-center relative`}>
        <span className="text-6xl drop-shadow">{restaurant.emoji}</span>
        {isSelected && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
            ✓ 本週選定
          </div>
        )}
        {restaurant.supportsCircular && (
          <div className="absolute bottom-2 left-2 bg-white/85 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
            ♻️ 環保容器
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-bold text-gray-800 text-sm mb-1">{restaurant.name}</h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {restaurant.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-0.5 mb-1">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className={`text-xs ${i <= Math.round(restaurant.rating) ? 'text-amber-400' : 'text-gray-200'}`}>
              ●
            </span>
          ))}
          <span className="text-xs text-gray-500 ml-1">{restaurant.rating}</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">{restaurant.location}</p>

        {/* Price + Select */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">NT$ {restaurant.pricePerMeal} / 份</span>
          <button
            onClick={() => onSelect(restaurant)}
            disabled={isConfirming}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              isSelected
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isConfirming ? '選定中...' : isSelected ? '✓ 已選定' : '選為本週'}
          </button>
        </div>
      </div>
    </div>
  )
}
