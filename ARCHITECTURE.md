# ARCHITECTURE.md — Stage 2 Output

> 本文件為 Stage 2 鎖定版本，是 Stage 3 任務拆分的唯一依據。
> 介面合約（Interface Contracts）鎖定後不得單方面修改。需變更請先在團隊確認並更新本文件。

---

## System Overview

本系統為一個 B2B 循環午餐管理 SaaS 平台。企業 HR 透過前端儀表板設定本週訂餐方案、選擇合作餐廳與環保服務商，員工在平台上點餐，餐後管理員掃描容器批次 QR 碼記錄回收，系統即時計算循環率與 CO₂e 減量，並由 AI Agent 呼叫 Claude API 一鍵生成符合 GHG Protocol Scope 3 格式的 ESG 報表段落。三層架構（後端 → 中介層 → 前端）嚴格分離，各層之間僅透過本文件定義的 API 合約通訊，任何一層皆可獨立開發與測試。

---

## Module Boundaries

### Module A — Backend Service
- **Owner:** WEI
- **Tech:** Python / FastAPI / SQLAlchemy / PostgreSQL / Claude API
- **Responsibility:** 所有業務邏輯與資料持久化。包含：用戶驗證（產生 JWT）、訂餐紀錄管理、容器批次出貨與回收紀錄、ESG 數據計算、呼叫 Claude API 生成 ESG 報表文字。不處理任何 WebSocket 連線。
- **Exposes:** REST API（供中介層呼叫），詳見 Interface Contracts
- **Consumes:** PostgreSQL、Claude API（`claude-sonnet-4-6`）

### Module B — Middleware / API Gateway
- **Owner:** HUANG
- **Tech:** Node.js / Express / TypeScript / ws 套件
- **Responsibility:** 作為前端的唯一入口。轉發 REST 請求至後端、管理 JWT 驗證（驗證 token 後再轉發）、維護 WebSocket 連線（前端訂閱即時事件）、接收後端推送的異常通知並廣播給對應公司的連線用戶。不包含任何業務邏輯。
- **Exposes:** REST API（供前端呼叫）、WebSocket endpoint `ws://middleware/ws`
- **Consumes:** Backend REST API（Module A）

### Module C — Frontend
- **Owner:** LUO
- **Tech:** React 18 / TypeScript / Vite / TailwindCSS
- **Responsibility:** 所有 UI 頁面。包含：HR 儀表板、員工點餐介面、管理員 QR 掃碼頁、ESG 報表頁。透過 WebSocket 接收即時更新（容器回收事件、異常警示）。所有 API 呼叫只打 Middleware，不直接呼叫 Backend。
- **Exposes:** 無（純消費方）
- **Consumes:** Middleware REST API、WebSocket（Module B）

---

## Data Flow

### Happy Path：完整循環（HR 設定 → 員工點餐 → 回收 → ESG 報表）

```
1. HR 登入
   前端 POST /auth/login {email, password}
   → 中介層驗證並轉發 → 後端驗證密碼，回傳 JWT
   → 中介層回傳 { token: string, user: UserRecord }
   → 前端儲存 JWT，進入 HR 儀表板

2. HR 設定本週訂餐
   前端 POST /api/orders/weekly {restaurantId, vendorId, estimatedCount, weekStart}
   → 中介層附加 companyId（從 JWT 解析）轉發
   → 後端建立 Order 紀錄，預估容器需求，回傳 { orderId, estimatedContainers }
   → 前端顯示「本週已設定，預估減少 X 個一次性餐盒」

3. 環保服務商出貨（後端模擬或管理員觸發）
   後端 / 管理員 POST /api/containers/dispatch {batchId, qrCode, companyId, quantity}
   → 後端建立 ContainerBatch，狀態 = 'dispatched'
   → 中介層 WebSocket 廣播 { event: 'container_dispatched', quantity }
   → 前端儀表板即時更新「在途容器數」

4. 員工點餐
   前端 POST /api/orders {restaurantId, mealCount, useCircular: true}
   → 中介層轉發 → 後端記錄 Order，回傳 { orderId }

5. 管理員掃碼回收
   前端 QR 掃描頁掃描容器 QR Code，取得 batchId
   前端 POST /api/containers/collect {batchId, collectedCount}
   → 中介層轉發 → 後端更新 ContainerBatch.status = 'collected'，計算當日回收率
   → 若回收率低於 90%，後端回傳 anomaly: true
   → 中介層收到 anomaly，WebSocket 廣播 { event: 'anomaly_alert', returnRate, batchId }
   → 前端儀表板即時顯示警示

6. HR 查看統計
   前端 GET /api/containers/stats?period=week
   → 後端計算：dispatched / collected / returnRate / co2eSaved
   → 前端儀表板更新圖表

7. HR 一鍵生成 ESG 報表
   前端 POST /api/esg/generate {periodStart, periodEnd}
   → 中介層轉發 → 後端聚合期間所有數據
   → 後端呼叫 Claude API，Prompt 含真實數字，要求輸出 GHG Protocol Scope 3 格式段落
   → 後端儲存 ESGSummary，回傳 { reportId, reportTextZh, reportTextEn, tables }
   → 前端 ESG 報表頁顯示可複製的報告內容
```

---

## Interface Contracts

> 以下合約為強制規格。前端只與中介層溝通；中介層只與後端溝通。欄位名稱與型別不得擅自更改。

### Contract 1：Auth — 登入

**前端 → 中介層 → 後端**

```
POST /auth/login
Request:  { email: string, password: string }
Response 200: { token: string, user: UserRecord }
Response 401: { error: "INVALID_CREDENTIALS" }
```

### Contract 2：訂餐設定

**前端 → 中介層 → 後端**

```
POST /api/orders/weekly
Headers: Authorization: Bearer <token>
Request:  {
  restaurantId: string,
  vendorId: string,
  estimatedCount: number,
  weekStart: string  // ISO date "2026-05-11"
}
Response 200: {
  orderId: string,
  estimatedContainers: number,
  estimatedReducedPackaging: number,  // 件數
  estimatedCo2eSaved: number          // kg
}
Response 400: { error: string, code: string }
```

### Contract 3：容器批次出貨

**後端內部 / 管理員觸發**

```
POST /api/containers/dispatch
Headers: Authorization: Bearer <token>
Request:  {
  qrCode: string,
  companyId: string,
  vendorId: string,
  quantity: number
}
Response 200: { batchId: string, status: "dispatched" }
```

### Contract 4：容器批次回收（核心 Demo 動作）

**前端 → 中介層 → 後端**

```
POST /api/containers/collect
Headers: Authorization: Bearer <token>
Request:  { batchId: string, collectedCount: number }
Response 200: {
  batchId: string,
  status: "collected",
  returnRate: number,     // 0.0–1.0
  anomaly: boolean,       // true if returnRate < 0.9
  co2eSaved: number       // kg，本次回收累計
}
Response 404: { error: "BATCH_NOT_FOUND" }
```

### Contract 5：容器統計數據

**前端 → 中介層 → 後端**

```
GET /api/containers/stats?period=week|month|quarter&companyId=<id>
Headers: Authorization: Bearer <token>
Response 200: ContainerStats
```

### Contract 6：ESG 報表生成

**前端 → 中介層 → 後端 → Claude API**

```
POST /api/esg/generate
Headers: Authorization: Bearer <token>
Request:  { periodStart: string, periodEnd: string }  // ISO date
Response 200: {
  reportId: string,
  totalMeals: number,
  circularMeals: number,
  reducedPackagingKg: number,
  co2eSaved: number,
  reportTextZh: string,   // GHG Protocol Scope 3 格式，中文
  reportTextEn: string,   // 英文版
  tables: ESGTable[]
}
Response 202: { status: "generating", jobId: string }  // 若需要非同步
Response 500: { error: "ESG_GENERATION_FAILED" }
```

### Contract 7：WebSocket 事件（中介層 → 前端）

```
ws://middleware/ws
Headers: Authorization: Bearer <token>（連線時帶入）

事件格式：{ event: string, payload: object }

事件清單：
{ event: "container_dispatched", payload: { batchId, quantity, companyId } }
{ event: "container_collected",  payload: { batchId, collectedCount, returnRate } }
{ event: "anomaly_alert",        payload: { batchId, returnRate, message: string } }
{ event: "esg_ready",            payload: { reportId } }  // 非同步生成完成通知
```

### Contract 8：餐廳與服務商列表（Mock 資料）

```
GET /api/restaurants
Response 200: Restaurant[]

GET /api/vendors
Response 200: Vendor[]
```

---

## Shared Schemas / DTOs

```typescript
// shared/types.ts — 前端與中介層共用

interface UserRecord {
  id: string
  companyId: string
  role: 'admin' | 'employee' | 'manager'
  name: string
  email: string
}

interface Company {
  id: string
  name: string
  employeeCount: number
  esgSettings: { format: 'ghg_scope3' | 'tw_env_ministry' }
}

interface Vendor {
  id: string
  name: string                    // e.g. "Loopick"
  certifications: string[]        // e.g. ["台灣環保標章", "ISO 14064"]
  carbonFactorPerCycle: number    // kg CO₂e per container per cycle
  containerTypes: string[]        // e.g. ["餐盒", "飲料杯"]
}

interface Restaurant {
  id: string
  vendorId: string
  name: string
  supportsCircular: boolean
  pricePerMeal: number
}

interface ContainerBatch {
  id: string
  qrCode: string
  companyId: string
  vendorId: string
  quantity: number
  dispatchedAt: string            // ISO datetime
  collectedAt?: string
  status: 'dispatched' | 'collected' | 'cleaning' | 'ready'
}

interface ContainerStats {
  companyId: string
  period: string                  // "2026-Q2"
  dispatched: number
  collected: number
  returnRate: number              // 0.0–1.0
  co2eSaved: number               // kg
  reducedPackagingCount: number
}

interface ESGTable {
  title: string
  headers: string[]
  rows: string[][]
}

interface ESGReport {
  id: string
  companyId: string
  periodStart: string
  periodEnd: string
  totalMeals: number
  circularMeals: number
  reducedPackagingKg: number
  co2eSaved: number
  reportTextZh: string
  reportTextEn: string
  tables: ESGTable[]
  generatedAt: string
}
```

```python
# shared/schemas.py — 後端 Pydantic 模型（與上方 TypeScript 對應）

from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

class UserRecord(BaseModel):
    id: str
    company_id: str
    role: Literal['admin', 'employee', 'manager']
    name: str
    email: str

class ContainerBatch(BaseModel):
    id: str
    qr_code: str
    company_id: str
    vendor_id: str
    quantity: int
    dispatched_at: datetime
    collected_at: Optional[datetime] = None
    status: Literal['dispatched', 'collected', 'cleaning', 'ready']

class ContainerStats(BaseModel):
    company_id: str
    period: str
    dispatched: int
    collected: int
    return_rate: float
    co2e_saved: float
    reduced_packaging_count: int

class ESGReport(BaseModel):
    id: str
    company_id: str
    period_start: str
    period_end: str
    total_meals: int
    circular_meals: int
    reduced_packaging_kg: float
    co2e_saved: float
    report_text_zh: str
    report_text_en: str
    generated_at: datetime
```

---

## Directory Tree

```
hackathon/
├── backend/                      # Owner: Person A
│   ├── app/
│   │   ├── main.py               # FastAPI app entry
│   │   ├── database.py           # SQLAlchemy engine + session
│   │   ├── models/               # ORM models (SQLAlchemy)
│   │   │   ├── user.py
│   │   │   ├── company.py
│   │   │   ├── vendor.py
│   │   │   ├── restaurant.py
│   │   │   ├── order.py
│   │   │   ├── container_batch.py
│   │   │   └── esg_summary.py
│   │   ├── routers/              # FastAPI routers
│   │   │   ├── auth.py
│   │   │   ├── orders.py
│   │   │   ├── containers.py
│   │   │   └── esg.py
│   │   ├── services/             # Business logic
│   │   │   ├── esg_agent.py      # Claude API 呼叫邏輯
│   │   │   ├── container_calc.py # CO₂e 計算
│   │   │   └── anomaly.py        # 異常偵測
│   │   └── seed.py               # 預植假資料（vendors, restaurants, history）
│   ├── Dockerfile
│   └── requirements.txt
│
├── middleware/                   # Owner: Person B
│   ├── src/
│   │   ├── index.ts              # Express app entry
│   │   ├── routes/               # 對應每個 Contract 的路由
│   │   │   ├── auth.ts
│   │   │   ├── orders.ts
│   │   │   ├── containers.ts
│   │   │   └── esg.ts
│   │   ├── ws/
│   │   │   └── wsServer.ts       # WebSocket 廣播管理
│   │   ├── middleware/
│   │   │   └── authGuard.ts      # JWT 驗證 middleware
│   │   └── proxy.ts              # 轉發至 Backend 的 HTTP client
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # Owner: Person C
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   ├── HRDashboard/      # 主儀表板 + 週訂餐設定
│   │   │   ├── EmployeeOrder/    # 員工點餐
│   │   │   ├── QRScanner/        # 管理員掃碼回收
│   │   │   └── ESGReport/        # 報表頁 + 生成按鈕
│   │   ├── components/           # 共用 UI 元件
│   │   ├── api/
│   │   │   ├── client.ts         # axios instance，帶 JWT header
│   │   │   └── ws.ts             # WebSocket 連線管理
│   │   └── types/
│   │       └── index.ts          # 從 shared/types.ts 引入或複製
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── shared/                       # 全員協調後才能修改
│   ├── types.ts                  # TypeScript 共用型別（前端、中介層使用）
│   └── schemas.py                # Python Pydantic 模型（後端使用）
│
├── docker-compose.yml            # Owner: Person B
└── .env.example                  # 環境變數範本（所有人填寫自己的部分）
```

---

## Ownership Map

| 資料夾 / 模組 | Owner | Git Branch | 備注 |
|-------------|-------|-----------|------|
| backend/ | WEI | feat/backend | |
| middleware/ | HUANG | feat/middleware | 含 docker-compose.yml |
| frontend/ | LUO | feat/frontend | |
| shared/ | 全員 | main | 修改前須在群組確認，避免衝突 |

**整合分支：** `main`（各人完成後開 PR 合併）

---

## Branch Naming Convention

```
feat/backend        # Person A 主分支
feat/middleware     # Person B 主分支
feat/frontend       # Person C 主分支
fix/<描述>          # 任何人的修復分支
```

---

## Integration Assumptions

1. 所有模組共用同一個 PostgreSQL 實例（Docker 內部網路 `db:5432`）
2. Backend 負責產生 JWT；中介層負責驗證 JWT（使用相同的 `JWT_SECRET`）
3. 環境變數統一定義在 `.env.example`，各人自行建立 `.env`（不 commit）
4. 中介層連接後端用 `http://backend:8000`（Docker Compose 服務名稱）
5. 前端連接中介層用 `http://middleware:3000`（開發時用 Vite proxy）

**環境變數清單（`.env.example`）：**
```
# Backend
DATABASE_URL=postgresql://user:password@db:5432/hackathon
JWT_SECRET=<共同決定，所有人一樣>
CLAUDE_API_KEY=<Person A 填入>
CLAUDE_MODEL=claude-sonnet-4-6

# Middleware
BACKEND_URL=http://backend:8000
JWT_SECRET=<與後端相同>
PORT=3000

# Frontend
VITE_MIDDLEWARE_URL=http://localhost:3000
```

---

## Mock Strategy

| 元件 | Real / Mock | 說明 |
|------|------------|------|
| Auth（JWT） | **Real** | 評審可能會測試登入流程 |
| PostgreSQL | **Real** | 所有交易資料需真實持久化 |
| Claude API（ESG 生成） | **Real** | 這是差異化功能，必須 Live |
| B2B 市集（Vendor/Restaurant 列表） | **Mock** | 資料庫預植 2 家餐廳、1 家服務商假資料 |
| 歷史訂餐數據 | **Mock** | seed.py 預植 3 個月假紀錄，供 ESG 報表有足夠數據 |
| 容器出貨（服務商端） | **Mock** | Demo 時由管理員在 UI 按「模擬出貨」觸發 dispatch API |
| WebSocket 即時更新 | **Real** | 掃碼後立即廣播，評審可看到儀表板更新 |
| Email / LINE 通知 | **Mock** | 異常警示只 console.log，不發實際訊息 |
| Redis（Session 快取） | **可選** | 若時間不足可跳過，JWT stateless 足夠 |

---

## Decision

採用嚴格三層分離架構：Python/FastAPI 後端處理所有業務邏輯與 Claude API 整合；Node.js/Express 中介層作為 API Gateway 與 WebSocket 廣播中心；React 前端只與中介層通訊。三層之間透過本文件定義的 8 個 REST 合約與 4 個 WebSocket 事件溝通，沒有跨層直接呼叫。Module A（B2B 市集）以預植假資料 Mock，其餘三個核心模組（HR 儀表板、QR 回收、ESG 報表）必須真實運作。

## Rationale

- 三層不直接溝通：確保 Person A/B/C 可以完全平行開發，中介層當 mock server，後端當 mock server，不互相等待
- 中介層持有 WebSocket：Node.js 的事件驅動模型天然適合長連線管理，Python FastAPI 也可做但需要額外設定
- Mock B2B 市集：這個模組在 Demo 中不是核心動作，省下的時間用在 ESG Agent 的 Prompt 調校

## Rejected Options

| 選項 | 拒絕原因 |
|------|---------|
| 前端直接呼叫後端（跳過中介層） | 失去 WebSocket 廣播能力；跨域設定複雜；兩人開發會踩到對方 |
| FastAPI 自己處理 WebSocket | 可行但需要額外套件（websockets/socketio），中介層已有 ws，不重複建設 |
| 使用 GraphQL | 合約不夠明確，hackathon 時間內 schema 協調成本高 |
| Monorepo 單一服務 | 三人無法平行開發；合併衝突風險高 |

## Open Questions

- [ ] JWT_SECRET 由誰生成並分發給全員？（建議 HUANG 在開工前 10 分鐘決定）
- [ ] ESG 報表格式：對齊 GHG Protocol Scope 3 或台灣環境部格式？（影響 Claude Prompt 設計）
- [ ] Demo 時是否有實體容器 + QR 貼紙？（影響 QR Scanner 頁面是否需要真實 camera 或可用按鈕代替）

## Risks

| 風險 | 可能性 | 影響 | 緩解 |
|------|--------|------|------|
| Person B 中介層未完成，Person A/C 無法整合 | 中 | 高 | HUANG 最優先完成 /auth/login 與 /api/containers/collect 兩個合約，其他路由可 stub 先回 200 |
| Claude API ESG 生成超時（>10s） | 中 | 中 | 後端改為非同步生成（202 + jobId），前端透過 WebSocket 收 esg_ready 事件 |
| Docker Compose 在 Demo 場地啟動失敗 | 低 | 高 | 準備預錄 Demo 影片；所有服務加 healthcheck 確保啟動順序 |
| shared/types.ts 被多人同時修改 | 中 | 中 | 開工前 1 小時由 orchestrator 鎖定 shared 型別，之後只能加不能改 |

## Fallback Plan

若時間不足，Demo 最小版本（可在 2 小時內完成）：
1. 純前端 + 假資料靜態展示 HR 儀表板與容器統計圖表
2. 直接從前端呼叫 Claude API（繞過後端）生成 ESG 報表文字
3. QR 掃碼改為手動輸入數量，跳過 camera 實作

此版本足以說明系統概念，評審可看到完整 Demo 故事線。

---

*Generated by orchestrating-hackathon — Stage 2 complete*
*Date: 2026-05-09*
