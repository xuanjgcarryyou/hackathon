import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ESGCalculationMethod(Base):
    __tablename__ = "esg_calculation_methods"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    method_name: Mapped[str] = mapped_column(String)
    scope_category: Mapped[str] = mapped_column(String)
    emission_factor_source: Mapped[str] = mapped_column(Text, default="")
    factor_version: Mapped[str] = mapped_column(String, default="")
    valid_region: Mapped[str] = mapped_column(String, default="TW")
    assumption_note: Mapped[str] = mapped_column(Text, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
