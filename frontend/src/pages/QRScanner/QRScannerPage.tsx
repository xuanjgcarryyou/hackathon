import { useState } from 'react'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'

export default function QRScannerPage() {
  const [batchId, setBatchId] = useState('')
  const [count, setCount] = useState(45)
  const [result, setResult] = useState<{ returnRate: number; co2eSaved: number; anomaly: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dispatchLoading, setDispatchLoading] = useState(false)
  const [lastBatchId, setLastBatchId] = useState('')

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
