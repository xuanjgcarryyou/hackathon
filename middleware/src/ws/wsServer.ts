import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { IncomingMessage, Server } from 'http'

const clients = new Map<string, Set<WebSocket>>()

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://localhost`)
    const token = url.searchParams.get('token')

    if (!token) { ws.close(1008, 'MISSING_TOKEN'); return }

    let companyId: string
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || '') as { company_id: string }
      companyId = payload.company_id
    } catch {
      ws.close(1008, 'INVALID_TOKEN'); return
    }

    if (!clients.has(companyId)) clients.set(companyId, new Set())
    clients.get(companyId)!.add(ws)

    ws.on('close', () => clients.get(companyId)?.delete(ws))
    ws.send(JSON.stringify({ event: 'connected', payload: { companyId } }))
  })
}

export function broadcast(companyId: string, message: object) {
  const targets = clients.get(companyId)
  if (!targets) return
  const payload = JSON.stringify(message)
  targets.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload)
  })
}
