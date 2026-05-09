import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'
import type { ContainerStats } from '../../types'

type Mode = 'onboarding' | 'gaps' | 'report'

interface Message {
  role: 'user' | 'ai'
  text: string
}

const INITIAL_MESSAGES: Record<Mode, string> = {
  onboarding: `你好！我是環保 AI 大使 🌿

請問這次合作是：
A) 長期合約（辦公室、學校、企業總部）
B) 短期活動（餐會、展覽、快閃活動）`,

  gaps: `根據目前資料，以下項目需要補強才能符合完整 ESG 揭露：

⚠️ 高優先：
• Scope 3 Category 1 以外的其他類別尚未涵蓋（如 Cat.4 運輸、Cat.5 廢棄物）
• 缺乏第三方確信報告

📋 中優先：
• 員工個人永續行動追蹤
• 部門別回收率比較

需要我協助規劃補強方案嗎？`,

  report: '__REPORT_MODE__',
}

const FOLLOWUP_MESSAGES: Record<Mode, string[]> = {
  onboarding: [
    '了解！根據您的需求，建議配置：\n✓ 掃碼機 3 台（出入口各 1）\n✓ 回收站 6 個（每層 2）\n✓ 合作廠商：Loopick（回收率 91%）',
    '設定完成後，系統將自動追蹤每日容器狀況，並在每月自動產生 ESG 報表草稿，供主管審核。',
  ],
  gaps: [
    '我建議從最容易實作的項目開始：先在 ESG 報告中明確標注覆蓋範圍，再逐步擴展到其他 Scope 3 類別。',
  ],
  report: [],
}

export default function AIAgentPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('onboarding')
  const [messagesByMode, setMessagesByMode] = useState<Record<Mode, Message[]>>({
    onboarding: [],
    gaps: [],
    report: [],
  })
  const [replyIndexByMode, setReplyIndexByMode] = useState<Record<Mode, number>>({
    onboarding: 0,
    gaps: 0,
    report: 0,
  })
  const [input, setInput] = useState('')
  const [stats, setStats] = useState<ContainerStats | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize AI messages for each mode
  useEffect(() => {
    setMessagesByMode({
      onboarding: [{ role: 'ai', text: INITIAL_MESSAGES.onboarding }],
      gaps: [{ role: 'ai', text: INITIAL_MESSAGES.gaps }],
      report: [],
    })
  }, [])

  // Fetch stats
  useEffect(() => {
    api.getContainerStats('week')
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesByMode, mode])

  function handleSend() {
    const text = input.trim()
    if (!text || mode === 'report') return

    const followups = FOLLOWUP_MESSAGES[mode]
    const replyIndex = replyIndexByMode[mode]
    const aiReply = replyIndex < followups.length ? followups[replyIndex] : null

    setMessagesByMode(prev => ({
      ...prev,
      [mode]: [
        ...prev[mode],
        { role: 'user', text },
        ...(aiReply ? [{ role: 'ai' as const, text: aiReply }] : []),
      ],
    }))
    setReplyIndexByMode(prev => ({
      ...prev,
      [mode]: prev[mode] + 1,
    }))
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

  const currentMessages = messagesByMode[mode]

  const modeButtons: { key: Mode; label: string }[] = [
    { key: 'onboarding', label: '入駐引導' },
    { key: 'gaps', label: '資料缺口' },
    { key: 'report', label: '生成報告' },
  ]

  const returnRate = stats ? (stats.returnRate * 100).toFixed(1) : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 max-w-6xl mx-auto w-full p-6 gap-6">

        {/* Left Panel 40% */}
        <div className="w-2/5 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-gray-800">本週 ESG 即時數據</h2>

          {/* Stats Cards */}
          <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">已出貨容器</p>
              <p className="text-2xl font-bold text-green-700">{stats ? stats.dispatched.toLocaleString() : '—'}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">已回收容器</p>
              <p className="text-2xl font-bold text-green-700">{stats ? stats.collected.toLocaleString() : '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-2">回收率</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: stats ? `${Math.min(stats.returnRate * 100, 100)}%` : '0%' }}
                  />
                </div>
                <span className="text-sm font-semibold text-green-700 w-12 text-right">
                  {returnRate !== null ? `${returnRate}%` : '—'}
                </span>
              </div>
            </div>
            {stats && stats.co2eSaved !== undefined && (
              <div className="col-span-2 bg-green-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">CO₂e 減量</p>
                <p className="text-2xl font-bold text-green-700">{stats.co2eSaved.toFixed(1)}<span className="text-sm font-normal"> kg</span></p>
              </div>
            )}
          </div>

          {/* Calculation Method Badge */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-2 font-semibold">計算方法</p>
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full">
              ✓ GHG Protocol Scope 3 Cat.1 避免排放量
            </span>
          </div>

          {/* Data Gap Warnings */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-3 font-semibold">GHG 揭露缺口狀態</p>
            <div className="flex flex-col gap-2">
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="text-orange-500 text-xs mt-0.5">⚠</span>
                <div>
                  <p className="text-xs text-orange-700 font-medium">Scope 3 Cat.4 / Cat.5 尚未追蹤</p>
                  <p className="text-xs text-orange-500 mt-0.5">Cat.1 包材避免排放量已量測，清冊表已揭露缺口範圍</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="text-blue-500 text-xs mt-0.5">○</span>
                <div>
                  <p className="text-xs text-blue-700 font-medium">第三方確信機制：規劃中</p>
                  <p className="text-xs text-blue-500 mt-0.5">SHA-256 稽核碼已建立，可供外部查驗</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="text-green-600 text-xs mt-0.5">✓</span>
                <div>
                  <p className="text-xs text-green-700 font-medium">員工個人貢獻追蹤：已建立</p>
                  <p className="text-xs text-green-500 mt-0.5">掃碼頁可查看個人 CO₂e 貢獻與回收比例</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel 60% */}
        <div className="w-3/5 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Mode Tabs */}
          <div className="flex gap-2 p-4 border-b border-gray-100">
            {modeButtons.map(btn => (
              <button
                key={btn.key}
                onClick={() => setMode(btn.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === btn.key
                    ? 'bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ minHeight: 0 }}>
            {mode === 'report' ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <button
                  onClick={() => navigate('/esg')}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm"
                >
                  前往 ESG 報表生成頁面 →
                </button>
                <p className="text-xs text-gray-500 text-center max-w-xs leading-relaxed">
                  報表將依據本週實際回收數據，由 Claude AI 自動產生符合 GHG Protocol Scope 3 Category 1 框架的包材避免排放量中英文報告。
                </p>
              </div>
            ) : (
              <>
                {currentMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs md:max-w-sm px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-green-600 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 text-gray-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          {mode !== 'report' && (
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入訊息..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                送出
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
