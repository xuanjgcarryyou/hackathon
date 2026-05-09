import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/hackathon")
ASYNC_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(ASYNC_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        from app.models import user, company, vendor, restaurant, order, container_batch, esg_summary, vendor_application, packaging_type, vendor_esg_profile, esg_calculation_method, carbon  # noqa
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        for col, coltype in [
            ("carbon_factor_source", "TEXT DEFAULT ''"),
            ("data_hash", "TEXT DEFAULT ''"),
            ("batch_ids", "JSON DEFAULT '[]'"),
        ]:
            await conn.execute(text(
                f"ALTER TABLE esg_summaries ADD COLUMN IF NOT EXISTS {col} {coltype}"
            ))
        for col, coltype in [
            ("collected_by_user_id", "TEXT"),
        ]:
            await conn.execute(text(
                f"ALTER TABLE container_batches ADD COLUMN IF NOT EXISTS {col} {coltype}"
            ))
