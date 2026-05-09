import { Router } from 'express'
import { authGuard, AuthRequest } from '../middleware/authGuard'
import { forwardRequest } from '../proxy'
import { broadcast } from '../ws/wsServer'

const router = Router()

router.post('/containers/dispatch', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('POST', '/api/containers/dispatch', req.body, {
      Authorization: req.headers.authorization!,
    })
    broadcast(req.user!.company_id, {
      event: 'container_dispatched',
      payload: { batchId: result.batchId, quantity: req.body.quantity, companyId: req.user!.company_id },
    })
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'DISPATCH_FAILED' })
  }
})

router.post('/containers/collect', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('POST', '/api/containers/collect', req.body, {
      Authorization: req.headers.authorization!,
    })

    broadcast(req.user!.company_id, {
      event: 'container_collected',
      payload: { batchId: result.batchId, collectedCount: req.body.collectedCount, returnRate: result.returnRate },
    })

    if (result.anomaly) {
      broadcast(req.user!.company_id, {
        event: 'anomaly_alert',
        payload: {
          batchId: result.batchId,
          returnRate: result.returnRate,
          message: `回收率僅 ${(result.returnRate * 100).toFixed(1)}%，低於標準 90%`,
        },
      })
    }

    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'COLLECT_FAILED' })
  }
})

router.get('/containers/my-stats', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('GET', '/api/containers/my-stats', undefined, {
      Authorization: req.headers.authorization!,
    })
    res.json(result)
  } catch {
    res.status(500).json({ error: 'MY_STATS_FAILED' })
  }
})

router.get('/containers/stats', authGuard, async (req: AuthRequest, res) => {
  try {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString()
    const result = await forwardRequest('GET', `/api/containers/stats?${qs}`, undefined, {
      Authorization: req.headers.authorization!,
    })
    res.json(result)
  } catch {
    res.status(500).json({ error: 'STATS_FAILED' })
  }
})

export default router
