import uuid
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String)
    employee_count: Mapped[int] = mapped_column(Integer, default=0)
    esg_format: Mapped[str] = mapped_column(String, default="ghg_scope3")
