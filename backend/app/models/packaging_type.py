import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PackagingType(Base):
    __tablename__ = "packaging_types"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    material: Mapped[str] = mapped_column(String, default="")
    single_use_weight_kg: Mapped[float] = mapped_column(Float, default=0.025)
    reusable_cycle_co2e_factor: Mapped[float] = mapped_column(Float, default=0.15)
    expected_lifespan_cycles: Mapped[int] = mapped_column(Integer, default=500)
    factor_source: Mapped[str] = mapped_column(String, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
