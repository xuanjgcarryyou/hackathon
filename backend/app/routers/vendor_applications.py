import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.vendor_application import VendorApplication

router = APIRouter()


class VendorApplyRequest(BaseModel):
    companyName: str
    contactEmail: str
    contactPhone: str
    businessId: str
    certifications: list[str]
    containerTypes: list[str]
    carbonFactorPerCycle: float = 0.12
    description: str = ""
    materialFileNames: list[str] = []


class ReviewRequest(BaseModel):
    action: str   # "approve" | "reject"
    note: str = ""


def _serialize(app: VendorApplication) -> dict:
    return {
        "id": app.id,
        "companyName": app.company_name,
        "contactEmail": app.contact_email,
        "contactPhone": app.contact_phone,
        "businessId": app.business_id,
        "certifications": app.certifications,
        "containerTypes": app.container_types,
        "carbonFactorPerCycle": app.carbon_factor_per_cycle,
        "description": app.description,
        "materialFileNames": app.material_file_names,
        "status": app.status,
        "submittedAt": app.submitted_at.isoformat() + "Z",
        "reviewedAt": (app.reviewed_at.isoformat() + "Z") if app.reviewed_at else None,
        "reviewNote": app.review_note,
    }


@router.post("/vendors/apply")
async def apply_vendor(body: VendorApplyRequest, db: AsyncSession = Depends(get_db)):
    application = VendorApplication(
        id=str(uuid.uuid4()),
        company_name=body.companyName,
        contact_email=body.contactEmail,
        contact_phone=body.contactPhone,
        business_id=body.businessId,
        certifications=body.certifications,
        container_types=body.containerTypes,
        carbon_factor_per_cycle=body.carbonFactorPerCycle,
        description=body.description,
        material_file_names=body.materialFileNames,
        status="pending",
        submitted_at=datetime.utcnow(),
    )
    db.add(application)
    await db.commit()
    return {"applicationId": application.id, "status": "pending"}


@router.get("/vendors/applications")
async def list_applications(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if user.get("role") not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail={"error": "FORBIDDEN"})

    result = await db.execute(
        select(VendorApplication).order_by(VendorApplication.submitted_at.desc())
    )
    apps = result.scalars().all()
    return [_serialize(a) for a in apps]


@router.post("/vendors/applications/{application_id}/review")
async def review_application(
    application_id: str,
    body: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if user.get("role") not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail={"error": "FORBIDDEN"})

    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail={"error": "INVALID_ACTION"})

    result = await db.execute(
        select(VendorApplication).where(VendorApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND"})

    application.status = "approved" if body.action == "approve" else "rejected"
    application.reviewed_at = datetime.utcnow()
    application.review_note = body.note or None
    application.reviewed_by = user.get("sub")
    await db.commit()

    return _serialize(application)
