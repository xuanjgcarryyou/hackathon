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

router.get('/esg/:reportId/export/xlsx', authGuard, async (req: AuthRequest, res) => {
  try {
    const axios = (await import('axios')).default
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000'
    const response = await axios.get(
      `${backendUrl}/api/esg/${req.params.reportId}/export/xlsx`,
      {
        headers: { Authorization: req.headers.authorization! },
        responseType: 'arraybuffer',
      }
    )
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="esg-report-${req.params.reportId.slice(0, 8)}.xlsx"`)
    res.send(Buffer.from(response.data))
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'XLSX_EXPORT_FAILED' })
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
