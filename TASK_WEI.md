# TASK_WEI.md — 後端工程師任務清單

> Owner: WEI | Branch: `feat/backend` | Tech: Python / FastAPI / SQLAlchemy / PostgreSQL / Claude API
> 依據: ARCHITECTURE.md（Stage 2 鎖定版）、TECH_STACK.md

---

## 你負責的範圍

- `backend/` 目錄下的所有程式碼
- 所有業務邏輯與資料持久化
- JWT 產生（簽發，不驗證）
- Claude API 呼叫（ESG 報表生成）
- `shared/schemas.py`（Pydantic 模型，開工前與 HUANG / LUO 確認後鎖定）

**你不負責：** WebSocket 連線、前端 UI、docker-compose.yml

---

## 優先順序（依阻塞性排列）

| 優先級 | 任務 | 預估時間 | 阻塞誰 |
|--------|------|---------|--------|
| P0 | 專案骨架 + Dockerfile 可啟動 | 45 min | 全員整合 |
| P0 | `POST /auth/login` — JWT 簽發 | 45 min | HUANG、LUO 無法登入 |
| P1 | 資料庫模型 + 建表 + seed.py | 1.5 hr | 所有 API 的資料來源 |
| P1 | `POST /api/containers/dispatch` | 1 hr | Demo 出貨流程 |
| P1 | `POST /api/containers/collect` | 1.5 hr | Demo 核心動作 |
| P2 | `POST /api/orders/weekly` | 1 hr | HR 儀表板設定訂餐 |
| P2 | `GET /api/containers/stats` | 1 hr | 儀表板圖表數據 |
| P2 | `GET /api/restaurants` + `GET /api/vendors` | 30 min | 前端下拉選單 |
| P3 | `POST /api/esg/generate` + Claude API | 3 hr | ESG 報表頁 |
| P3 | 整合測試 + seed 資料驗證 | 1 hr | Demo 彩排 |

**總預估：約 12 小時**

---

## 詳細任務

### Step 1 — 專案骨架（P0，先做）

建立以下檔案結構：

```
backend/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── company.py
│   │   ├── vendor.py
│   │   ├── restaurant.py
│   │   ├── order.py
│   │   ├── container_batch.py
│   │   └── esg_summary.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── orders.py
│   │   ├── containers.py
│   │   └── esg.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── esg_agent.py
│   │   ├── container_calc.py
│   │   └── anomaly.py
│   └── seed.py
├── Dockerfile
└── requirements.txt
```

**requirements.txt 最小集合：**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.7.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
anthropic==0.28.0
python-dotenv==1.0.1
httpx==0.27.0
```

**Dockerfile：**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**main.py 骨架（先回 200 佔位，讓 HUANG 可以轉發）：**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, orders, containers, esg

app = FastAPI(title="Hackathon Backend")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(orders.router, prefix="/api")
app.include_router(containers.router, prefix="/api")
app.include_router(esg.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

### Step 2 — 資料庫模型

**database.py：**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

**重要模型欄位（對應 shared/schemas.py）：**

```python
# models/user.py
class User(Base):
    __tablename__ = "users"
    id: str (UUID, PK)
    company_id: str (FK → companies.id)
    role: str  # 'admin' | 'employee' | 'manager'
    name: str
    email: str (unique)
    hashed_password: str

# models/container_batch.py
class ContainerBatch(Base):
    __tablename__ = "container_batches"
    id: str (UUID, PK)
    qr_code: str (unique)
    company_id: str
    vendor_id: str
    quantity: int
    dispatched_at: datetime
    collected_at: datetime (nullable)
    collected_count: int (nullable)
    status: str  # 'dispatched' | 'collected' | 'cleaning' | 'ready'
```

---

### Step 3 — Auth（P0，最優先完成）

```python
# routers/auth.py
POST /auth/login
- 查詢 users 表，bcrypt 驗證密碼
- 成功：回傳 { token: JWT, user: UserRecord }
- JWT payload: { sub: user.id, company_id, role, exp }
- 失敗：401 { error: "INVALID_CREDENTIALS" }
```

JWT 簽發用 `JWT_SECRET`（從 env 讀取，與 HUANG 使用同一個值）。

---

### Step 4 — seed.py（早做，讓大家有測試資料）

預植以下資料：

```python
# 公司
Company: id="company-001", name="台積電示範辦公室", employee_count=500

# 服務商
Vendor: id="vendor-001", name="Loopick", carbon_factor_per_cycle=0.15
        certifications=["台灣環保標章"], container_types=["餐盒", "飲料杯"]

# 餐廳
Restaurant: id="rest-001", name="健康廚房", vendor_id="vendor-001", supports_circular=True, price=120
Restaurant: id="rest-002", name="素食便當", vendor_id="vendor-001", supports_circular=True, price=100

# 使用者（密碼都是 "demo1234"）
User: email="hr@demo.com",      role="admin",    name="王小明"
User: email="mgr@demo.com",     role="manager",  name="李管理"
User: email="emp@demo.com",     role="employee", name="張員工"

# 歷史訂餐（3 個月，供 ESG 報表有數據）
Order: 每週 5 天 × 50 份 × 12 週 = 3,000 份歷史紀錄
ContainerBatch: 對應歷史訂單，return_rate 約 92%（讓報表數字好看）
```

---

### Step 5 — 容器 API

**POST /api/containers/dispatch（Contract 3）：**
```
- 建立 ContainerBatch，status = 'dispatched'
- 回傳 { batchId, status: "dispatched" }
- 注意：此 API 完成後主動通知 HUANG，讓他確認 WebSocket 廣播能觸發
```

**POST /api/containers/collect（Contract 4）：**
```
- 查詢 ContainerBatch by batchId
- 更新 status = 'collected'，記錄 collected_count、collected_at
- 計算 returnRate = collected_count / quantity
- 呼叫 container_calc.py 計算 co2eSaved
- 若 returnRate < 0.9，在 response 加 anomaly: true
- HUANG 收到 anomaly: true 後會廣播 WebSocket 警示
```

**CO₂e 計算公式（container_calc.py）：**
```python
def calc_co2e_saved(collected_count: int, vendor: Vendor) -> float:
    # 每個循環容器取代一個一次性餐盒
    # 一次性餐盒碳排：約 0.3 kg CO₂e（台灣環保署數據）
    # 循環容器碳排：vendor.carbon_factor_per_cycle
    return collected_count * (0.3 - vendor.carbon_factor_per_cycle)
```

---

### Step 6 — ESG 報表生成（P3，最後做）

**esg_agent.py：**
```python
import anthropic

SYSTEM_PROMPT = """你是一位專業的企業永續報告撰寫專家，
熟悉 GHG Protocol Scope 3 標準。
你的任務是根據提供的真實數據，撰寫符合 GHG Protocol Scope 3 格式的 ESG 報告段落。
重要規則：
1. 只能使用提供的數字，絕對不可自行推算或假設數字
2. 輸出中文版與英文版各一份
3. 格式包含：摘要段落、數據表格建議、減量成效說明"""

def build_user_prompt(data: dict) -> str:
    return f"""
請根據以下真實數據生成 ESG 報告段落：

報告期間：{data['period_start']} 至 {data['period_end']}
總訂餐份數：{data['total_meals']} 份
使用循環容器份數：{data['circular_meals']} 份
循環率：{data['return_rate']:.1%}
避免一次性包材：{data['reduced_packaging_kg']:.1f} kg
CO₂e 減量：{data['co2e_saved']:.2f} kg
使用服務商：{data['vendor_name']}（碳因子：{data['carbon_factor']} kg CO₂e/次）
"""

async def generate_esg_report(client: anthropic.AsyncAnthropic, data: dict) -> dict:
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(data)}]
    )
    # 解析 response，分別提取中文版與英文版
    ...
```

**POST /api/esg/generate 流程：**
1. 聚合期間資料（container_batches JOIN orders）
2. 呼叫 esg_agent.py
3. 儲存 ESGSummary 至資料庫
4. 回傳完整 ESGReport 物件

若 Claude API 超時（>10s），改為 202 + jobId 非同步模式，完成後透過 HUANG WebSocket 廣播 `esg_ready`。

---

## 與 HUANG 的整合協議

| 時間點 | 你要做的事 |
|--------|-----------|
| 開工 30 分鐘內 | 確認 JWT_SECRET 值，寫入 `.env` |
| auth 完成後 | 告知 HUANG `POST /auth/login` 可測試 |
| collect 完成後 | 確認 anomaly 回傳格式，讓 HUANG 測試 WebSocket 廣播 |
| ESG 完成後 | 確認 202 非同步模式是否需要啟用 |

---

## 環境變數（你需要填的部分）

```
DATABASE_URL=postgresql://user:password@db:5432/hackathon
JWT_SECRET=<HUANG 決定後告知>
CLAUDE_API_KEY=<你自己的 API Key>
CLAUDE_MODEL=claude-sonnet-4-6
```

---

## Demo 前 Checklist

- [ ] `docker compose up` 後 `GET /health` 回 200
- [ ] `POST /auth/login` 用 `hr@demo.com / demo1234` 成功取得 JWT
- [ ] `POST /api/containers/dispatch` 建立批次，qrCode 可掃描
- [ ] `POST /api/containers/collect` 回傳 returnRate 與 anomaly
- [ ] `GET /api/containers/stats?period=quarter` 回傳有意義的數字
- [ ] `POST /api/esg/generate` 成功呼叫 Claude API，回傳中英文報告
- [ ] seed.py 執行後資料完整（執行 `python app/seed.py`）
- [ ] 異常場景：collect_count < 90% → anomaly: true

---

*TASK_WEI.md — Stage 3 Output | 2026-05-09*
