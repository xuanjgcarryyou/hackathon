import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Float, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CarbonFactor(Base):
    __tablename__ = "carbon_factors"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    item_type: Mapped[str] = mapped_column(String)
    lifecycle_stage: Mapped[str] = mapped_column(String)
    model_type: Mapped[str] = mapped_column(String)
    material: Mapped[str] = mapped_column(String, default="pp")
    emission_factor: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String, default="kg_co2e_per_item")
    source_name: Mapped[str] = mapped_column(String, default="Demo Estimate")
    source_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    region: Mapped[str] = mapped_column(String, default="TW")
    confidence_level: Mapped[str] = mapped_column(String, default="low")
    is_demo_factor: Mapped[bool] = mapped_column(Boolean, default=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PackagingLifecycleModel(Base):
    __tablename__ = "packaging_lifecycle_models"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name: Mapped[str] = mapped_column(String)
    model_type: Mapped[str] = mapped_column(String)
    item_type: Mapped[str] = mapped_column(String)
    expected_lifespan_cycles: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    washing_required: Mapped[bool] = mapped_column(Boolean, default=False)
    disposal_method: Mapped[str] = mapped_column(String, default="incineration")
    default_transport_distance_km: Mapped[float] = mapped_column(Float, default=10.0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CarbonCalculationResult(Base):
    __tablename__ = "carbon_calculation_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String)
    item_type: Mapped[str] = mapped_column(String)
    quantity: Mapped[int] = mapped_column(Integer)
    single_use_total_kg_co2e: Mapped[float] = mapped_column(Float)
    reusable_total_kg_co2e: Mapped[float] = mapped_column(Float)
    estimated_saved_kg_co2e: Mapped[float] = mapped_column(Float)
    successful_reuse_count: Mapped[int] = mapped_column(Integer)
    confidence_level: Mapped[str] = mapped_column(String, default="low")
    is_demo_estimate: Mapped[bool] = mapped_column(Boolean, default=True)
    factor_snapshot_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
