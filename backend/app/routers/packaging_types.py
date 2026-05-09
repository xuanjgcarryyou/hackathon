from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.packaging_type import PackagingType

router = APIRouter()


@router.get("/packaging-types")
async def list_packaging_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PackagingType).where(PackagingType.active == True))
    items = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "material": p.material,
            "singleUseWeightKg": p.single_use_weight_kg,
            "reusableCycleCo2eFactor": p.reusable_cycle_co2e_factor,
            "expectedLifespanCycles": p.expected_lifespan_cycles,
            "factorSource": p.factor_source,
        }
        for p in items
    ]
