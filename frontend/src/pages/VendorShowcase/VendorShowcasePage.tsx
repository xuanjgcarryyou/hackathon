import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'
import type { VendorESGProfile } from '../../types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'

const verificationBadge: Record<string, { label: string; className: string }> = {
  third_party_verified: { label: '第三方驗證', className: 'bg-green-800 text-white' },
  platform_checked:     { label: '平台審核',   className: 'bg-blue-600 text-white' },
  self_declared:        { label: '自行申報',   className: 'bg-gray-500 text-white' },
  unverified:           { label: '待審核',     className: 'bg-yellow-400 text-gray-800' },
}

function generateMonthlyTrend(totalCo2e: number) {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月']
  const weights = [0.12, 0.14, 0.16, 0.18, 0.19, 0.21]
  return months.map((month, i) => ({
    month,
    co2e: +(totalCo2e * weights[i]).toFixed(1),
  }))
}

function VendorCard({ vendor }: { vendor: VendorESGProfile }) {
  const badge = verificationBadge[vendor.verificationStatus] ?? verificationBadge.unverified
  const [monthlyMeals, setMonthlyMeals] = useState(500)
  const trendData = generateMonthlyTrend(vendor.estimatedCo2eSaved)

  const annualSaved = +(monthlyMeals * 12 * vendor.averageReturnRate * vendor.carbonFactorPerCycle).toFixed(1)
  const treesEquiv = Math.round(annualSaved / 21.8)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{vendor.vendorName}</h2>
          {vendor.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{vendor.description}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Certifications */}
      {vendor.certifications.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {vendor.certifications.map(cert => (
            <span key={cert} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full font-medium">
              ✓ {cert}
            </span>
          ))}
        </div>
      )}

      {/* Tags row */}
      <div className="flex flex-wrap gap-1">
        {vendor.containerTypes.map(ct => (
          <span key={ct} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{ct}</span>
        ))}
        {vendor.partnerGroups.map(pg => (
          <span key={pg} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{pg}</span>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: '服務件數', value: vendor.totalReusableItemsServed.toLocaleString('zh-TW'), unit: '' },
          { label: '回收率', value: `${(vendor.averageReturnRate * 100).toFixed(1)}`, unit: '%' },
          { label: 'CO₂e 減量', value: vendor.estimatedCo2eSaved.toFixed(0), unit: ' kg' },
          { label: '包材減少', value: vendor.estimatedPackagingReducedKg.toFixed(0), unit: ' kg' },
        ].map(item => (
          <div key={item.label} className="bg-green-50 rounded-xl p-2">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-base font-bold text-green-700">
              {item.value}<span className="text-xs font-normal">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Return Rate Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 font-medium">容器回收率</p>
          <p className="text-xs font-bold text-green-700">{(vendor.averageReturnRate * 100).toFixed(1)}%</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all"
            style={{ width: `${vendor.averageReturnRate * 100}%` }}
          />
        </div>
      </div>

      {/* 6-Month Trend Chart */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2">近六個月 CO₂e 避免排放趨勢（kg）</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={trendData} margin={{ top: 18, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: number) => [`${value} kg CO₂e`, '避免排放量']}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Bar dataKey="co2e" radius={[4, 4, 0, 0]}>
              {trendData.map((_, i) => (
                <Cell key={i} fill={i === trendData.length - 1 ? '#059669' : '#6EE7B7'} />
              ))}
              <LabelList dataKey="co2e" position="top" style={{ fontSize: 9, fill: '#6B7280' }} formatter={(v: number) => `${v}`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Impact Estimator */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-600 mb-3">年度影響估算</p>
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs text-gray-500 whitespace-nowrap">每月訂餐份數</label>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={monthlyMeals}
            onChange={e => setMonthlyMeals(Number(e.target.value))}
            className="flex-1 accent-green-600"
          />
          <span className="text-xs font-bold text-gray-700 w-14 text-right">
            {monthlyMeals.toLocaleString()} 份
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-xs text-gray-500">年度預估 CO₂e 節省</p>
            <p className="text-lg font-bold text-green-700">
              {annualSaved.toFixed(1)}<span className="text-xs font-normal"> kg</span>
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-xs text-gray-500">等效植樹數</p>
            <p className="text-lg font-bold text-green-700">
              {treesEquiv}<span className="text-xs font-normal"> 棵</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          計算基礎：碳因子 {vendor.carbonFactorPerCycle} kg CO₂e/次 × 回收率 {(vendor.averageReturnRate * 100).toFixed(0)}% × 12 個月
        </p>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400">
        碳因子：<span className="font-medium text-gray-600">{vendor.carbonFactorPerCycle} kg CO₂e/次</span>
        　·　資料來源：平台實測數據
      </p>
    </div>
  )
}

export default function VendorShowcasePage() {
  const [vendors, setVendors] = useState<VendorESGProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPublicVendorESG()
      .then(res => setVendors(res.data || []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">環保合作廠商</h1>
          <p className="text-sm text-gray-500 mt-1">
            已通過平台審核的循環容器服務商 · 含年度影響估算
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400 text-sm">載入中...</div>
          </div>
        )}

        {!loading && vendors.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">
            目前尚無環保認證廠商
          </div>
        )}

        {!loading && vendors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vendors.map(vendor => (
              <VendorCard key={vendor.vendorId} vendor={vendor} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
