import uuid
from datetime import datetime
from sqlalchemy import String, Float, JSON, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class VendorApplication(Base):
    __tablename__ = "vendor_applications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name: Mapped[str] = mapped_column(String)
    contact_email: Mapped[str] = mapped_column(String)
    contact_phone: Mapped[str] = mapped_column(String)
    business_id: Mapped[str] = mapped_column(String)
    certifications: Mapped[list] = mapped_column(JSON, default=list)
    container_types: Mapped[list] = mapped_column(JSON, default=list)
    carbon_factor_per_cycle: Mapped[float] = mapped_column(Float, default=0.12)
    description: Mapped[str] = mapped_column(Text, default="")
    material_file_names: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String, default="pending")
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String, nullable=True)
