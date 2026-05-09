import { Router } from 'express'
import { authGuard, AuthRequest } from '../middleware/authGuard'
import { forwardRequest } from '../proxy'
import { broadcast } from '../ws/wsServer'

const router = Router()

router.post('/esg/generate', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('POST', '/api/esg/generate', req.body, {
      Authorization: req.headers.authorization!,
    })

    // 若後端改為非同步（202），廣播 esg_ready
    if (result.jobId) {
      res.status(202).json(result)
      return
    }

    if (result.reportId) {
      broadcast(req.user!.company_id, {
        event: 'esg_ready',
        payload: { reportId: result.reportId },
      })
    }

    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'ESG_GENERATION_FAILED' })
  }
})

export default router
