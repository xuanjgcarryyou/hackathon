import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import { api } from '../../api/client'
import type { VendorESGProfile } from '../../types'

const verificationBadge: Record<string, { label: string; className: string }> = {
  third_party_verified: { label: '第三方驗證', className: 'bg-green-800 text-white' },
  platform_checked:     { label: '平台審核',   className: 'bg-blue-600 text-white' },
  self_declared:        { label: '自行申報',   className: 'bg-gray-500 text-white' },
  unverified:           { label: '待審核',     className: 'bg-yellow-400 text-gray-800' },
}

function formatNumber(n: number) {
  return n.toLocaleString('zh-TW')
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
          <p className="text-sm text-gray-500 mt-1">已通過平台審核的循環容器服務商</p>
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
            {vendors.map(vendor => {
              const badge = verificationBadge[vendor.verificationStatus] ?? verificationBadge.unverified
              return (
                <div key={vendor.vendorId} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-gray-800">{vendor.vendorName}</h2>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Description */}
                  {vendor.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{vendor.description}</p>
                  )}

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

                  {/* Container Types */}
                  {vendor.containerTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vendor.containerTypes.map(ct => (
                        <span key={ct} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {ct}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metrics 2x2 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">累積服務件數</p>
                      <p className="text-xl font-bold text-green-700">{formatNumber(vendor.totalReusableItemsServed)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">平均回收率</p>
                      <p className="text-xl font-bold text-green-700">{(vendor.averageReturnRate * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">CO₂e 減少量</p>
                      <p className="text-xl font-bold text-green-700">{vendor.estimatedCo2eSaved.toFixed(1)}<span className="text-sm font-normal"> kg</span></p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">包材減少</p>
                      <p className="text-xl font-bold text-green-700">{vendor.estimatedPackagingReducedKg.toFixed(1)}<span className="text-sm font-normal"> kg</span></p>
                    </div>
                  </div>

                  {/* Carbon Factor */}
                  <div className="text-xs text-gray-500">
                    碳因子：<span className="font-medium text-gray-700">{vendor.carbonFactorPerCycle} kg CO₂e/次</span>
                  </div>

                  {/* Partner Groups */}
                  {vendor.partnerGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
                      {vendor.partnerGroups.map(pg => (
                        <span key={pg} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {pg}
                        </span>
                      ))}
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
