import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { api } from '../../api/client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface StageNode {
  stage: string
  label: string
  kgCO2e: number
  pct: number
  note?: string
}

interface CompareResult {
  singleUsePerItemKgCO2e: number
  reusablePerCycleKgCO2e: number
  savedPerItemKgCO2e: number
  estimatedSavedKgCO2e: number
  quantity: number
  returnRate: number
  successfulReuseCount: number
  confidenceLevel: string
  isDemoEstimate: boolean
  singleUseNodes: StageNode[]
  reusableNodes: StageNode[]
  assumptions: string[]
}

// ── Demo fallback (if backend is offline) ────────────────────────────────────
const DEMO: Record<string, { singleUse: StageNode[]; reusable: StageNode[] }> = {
  lunch_box: {
    singleUse: [
      { stage: 'raw_material', label: '原料取得', kgCO2e: 0.09, pct: 30.0, note: 'PP 塑料原料，Ecoinvent 3.9' },
      { stage: 'manufacturing', label: '製造加工', kgCO2e: 0.07, pct: 23.3, note: '台灣環保署 LCA 2022' },
      { stage: 'transport', label: '運輸配送', kgCO2e: 0.04, pct: 13.3, note: 'GHG Protocol Transport Tool v2' },
      { stage: 'disposal', label: '廢棄處理', kgCO2e: 0.10, pct: 33.3, note: 'IPCC AR6 焚化係數' },
    ],
    reusable: [
      { stage: 'production', label: '製造攤提', kgCO2e: 0.030, pct: 26.1, note: '不鏽鋼 3.0 kg / 100 次壽命攤提' },
      { stage: 'outbound_transport', label: '正向配送', kgCO2e: 0.015, pct: 13.0, note: '廚房至公司' },
      { stage: 'washing', label: '清洗消毒', kgCO2e: 0.025, pct: 21.7, note: '台灣電力係數 0.495 kWh/kg CO₂e' },
      { stage: 'reverse_logistics', label: '逆物流', kgCO2e: 0.025, pct: 21.7, note: '回收點至清洗廠' },
      { stage: 'damage_loss', label: '損耗攤提', kgCO2e: 0.020, pct: 17.4, note: '損耗率 2%' },
    ],
  },
  drink_cup: {
    singleUse: [
      { stage: 'raw_material', label: '原料取得', kgCO2e: 0.06, pct: 30.0 },
      { stage: 'manufacturing', label: '製造加工', kgCO2e: 0.04, pct: 20.0 },
      { stage: 'transport', label: '運輸配送', kgCO2e: 0.02, pct: 10.0 },
      { stage: 'disposal', label: '廢棄處理', kgCO2e: 0.08, pct: 40.0 },
    ],
    reusable: [
      { stage: 'production', label: '製造攤提', kgCO2e: 0.020, pct: 26.7 },
      { stage: 'outbound_transport', label: '正向配送', kgCO2e: 0.010, pct: 13.3 },
      { stage: 'washing', label: '清洗消毒', kgCO2e: 0.020, pct: 26.7 },
      { stage: 'reverse_logistics', label: '逆物流', kgCO2e: 0.015, pct: 20.0 },
      { stage: 'damage_loss', label: '損耗攤提', kgCO2e: 0.010, pct: 13.3 },
    ],
  },
  delivery_bag: {
    singleUse: [
      { stage: 'raw_material', label: '原料取得', kgCO2e: 0.05, pct: 31.3 },
      { stage: 'manufacturing', label: '製造加工', kgCO2e: 0.03, pct: 18.8 },
      { stage: 'transport', label: '運輸配送', kgCO2e: 0.02, pct: 12.5 },
      { stage: 'disposal', label: '廢棄處理', kgCO2e: 0.06, pct: 37.5 },
    ],
    reusable: [
      { stage: 'production', label: '製造攤提', kgCO2e: 0.015, pct: 28.3 },
      { stage: 'outbound_transport', label: '正向配送', kgCO2e: 0.008, pct: 15.1 },
      { stage: 'washing', label: '清洗消毒', kgCO2e: 0.012, pct: 22.6 },
      { stage: 'reverse_logistics', label: '逆物流', kgCO2e: 0.010, pct: 18.9 },
      { stage: 'damage_loss', label: '損耗攤提', kgCO2e: 0.008, pct: 15.1 },
    ],
  },
}

const SU_COLORS = ['#F59E0B', '#F97316', '#FB923C', '#EF4444']
const RU_COLORS = ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0']

const ITEM_OPTIONS = [
  { value: 'lunch_box', label: '午餐盒' },
  { value: 'drink_cup', label: '飲料杯' },
  { value: 'delivery_bag', label: '外送袋' },
]

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function StageTooltip({ active, payload }: { active?: boolean; payload?: { payload: StageNode }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-800 border border-white/10 rounded-lg p-3 text-xs shadow-xl max-w-[200px]">
      <p className="font-semibold text-white mb-1">{d.label}</p>
      <p className="text-slate-300 font-mono">{d.kgCO2e.toFixed(4)} kg CO₂e</p>
      <p className="text-slate-400 mt-0.5">{d.pct}% of total</p>
      {d.note && <p className="text-slate-500 mt-1.5 leading-relaxed">{d.note}</p>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CarbonModelPage() {
  const [itemType, setItemType] = useState('lunch_box')
  const [quantity, setQuantity] = useState(200)
  const [returnRate, setReturnRate] = useState(93)
  const [reusableCycles, setReusableCycles] = useState(100)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [usedDemo, setUsedDemo] = useState(false)

  const suNodes = result?.singleUseNodes ?? DEMO[itemType]?.singleUse ?? []
  const ruNodes = result?.reusableNodes ?? DEMO[itemType]?.reusable ?? []
  const suTotal = suNodes.reduce((s, n) => s + n.kgCO2e, 0)
  const ruTotal = ruNodes.reduce((s, n) => s + n.kgCO2e, 0)
  const savedPerItem = suTotal - ruTotal
  const totalSaved = result?.estimatedSavedKgCO2e ?? savedPerItem * Math.round(quantity * returnRate / 100)

  async function loadTree(type: string) {
    try {
      const r = await api.getCarbonLifecycleTree(type)
      const d = r.data
      const suTotal = (d.singleUse?.nodes ?? []).reduce((s: number, n: StageNode) => s + n.kgCO2e, 0)
      const ruTotal = (d.reusable?.nodes ?? []).reduce((s: number, n: StageNode) => s + n.kgCO2e, 0)
      const savedPer = suTotal - ruTotal
      setResult({
        singleUsePerItemKgCO2e: d.singleUse?.totalKgCO2e ?? suTotal,
        reusablePerCycleKgCO2e: d.reusable?.totalKgCO2e ?? ruTotal,
        savedPerItemKgCO2e: d.savedKgCO2e ?? savedPer,
        estimatedSavedKgCO2e: savedPer * Math.round(quantity * returnRate / 100),
        quantity,
        returnRate: returnRate / 100,
        successfulReuseCount: Math.round(quantity * returnRate / 100),
        confidenceLevel: d.confidenceLevel ?? 'low',
        isDemoEstimate: d.isDemoEstimate ?? true,
        singleUseNodes: d.singleUse?.nodes ?? [],
        reusableNodes: d.reusable?.nodes ?? [],
        assumptions: d.assumptions ?? [],
      })
      setUsedDemo(false)
    } catch {
      setUsedDemo(true)
    }
  }

  useEffect(() => { loadTree(itemType) }, [itemType])

  async function handleCompare() {
    setLoading(true)
    try {
      const r = await api.carbonCompare({
        itemType,
        quantity,
        returnRate: returnRate / 100,
        reusableCycles,
      })
      setResult(r.data)
      setUsedDemo(false)
    } catch {
      setUsedDemo(true)
    } finally {
      setLoading(false)
    }
  }

  const assumptions = result?.assumptions ?? [
    '碳係數為 Demo 估算值，正式揭露前應替換為第三方驗證數據。',
    '估算節省量屬 avoided emissions / impact 指標，不直接計入 Scope 1、2、3 清冊總量。',
    '循環容器碳排以預期 100 次壽命攤提生產碳成本計算。',
  ]

  return (
    <div className="min-h-screen bg-[#0F172A] text-white" style={{ fontFamily: "'Inter', 'SF Pro Display', sans-serif" }}>

      {/* Header */}
      <header className="border-b border-white/8 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 text-lg select-none">⬡</span>
          <div>
            <p className="font-semibold text-sm tracking-tight">
              碳生命週期模型探索器 <span className="text-emerald-400">Carbon Lifecycle Model</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">比較一次性包材與循環容器在各生命週期階段的碳排差異</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <Link to="/dashboard" className="hover:text-white transition-colors">概覽</Link>
            <Link to="/esg" className="hover:text-white transition-colors">ESG 報表</Link>
            <Link to="/esg-bi" className="hover:text-white transition-colors">BI 儀表板</Link>
            <Link to="/ai-agent" className="hover:text-white transition-colors">AI 大使</Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs rounded-md">
              Demo Estimate
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-md">
              GHG Protocol
            </span>
            {usedDemo && (
              <span className="px-2 py-0.5 bg-slate-500/15 border border-slate-500/30 text-slate-400 text-xs rounded-md">
                Offline Mode
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-5">

          {/* ── Left: Parameters ── */}
          <div className="col-span-3 space-y-4">
            <div className="bg-white/4 border border-white/8 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">包材類型</p>
              <div className="space-y-2">
                {ITEM_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${itemType === opt.value ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                      {itemType === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <input
                      type="radio"
                      name="itemType"
                      value={opt.value}
                      checked={itemType === opt.value}
                      onChange={e => setItemType(e.target.value)}
                      className="sr-only"
                    />
                    <span className={`text-sm transition-colors ${itemType === opt.value ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white/4 border border-white/8 rounded-xl p-5 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">情境參數</p>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">批次數量</span>
                  <span className="text-white font-mono font-semibold">{quantity} 個</span>
                </div>
                <input type="range" min={50} max={1000} step={50} value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                <div className="flex justify-between text-xs text-slate-700 mt-0.5"><span>50</span><span>1000</span></div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">回收率</span>
                  <span className="text-white font-mono font-semibold">{returnRate}%</span>
                </div>
                <input type="range" min={50} max={100} step={1} value={returnRate}
                  onChange={e => setReturnRate(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500" />
                <div className="flex justify-between text-xs text-slate-700 mt-0.5"><span>50%</span><span>100%</span></div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">預計循環次數</span>
                  <span className="text-white font-mono font-semibold">{reusableCycles} 次</span>
                </div>
                <input type="range" min={20} max={200} step={10} value={reusableCycles}
                  onChange={e => setReusableCycles(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-500" />
                <div className="flex justify-between text-xs text-slate-700 mt-0.5"><span>20</span><span>200</span></div>
              </div>

              <button
                onClick={handleCompare}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? '計算中...' : '計算比較'}
              </button>
            </div>
          </div>

          {/* ── Center: Charts ── */}
          <div className="col-span-6">
            <div className="bg-white/4 border border-white/8 rounded-xl p-5 h-full">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">生命週期碳排比較</p>
                <p className="text-xs text-slate-500">Lifecycle CO₂e Comparison</p>
              </div>
              <p className="text-xs text-slate-600 mb-5">點擊各階段 bar 查看方法論說明</p>

              <div className="grid grid-cols-2 gap-4">
                {/* Single-use chart */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-amber-400">
                      一次性{ITEM_OPTIONS.find(o => o.value === itemType)?.label}
                    </p>
                    <span className="text-xs font-mono text-amber-400/80">{suTotal.toFixed(3)} kg CO₂e</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={suNodes} margin={{ top: 20, right: 8, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} interval={0} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                      <Tooltip content={<StageTooltip />} />
                      <Bar dataKey="kgCO2e" radius={[3, 3, 0, 0]}>
                        {suNodes.map((_, i) => (
                          <Cell key={i} fill={SU_COLORS[i % SU_COLORS.length]} />
                        ))}
                        <LabelList dataKey="pct" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 9, fill: '#94A3B8' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Reusable chart */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-emerald-400">
                      循環{ITEM_OPTIONS.find(o => o.value === itemType)?.label}
                    </p>
                    <span className="text-xs font-mono text-emerald-400/80">{ruTotal.toFixed(3)} kg CO₂e</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ruNodes} margin={{ top: 20, right: 8, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} interval={0} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                      <Tooltip content={<StageTooltip />} />
                      <Bar dataKey="kgCO2e" radius={[3, 3, 0, 0]}>
                        {ruNodes.map((_, i) => (
                          <Cell key={i} fill={RU_COLORS[i % RU_COLORS.length]} />
                        ))}
                        <LabelList dataKey="pct" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 9, fill: '#94A3B8' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Saved callout */}
              <div className="mt-4 pt-4 border-t border-white/6 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-slate-500">一次性基線</p>
                  <p className="text-lg font-bold text-amber-400 font-mono">{suTotal.toFixed(3)}</p>
                  <p className="text-xs text-slate-600">kg CO₂e / 個</p>
                </div>
                <div className="text-slate-600 text-xl">→</div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">每次節省</p>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">{savedPerItem.toFixed(3)}</p>
                  <p className="text-xs text-slate-600">kg CO₂e / 次</p>
                </div>
                <div className="text-slate-600 text-xl">→</div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">循環基線</p>
                  <p className="text-lg font-bold text-emerald-300 font-mono">{ruTotal.toFixed(3)}</p>
                  <p className="text-xs text-slate-600">kg CO₂e / 次</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Summary ── */}
          <div className="col-span-3 space-y-4">
            <div className="bg-white/4 border border-white/8 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">計算結果</p>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">批次估算節省量</p>
                  <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                    {totalSaved.toFixed(2)}
                    <span className="text-sm font-normal text-slate-500 ml-1">kg CO₂e</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {quantity} 個 × {returnRate}% 回收率
                  </p>
                </div>

                <div className="pt-3 border-t border-white/6">
                  <p className="text-xs text-slate-500 mb-0.5">每個節省量</p>
                  <p className="text-xl font-bold text-emerald-300 tabular-nums">
                    {savedPerItem.toFixed(4)}
                    <span className="text-sm font-normal text-slate-500 ml-1">kg CO₂e</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-white/6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">信心等級</p>
                    <span className="px-2 py-0.5 bg-red-500/15 border border-red-500/30 text-red-400 text-xs rounded-md">
                      低 · Low
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-500">資料狀態</p>
                    <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs rounded-md">
                      Demo Estimate
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/4 border border-white/8 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">方法論假設</p>
              <ul className="space-y-2">
                {assumptions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                    <span className="text-slate-600 mt-0.5 flex-shrink-0">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-3 border-t border-white/6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  SDG 對照：<span className="text-slate-500">SDG 12 (負責任消費)、SDG 13 (氣候行動)</span>
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  ESG 欄位：<span className="text-slate-500">E — Scope 3 Cat.11 avoided emissions</span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
