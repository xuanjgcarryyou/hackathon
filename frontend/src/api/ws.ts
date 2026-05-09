const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

type WSHandler = (payload: unknown) => void

class WSClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, WSHandler[]>()
  private token: string | null = null

  connect(token: string) {
    this.token = token
    this.ws = new WebSocket(`${WS_BASE}/ws?token=${token}`)

    this.ws.onmessage = (evt) => {
      const { event, payload } = JSON.parse(evt.data)
      this.handlers.get(event)?.forEach(h => h(payload))
    }

    this.ws.onclose = () => {
      setTimeout(() => { if (this.token) this.connect(this.token) }, 3000)
    }
  }

  on(event: string, handler: WSHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push(handler)
    return () => {
      const list = this.handlers.get(event) || []
      this.handlers.set(event, list.filter(h => h !== handler))
    }
  }

  disconnect() {
    this.token = null
    this.ws?.close()
    this.ws = null
  }
}

export const wsClient = new WSClient()
