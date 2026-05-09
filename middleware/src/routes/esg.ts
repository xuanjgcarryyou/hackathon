import { Router, Request, Response } from 'express'
import { authGuard, AuthRequest } from '../middleware/authGuard'
import { forwardRequest } from '../proxy'
import { broadcast } from '../ws/wsServer'

const router = Router()

router.get('/esg/calculation-methods', async (_req: Request, res: Response) => {
  try {
    const result = await forwardRequest('GET', '/api/esg/calculation-methods')
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'FETCH_FAILED' })
  }
})

router.get('/packaging-types', async (_req: Request, res: Response) => {
  try {
    const result = await forwardRequest('GET', '/api/packaging-types')
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'FETCH_FAILED' })
  }
})

router.get('/esg/:reportId/export', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('GET', `/api/esg/${req.params.reportId}/export`, undefined, {
      Authorization: req.headers.authorization!,
    })
    res.setHeader('Content-Disposition', `attachment; filename="esg-report-${req.params.reportId.slice(0, 8)}.json"`)
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'EXPORT_FAILED' })
  }
})

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
