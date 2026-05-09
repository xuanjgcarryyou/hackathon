import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: { sub: string; company_id: string; role: string }
}

export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) { res.status(401).json({ error: 'MISSING_TOKEN' }); return }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || '') as AuthRequest['user']
    next()
  } catch {
    res.status(401).json({ error: 'INVALID_TOKEN' })
  }
}
