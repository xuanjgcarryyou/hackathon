"""
Run: python -m app.seed
Seeds vendors, restaurants, companies, users, and 3-month historical data.
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext

from app.database import engine, AsyncSessionLocal, Base
from app.models import user, company, vendor, restaurant, order, container_batch, esg_summary  # noqa

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        from app.models.company import Company
        from app.models.vendor import Vendor
        from app.models.restaurant import Restaurant
        from app.models.user import User
        from app.models.order import Order
        from app.models.container_batch import ContainerBatch

        # Skip if already seeded
        existing = await db.execute(select(Company).where(Company.id == "company-001"))
        if existing.scalar_one_or_none():
            print("Seed already run — skipping.")
            return

        # Stage 1: Company + Vendor (no FK deps)
        company_obj = Company(id="company-001", name="台積電示範辦公室", employee_count=500)
        vendor_obj = Vendor(
            id="vendor-001",
            name="Loopick",
            certifications=["台灣環保標章", "ISO 14064"],
            carbon_factor_per_cycle=0.15,
            container_types=["餐盒", "飲料杯"],
        )
        db.add_all([company_obj, vendor_obj])
        await db.flush()

        # Stage 2: Restaurants + Users (FK → companies, vendors)
        rest1 = Restaurant(id="rest-001", vendor_id="vendor-001", name="健康廚房",
                           supports_circular=True, price_per_meal=120)
        rest2 = Restaurant(id="rest-002", vendor_id="vendor-001", name="素食便當",
                           supports_circular=True, price_per_meal=100)
        db.add_all([rest1, rest2])

        hashed = pwd_context.hash("demo1234")
        db.add_all([
            User(id="user-hr-001",  company_id="company-001", role="admin",    name="王小明", email="hr@demo.com",  hashed_password=hashed),
            User(id="user-mgr-001", company_id="company-001", role="manager",  name="李管理", email="mgr@demo.com", hashed_password=hashed),
            User(id="user-emp-001", company_id="company-001", role="employee", name="張員工", email="emp@demo.com", hashed_password=hashed),
        ])
        await db.flush()

        # Stage 3: Orders + ContainerBatches (FK → companies, vendors, restaurants)
        base_date = datetime.utcnow() - timedelta(weeks=12)
        for week in range(12):
            week_start = (base_date + timedelta(weeks=week)).strftime("%Y-%m-%d")
            db.add(Order(
                id=str(uuid.uuid4()),
                company_id="company-001",
                restaurant_id="rest-001",
                vendor_id="vendor-001",
                estimated_count=250,
                week_start=week_start,
            ))
            db.add(ContainerBatch(
                id=str(uuid.uuid4()),
                qr_code=f"BATCH-HIST-{week:03d}",
                company_id="company-001",
                vendor_id="vendor-001",
                quantity=250,
                dispatched_at=base_date + timedelta(weeks=week),
                collected_at=base_date + timedelta(weeks=week, days=5),
                collected_count=230,
                status="collected",
            ))

        await db.commit()
        print("Seed complete. Demo accounts: hr@demo.com / mgr@demo.com / emp@demo.com (password: demo1234)")


if __name__ == "__main__":
    asyncio.run(seed())
