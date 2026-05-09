import axios from 'axios'
import type { VendorApplication } from '../types'

const BASE_URL = import.meta.env.VITE_MIDDLEWARE_URL || ''

export const apiClient = axios.create({ baseURL: BASE_URL })

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const api = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  getRestaurants: () => apiClient.get('/api/restaurants'),
  getVendors: () => apiClient.get('/api/vendors'),

  createWeeklyOrder: (data: {
    restaurantId: string; vendorId: string; estimatedCount: number; weekStart: string
  }) => apiClient.post('/api/orders/weekly', data),

  dispatchContainers: (data: {
    qrCode: string; companyId: string; vendorId: string; quantity: number
  }) => apiClient.post('/api/containers/dispatch', data),

  collectContainers: (batchId: string, collectedCount: number) =>
    apiClient.post('/api/containers/collect', { batchId, collectedCount }),

  getContainerStats: (period: 'week' | 'month' | 'quarter') =>
    apiClient.get(`/api/containers/stats?period=${period}`),

  generateESGReport: (periodStart: string, periodEnd: string) =>
    apiClient.post('/api/esg/generate', { periodStart, periodEnd }),

  applyVendor: (data: VendorApplication) =>
    apiClient.post('/api/vendors/apply', data),
}
