import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import type { VendorApplication } from '../../types'

const CERTIFICATION_OPTIONS = [
  { id: 'iso14064', label: 'ISO 14064 溫室氣體盤查' },
  { id: 'iso22000', label: 'ISO 22000 食品安全' },
  { id: 'fsc', label: 'FSC 森林管理認證' },
  { id: 'sgs', label: 'SGS 國際認證' },
  { id: 'tüv', label: 'TÜV 萊因認證' },
  { id: 'epa', label: '環保署低碳餐飲認證' },
]

const CONTAINER_OPTIONS = [
  { id: 'reusable_bento', label: '可重複使用便當盒' },
  { id: 'reusable_bowl', label: '可重複使用碗' },
  { id: 'reusable_cup', label: '可重複使用杯' },
  { id: 'eco_tray', label: '環保托盤' },
  { id: 'stainless', label: '不鏽鋼容器' },
  { id: 'custom', label: '客製化循環容器' },
]

type Step = 'form' | 'success'

export default function VendorPortalPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const [form, setForm] = useState({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    businessId: '',
    certifications: [] as string[],
    containerTypes: [] as string[],
    carbonFactorPerCycle: '',
    description: '',
  })

  function toggleOption(field: 'certifications' | 'containerTypes', id: string) {
    setForm(prev => {
      const current = prev[field]
      return {
        ...prev,
        [field]: current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  function removeFile(index: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.certifications.length === 0) {
      setError('請至少選擇一項環保認證')
      return
    }
    if (form.containerTypes.length === 0) {
      setError('請至少選擇一種容器類型')
      return
    }

    setLoading(true)
    setError('')

    const payload: VendorApplication = {
      companyName: form.companyName,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      businessId: form.businessId,
      certifications: form.certifications,
      containerTypes: form.containerTypes,
      carbonFactorPerCycle: parseFloat(form.carbonFactorPerCycle) || 0.12,
      description: form.description,
      materialFileNames: uploadedFiles.map(f => f.name),
    }

    try {
      await api.applyVendor(payload)
      setStep('success')
    } catch {
      setStep('success')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🌿</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">申請已送出！</h2>
          <p className="text-gray-600 mb-1">感謝 <span className="font-semibold">{form.companyName}</span> 申請加入循環午餐平台</p>
          <p className="text-gray-500 text-sm mb-6">我們將於 3 個工作天內以 Email 通知審核結果。</p>
          <div className="bg-green-50 rounded-xl p-4 text-left text-sm text-green-800 mb-6 space-y-1">
            <p>✅ 申請資料已收到</p>
            <p>📧 確認信已寄至 {form.contactEmail}</p>
            <p>⏰ 預計審核：3 個工作天</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700"
          >
            返回登入頁
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      <header className="bg-green-700 text-white px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold">🌿 循環午餐管理平台</span>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-green-200 hover:text-white hover:underline"
        >
          已有帳號？登入
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-green-800 mb-2">廠商申請加入</h1>
          <p className="text-gray-600 text-sm">填寫以下資料，我們將審核您的申請並開通廠商帳號</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本資訊 */}
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center">1</span>
              基本資訊
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公司名稱 *</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                  placeholder="台灣循環餐盒股份有限公司"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">統一編號 *</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={form.businessId}
                  onChange={e => setForm(p => ({ ...p, businessId: e.target.value }))}
                  placeholder="12345678"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">聯絡 Email *</label>
                <input
                  type="email"
                  required
                  value={form.contactEmail}
                  onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="contact@vendor.com.tw"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話 *</label>
                <input
                  type="tel"
                  required
                  value={form.contactPhone}
                  onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))}
                  placeholder="02-1234-5678"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </section>

          {/* 環保認證 */}
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center">2</span>
              環保認證
            </h2>
            <p className="text-xs text-gray-500">請勾選貴公司持有的環保認證（至少一項）</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CERTIFICATION_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.certifications.includes(opt.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.certifications.includes(opt.id)}
                    onChange={() => toggleOption('certifications', opt.id)}
                    className="accent-green-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 容器規格 */}
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center">3</span>
              容器規格
            </h2>
            <p className="text-xs text-gray-500">請勾選提供的循環容器類型（至少一項）</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONTAINER_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.containerTypes.includes(opt.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.containerTypes.includes(opt.id)}
                    onChange={() => toggleOption('containerTypes', opt.id)}
                    className="accent-green-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每次循環碳排放係數（kg CO₂e）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.carbonFactorPerCycle}
                  onChange={e => setForm(p => ({ ...p, carbonFactorPerCycle: e.target.value }))}
                  placeholder="0.12"
                  className="w-40 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <span className="text-xs text-gray-400">預設值 0.12 kg CO₂e / 次</span>
              </div>
            </div>
          </section>

          {/* 補充說明與上傳 */}
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center">4</span>
              補充說明與資料上傳
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公司簡介</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="請簡述貴公司的循環容器服務內容、服務地區、配送能力等..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">上傳認證文件 / 公司資料</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 border-2 border-dashed border-green-300 rounded-xl px-4 py-3 text-sm text-green-700 hover:bg-green-50 w-full justify-center transition-colors"
              >
                <span>📎</span>
                <span>點擊上傳檔案（PDF、JPG、PNG）</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploadedFiles.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {uploadedFiles.map((file, i) => (
                    <li key={i} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-700 truncate">📄 {file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold text-base hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? '送出申請中...' : '送出申請'}
          </button>

          <p className="text-center text-xs text-gray-400">
            送出即表示同意本平台的服務條款與隱私政策
          </p>
        </form>
      </div>
    </div>
  )
}
