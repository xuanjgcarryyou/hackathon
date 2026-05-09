import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.container_batch import ContainerBatch
from app.models.vendor import Vendor
from app.services.container_calc import calc_co2e_saved
from app.services.anomaly import check_anomaly

router = APIRouter()

ANOMALY_THRESHOLD = 0.9


class DispatchRequest(BaseModel):
    qrCode: str
    companyId: str
    vendorId: str
    quantity: int


class CollectRequest(BaseModel):
    batchId: str
    collectedCount: int


@router.post("/containers/dispatch")
async def dispatch_containers(body: DispatchRequest, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    batch = ContainerBatch(
        id=str(uuid.uuid4()),
        qr_code=body.qrCode,
        company_id=body.companyId,
        vendor_id=body.vendorId,
        quantity=body.quantity,
        status="dispatched",
    )
    db.add(batch)
    await db.commit()
    return {"batchId": batch.id, "status": "dispatched"}


@router.post("/containers/collect")
async def collect_containers(body: CollectRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(ContainerBatch).where(ContainerBatch.id == body.batchId))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail={"error": "BATCH_NOT_FOUND"})

    batch.collected_count = body.collectedCount
    batch.collected_at = datetime.utcnow()
    batch.status = "collected"
    batch.collected_by_user_id = user.get("sub")

    return_rate = body.collectedCount / batch.quantity if batch.quantity > 0 else 0.0

    vendor_result = await db.execute(select(Vendor).where(Vendor.id == batch.vendor_id))
    vendor = vendor_result.scalar_one_or_none()
    co2e = calc_co2e_saved(body.collectedCount, vendor.carbon_factor_per_cycle if vendor else 0.15)

    await db.commit()

    return {
        "batchId": batch.id,
        "status": "collected",
        "returnRate": round(return_rate, 4),
        "anomaly": return_rate < ANOMALY_THRESHOLD,
        "co2eSaved": round(co2e, 3),
    }


@router.get("/containers/my-stats")
async def get_my_stats(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    user_id = user.get("sub", "")
    result = await db.execute(
        select(ContainerBatch).where(
            ContainerBatch.collected_by_user_id == user_id,
            ContainerBatch.status == "collected",
        )
    )
    my_batches = result.scalars().all()
    my_collected = sum(b.collected_count or 0 for b in my_batches)
    my_co2e = sum(calc_co2e_saved(b.collected_count or 0, 0.15) for b in my_batches)

    company_id = user.get("company_id", "company-001")
    company_result = await db.execute(
        select(ContainerBatch).where(ContainerBatch.company_id == company_id)
    )
    all_batches = company_result.scalars().all()
    company_collected = sum(b.collected_count or 0 for b in all_batches if b.status == "collected")
    company_co2e = sum(calc_co2e_saved(b.collected_count or 0, 0.15) for b in all_batches if b.status == "collected")

    return {
        "userId": user_id,
        "userName": user.get("name", ""),
        "myCollectedCount": my_collected,
        "myCo2eSaved": round(my_co2e, 3),
        "myScanCount": len(my_batches),
        "companyCollectedCount": company_collected,
        "companyCo2eSaved": round(company_co2e, 3),
    }


@router.get("/containers/stats")
async def get_stats(period: str = "week", db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    company_id = user.get("company_id", "company-001")

    result = await db.execute(
        select(ContainerBatch).where(ContainerBatch.company_id == company_id)
    )
    batches = result.scalars().all()

    dispatched = sum(b.quantity for b in batches)
    collected = sum(b.collected_count or 0 for b in batches if b.status == "collected")
    return_rate = collected / dispatched if dispatched > 0 else 0.0
    co2e_saved = sum(
        calc_co2e_saved(b.collected_count or 0, 0.15)
        for b in batches if b.status == "collected"
    )

    return {
        "companyId": company_id,
        "period": period,
        "dispatched": dispatched,
        "collected": collected,
        "returnRate": round(return_rate, 4),
        "co2eSaved": round(co2e_saved, 3),
        "reducedPackagingCount": collected,
    }
