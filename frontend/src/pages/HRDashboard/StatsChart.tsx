import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ContainerStats } from '../../types'

export default function StatsChart({ stats }: { stats: ContainerStats | null }) {
  if (!stats) return <p className="text-gray-400 text-sm">載入統計資料中...</p>

  const data = [
    { name: '已出貨', value: stats.dispatched, color: '#6ee7b7' },
    { name: '已回收', value: stats.collected, color: '#059669' },
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="bg-emerald-50 rounded p-2 text-center">
          <p className="text-xs text-gray-500">CO₂e 減量</p>
          <p className="font-bold text-emerald-700">{stats.co2eSaved.toFixed(1)} kg</p>
        </div>
        <div className="bg-emerald-50 rounded p-2 text-center">
          <p className="text-xs text-gray-500">回收率</p>
          <p className="font-bold text-emerald-700">{(stats.returnRate * 100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}
