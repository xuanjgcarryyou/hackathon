import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'

interface MyStats {
  userName: string
  myCollectedCount: number
  myCo2eSaved: number
  myScanCount: number
  companyCollectedCount: number
  companyCo2eSaved: number
}

export default function QRScannerPage() {
  const [batchId, setBatchId] = useState('')
  const [count, setCount] = useState(45)
  const [result, setResult] = useState<{ returnRate: number; co2eSaved: number; anomaly: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dispatchLoading, setDispatchLoading] = useState(false)
  const [lastBatchId, setLastBatchId] = useState('')
  const [myStats, setMyStats] = useState<MyStats | null>(null)

  function fetchMyStats() {
    api.getMyContainerStats().then(res => setMyStats(res.data)).catch(() => {})
  }

  useEffect(() => { fetchMyStats() }, [])

  async function handleSimulateDispatch() {
    setDispatchLoading(true)
    try {
      const qrCode = `BATCH-${Date.now()}`
      const { data } = await api.dispatchContainers({
        qrCode,
        companyId: 'company-001',
        vendorId: 'vendor-001',
        quantity: 50,
      })
      setLastBatchId(data.batchId)
      setBatchId(data.batchId)
      alert(`✅ 已模擬出貨，batchId: ${data.batchId}`)
    } catch (err) {
      console.error(err)
    } finally {
      setDispatchLoading(false)
    }
  }

  async function handleCollect(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const { data } = await api.collectContainers(batchId, count)
      setResult(data)
      fetchMyStats()
    } catch (err: any) {
      alert(err.response?.data?.error || '回收失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">容器掃碼回收</h1>

        {/* Personal Contribution Card */}
        {myStats && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-500 font-semibold mb-3">我的環保貢獻（GHG Scope 3 Cat.11）</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{myStats.myScanCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">累積掃碼次數</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{myStats.myCollectedCount.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">回收容器總數</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{myStats.myCo2eSaved.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-0.5">kg CO₂e 減量</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>個人佔公司總回收比例</span>
                <span>{myStats.companyCollectedCount > 0 ? ((myStats.myCollectedCount / myStats.companyCollectedCount) * 100).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: myStats.companyCollectedCount > 0 ? `${Math.min((myStats.myCollectedCount / myStats.companyCollectedCount) * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        )}


        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-3">Step 1：模擬出貨（建立批次）</h2>
          <button onClick={handleSimulateDispatch} disabled={dispatchLoading}
            className="w-full border-2 border-green-600 text-green-600 rounded-lg py-2 font-medium hover:bg-green-50 disabled:opacity-50">
            {dispatchLoading ? '出貨中...' : '模擬出貨 50 個容器'}
          </button>
          {lastBatchId && <p className="text-xs text-gray-400 mt-2">批次 ID：{lastBatchId}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3">Step 2：記錄回收</h2>
          <form onSubmit={handleCollect} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">批次 ID（掃描 QR 或貼上）</label>
              <input value={batchId} onChange={e => setBatchId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-green-400"
                placeholder="BATCH-xxxx" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">回收數量</label>
              <input type="number" min={0} value={count} onChange={e => setCount(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 disabled:opacity-50">
              {loading ? '記錄中...' : '確認回收'}
            </button>
          </form>

          {result && (
            <div className={`mt-4 rounded-lg p-4 ${result.anomaly ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <p className="font-semibold">{result.anomaly ? '⚠️ 回收異常' : '✅ 回收成功'}</p>
              <p className="text-sm mt-1">回收率：<strong>{(result.returnRate * 100).toFixed(1)}%</strong></p>
              <p className="text-sm">CO₂e 減量：<strong>{result.co2eSaved} kg</strong></p>
              {result.anomaly && <p className="text-red-600 text-sm mt-1">回收率低於標準 90%，請追查原因</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
