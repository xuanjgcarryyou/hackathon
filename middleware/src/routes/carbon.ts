import { Router, Request, Response } from 'express'
import { forwardRequest } from '../proxy'

const router = Router()

router.get('/carbon/factors', async (_req: Request, res: Response) => {
  try {
    const result = await forwardRequest('GET', '/api/carbon/factors')
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'FETCH_FAILED' })
  }
})

router.post('/carbon/compare', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest('POST', '/api/carbon/compare', req.body)
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'COMPARE_FAILED' })
  }
})

router.get('/carbon/lifecycle-tree', async (req: Request, res: Response) => {
  try {
    const itemType = (req.query.item_type as string) || 'lunch_box'
    const result = await forwardRequest('GET', `/api/carbon/lifecycle-tree?item_type=${encodeURIComponent(itemType)}`)
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'FETCH_FAILED' })
  }
})

export default router
