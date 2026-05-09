# TASK_HUANG.md — 中介層工程師任務清單

> Owner: HUANG | Branch: `feat/middleware` | Tech: Node.js / Express / TypeScript / ws
> 依據: ARCHITECTURE.md（Stage 2 鎖定版）、TECH_STACK.md

---

## 你負責的範圍

- `middleware/` 目錄下的所有程式碼
- `docker-compose.yml`（全專案容器編排）
- `.env.example`（環境變數範本）
- JWT 驗證（不簽發，只驗）
- WebSocket 廣播中心

**你不負責：** 業務邏輯、資料庫、Claude API 呼叫、前端 UI

**你是整合的關鍵人：** WEI 和 LUO 都在等你的 `/auth/login` 路由和 stub 完成才能繼續開發。

---

## 優先順序（依阻塞性排列）

| 優先級 | 任務 | 預估時間 | 阻塞誰 |
|--------|------|---------|--------|
| P0 | 決定 JWT_SECRET，分發給 WEI 和 LUO | 5 min | 全員 |
| P0 | 專案骨架 + Dockerfile 可啟動 | 45 min | 整合測試 |
| P0 | docker-compose.yml + .env.example | 45 min | 全員啟動環境 |
| P0 | `POST /auth/login` 轉發（最優先路由） | 30 min | LUO 的登入頁 |
| P0 | authGuard JWT 驗證 middleware | 30 min | 所有受保護路由 |
| P1 | `POST /api/containers/collect` 轉發 + anomaly 廣播 | 1 hr | Demo 核心流程 |
| P1 | WebSocket server（連線管理 + 廣播） | 1.5 hr | LUO 即時儀表板 |
| P2 | 其餘路由 stub（orders、esg、restaurants、vendors）| 1 hr | LUO 各頁面開發 |
| P2 | 其餘路由完整轉發 | 1 hr | 整合測試 |
| P3 | 整合測試 + 端到端驗證 | 1 hr | Demo 彩排 |

**總預估：約 8 小時**

---

## 詳細任務

### Step 1 — 決定 JWT_SECRET（P0，第一件事）

開工 10 分鐘內：
1. 產生一個隨機字串作為 JWT_SECRET：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. 貼到群組，WEI 和 LUO 各自寫進自己的 `.env`

---

### Step 2 — 專案骨架

建立以下檔案結構：

```
middleware/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── orders.ts
│   │   ├── containers.ts
│   │   └── esg.ts
│   ├── ws/
│   │   └── wsServer.ts
│   ├── middleware/
│   │   └── authGuard.ts
│   └── proxy.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

**package.json 關鍵依賴：**
```json
{
  "dependencies": {
    "express": "^4.19.2",
    "ws": "^8.17.0",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.7.2",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.10",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.14.0",
    "typescript": "^5.4.5",
    "ts-node": "^10.9.2"
  }
}
```

**Dockerfile：**
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

**tsconfig.json：**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

---

### Step 3 — docker-compose.yml（P0）

```yaml
version: "3.9"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: hackathon
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d hackathon"]
      interval: 5s
      retries: 10

  backend:
    build: ./backend
    env_file: .env
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy

  middleware:
    build: ./middleware
    env_file: .env
    ports:
      - "3000:3000"
    depends_on:
      - backend

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - middleware

volumes:
  db_data:
```

**.env.example：**
```
# Backend
DATABASE_URL=postgresql://user:password@db:5432/hackathon
JWT_SECRET=FILL_IN_SAME_VALUE_AS_MIDDLEWARE
CLAUDE_API_KEY=FILL_IN_BY_WEI
CLAUDE_MODEL=claude-sonnet-4-6

# Middleware
BACKEND_URL=http://backend:8000
JWT_SECRET=FILL_IN_SAME_VALUE_AS_BACKEND
PORT=3000

# Frontend
VITE_MIDDLEWARE_URL=http://localhost:3000
```

---

### Step 4 — proxy.ts（HTTP 轉發工具）

```typescript
// src/proxy.ts
import axios from 'axios'

const backendClient = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://backend:8000',
  timeout: 15000,
})

export async function forwardRequest(
  method: string,
  path: string,
  data?: unknown,
  headers?: Record<string, string>
) {
  const response = await backendClient.request({
    method,
    url: path,
    data,
    headers,
  })
  return response.data
}
```

---

### Step 5 — authGuard.ts（JWT 驗證 middleware）

```typescript
// src/middleware/authGuard.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: { sub: string; company_id: string; role: string }
}

export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'MISSING_TOKEN' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as any
    next()
  } catch {
    res.status(401).json({ error: 'INVALID_TOKEN' })
  }
}
```

---

### Step 6 — routes/auth.ts（P0，最優先）

```typescript
// src/routes/auth.ts
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
```

在 WEI 的後端完成前，可以先用 stub 回傳：
```typescript
// 暫時 stub，讓 LUO 可以開發 Login 頁
router.post('/auth/login', async (req, res) => {
  if (req.body.email === 'hr@demo.com' && req.body.password === 'demo1234') {
    res.json({
      token: 'stub-jwt-token',
      user: { id: 'u1', companyId: 'company-001', role: 'admin', name: '王小明', email: 'hr@demo.com' }
    })
  } else {
    res.status(401).json({ error: 'INVALID_CREDENTIALS' })
  }
})
```

---

### Step 7 — routes/containers.ts（P1，含 anomaly 廣播）

```typescript
// src/routes/containers.ts — 核心：collect 完成後廣播
import { Router } from 'express'
import { authGuard, AuthRequest } from '../middleware/authGuard'
import { forwardRequest } from '../proxy'
import { broadcast } from '../ws/wsServer'

const router = Router()

router.post('/containers/collect', authGuard, async (req: AuthRequest, res) => {
  try {
    const token = req.headers.authorization!
    const result = await forwardRequest('POST', '/api/containers/collect', req.body, {
      Authorization: token
    })

    // 廣播回收事件
    broadcast(req.user!.company_id, {
      event: 'container_collected',
      payload: {
        batchId: result.batchId,
        collectedCount: req.body.collectedCount,
        returnRate: result.returnRate,
      }
    })

    // 若異常，額外廣播警示
    if (result.anomaly) {
      broadcast(req.user!.company_id, {
        event: 'anomaly_alert',
        payload: {
          batchId: result.batchId,
          returnRate: result.returnRate,
          message: `回收率僅 ${(result.returnRate * 100).toFixed(1)}%，低於標準 90%`
        }
      })
    }

    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'COLLECT_FAILED' })
  }
})

router.post('/containers/dispatch', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('POST', '/api/containers/dispatch', req.body, {
      Authorization: req.headers.authorization!
    })
    broadcast(req.user!.company_id, {
      event: 'container_dispatched',
      payload: { batchId: result.batchId, quantity: req.body.quantity, companyId: req.user!.company_id }
    })
    res.json(result)
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data)
  }
})

router.get('/containers/stats', authGuard, async (req: AuthRequest, res) => {
  try {
    const result = await forwardRequest('GET', `/api/containers/stats?${new URLSearchParams(req.query as any)}`, undefined, {
      Authorization: req.headers.authorization!
    })
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: 'STATS_FAILED' })
  }
})

export default router
```

---

### Step 8 — ws/wsServer.ts（WebSocket 廣播）

```typescript
// src/ws/wsServer.ts
import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { IncomingMessage } from 'http'

// company_id → Set<WebSocket>
const clients = new Map<string, Set<WebSocket>>()

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://localhost`)
    const token = url.searchParams.get('token')

    if (!token) { ws.close(1008, 'MISSING_TOKEN'); return }

    let companyId: string
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any
      companyId = payload.company_id
    } catch {
      ws.close(1008, 'INVALID_TOKEN'); return
    }

    if (!clients.has(companyId)) clients.set(companyId, new Set())
    clients.get(companyId)!.add(ws)

    ws.on('close', () => clients.get(companyId)?.delete(ws))
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
```

**WebSocket 連線方式（給 LUO 參考）：**
```
ws://localhost:3000/ws?token=<JWT>
```

---

### Step 9 — 其餘路由 stub（P2，讓 LUO 繼續開發）

```typescript
// 開發期間快速 stub，WEI API 完成後改為真實轉發
router.get('/restaurants', authGuard, (req, res) => {
  res.json([
    { id: 'rest-001', name: '健康廚房', vendorId: 'vendor-001', supportsCircular: true, pricePerMeal: 120 },
    { id: 'rest-002', name: '素食便當', vendorId: 'vendor-001', supportsCircular: true, pricePerMeal: 100 },
  ])
})

router.get('/vendors', authGuard, (req, res) => {
  res.json([
    { id: 'vendor-001', name: 'Loopick', certifications: ['台灣環保標章'], carbonFactorPerCycle: 0.15, containerTypes: ['餐盒', '飲料杯'] }
  ])
})
```

---

## 與 WEI / LUO 的整合協議

| 時間點 | 你要做的事 |
|--------|-----------|
| 開工 10 分鐘內 | 產生並分發 JWT_SECRET |
| 開工 1 小時內 | `POST /auth/login` stub 上線，通知 LUO |
| 開工 2 小時內 | docker-compose.yml 可以 `docker compose up` 啟動所有服務 |
| WEI auth 完成後 | 把 stub 換成真實轉發，通知 LUO 重新測試 |
| WEI collect 完成後 | 驗證 anomaly 廣播，測試 WebSocket |
| Demo 前 1 小時 | 端到端跑一次完整 Happy Path |

---

## 環境變數（你需要填的部分）

```
BACKEND_URL=http://backend:8000
JWT_SECRET=<你決定的值，同時分發給 WEI>
PORT=3000
```

---

## Demo 前 Checklist

- [ ] `docker compose up` 所有容器健康啟動（db → backend → middleware → frontend）
- [ ] `POST /auth/login` 返回真實 JWT（非 stub）
- [ ] `POST /api/containers/collect` 後 WebSocket 客戶端收到 `container_collected` 事件
- [ ] returnRate < 0.9 時，WebSocket 收到 `anomaly_alert`
- [ ] `GET /ws?token=<JWT>` 連線成功，不被拒絕
- [ ] 所有路由都已轉發至真實後端（無 stub 殘留）
- [ ] `.env.example` 所有欄位完整，其他人照著填可以跑起來

---

*TASK_HUANG.md — Stage 3 Output | 2026-05-09*
