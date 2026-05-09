from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.esg_calculation_method import ESGCalculationMethod

router = APIRouter()


@router.get("/esg/calculation-methods")
async def list_calculation_methods(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ESGCalculationMethod).where(ESGCalculationMethod.active == True))
    items = result.scalars().all()
    return [
        {
            "id": m.id,
            "methodName": m.method_name,
            "scopeCategory": m.scope_category,
            "emissionFactorSource": m.emission_factor_source,
            "factorVersion": m.factor_version,
            "validRegion": m.valid_region,
            "assumptionNote": m.assumption_note,
        }
        for m in items
    ]
