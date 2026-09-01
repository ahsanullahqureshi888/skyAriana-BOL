from __future__ import annotations

import os
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from backend.config import DATABASE_URL, EXPORTS_DIR, REPORTS_DIR, UPLOADS_DIR

# Adapt database URL for async SQLite
async_db_url = DATABASE_URL
if async_db_url.startswith("sqlite://") and not async_db_url.startswith("sqlite+aiosqlite://"):
    async_db_url = async_db_url.replace("sqlite://", "sqlite+aiosqlite://")

connect_args = {"check_same_thread": False} if async_db_url.startswith("sqlite") else {}
engine = create_async_engine(
    async_db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)


@event.listens_for(engine.sync_engine, "connect")
def configure_sqlite_pragmas(dbapi_connection, connection_record):
    """Enable SQLite WAL mode, foreign key constraints, and 10s busy timeout for high concurrency."""
    if hasattr(dbapi_connection, "execute"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode = WAL;")
            cursor.execute("PRAGMA synchronous = NORMAL;")
            cursor.execute("PRAGMA foreign_keys = ON;")
            cursor.execute("PRAGMA busy_timeout = 10000;")
            cursor.execute("PRAGMA temp_store = MEMORY;")
        finally:
            cursor.close()


SessionLocal = async_sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
    class_=AsyncSession,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as db:
        try:
            yield db
        except Exception:
            await db.rollback()
            raise
        finally:
            await db.close()


async def init_db() -> None:
    from backend.models import core  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

