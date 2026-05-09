import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.order import Order
from app.models.vendor import Vendor

router = APIRouter()

PACKAGING_KG_PER_MEAL = 0.025   # 每份一次性餐盒重量 kg
CO2E_PER_PACKAGING_KG = 2.5     # 塑料生產 kg CO₂e / kg


class WeeklyOrderRequest(BaseModel):
    restaurantId: str
    vendorId: str
    estimatedCount: int
    weekStart: str


@router.post("/orders/weekly")
async def create_weekly_order(body: WeeklyOrderRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    company_id = user.get("company_id", "company-001")

    order = Order(
        id=str(uuid.uuid4()),
        company_id=company_id,
        restaurant_id=body.restaurantId,
        vendor_id=body.vendorId,
        estimated_count=body.estimatedCount,
        week_start=body.weekStart,
    )
    db.add(order)
    await db.commit()

    reduced_packaging = body.estimatedCount
    estimated_co2e = round(reduced_packaging * PACKAGING_KG_PER_MEAL * CO2E_PER_PACKAGING_KG, 2)

    return {
        "orderId": order.id,
        "estimatedContainers": body.estimatedCount,
        "estimatedReducedPackaging": reduced_packaging,
        "estimatedCo2eSaved": estimated_co2e,
    }


@router.get("/restaurants")
async def get_restaurants(db: AsyncSession = Depends(get_db)):
    from app.models.restaurant import Restaurant
    result = await db.execute(select(Restaurant))
    restaurants = result.scalars().all()
    return [
        {
            "id": r.id,
            "vendorId": r.vendor_id,
            "name": r.name,
            "supportsCircular": r.supports_circular,
            "pricePerMeal": r.price_per_meal,
        }
        for r in restaurants
    ]


@router.get("/vendors")
async def get_vendors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vendor))
    vendors = result.scalars().all()
    return [
        {
            "id": v.id,
            "name": v.name,
            "certifications": v.certifications,
            "carbonFactorPerCycle": v.carbon_factor_per_cycle,
            "containerTypes": v.container_types,
        }
        for v in vendors
    ]
