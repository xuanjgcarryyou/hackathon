import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ESGSummary(Base):
    __tablename__ = "esg_summaries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String, ForeignKey("companies.id"))
    period_start: Mapped[str] = mapped_column(String)
    period_end: Mapped[str] = mapped_column(String)
    total_meals: Mapped[int] = mapped_column(Integer, default=0)
    circular_meals: Mapped[int] = mapped_column(Integer, default=0)
    reduced_packaging_kg: Mapped[float] = mapped_column(Float, default=0.0)
    co2e_saved: Mapped[float] = mapped_column(Float, default=0.0)
    report_text_zh: Mapped[str] = mapped_column(Text, default="")
    report_text_en: Mapped[str] = mapped_column(Text, default="")
    tables: Mapped[list] = mapped_column(JSON, default=list)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    carbon_factor_source: Mapped[str] = mapped_column(String, default="")
    data_hash: Mapped[str] = mapped_column(String, default="")
    batch_ids: Mapped[list] = mapped_column(JSON, default=list)
