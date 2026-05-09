import uuid
from sqlalchemy import String, Boolean, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_id: Mapped[str] = mapped_column(String, ForeignKey("vendors.id"))
    name: Mapped[str] = mapped_column(String)
    supports_circular: Mapped[bool] = mapped_column(Boolean, default=True)
    price_per_meal: Mapped[float] = mapped_column(Float)
