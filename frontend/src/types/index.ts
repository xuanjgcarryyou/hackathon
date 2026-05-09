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
}
