# shared/schemas.py — Backend Pydantic models
# DO NOT modify without team consensus. Add only, never rename.

from pydantic import BaseModel
from typing import Literal, Optional, List
from datetime import datetime


class UserRecord(BaseModel):
    id: str
    company_id: str
    role: Literal['admin', 'employee', 'manager']
    name: str
    email: str


class Company(BaseModel):
    id: str
    name: str
    employee_count: int


class Vendor(BaseModel):
    id: str
    name: str
    certifications: List[str]
    carbon_factor_per_cycle: float
    container_types: List[str]


class Restaurant(BaseModel):
    id: str
    vendor_id: str
    name: str
    supports_circular: bool
    price_per_meal: float


class ContainerBatch(BaseModel):
    id: str
    qr_code: str
    company_id: str
    vendor_id: str
    quantity: int
    dispatched_at: datetime
    collected_at: Optional[datetime] = None
    collected_count: Optional[int] = None
    status: Literal['dispatched', 'collected', 'cleaning', 'ready']


class ContainerStats(BaseModel):
    company_id: str
    period: str
    dispatched: int
    collected: int
    return_rate: float
    co2e_saved: float
    reduced_packaging_count: int


class ESGTable(BaseModel):
    title: str
    headers: List[str]
    rows: List[List[str]]


class ESGReport(BaseModel):
    id: str
    company_id: str
    period_start: str
    period_end: str
    total_meals: int
    circular_meals: int
    reduced_packaging_kg: float
    co2e_saved: float
    report_text_zh: str
    report_text_en: str
    tables: List[ESGTable]
    generated_at: datetime
