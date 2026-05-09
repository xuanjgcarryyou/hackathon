export interface UserRecord {
  id: string
  companyId: string
  role: 'admin' | 'employee' | 'manager'
  name: string
  email: string
}

export interface Vendor {
  id: string
  name: string
  certifications: string[]
  carbonFactorPerCycle: number
  containerTypes: string[]
}

export interface Restaurant {
  id: string
  vendorId: string
  name: string
  supportsCircular: boolean
  pricePerMeal: number
}

export interface ContainerStats {
  companyId: string
  period: string
  dispatched: number
  collected: number
  returnRate: number
  co2eSaved: number
  reducedPackagingCount: number
}

export interface ESGTable {
  title: string
  headers: string[]
  rows: string[][]
}

export interface ESGReport {
  reportId: string
  totalMeals: number
  circularMeals: number
  reducedPackagingKg: number
  co2eSaved: number
  reportTextZh: string
  reportTextEn: string
  tables: ESGTable[]
  carbonFactorSource?: string
  dataHash?: string
}

export interface VendorApplication {
  companyName: string
  contactEmail: string
  contactPhone: string
  businessId: string
  certifications: string[]
  containerTypes: string[]
  carbonFactorPerCycle: number
  description: string
  materialFileNames: string[]
}

export interface VendorApplicationRecord extends VendorApplication {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewNote?: string
}

export interface VendorESGProfile {
  vendorId: string
  vendorName: string
  certifications: string[]
  carbonFactorPerCycle: number
  containerTypes: string[]
  description: string
  totalReusableItemsServed: number
  averageReturnRate: number
  estimatedCo2eSaved: number
  estimatedPackagingReducedKg: number
  verificationStatus: 'unverified' | 'self_declared' | 'platform_checked' | 'third_party_verified'
  partnerGroups: string[]
}

export interface ESGCalculationMethod {
  id: string
  methodName: string
  scopeCategory: string
  emissionFactorSource: string
  factorVersion: string
  assumptionNote: string
}
