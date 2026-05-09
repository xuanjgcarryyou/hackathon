import { Router, Request, Response } from 'express'
import { authGuard, AuthRequest } from '../middleware/authGuard'
import { forwardRequest } from '../proxy'

const router = Router()

router.get('/vendors/public-esg', async (_req: Request, res: Response) => {
  try {
    const result = await forwardRequest('GET', '/api/vendors/public-esg')
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'FETCH_FAILED' })
  }
})

router.post('/vendors/apply', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest('POST', '/api/vendors/apply', req.body)
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'APPLY_FAILED' })
  }
})

router.get('/vendors/applications', authGuard, async (req: AuthRequest, res: Response) => {
  try {
    const result = await forwardRequest('GET', '/api/vendors/applications', undefined, {
      Authorization: req.headers.authorization!,
    })
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'FETCH_FAILED' })
  }
})

router.post('/vendors/applications/:id/review', authGuard, async (req: AuthRequest, res: Response) => {
  try {
    const result = await forwardRequest(
      'POST',
      `/api/vendors/applications/${req.params.id}/review`,
      req.body,
      { Authorization: req.headers.authorization! }
    )
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'REVIEW_FAILED' })
  }
})

export default router
