# TASK_LUO.md — 前端工程師任務清單

> Owner: LUO | Branch: `feat/frontend` | Tech: React 18 / TypeScript / Vite / TailwindCSS / axios
> 依據: ARCHITECTURE.md（Stage 2 鎖定版）、TECH_STACK.md

---

## 你負責的範圍

- `frontend/` 目錄下的所有程式碼
- 所有 UI 頁面（Login、HR 儀表板、員工點餐、QR 掃碼、ESG 報表）
- API client（axios + JWT header）
- WebSocket 客戶端（接收即時事件）

**你不負責：** 業務邏輯、資料庫、後端 API 實作、WebSocket server

**重要：** 所有 API 呼叫只打 Middleware（`http://localhost:3000`），絕對不直接呼叫 Backend。

---

## 優先順序（依 Demo 重要性排列）

| 優先級 | 任務 | 預估時間 | 說明 |
|--------|------|---------|------|
| P0 | 專案骨架 + Dockerfile + Vite 設定 | 45 min | 環境先跑起來 |
| P0 | API client（axios）+ WS client | 30 min | 所有頁面的基礎 |
| P0 | Login 頁（可用 stub JWT） | 45 min | 所有流程的起點 |
| P1 | HR 儀表板（靜態佈局 + 圖表） | 2 hr | Demo 主畫面 |
| P1 | QR 掃碼回收頁 | 1.5 hr | Demo 核心動作 |
| P1 | WebSocket 整合（anomaly 警示） | 1 hr | 即時更新效果 |
| P2 | ESG 報表頁（生成 + 顯示） | 1.5 hr | Demo 收尾亮點 |
| P2 | 員工點餐頁 | 1 hr | Demo 中間步驟 |
| P3 | 整體 UI 打磨（TailwindCSS） | 1 hr | 讓評審看起來專業 |

**總預估：約 10 小時**

---

## 詳細任務

### Step 1 — 專案骨架

建立以下檔案結構：

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── Login/
│   │   │   └── LoginPage.tsx
│   │   ├── HRDashboard/
│   │   │   ├── HRDashboardPage.tsx
│   │   │   ├── WeeklyOrderForm.tsx
│   │   │   └── StatsChart.tsx
│   │   ├── EmployeeOrder/
│   │   │   └── EmployeeOrderPage.tsx
│   │   ├── QRScanner/
│   │   │   └── QRScannerPage.tsx
│   │   └── ESGReport/
│   │       └── ESGReportPage.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── AnomalyAlert.tsx
│   │   └── LoadingSpinner.tsx
│   ├── api/
│   │   ├── client.ts
│   │   └── ws.ts
│   └── types/
│       └── index.ts
├── Dockerfile
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── index.html
```

**package.json 關鍵依賴：**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "axios": "^1.7.2",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.13",
    "tailwindcss": "^3.4.4",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38"
  }
}
```

**vite.config.ts（Proxy 設定，開發時繞過 CORS）：**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': 'http://middleware:3000',
      '/api': 'http://middleware:3000',
    }
  }
})
```

**Dockerfile：**
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
```

---

### Step 2 — types/index.ts（共用型別，從 ARCHITECTURE.md 複製）

```typescript
// src/types/index.ts
export interface UserRecord {
  id: string
  companyId: string
  role: 'admin' | 'employee' | 'manager'
  name: string
  email: string
}

export interface ContainerStats {
  companyId: string
  period: string
  dispatched: number
  collected: number
  returnRate: number
  co2eSaved: number
  reducedPackagingCount: number
}

export interface ESGReport {
  reportId: string
  totalMeals: number
  circularMeals: number
  reducedPackagingKg: number
  co2eSaved: number
  reportTextZh: string
  reportTextEn: string
  tables: ESGTable[]
}

export interface ESGTable {
  title: string
  headers: string[]
  rows: string[][]
}

export interface Vendor {
  id: string
  name: string
  certifications: string[]
  carbonFactorPerCycle: number
  containerTypes: string[]
}

export interface Restaurant {
  id: string
  vendorId: string
  name: string
  supportsCircular: boolean
  pricePerMeal: number
}
```

---

### Step 3 — api/client.ts（P0）

```typescript
// src/api/client.ts
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_MIDDLEWARE_URL || 'http://localhost:3000'

export const apiClient = axios.create({ baseURL: BASE_URL })

// 自動附加 JWT
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// API 呼叫封裝
export const api = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  getRestaurants: () => apiClient.get('/api/restaurants'),
  getVendors: () => apiClient.get('/api/vendors'),

  createWeeklyOrder: (data: {
    restaurantId: string, vendorId: string, estimatedCount: number, weekStart: string
  }) => apiClient.post('/api/orders/weekly', data),

  dispatchContainers: (data: {
    qrCode: string, companyId: string, vendorId: string, quantity: number
  }) => apiClient.post('/api/containers/dispatch', data),

  collectContainers: (batchId: string, collectedCount: number) =>
    apiClient.post('/api/containers/collect', { batchId, collectedCount }),

  getContainerStats: (period: 'week' | 'month' | 'quarter') =>
    apiClient.get(`/api/containers/stats?period=${period}`),

  generateESGReport: (periodStart: string, periodEnd: string) =>
    apiClient.post('/api/esg/generate', { periodStart, periodEnd }),
}
```

---

### Step 4 — api/ws.ts（WebSocket 客戶端）

```typescript
// src/api/ws.ts
const WS_URL = import.meta.env.VITE_MIDDLEWARE_URL?.replace('http', 'ws') || 'ws://localhost:3000'

type WSHandler = (payload: unknown) => void

class WSClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, WSHandler[]>()

  connect(token: string) {
    this.ws = new WebSocket(`${WS_URL}/ws?token=${token}`)

    this.ws.onmessage = (evt) => {
      const { event, payload } = JSON.parse(evt.data)
      this.handlers.get(event)?.forEach(h => h(payload))
    }

    this.ws.onclose = () => {
      // 斷線後 3 秒重連
      setTimeout(() => { if (token) this.connect(token) }, 3000)
    }
  }

  on(event: string, handler: WSHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push(handler)
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
  }
}

export const wsClient = new WSClient()
```

**可接收的事件（ARCHITECTURE.md Contract 7）：**
```typescript
'container_dispatched' → { batchId, quantity, companyId }
'container_collected'  → { batchId, collectedCount, returnRate }
'anomaly_alert'        → { batchId, returnRate, message }
'esg_ready'            → { reportId }
```

---

### Step 5 — Login 頁（P0）

```typescript
// src/pages/Login/LoginPage.tsx
// 功能：
// 1. email + password 表單
// 2. 呼叫 api.login()
// 3. 成功後：localStorage.setItem('token', token)，wsClient.connect(token)
// 4. 根據 user.role 導向不同頁面：
//    admin/manager → /dashboard
//    employee → /order
// 5. 失敗：顯示「帳號或密碼錯誤」

// Demo 測試帳號（顯示在畫面上方便評審）：
// hr@demo.com / demo1234 → HR 儀表板
// emp@demo.com / demo1234 → 員工點餐
```

---

### Step 6 — HR 儀表板（P1，Demo 主畫面）

```typescript
// src/pages/HRDashboard/HRDashboardPage.tsx

// 頁面區塊：
// 1. 本週訂餐設定表單（WeeklyOrderForm）
//    - 下拉選擇餐廳（GET /api/restaurants）
//    - 下拉選擇服務商（GET /api/vendors）
//    - 輸入份數（estimatedCount）
//    - 選擇週期開始（weekStart）
//    - 送出後顯示「預估減少 X 個餐盒、省 Y kg CO₂e」

// 2. 即時統計數據（StatsChart）
//    - 本週：已出貨容器數、已回收數、回收率
//    - 使用 recharts BarChart 顯示
//    - WebSocket 事件 'container_collected' → 自動更新數字

// 3. 異常警示橫幅（AnomalyAlert）
//    - WebSocket 事件 'anomaly_alert' → 紅色橫幅彈出
//    - 顯示：「批次 XXXX 回收率僅 XX%，低於標準 90%」

// 4. 一鍵生成 ESG 報表按鈕 → 導向 /esg
```

**UI 設計重點（TailwindCSS）：**
- 主色調：綠色系（`green-600`）強調環保主題
- 儀表板用 Card 組件（`rounded-xl shadow-md p-6`）
- 數字用大字體展示（`text-4xl font-bold text-green-600`）
- 異常警示用紅色橫幅（`bg-red-50 border-l-4 border-red-500`）

---

### Step 7 — QR 掃碼頁（P1，Demo 核心動作）

```typescript
// src/pages/QRScanner/QRScannerPage.tsx

// 功能：
// 1. 掃描模式：使用 <input> 接受 QR Code 字串
//    （Demo 可用鍵盤輸入 batchId 模擬掃碼，不一定需要 camera）
// 2. 輸入 collectedCount（回收數量）
// 3. 呼叫 api.collectContainers(batchId, collectedCount)
// 4. 成功：顯示回收率、CO₂e 減量
// 5. 若 response.anomaly === true：顯示警示提示

// 備案（若時間不足）：
// 提供「模擬出貨」按鈕 → 呼叫 api.dispatchContainers() 建立一個新批次
// 這樣 Demo 時不需要實體 QR Code

// QR Code 格式（WEI 會告知真實格式）：
// 假設為 "BATCH-{uuid}" 字串
```

---

### Step 8 — ESG 報表頁（P2）

```typescript
// src/pages/ESGReport/ESGReportPage.tsx

// 功能：
// 1. 選擇報告期間（periodStart / periodEnd 日期選擇器）
// 2. 點擊「生成 ESG 報表」→ 呼叫 api.generateESGReport()
// 3. Loading 狀態：「AI 正在撰寫報告...」動畫
// 4. 若收到 202（非同步），等待 WebSocket 'esg_ready' 事件後再 GET 報告
// 5. 顯示：
//    - 數據摘要（totalMeals、circularMeals、co2eSaved）
//    - 中文版報告全文（reportTextZh）可複製
//    - 英文版報告全文（reportTextEn）可複製
// 6. 「複製報告」按鈕（navigator.clipboard.writeText）
```

---

### Step 9 — 員工點餐頁（P2）

```typescript
// src/pages/EmployeeOrder/EmployeeOrderPage.tsx

// 功能（Demo 中較次要，可簡化）：
// 1. 顯示可訂餐廳列表（GET /api/restaurants）
// 2. 選擇餐廳 → 顯示「使用環保容器」勾選框
// 3. 點擊「訂餐」→ 呼叫 POST /api/orders（Contract 4，員工版）
// 4. 成功：顯示「訂餐成功，您使用了環保容器！」
```

---

## 與 HUANG 的整合協議

| 時間點 | 你要做的事 |
|--------|-----------|
| 開工後 | 等 HUANG 通知「auth stub 上線」再開始 Login 頁 |
| Login 完成後 | 告知 HUANG 你的 API 呼叫是否有問題（CORS、格式等）|
| WebSocket 連線後 | 確認 anomaly_alert 事件格式與 HUANG 一致 |
| WEI auth 完成後 | 切換到真實 JWT，測試 token 解析是否正確 |

---

## 環境變數

```
VITE_MIDDLEWARE_URL=http://localhost:3000
```

本地開發時 Vite proxy 會幫你處理，不用擔心 CORS。

---

## Demo Happy Path 操作步驟

Demo 時按照此順序操作：

1. 打開 `http://localhost:5173`
2. 用 `hr@demo.com / demo1234` 登入 → 進入 HR 儀表板
3. 設定本週訂餐（選餐廳 + 服務商 + 50 份）→ 顯示預估減少數字
4. 切換到 QR 掃碼頁，先按「模擬出貨」建立批次
5. 輸入 batchId + 45（份）→ 點擊回收 → 儀表板即時更新
6. 回收率 = 45/50 = 90%，剛好在門檻邊緣（可調整數字觸發警示）
7. 輸入 batchId + 40（份）→ 點擊回收 → 觸發 anomaly_alert（80% < 90%）
8. 切換到 ESG 報表頁 → 選擇 2026-Q2 → 生成報表 → 展示 AI 輸出

---

## Demo 前 Checklist

- [ ] `docker compose up` 後 `http://localhost:5173` 可打開
- [ ] Login 頁用 `hr@demo.com / demo1234` 成功登入，JWT 存入 localStorage
- [ ] HR 儀表板顯示本週統計數字（非零）
- [ ] 送出週訂餐後，顯示「預估減少 X 個餐盒」
- [ ] QR 掃碼頁可以手動輸入 batchId 完成回收
- [ ] 回收後儀表板數字即時更新（WebSocket 有效）
- [ ] returnRate < 0.9 時，畫面顯示紅色警示橫幅
- [ ] ESG 報表生成後，顯示中文版全文，可複製
- [ ] 所有頁面在 1280×720 解析度下排版正常

---

*TASK_LUO.md — Stage 3 Output | 2026-05-09*
