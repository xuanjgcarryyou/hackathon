import hashlib
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.container_batch import ContainerBatch
from app.models.esg_summary import ESGSummary
from app.services.esg_agent import generate_esg_report
from app.services.container_calc import calc_co2e_saved, DISPOSABLE_CO2E_SOURCE, CIRCULAR_CO2E_SOURCE

router = APIRouter()

PACKAGING_KG_PER_UNIT = 0.025


class ESGRequest(BaseModel):
    periodStart: str
    periodEnd: str


@router.post("/esg/generate")
async def create_esg_report(body: ESGRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=401, detail="company_id missing from token")

    result = await db.execute(
        select(ContainerBatch).where(
            ContainerBatch.company_id == company_id,
            ContainerBatch.status == "collected",
        )
    )
    batches = result.scalars().all()

    total_meals = sum(b.quantity for b in batches)
    circular_meals = sum(b.collected_count or 0 for b in batches)
    co2e_saved = sum(calc_co2e_saved(b.collected_count or 0, 0.15) for b in batches)
    reduced_packaging_kg = circular_meals * PACKAGING_KG_PER_UNIT

    batch_ids = [b.id for b in batches]
    raw_for_hash = [{"id": b.id, "qty": b.quantity, "collected": b.collected_count or 0} for b in batches]
    data_hash = hashlib.sha256(json.dumps(raw_for_hash, sort_keys=True).encode()).hexdigest()
    carbon_factor_source = f"一次性包材：{DISPOSABLE_CO2E_SOURCE}；循環容器：{CIRCULAR_CO2E_SOURCE}"

    report_data = {
        "period_start": body.periodStart,
        "period_end": body.periodEnd,
        "total_meals": total_meals,
        "circular_meals": circular_meals,
        "return_rate": circular_meals / total_meals if total_meals > 0 else 0,
        "reduced_packaging_kg": round(reduced_packaging_kg, 2),
        "co2e_saved": round(co2e_saved, 2),
        "vendor_name": "Loopick",
        "carbon_factor": 0.15,
        "carbon_factor_source": carbon_factor_source,
    }

    report_text_zh, report_text_en, tables, is_fallback = await generate_esg_report(report_data)

    summary = ESGSummary(
        id=str(uuid.uuid4()),
        company_id=company_id,
        period_start=body.periodStart,
        period_end=body.periodEnd,
        total_meals=total_meals,
        circular_meals=circular_meals,
        reduced_packaging_kg=reduced_packaging_kg,
        co2e_saved=co2e_saved,
        report_text_zh=report_text_zh,
        report_text_en=report_text_en,
        tables=tables,
        carbon_factor_source=carbon_factor_source,
        data_hash=data_hash,
        batch_ids=batch_ids,
    )
    db.add(summary)
    await db.commit()

    return {
        "reportId": summary.id,
        "totalMeals": total_meals,
        "circularMeals": circular_meals,
        "reducedPackagingKg": round(reduced_packaging_kg, 2),
        "co2eSaved": round(co2e_saved, 2),
        "reportTextZh": report_text_zh,
        "reportTextEn": report_text_en,
        "tables": tables,
        "carbonFactorSource": carbon_factor_source,
        "dataHash": data_hash,
        "isFallback": is_fallback,
    }


@router.get("/esg/{report_id}/export")
async def export_esg_report(report_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=401, detail="company_id missing from token")

    result = await db.execute(
        select(ESGSummary).where(
            ESGSummary.id == report_id,
            ESGSummary.company_id == company_id,
        )
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="Report not found")

    return_rate = summary.circular_meals / summary.total_meals if summary.total_meals > 0 else 0

    payload = {
        "schemaVersion": "1.0",
        "framework": "GHG Protocol Scope 3 Category 1 — Avoided Emissions",
        "reportId": summary.id,
        "companyId": summary.company_id,
        "period": {"start": summary.period_start, "end": summary.period_end},
        "generatedAt": summary.generated_at.isoformat() if summary.generated_at else None,
        "metrics": {
            "totalMeals": summary.total_meals,
            "circularMeals": summary.circular_meals,
            "returnRate": round(return_rate, 4),
            "reducedPackagingKg": round(summary.reduced_packaging_kg, 3),
            "co2eSavedKg": round(summary.co2e_saved, 3),
        },
        "methodology": {
            "carbonFactorSource": summary.carbon_factor_source,
            "dataHash": summary.data_hash,
            "batchIds": summary.batch_ids,
        },
        "reportText": {
            "zh": summary.report_text_zh,
            "en": summary.report_text_en,
        },
        "tables": summary.tables,
    }

    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="esg-report-{report_id[:8]}.json"'},
    )
