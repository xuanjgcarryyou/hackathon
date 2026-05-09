import { Router } from 'express'
import { authGuard, AuthRequest } from '../middleware/authGuard'
import { forwardRequest } from '../proxy'

const router = Router()

router.post('/orders/weekly', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('POST', '/api/orders/weekly', req.body, {
      Authorization: req.headers.authorization!,
    })
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'ORDER_FAILED' })
  }
})

router.get('/orders/current-week', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('GET', '/api/orders/current-week', undefined, {
      Authorization: req.headers.authorization!,
    })
    res.json(result)
  } catch {
    res.status(500).json({ error: 'FETCH_FAILED' })
  }
})

router.get('/restaurants', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('GET', '/api/restaurants', undefined, {
      Authorization: req.headers.authorization!,
    })
    res.json(result)
  } catch {
    res.status(500).json({ error: 'FETCH_FAILED' })
  }
})

router.get('/vendors', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('GET', '/api/vendors', undefined, {
      Authorization: req.headers.authorization!,
    })
    res.json(result)
  } catch {
    res.status(500).json({ error: 'FETCH_FAILED' })
  }
})

export default router
