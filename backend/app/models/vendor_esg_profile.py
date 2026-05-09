import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class VendorESGProfile(Base):
    __tablename__ = "vendor_esg_profiles"
    __table_args__ = (UniqueConstraint("vendor_id"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_id: Mapped[str] = mapped_column(String, ForeignKey("vendors.id"))
    description: Mapped[str] = mapped_column(String, default="")
    total_reusable_items_served: Mapped[int] = mapped_column(Integer, default=0)
    average_return_rate: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_co2e_saved: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_packaging_reduced_kg: Mapped[float] = mapped_column(Float, default=0.0)
    verification_status: Mapped[str] = mapped_column(String, default="self_declared")
    partner_groups: Mapped[list] = mapped_column(JSON, default=list)
    public_profile_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
