"""
Run: python -m app.seed
Seeds vendors, restaurants, companies, users, and 3-month historical data.
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext

from app.database import engine, AsyncSessionLocal, Base
from app.models import user, company, vendor, restaurant, order, container_batch, esg_summary, vendor_application, packaging_type, vendor_esg_profile, esg_calculation_method  # noqa

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
        from app.models.vendor_application import VendorApplication

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
        rest3 = Restaurant(id="rest-003", vendor_id="vendor-001", name="覓廚定食",
                           supports_circular=True, price_per_meal=150)
        rest4 = Restaurant(id="rest-004", vendor_id="vendor-001", name="十八廚",
                           supports_circular=False, price_per_meal=100)
        rest5 = Restaurant(id="rest-005", vendor_id="vendor-001", name="Dr. Salt",
                           supports_circular=True, price_per_meal=180)
        rest6 = Restaurant(id="rest-006", vendor_id="vendor-001", name="純浮食代",
                           supports_circular=True, price_per_meal=130)
        db.add_all([rest1, rest2, rest3, rest4, rest5, rest6])

        hashed = pwd_context.hash("demo1234")
        db.add_all([
            User(id="user-hr-001",  company_id="company-001", role="admin",    name="王小明", email="hr@demo.com",  hashed_password=hashed),
            User(id="user-mgr-001", company_id="company-001", role="manager",  name="李管理", email="mgr@demo.com", hashed_password=hashed),
            User(id="user-emp-001", company_id="company-001", role="employee", name="張員工", email="emp@demo.com", hashed_password=hashed),
        ])
        await db.flush()

        # Stage 3: 12 weeks of orders + container batches with realistic variation
        base_date = datetime.utcnow() - timedelta(weeks=12)
        WEEK_DATA = [
            # (estimated, collected) — weeks 0-11
            (250, 235),  # week 0: 94%
            (260, 241),  # week 1: 92.7%
            (245, 226),  # week 2: 92.2%
            (255, 240),  # week 3: 94.1%
            (250, 130),  # week 4: 52% ← anomaly (low)
            (260, 248),  # week 5: 95.4%
            (240, 222),  # week 6: 92.5%
            (265, 251),  # week 7: 94.7%
            (250,  90),  # week 8: 36% ← anomaly (very low)
            (255, 244),  # week 9: 95.7%
            (260, 249),  # week 10: 95.8%
            (250, 238),  # week 11: 95.2%
        ]
        for week, (qty, collected) in enumerate(WEEK_DATA):
            week_start = (base_date + timedelta(weeks=week)).strftime("%Y-%m-%d")
            rest_id = "rest-001" if week % 2 == 0 else "rest-002"
            db.add(Order(
                id=str(uuid.uuid4()),
                company_id="company-001",
                restaurant_id=rest_id,
                vendor_id="vendor-001",
                estimated_count=qty,
                week_start=week_start,
            ))
            db.add(ContainerBatch(
                id=str(uuid.uuid4()),
                qr_code=f"BATCH-HIST-{week:03d}",
                company_id="company-001",
                vendor_id="vendor-001",
                quantity=qty,
                dispatched_at=base_date + timedelta(weeks=week),
                collected_at=base_date + timedelta(weeks=week, days=5),
                collected_count=collected,
                status="collected",
            ))

        # Stage 4: Pre-seeded vendor applications for demo
        now = datetime.utcnow()
        db.add_all([
            VendorApplication(
                id=str(uuid.uuid4()),
                company_name="台灣循環餐盒股份有限公司",
                contact_email="contact@circular-box.com.tw",
                contact_phone="02-2345-6789",
                business_id="12345678",
                certifications=["iso14064", "iso22000", "epa"],
                container_types=["reusable_bento", "reusable_bowl", "stainless"],
                carbon_factor_per_cycle=0.08,
                description="專注於企業午餐循環容器服務，服務大台北地區，每日可配送 5000 份以上。擁有完整 RFID 追蹤系統，回收率超過 95%。",
                material_file_names=["ISO14064證書.pdf", "公司簡介.pdf"],
                status="pending",
                submitted_at=now - timedelta(days=1),
            ),
            VendorApplication(
                id=str(uuid.uuid4()),
                company_name="綠食科技有限公司",
                contact_email="green@greenfood.tw",
                contact_phone="04-7890-1234",
                business_id="87654321",
                certifications=["fsc", "sgs"],
                container_types=["eco_tray", "reusable_cup", "custom"],
                carbon_factor_per_cycle=0.11,
                description="中部地區最大循環餐具供應商，提供客製化容器設計服務，支援企業品牌印刷。",
                material_file_names=["FSC認證.pdf"],
                status="pending",
                submitted_at=now - timedelta(days=2),
            ),
            VendorApplication(
                id=str(uuid.uuid4()),
                company_name="環淨容器工業股份有限公司",
                contact_email="info@hj-container.com",
                contact_phone="07-5678-9012",
                business_id="11223344",
                certifications=["iso14064", "tüv", "sgs", "iso22000"],
                container_types=["reusable_bento", "stainless", "reusable_bowl"],
                carbon_factor_per_cycle=0.06,
                description="南部製造商，自有工廠生產不鏽鋼循環容器，碳足跡最低，通過多項國際認證。",
                material_file_names=["TÜV認證書.pdf", "工廠實景.jpg"],
                status="approved",
                submitted_at=now - timedelta(days=8),
                reviewed_at=now - timedelta(days=6),
                review_note="認證齊全，碳係數優異，優先合作",
                reviewed_by="user-hr-001",
            ),
        ])

        # Stage 5: PackagingType seed
        from app.models.packaging_type import PackagingType
        packaging_types_data = [
            {"id": "pkg-001", "name": "午餐餐盒", "category": "lunch_box", "material": "PP+不銹鋼",
             "single_use_weight_kg": 0.025, "reusable_cycle_co2e_factor": 0.15,
             "expected_lifespan_cycles": 500, "factor_source": "台灣環保署《一次性塑膠餐具生命週期評估》(2022)"},
            {"id": "pkg-002", "name": "飲料杯", "category": "drink_cup", "material": "不銹鋼",
             "single_use_weight_kg": 0.015, "reusable_cycle_co2e_factor": 0.08,
             "expected_lifespan_cycles": 300, "factor_source": "Ecoinvent 3.9 — stainless cup washing"},
            {"id": "pkg-003", "name": "湯碗", "category": "soup_bowl", "material": "陶瓷",
             "single_use_weight_kg": 0.020, "reusable_cycle_co2e_factor": 0.12,
             "expected_lifespan_cycles": 400, "factor_source": "台灣環保署(2022)"},
            {"id": "pkg-004", "name": "餐具組", "category": "utensil_set", "material": "竹製",
             "single_use_weight_kg": 0.010, "reusable_cycle_co2e_factor": 0.05,
             "expected_lifespan_cycles": 200, "factor_source": "Ecoinvent 3.9 — bamboo utensil"},
            {"id": "pkg-005", "name": "外送袋", "category": "delivery_bag", "material": "棉帆布",
             "single_use_weight_kg": 0.050, "reusable_cycle_co2e_factor": 0.30,
             "expected_lifespan_cycles": 150, "factor_source": "台灣環保署(2022)"},
        ]
        for pt_data in packaging_types_data:
            existing_pt = await db.execute(select(PackagingType).where(PackagingType.id == pt_data["id"]))
            if not existing_pt.scalar_one_or_none():
                db.add(PackagingType(**pt_data))

        # Stage 6: VendorESGProfile seed (first vendor)
        from app.models.vendor_esg_profile import VendorESGProfile
        first_vendor_result = await db.execute(select(Vendor))
        first_vendor = first_vendor_result.scalars().first()
        if first_vendor:
            existing_esg = await db.execute(
                select(VendorESGProfile).where(VendorESGProfile.vendor_id == first_vendor.id)
            )
            if not existing_esg.scalar_one_or_none():
                db.add(VendorESGProfile(
                    id=str(uuid.uuid4()),
                    vendor_id=first_vendor.id,
                    description="Loopick 致力於提供高品質循環容器，合作超過 50 家企業，累計減少 10 萬件一次性包材。",
                    total_reusable_items_served=58420,
                    average_return_rate=0.91,
                    estimated_co2e_saved=8763.0,
                    estimated_packaging_reduced_kg=1460.5,
                    verification_status="platform_checked",
                    partner_groups=["科技業", "金融業", "教育機構"],
                    public_profile_enabled=True,
                    updated_at=datetime.utcnow(),
                ))

        # Stage 7: ESGCalculationMethod seed
        from app.models.esg_calculation_method import ESGCalculationMethod
        existing_method = await db.execute(
            select(ESGCalculationMethod).where(ESGCalculationMethod.id == "method-001")
        )
        if not existing_method.scalar_one_or_none():
            db.add(ESGCalculationMethod(
                id="method-001",
                method_name="GHG Protocol Scope 3 Cat.11 — 循環午餐容器減碳計算",
                scope_category="Scope 3 Category 11",
                emission_factor_source="台灣環保署《一次性塑膠餐具生命週期評估》(2022)；Ecoinvent 3.9",
                factor_version="2022-v1",
                valid_region="TW",
                assumption_note="一次性餐盒碳排 0.3 kg CO₂e/件（環保署），循環容器清洗碳排 0.15 kg CO₂e/次（Ecoinvent 3.9）。Scope 3 僅涵蓋 Category 11。",
                active=True,
            ))

        await db.commit()
        print("Seed complete. Demo accounts: hr@demo.com / mgr@demo.com / emp@demo.com (password: demo1234)")


if __name__ == "__main__":
    asyncio.run(seed())
