import axios from 'axios'

const backendClient = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://backend:8000',
  timeout: 15000,
})

export async function forwardRequest(
  method: string,
  path: string,
  data?: unknown,
  headers?: Record<string, string>
) {
  const response = await backendClient.request({ method, url: path, data, headers })
  return response.data
}
