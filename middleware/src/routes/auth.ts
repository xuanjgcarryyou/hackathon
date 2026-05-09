import { Router } from 'express'
import { forwardRequest } from '../proxy'

const router = Router()

router.post('/auth/login', async (req, res) => {
  try {
    const result = await forwardRequest('POST', '/auth/login', req.body)
    res.json(result)
  } catch (err: any) {
    const status = err.response?.status || 500
    res.status(status).json(err.response?.data || { error: 'LOGIN_FAILED' })
  }
})

export default router
