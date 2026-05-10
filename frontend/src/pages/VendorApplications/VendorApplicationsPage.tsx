import { useEffect, useState, useMemo } from 'react'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'
import type { VendorApplicationRecord } from '../../types'

const MOCK_DATA: VendorApplicationRecord[] = [
  {
    id: 'app-001',
    companyName: '台灣循環餐盒股份有限公司',
    contactEmail: 'contact@circular-box.com.tw',
    contactPhone: '02-2345-6789',
    businessId: '12345678',
    certifications: ['iso14064', 'iso22000', 'epa'],
    containerTypes: ['reusable_bento', 'reusable_bowl', 'stainless'],
    carbonFactorPerCycle: 0.08,
    description: '專注於企業午餐循環容器服務，服務大台北地區，每日可配送 5000 份以上。擁有完整 RFID 追蹤系統，回收率超過 95%。',
    materialFileNames: ['ISO14064證書.pdf', '公司簡介.pdf', '產品型錄.jpg'],
    status: 'pending',
    submittedAt: '2026-05-08T09:23:00Z',
  },
  {
    id: 'app-002',
    companyName: '綠食科技有限公司',
    contactEmail: 'green@greenfood.tw',
    contactPhone: '04-7890-1234',
    businessId: '87654321',
    certifications: ['fsc', 'sgs'],
    containerTypes: ['eco_tray', 'reusable_cup', 'custom'],
    carbonFactorPerCycle: 0.11,
    description: '中部地區最大循環餐具供應商，提供客製化容器設計服務，支援企業品牌印刷。',
    materialFileNames: ['FSC認證.pdf', '樣品照片.jpg'],
    status: 'pending',
    submittedAt: '2026-05-07T14:05:00Z',
  },
  {
    id: 'app-003',
    companyName: '環淨容器工業股份有限公司',
    contactEmail: 'info@hj-container.com',
    contactPhone: '07-5678-9012',
    businessId: '11223344',
    certifications: ['iso14064', 'tüv', 'sgs', 'iso22000'],
    containerTypes: ['reusable_bento', 'stainless', 'reusable_bowl'],
    carbonFactorPerCycle: 0.06,
    description: '南部製造商，自有工廠生產不鏽鋼循環容器，碳足跡最低，通過多項國際認證。',
    materialFileNames: ['TÜV認證書.pdf', '工廠實景.jpg', '碳盤查報告.pdf'],
    status: 'approved',
    submittedAt: '2026-05-01T10:00:00Z',
    reviewedAt: '2026-05-03T11:30:00Z',
    reviewNote: '認證齊全，碳係數優異，優先合作',
  },
  {
    id: 'app-004',
    companyName: '快樂飲食包材行',
    contactEmail: 'happy@packing.tw',
    contactPhone: '02-9999-0000',
    businessId: '99887766',
    certifications: [],
    containerTypes: ['eco_tray'],
    carbonFactorPerCycle: 0.35,
    description: '提供各式環保包材，可配合循環模式。',
    materialFileNames: [],
    status: 'rejected',
    submittedAt: '2026-05-05T08:00:00Z',
    reviewedAt: '2026-05-06T09:15:00Z',
    reviewNote: '無環保認證，碳係數過高，不符合平台標準',
  },
]

const CERT_LABELS: Record<string, string> = {
  iso14064: 'ISO 14064',
  iso22000: 'ISO 22000',
  fsc: 'FSC',
  sgs: 'SGS',
  tüv: 'TÜV',
  epa: '環保署低碳',
}

const CONTAINER_LABELS: Record<string, string> = {
  reusable_bento: '循環便當盒',
  reusable_bowl: '循環碗',
  reusable_cup: '循環杯',
  eco_tray: '環保托盤',
  stainless: '不鏽鋼容器',
  custom: '客製容器',
}

const STATUS_CONFIG = {
  pending:  { label: '待審核', bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  approved: { label: '已核准', bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  rejected: { label: '已拒絕', bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-400'   },
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function VendorApplicationsPage() {
  const [applications, setApplications] = useState<VendorApplicationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [certFilter, setCertFilter] = useState<string>('all')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    api.getVendorApplications()
      .then(r => setApplications(r.data))
      .catch(() => setApplications(MOCK_DATA))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => ({
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }), [applications])

  const filtered = useMemo(() => {
    return applications.filter(app => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false
      if (certFilter !== 'all' && !app.certifications.includes(certFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!app.companyName.toLowerCase().includes(q) &&
            !app.contactEmail.toLowerCase().includes(q) &&
            !app.businessId.includes(q)) return false
      }
      return true
    })
  }, [applications, statusFilter, certFilter, search])

  async function handleDelete(id: string, companyName: string) {
    if (!window.confirm(`確定要刪除「${companyName}」的申請紀錄嗎？此動作無法復原。`)) return
    setDeletingId(id)
    try {
      await api.deleteVendorApplication(id)
    } catch { /* optimistic */ }
    setApplications(prev => prev.filter(a => a.id !== id))
    setDeletingId(null)
    setExpandedId(null)
  }

  async function handleReview(id: string, action: 'approve' | 'reject') {
    setReviewingId(id)
    const note = noteMap[id] || ''
    try {
      await api.reviewVendorApplication(id, action, note)
    } catch { /* optimistic */ }
    setApplications(prev => prev.map(a =>
      a.id === id
        ? { ...a, status: action === 'approve' ? 'approved' : 'rejected', reviewedAt: new Date().toISOString(), reviewNote: note }
        : a
    ))
    setReviewingId(null)
    setExpandedId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">廠商申請審核</h1>
            <p className="text-sm text-gray-500 mt-0.5">審核廠商加入循環午餐平台的申請</p>
          </div>
          <div className="flex gap-3">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(s => {
              const cfg = s === 'all'
                ? { label: '全部', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
                : STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                    statusFilter === s
                      ? 'border-green-500 ' + cfg.bg + ' ' + cfg.text
                      : 'border-transparent ' + cfg.bg + ' ' + cfg.text + ' opacity-60'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                  <span className="ml-0.5 font-bold">{counts[s]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋公司名稱、Email、統編..."
              className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">篩選認證</span>
            <select
              value={certFilter}
              onChange={e => setCertFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="all">所有認證</option>
              {Object.entries(CERT_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          {(search || statusFilter !== 'all' || certFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setCertFilter('all') }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕ 清除篩選
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">共 {filtered.length} 筆</span>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>沒有符合條件的申請</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(app => {
              const cfg = STATUS_CONFIG[app.status]
              const isExpanded = expandedId === app.id
              const isPending = app.status === 'pending'
              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden border border-transparent hover:border-green-100 transition-all"
                >
                  {/* Card Header */}
                  <div
                    className="p-5 cursor-pointer select-none"
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0">
                          🏭
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-800 truncate">{app.companyName}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                            <span>統編 {app.businessId}</span>
                            <span>{app.contactEmail}</span>
                            <span>{app.contactPhone}</span>
                            <span>碳係數 {app.carbonFactorPerCycle} kg CO₂e</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {app.certifications.map(c => (
                              <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{CERT_LABELS[c] ?? c}</span>
                            ))}
                            {app.certifications.length === 0 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-xs">無認證</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {new Date(app.submittedAt).toLocaleDateString('zh-TW')}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(app.id, app.companyName) }}
                          disabled={deletingId === app.id}
                          title="刪除此申請"
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          {deletingId === app.id ? (
                            <span className="text-xs text-gray-400">刪除中</span>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          )}
                        </button>
                        <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 px-5 pb-5 pt-4 space-y-4">
                      {/* Container Types */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">容器類型</p>
                        <div className="flex flex-wrap gap-1">
                          {app.containerTypes.map(c => (
                            <span key={c} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">{CONTAINER_LABELS[c] ?? c}</span>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      {app.description && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1.5">公司簡介</p>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">{app.description}</p>
                        </div>
                      )}

                      {/* Files */}
                      {app.materialFileNames.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1.5">附件資料</p>
                          <div className="flex flex-wrap gap-2">
                            {app.materialFileNames.map(f => (
                              <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-600 border">
                                📄 {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Previous review note */}
                      {app.reviewNote && (
                        <div className={`rounded-lg px-4 py-3 text-sm ${app.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          <span className="font-medium">審核備註：</span>{app.reviewNote}
                        </div>
                      )}

                      {/* Review Actions */}
                      {isPending && (
                        <div className="pt-1 border-t border-gray-50 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">審核備註（選填）</label>
                            <input
                              type="text"
                              value={noteMap[app.id] ?? ''}
                              onChange={e => setNoteMap(p => ({ ...p, [app.id]: e.target.value }))}
                              placeholder="輸入核准或拒絕的原因..."
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReview(app.id, 'approve')}
                              disabled={reviewingId === app.id}
                              className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {reviewingId === app.id ? '處理中...' : '✓ 核准'}
                            </button>
                            <button
                              onClick={() => handleReview(app.id, 'reject')}
                              disabled={reviewingId === app.id}
                              className="flex-1 border border-red-300 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              {reviewingId === app.id ? '處理中...' : '✕ 拒絕'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
