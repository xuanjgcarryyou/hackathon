import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.vendor import Vendor
from app.models.vendor_esg_profile import VendorESGProfile

router = APIRouter()


@router.get("/vendors/public-esg")
async def list_public_vendor_esg(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Vendor, VendorESGProfile)
        .join(VendorESGProfile, Vendor.id == VendorESGProfile.vendor_id, isouter=True)
        .where(VendorESGProfile.public_profile_enabled == True)
    )
    rows = result.all()
    return [
        {
            "vendorId": vendor.id,
            "vendorName": vendor.name,
            "certifications": vendor.certifications,
            "carbonFactorPerCycle": vendor.carbon_factor_per_cycle,
            "containerTypes": vendor.container_types,
            "description": profile.description if profile else "",
            "totalReusableItemsServed": profile.total_reusable_items_served if profile else 0,
            "averageReturnRate": profile.average_return_rate if profile else 0.0,
            "estimatedCo2eSaved": profile.estimated_co2e_saved if profile else 0.0,
            "estimatedPackagingReducedKg": profile.estimated_packaging_reduced_kg if profile else 0.0,
            "verificationStatus": profile.verification_status if profile else "unverified",
            "partnerGroups": profile.partner_groups if profile else [],
        }
        for vendor, profile in rows
    ]


@router.get("/vendors/{vendor_id}/esg-profile")
async def get_vendor_esg_profile(vendor_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(VendorESGProfile).where(VendorESGProfile.vendor_id == vendor_id))
    profile = result.scalar_one_or_none()
    if not profile:
        return {}
    return {
        "vendorId": vendor_id,
        "description": profile.description,
        "totalReusableItemsServed": profile.total_reusable_items_served,
        "averageReturnRate": profile.average_return_rate,
        "estimatedCo2eSaved": profile.estimated_co2e_saved,
        "estimatedPackagingReducedKg": profile.estimated_packaging_reduced_kg,
        "verificationStatus": profile.verification_status,
        "partnerGroups": profile.partner_groups,
        "publicProfileEnabled": profile.public_profile_enabled,
    }


class ESGProfileUpdate(BaseModel):
    description: str | None = None
    verificationStatus: str | None = None
    partnerGroups: list | None = None
    publicProfileEnabled: bool | None = None


@router.patch("/vendors/{vendor_id}/esg-profile")
async def update_vendor_esg_profile(vendor_id: str, body: ESGProfileUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(VendorESGProfile).where(VendorESGProfile.vendor_id == vendor_id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = VendorESGProfile(id=str(uuid.uuid4()), vendor_id=vendor_id)
        db.add(profile)
    if body.description is not None:
        profile.description = body.description
    if body.verificationStatus is not None:
        profile.verification_status = body.verificationStatus
    if body.partnerGroups is not None:
        profile.partner_groups = body.partnerGroups
    if body.publicProfileEnabled is not None:
        profile.public_profile_enabled = body.publicProfileEnabled
    profile.updated_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}
