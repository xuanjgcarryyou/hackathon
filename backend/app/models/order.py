import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"))
    restaurant_id: Mapped[str] = mapped_column(String, ForeignKey("restaurants.id"))
    vendor_id: Mapped[str] = mapped_column(String, ForeignKey("vendors.id"))
    estimated_count: Mapped[int] = mapped_column(Integer)
    week_start: Mapped[str] = mapped_column(String)  # ISO date
    use_circular: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
