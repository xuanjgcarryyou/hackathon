import uuid
from sqlalchemy import String, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String)
    certifications: Mapped[list] = mapped_column(JSON, default=list)
    carbon_factor_per_cycle: Mapped[float] = mapped_column(Float, default=0.15)
    container_types: Mapped[list] = mapped_column(JSON, default=list)
