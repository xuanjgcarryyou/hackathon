// shared/types.ts — Frontend & Middleware shared types
// DO NOT modify without team consensus. Add only, never rename.

export interface UserRecord {
  id: string
  companyId: string
  role: 'admin' | 'employee' | 'manager'
  name: string
  email: string
}

export interface Company {
  id: string
  name: string
  employeeCount: number
  esgSettings: { format: 'ghg_scope3' | 'tw_env_ministry' }
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

export interface ContainerBatch {
  id: string
  qrCode: string
  companyId: string
  vendorId: string
  quantity: number
  dispatchedAt: string
  collectedAt?: string
  status: 'dispatched' | 'collected' | 'cleaning' | 'ready'
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

// WebSocket event payloads
export interface WSEvent {
  event: 'container_dispatched' | 'container_collected' | 'anomaly_alert' | 'esg_ready'
  payload: Record<string, unknown>
}
