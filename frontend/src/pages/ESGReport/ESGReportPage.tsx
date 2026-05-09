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
  const [exporting, setExporting] = useState(false)

  async function handleExport(reportId: string) {
    setExporting(true)
    try {
      const { data } = await api.exportESGReport(reportId)
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `esg-report-${reportId.slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent — user can retry
    } finally {
      setExporting(false)
    }
  }

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
            {report.isFallback && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-orange-700">本地計算模板（AI 生成服務暫時不可用）</p>
                  <p className="text-xs text-orange-500 mt-0.5">數值由本地公式正確計算；文字格式為預設模板，非 AI 即時生成。</p>
                </div>
              </div>
            )}
            {generatedAt && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-400">
                  {report.isFallback ? '📋 本地公式計算' : '🤖 由 Claude AI 生成'}　·　{generatedAt}
                </p>
                {report.reportId && (
                  <button
                    onClick={() => handleExport(report.reportId)}
                    disabled={exporting}
                    className="flex items-center gap-1.5 text-xs font-medium text-green-700 border border-green-300 bg-green-50 hover:bg-green-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {exporting ? '匯出中...' : '下載 JSON 底稿'}
                  </button>
                )}
              </div>
            )}

            {/* GHG Protocol Inventory Table */}
            <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-green-700 text-white px-4 py-3">
                <p className="text-sm font-bold">GHG Protocol 溫室氣體清冊</p>
                <p className="text-xs text-green-200 mt-0.5">依 ISO 14064-1 / GHG Protocol Corporate Standard 編製</p>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold w-20">範疇</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold w-24">類別</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold">說明</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-semibold w-32">排放量 (kg CO₂e)</th>
                    <th className="text-center px-3 py-2 text-gray-500 font-semibold w-24">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { scope: 'Scope 1', cat: '—', desc: '直接排放（燃料燃燒、逸散）', value: '0', status: 'na', statusLabel: '不適用' },
                    { scope: 'Scope 2', cat: '—', desc: '電力間接排放', value: '—', status: 'untracked', statusLabel: '未追蹤' },
                    { scope: 'Scope 3', cat: 'Cat.1', desc: '採購商品與服務－包材碳排避免量（循環容器替代一次性包材，Avoided Emissions）', value: report.co2eSaved.toFixed(2), status: 'measured', statusLabel: '✓ 已量測' },
                    { scope: 'Scope 3', cat: 'Cat.1', desc: '採購商品與服務－食材上游完整碳排', value: '—', status: 'untracked', statusLabel: '未追蹤' },
                    { scope: 'Scope 3', cat: 'Cat.4', desc: '上游運輸與配送', value: '—', status: 'untracked', statusLabel: '未追蹤' },
                    { scope: 'Scope 3', cat: 'Cat.5', desc: '營運產生廢棄物', value: '—', status: 'untracked', statusLabel: '未追蹤' },
                  ].map((row, i) => (
                    <tr key={i} className={row.status === 'measured' ? 'bg-green-50' : ''}>
                      <td className="px-3 py-2.5 font-semibold text-gray-700">{row.scope}</td>
                      <td className="px-3 py-2.5 text-gray-500">{row.cat}</td>
                      <td className="px-3 py-2.5 text-gray-600">{row.desc}</td>
                      <td className={`px-3 py-2.5 text-right font-mono font-semibold ${row.status === 'measured' ? 'text-green-700' : 'text-gray-400'}`}>
                        {row.value}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.status === 'measured' ? 'bg-green-100 text-green-700' :
                          row.status === 'na' ? 'bg-gray-100 text-gray-500' :
                          'bg-orange-50 text-orange-600'
                        }`}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                <p className="text-xs text-gray-400">本報告揭露 Scope 3 Category 1 包材採購避免排放量（Avoided Emissions），為補充揭露指標，不計入 GHG 清冊排放總量。其他 Scope 3 類別尚待擴充追蹤。</p>
              </div>
            </div>

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
