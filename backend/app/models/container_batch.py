import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ContainerBatch(Base):
    __tablename__ = "container_batches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    qr_code: Mapped[str] = mapped_column(String, unique=True, index=True)
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"))
    vendor_id: Mapped[str] = mapped_column(String, ForeignKey("vendors.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    dispatched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    collected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    collected_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, default="dispatched")
