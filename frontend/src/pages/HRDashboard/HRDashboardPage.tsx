import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import AnomalyAlert from '../../components/AnomalyAlert'
import WeeklyOrderForm from './WeeklyOrderForm'
import StatsChart from './StatsChart'
import { api } from '../../api/client'
import { wsClient } from '../../api/ws'
import type { ContainerStats } from '../../types'
import { useNavigate } from 'react-router-dom'

export default function HRDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<ContainerStats | null>(null)
  const [anomalies, setAnomalies] = useState<string[]>([])

  useEffect(() => {
    api.getContainerStats('week').then(r => setStats(r.data)).catch(console.error)

    const unsubCollected = wsClient.on('container_collected', (payload: any) => {
      setStats(prev => prev ? {
        ...prev,
        collected: prev.collected + payload.collectedCount,
        returnRate: payload.returnRate,
      } : prev)
    })

    const unsubAnomaly = wsClient.on('anomaly_alert', (payload: any) => {
      setAnomalies(prev => [...prev, payload.message])
    })

    return () => { unsubCollected(); unsubAnomaly() }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">HR 儀表板</h1>

        {anomalies.map((msg, i) => (
          <AnomalyAlert key={i} message={msg} onDismiss={() => setAnomalies(prev => prev.filter((_, j) => j !== i))} />
        ))}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: '已出貨容器', value: stats?.dispatched ?? '--', unit: '個' },
            { label: '已回收容器', value: stats?.collected ?? '--', unit: '個' },
            { label: '回收率', value: stats ? `${(stats.returnRate * 100).toFixed(1)}%` : '--', unit: '' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{card.value}<span className="text-base font-normal ml-1">{card.unit}</span></p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-700 mb-4">本週訂餐設定</h2>
            <WeeklyOrderForm />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-700 mb-4">容器使用趨勢</h2>
            <StatsChart stats={stats} />
          </div>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={() => navigate('/esg')}
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
          >
            一鍵生成 ESG 報表 →
          </button>
        </div>
      </div>
    </div>
  )
}
