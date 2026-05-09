import { useState } from 'react'
import Navbar from '../../components/Navbar'
import LoadingSpinner from '../../components/LoadingSpinner'
import { api } from '../../api/client'
import type { ESGReport } from '../../types'

export default function ESGReportPage() {
  const [periodStart, setPeriodStart] = useState('2026-01-01')
  const [periodEnd, setPeriodEnd] = useState('2026-06-30')
  const [report, setReport] = useState<ESGReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'zh' | 'en'>('zh')
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [genError, setGenError] = useState('')

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setReport(null)
    setGenError('')
    try {
      const { data } = await api.generateESGReport(periodStart, periodEnd)
      setReport(data)
      setGeneratedAt(new Date().toLocaleString('zh-TW'))
    } catch {
      setGenError('ESG 報表生成失敗，請確認後端連線是否正常')
    } finally {
      setLoading(false)
    }
  }

  function copyReport() {
    const text = tab === 'zh' ? report?.reportTextZh : report?.reportTextEn
    if (text) navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">ESG 報表生成</h1>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <form onSubmit={handleGenerate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">報告起始日</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-400" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">報告結束日</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-400" />
            </div>
            <button type="submit" disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap">
              {loading ? '生成中...' : '🤖 一鍵生成 ESG 報表'}
            </button>
          </form>
        </div>

        {loading && <LoadingSpinner text="AI 正在撰寫 ESG 報告（約 10-15 秒）..." />}

        {genError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
            {genError}
          </div>
        )}

        {report && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {generatedAt && (
              <p className="text-xs text-gray-400 mb-4">🤖 由 Claude AI 生成　·　{generatedAt}</p>
            )}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: '總訂餐份數', value: report.totalMeals, unit: '份' },
                { label: '循環容器份數', value: report.circularMeals, unit: '份' },
                { label: '減少包材', value: `${report.reducedPackagingKg.toFixed(1)} kg`, unit: '' },
                { label: 'CO₂e 減量', value: `${report.co2eSaved.toFixed(1)} kg`, unit: '' },
              ].map(item => (
                <div key={item.label} className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="text-xl font-bold text-green-700">{item.value}<span className="text-sm font-normal">{item.unit}</span></p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              {(['zh', 'en'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1 rounded-full text-sm font-medium ${tab === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {t === 'zh' ? '中文版' : 'English'}
                </button>
              ))}
              <button onClick={copyReport}
                className="ml-auto px-4 py-1 rounded-full text-sm border border-green-600 text-green-600 hover:bg-green-50">
                複製報告
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {tab === 'zh' ? report.reportTextZh : report.reportTextEn}
            </div>

            {report.carbonFactorSource && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">碳因子來源</p>
                <p className="text-xs text-blue-600">{report.carbonFactorSource}</p>
              </div>
            )}

            {report.dataHash && (
              <div className="mt-3 bg-gray-100 rounded-lg px-4 py-3 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 mb-1">資料稽核碼（SHA-256）</p>
                  <p className="text-xs font-mono text-gray-500 break-all">{report.dataHash}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
