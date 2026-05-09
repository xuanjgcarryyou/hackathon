import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { api } from '../../api/client'
import Navbar from '../../components/Navbar'
import type { ContainerStats } from '../../types/index'

// ── Sankey static layout ──────────────────────────────────────────────────────
// SVG viewBox: 600 × 300, padding-y: 30, gap between nodes: 10
// Source x=0 w=130, Target x=470 w=130, bezier midpoint x=300

const SOURCE_NODES = [
  { label: '上游製造', sub: 'Upstream Mfg', y: 30, h: 110, color: '#F59E0B' },
  { label: '清洗物流', sub: 'Sanitization', y: 150, h: 69, color: '#F97316' },
  { label: '配送運輸', sub: 'Transport', y: 229, h: 41, color: '#FB923C' },
]

const TARGET_NODES = [
  { label: '循環使用節省', sub: 'Circular Savings', y: 30, h: 165, color: '#10B981' },
  { label: '廢棄處理迴避', sub: 'Disposal Avoided', y: 205, h: 41, color: '#34D399' },
  { label: '碳匯效益', sub: 'Offset', y: 256, h: 14, color: '#3B82F6' },
]

interface SankeyFlow {
  id: string
  label: string
  desc: string
  path: string
  fill: string
  stroke: string
}

const SANKEY_FLOWS: SankeyFlow[] = [
  {
    id: 'mfg-circular',
    label: 'LCA：製造 → 循環使用節省',
    desc: 'GHG Protocol Scope 3 Cat.1：採購商品包材避免排放（Avoided Emissions），每容器節省 0.13 kg CO₂e，採搖籃到大門（Cradle-to-Gate）邊界',
    path: 'M 130 30 C 300 30 300 30 470 30 L 470 113 C 300 113 300 113 130 113 Z',
    fill: 'rgba(16,185,129,0.3)',
    stroke: 'rgba(16,185,129,0.55)',
  },
  {
    id: 'mfg-disposal',
    label: 'LCA：製造 → 廢棄處理迴避',
    desc: 'Scope 3 Cat.5：避免一次性包材廢棄處理，採 IPCC AR6 廢棄物排放係數計算（約 0.025 kg CO₂e / 件）',
    path: 'M 130 113 C 300 113 300 205 470 205 L 470 232 C 300 232 300 141 130 141 Z',
    fill: 'rgba(52,211,153,0.22)',
    stroke: 'rgba(52,211,153,0.5)',
  },
  {
    id: 'san-circular',
    label: 'LCA：清洗物流 → 循環使用節省',
    desc: '清洗能耗排放（Scope 3 Cat.4），以台灣電力排放係數 0.495 kg CO₂e/kWh 計算，佔循環節省 20/60 比例',
    path: 'M 130 150 C 300 150 300 113 470 113 L 470 168 C 300 168 300 205 130 205 Z',
    fill: 'rgba(16,185,129,0.22)',
    stroke: 'rgba(16,185,129,0.48)',
  },
  {
    id: 'san-offset',
    label: 'LCA：清洗物流 → 碳匯效益',
    desc: '採用綠電清洗設施產生碳匯效益，符合 ISO 14064-2 額外性原則，待第三方確信後納入正式揭露',
    path: 'M 130 205 C 300 205 300 256 470 256 L 470 270 C 300 270 300 219 130 219 Z',
    fill: 'rgba(59,130,246,0.22)',
    stroke: 'rgba(59,130,246,0.48)',
  },
  {
    id: 'trans-circular',
    label: 'LCA：配送運輸 → 循環使用節省',
    desc: '最後一哩回收運輸（Scope 3 Cat.4），透過回收點密度優化，每容器運輸排放 0.01–0.10 kg CO₂e',
    path: 'M 130 229 C 300 229 300 168 470 168 L 470 195 C 300 195 300 256 130 256 Z',
    fill: 'rgba(16,185,129,0.18)',
    stroke: 'rgba(16,185,129,0.42)',
  },
  {
    id: 'trans-disposal',
    label: 'LCA：配送 → 廢棄處理迴避',
    desc: '回收後統一配送處理，降低分散廢棄的運輸排放，以 GHG Protocol 運輸計算工具 v2 計量',
    path: 'M 130 256 C 300 256 300 232 470 232 L 470 246 C 300 246 300 270 130 270 Z',
    fill: 'rgba(52,211,153,0.18)',
    stroke: 'rgba(52,211,153,0.42)',
  },
]

// ── Compliance items ──────────────────────────────────────────────────────────
const COMPLIANCE_ITEMS = [
  {
    label: '台灣 2030 淨零排放路徑',
    sub: 'Taiwan Net-Zero by 2030 Roadmap',
    checked: true,
    note: 'Scope 3 Cat.1 包材避免排放量（Avoided Emissions）已量測，符合環保署 NDC 揭露要求；清冊表已揭露其他類別缺口',
    badge: 'COMPLIANT',
    badgeColor: 'text-emerald-400 border-emerald-500/50',
    bg: 'border-emerald-500/15 bg-emerald-500/5',
  },
  {
    label: 'EU SUP Directive 相容性',
    sub: 'EU Single-Use Plastics Directive 2019/904',
    checked: true,
    note: '循環容器取代一次性塑料餐具，符合 Article 4 使用限制豁免，具出口市場準入條件',
    badge: 'COMPLIANT',
    badgeColor: 'text-emerald-400 border-emerald-500/50',
    bg: 'border-emerald-500/15 bg-emerald-500/5',
  },
  {
    label: 'ESG 評級機構方法論對齊',
    sub: 'MSCI ESG / S&P Global CSA Methodology',
    checked: false,
    note: '需補充第三方確信報告（SHA-256 稽核碼已建立，可供外部查驗）',
    badge: 'PENDING',
    badgeColor: 'text-amber-400 border-amber-500/50',
    bg: 'border-amber-500/15 bg-amber-500/5',
  },
  {
    label: '法律合規治理架構',
    sub: 'ISO 14064-1 GHG Governance Framework',
    checked: true,
    note: 'GHG 清冊依 ISO 14064-1 架構編製，揭露邊界、基線設定及缺口範圍均已記錄',
    badge: 'COMPLIANT',
    badgeColor: 'text-emerald-400 border-emerald-500/50',
    bg: 'border-emerald-500/15 bg-emerald-500/5',
  },
]

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ScenarioTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: number }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="bg-slate-800 border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">第 {label} 次循環</p>
      <p className={`font-semibold ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {val >= 0 ? '+' : ''}{val.toFixed(3)} tCO₂e
      </p>
      <p className="text-slate-500 mt-0.5">{val >= 0 ? '已回收製造碳成本' : '尚需回收碳成本'}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ESGBIDashboardPage() {
  const [batchSize, setBatchSize] = useState(200)
  const [returnPointDensity, setReturnPointDensity] = useState(5)
  const [durability, setDurability] = useState(12)
  const [hoveredFlow, setHoveredFlow] = useState<string | null>(null)
  const [stats, setStats] = useState<ContainerStats | null>(null)

  useEffect(() => {
    api.getContainerStats('month').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const savingsPerCycle = Math.max(0.001, 0.15 - 0.01 - (0.1 / returnPointDensity))
  const paybackCycle = Math.ceil(0.8 / savingsPerCycle)

  const scenarioData = useMemo(() => {
    return Array.from({ length: Math.max(durability, paybackCycle) + 2 }, (_, i) => ({
      cycle: i,
      balance: parseFloat(((i * savingsPerCycle - 0.8) * batchSize / 1000).toFixed(4)),
    }))
  }, [batchSize, savingsPerCycle, durability, paybackCycle])

  const circularity = stats ? (stats.returnRate * 100).toFixed(1) : '87.3'
  const co2eSaved = stats?.co2eSaved?.toFixed(1) ?? '234.5'

  return (
    <div className="min-h-screen bg-[#0F172A] text-white font-sans">
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto space-y-5">

        {/* ── Section label ── */}
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            企業碳管理儀表板 · Corporate Carbon Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            依 GHG Protocol Corporate Standard / ISO 14064-1 編製　·　資料週期：本月
          </p>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* KPI 1 */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500 to-teal-400" />
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">CO₂e 減量 · Scope 3 Cat.1 Avoided</p>
            <p className="text-4xl font-bold text-emerald-400 tabular-nums">
              {co2eSaved}
              <span className="text-base font-normal text-slate-500 ml-1.5">kg</span>
            </p>
            <div className="mt-3 pt-3 border-t border-white/6 flex justify-between text-xs">
              <span className="text-slate-500">vs 基線（一次性包材）</span>
              <span className="text-emerald-400/80">
                ≈ NT${(parseFloat(co2eSaved) * 0.3).toFixed(0)} 碳資產估值
              </span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-5 relative overflow-hidden hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500 to-cyan-400" />
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">系統循環率 · Circularity Rate</p>
            <p className="text-4xl font-bold text-blue-400 tabular-nums">
              {circularity}
              <span className="text-base font-normal text-slate-500 ml-0.5">%</span>
            </p>
            <div className="mt-3 pt-3 border-t border-white/6 flex justify-between text-xs">
              <span className="text-slate-500">容器回收 / 出貨比例</span>
              <span className={parseFloat(circularity) >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                {parseFloat(circularity) >= 90 ? '✓ 達 90% 標準' : '⚠ 低於 90% 閾值'}
              </span>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-5 relative overflow-hidden hover:border-violet-500/30 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-violet-500 to-purple-400" />
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">平均循環次數 · Avg Reuse Cycles</p>
            <p className="text-4xl font-bold text-violet-400 tabular-nums">
              {durability}
              <span className="text-base font-normal text-slate-500 ml-1.5">×</span>
            </p>
            <div className="mt-3 pt-3 border-t border-white/6 flex justify-between text-xs">
              <span className="text-slate-500">設計耐用壽命（情境模擬值）</span>
              <span className="text-violet-400/80">LCA 邊界：Cradle-to-Gate</span>
            </div>
          </div>
        </div>

        {/* ── Sankey + Compliance ── */}
        <div className="grid grid-cols-5 gap-4">

          {/* Sankey */}
          <div className="col-span-3 bg-white/4 border border-white/8 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold">GHG Protocol 價值流圖</p>
                <p className="text-xs text-slate-500 mt-0.5">Value Flow Analysis · 滑鼠懸停查看 LCA 方法論</p>
              </div>
              <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs rounded-md">
                ISO 14064-1
              </span>
            </div>

            <div className="relative">
              <svg viewBox="0 0 600 300" className="w-full">
                {/* Source nodes */}
                {SOURCE_NODES.map((n, i) => (
                  <g key={i}>
                    <rect x={0} y={n.y} width={130} height={n.h} rx={5}
                      fill={n.color} fillOpacity={0.12}
                      stroke={n.color} strokeOpacity={0.4} strokeWidth={1} />
                    {n.h > 28 && (
                      <>
                        <text x={65} y={n.y + n.h / 2 - 7} textAnchor="middle"
                          fill={n.color} fontSize={10.5} fontWeight="600">{n.label}</text>
                        <text x={65} y={n.y + n.h / 2 + 9} textAnchor="middle"
                          fill={n.color} fillOpacity={0.65} fontSize={8.5}>{n.sub}</text>
                      </>
                    )}
                    {n.h <= 28 && (
                      <text x={65} y={n.y + n.h / 2 + 4} textAnchor="middle"
                        fill={n.color} fontSize={9.5} fontWeight="600">{n.label}</text>
                    )}
                  </g>
                ))}

                {/* Target nodes */}
                {TARGET_NODES.map((n, i) => (
                  <g key={i}>
                    <rect x={470} y={n.y} width={130} height={n.h} rx={5}
                      fill={n.color} fillOpacity={0.12}
                      stroke={n.color} strokeOpacity={0.4} strokeWidth={1} />
                    {n.h > 28 && (
                      <>
                        <text x={535} y={n.y + n.h / 2 - 7} textAnchor="middle"
                          fill={n.color} fontSize={10.5} fontWeight="600">{n.label}</text>
                        <text x={535} y={n.y + n.h / 2 + 9} textAnchor="middle"
                          fill={n.color} fillOpacity={0.65} fontSize={8.5}>{n.sub}</text>
                      </>
                    )}
                    {n.h <= 28 && (
                      <text x={535} y={n.y + n.h / 2 + 4} textAnchor="middle"
                        fill={n.color} fontSize={9.5} fontWeight="600">{n.label}</text>
                    )}
                  </g>
                ))}

                {/* Flows */}
                {SANKEY_FLOWS.map(flow => (
                  <path
                    key={flow.id}
                    d={flow.path}
                    fill={hoveredFlow === flow.id
                      ? flow.fill.replace(/[\d.]+\)$/, '0.55)')
                      : flow.fill}
                    stroke={flow.stroke}
                    strokeWidth={hoveredFlow === flow.id ? 1.5 : 0.8}
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onMouseEnter={() => setHoveredFlow(flow.id)}
                    onMouseLeave={() => setHoveredFlow(null)}
                  />
                ))}
              </svg>

              {/* Hover tooltip */}
              <div className={`mt-2 rounded-lg p-3 border border-white/8 bg-slate-800/80 transition-opacity duration-150 min-h-[52px] ${hoveredFlow ? 'opacity-100' : 'opacity-0'}`}>
                {hoveredFlow && (() => {
                  const flow = SANKEY_FLOWS.find(f => f.id === hoveredFlow)
                  return flow ? (
                    <>
                      <p className="text-xs font-semibold text-white mb-1">{flow.label}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{flow.desc}</p>
                    </>
                  ) : null
                })()}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-5 mt-2 pt-2 border-t border-white/6">
              {[
                { color: 'bg-amber-500/35 border-amber-500/50', label: '排放輸入' },
                { color: 'bg-emerald-500/35 border-emerald-500/50', label: '節省效益' },
                { color: 'bg-blue-500/35 border-blue-500/50', label: '碳匯效益' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm border ${l.color}`} />
                  <span className="text-xs text-slate-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Tracker */}
          <div className="col-span-2 bg-white/4 border border-white/8 rounded-xl p-5 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold">法規合規追蹤器</p>
                <p className="text-xs text-slate-500 mt-0.5">Regulatory &amp; Risk Tracker</p>
              </div>
            </div>

            <div className="space-y-2.5 flex-1">
              {COMPLIANCE_ITEMS.map((item, i) => (
                <div key={i} className={`rounded-lg p-3 border ${item.bg} transition-colors`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className={`mt-0.5 flex-shrink-0 text-base leading-none ${item.checked ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {item.checked ? '☑' : '☐'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white leading-snug">{item.label}</p>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">{item.sub}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded border ${item.badgeColor} font-mono`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed pl-6">{item.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/6">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500">整體合規評分</span>
                <span className="text-emerald-400 font-semibold">3 / 4 項達標</span>
              </div>
              <div className="w-full bg-white/8 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: '75%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Scenario Builder ── */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-sm font-semibold">情境分析模擬器</p>
              <p className="text-xs text-slate-500 mt-0.5">Scenario Builder · Carbon Payback Period Analysis</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">碳回收週期</p>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">
                {paybackCycle > 50 ? '∞' : paybackCycle}
                <span className="text-sm font-normal text-slate-500 ml-1">循環後轉正</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-6">

            {/* Sliders + assumptions */}
            <div className="col-span-2 space-y-5">
              {/* Slider 1 */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">批次大小 · Batch Size</span>
                  <span className="text-white font-mono font-semibold">{batchSize} 個</span>
                </div>
                <input type="range" min={50} max={500} step={50} value={batchSize}
                  onChange={e => setBatchSize(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                <div className="flex justify-between text-xs text-slate-700 mt-0.5">
                  <span>50</span><span>500</span>
                </div>
              </div>

              {/* Slider 2 */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">回收點密度 · Return Point Density</span>
                  <span className="text-white font-mono font-semibold">{returnPointDensity} 點/km²</span>
                </div>
                <input type="range" min={1} max={20} step={1} value={returnPointDensity}
                  onChange={e => setReturnPointDensity(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500" />
                <div className="flex justify-between text-xs text-slate-700 mt-0.5">
                  <span>1</span><span>20</span>
                </div>
              </div>

              {/* Slider 3 */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">材質耐用度 · Material Durability</span>
                  <span className="text-white font-mono font-semibold">{durability} 次循環</span>
                </div>
                <input type="range" min={5} max={30} step={1} value={durability}
                  onChange={e => setDurability(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-500" />
                <div className="flex justify-between text-xs text-slate-700 mt-0.5">
                  <span>5</span><span>30</span>
                </div>
              </div>

              {/* LCA assumptions */}
              <div className="bg-slate-800/60 border border-white/6 rounded-lg p-3 text-xs space-y-1.5">
                <p className="text-slate-300 font-semibold mb-2">LCA 方法論假設</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">製造排放</span>
                  <span className="text-slate-400 font-mono">0.8 kg CO₂e / 容器</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">一次性基線</span>
                  <span className="text-slate-400 font-mono">0.15 kg CO₂e / 次</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">清洗排放</span>
                  <span className="text-slate-400 font-mono">0.01 kg CO₂e / 次</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">運輸排放</span>
                  <span className="text-slate-400 font-mono">{(0.1 / returnPointDensity).toFixed(3)} kg CO₂e / 次</span>
                </div>
                <div className="flex justify-between border-t border-white/6 pt-1.5 mt-1.5">
                  <span className="text-emerald-400">每次淨節省</span>
                  <span className="text-emerald-400 font-mono font-semibold">{savingsPerCycle.toFixed(3)} kg CO₂e</span>
                </div>
              </div>
            </div>

            {/* Area Chart */}
            <div className="col-span-3 flex flex-col">
              <p className="text-xs text-slate-500 mb-2">
                累積碳平衡（tCO₂e）· 正值代表系統碳效益淨正
              </p>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scenarioData} margin={{ top: 5, right: 10, bottom: 15, left: 0 }}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="cycle"
                      stroke="#334155"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      label={{ value: '循環次數', position: 'insideBottomRight', fill: '#475569', fontSize: 10, offset: -5 }}
                    />
                    <YAxis stroke="#334155" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<ScenarioTooltip />} />
                    <ReferenceLine
                      y={0}
                      stroke="#F59E0B"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{ value: '損益兩平', position: 'insideTopLeft', fill: '#F59E0B', fontSize: 10 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#balGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-xs text-slate-700 pb-2">
          <span>依據 GHG Protocol Corporate Standard &amp; ISO 14064-1 編製</span>
          <span>循環午餐管理平台 · ESG Intelligence v1.0</span>
        </div>

      </div>
    </div>
  )
}
