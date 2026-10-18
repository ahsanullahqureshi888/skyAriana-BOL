from __future__ import annotations

import logging
from typing import AsyncGenerator
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

logger = logging.getLogger("sky_ariana.database")

db_url = settings.resolved_database_url
is_sqlite = "sqlite" in db_url.lower()

if is_sqlite:
    engine_kwargs = {
        "connect_args": {"check_same_thread": False},
        "pool_pre_ping": True,
        "future": True,
    }
else:
    # Modern PostgreSQL pool configuration for multi-PC office access
    engine_kwargs = {
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "pool_pre_ping": True,
        "isolation_level": "READ COMMITTED",
        "future": True,
    }

engine = create_async_engine(
    db_url,
    **engine_kwargs,
)

if is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def configure_sqlite_pragmas(dbapi_connection, connection_record):
        """Enable SQLite WAL mode, foreign keys, synchronous NORMAL, 64MB cache, and 256MB MMAP."""
        if hasattr(dbapi_connection, "execute"):
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode = WAL;")
                cursor.execute("PRAGMA synchronous = NORMAL;")
                cursor.execute("PRAGMA foreign_keys = ON;")
                cursor.execute("PRAGMA busy_timeout = 10000;")
                cursor.execute("PRAGMA temp_store = MEMORY;")
                cursor.execute("PRAGMA cache_size = -64000;")       # 64 MB page cache
                cursor.execute("PRAGMA mmap_size = 268435456;")     # 256 MB memory-mapped I/O
            finally:
                cursor.close()

import time
from backend.middleware.timing import record_query_metric

@event.listens_for(engine.sync_engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    context._query_start_time = time.perf_counter()

@event.listens_for(engine.sync_engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    start = getattr(context, "_query_start_time", None)
    if start is not None:
        dur_ms = (time.perf_counter() - start) * 1000.0
        record_query_metric(statement, dur_ms)


class TimedAsyncSession(AsyncSession):
    """AsyncSession with query duration measurement on the active asyncio task."""

    async def execute(self, statement, params=None, execution_options=None, bind_arguments=None, **kw):
        t0 = time.perf_counter()
        try:
            return await super().execute(
                statement,
                params=params,
                execution_options=execution_options,
                bind_arguments=bind_arguments,
                **kw,
            )
        finally:
            dur_ms = (time.perf_counter() - t0) * 1000.0
            record_query_metric(str(statement), dur_ms)


SessionLocal = async_sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
    class_=TimedAsyncSession,
)


class Base(DeclarativeBase):
    pass


from fastapi import HTTPException

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding database sessions with automatic rollback on error."""
    async with SessionLocal() as session:
        try:
            yield session
        except HTTPException:
            await session.rollback()
            raise
        except Exception as exc:
            logger.error(f"Database session error: {exc}", exc_info=True)
            await session.rollback()
            raise
        finally:
            await session.close()


async def ensure_performance_indexes(conn) -> None:
    """Ensure all required indexes exist for BOL search, container lookups, and ledger performance."""
    indexes = [
        # BOL indexes
        "CREATE INDEX IF NOT EXISTS ix_bol_records_status_date ON bol_records(status, issue_date);",
        "CREATE INDEX IF NOT EXISTS ix_bol_records_status_created ON bol_records(status, created_at DESC);",
        "CREATE INDEX IF NOT EXISTS ix_bol_records_company_date ON bol_records(company_id, issue_date);",
        "CREATE INDEX IF NOT EXISTS ix_bol_records_company_created ON bol_records(company_id, created_at DESC);",
        "CREATE INDEX IF NOT EXISTS ix_bol_records_shipper_date ON bol_records(shipper_id, issue_date);",
        "CREATE INDEX IF NOT EXISTS ix_bol_records_consignee_date ON bol_records(consignee_id, issue_date);",
        "CREATE INDEX IF NOT EXISTS ix_bol_records_created_id ON bol_records(created_at, id);",
        "CREATE INDEX IF NOT EXISTS ix_bol_records_created_id_desc ON bol_records(created_at DESC, id DESC);",
        "CREATE INDEX IF NOT EXISTS ix_bol_records_bol_num_nocase ON bol_records(bol_number COLLATE NOCASE);",
        # BOL Items & Containers
        "CREATE INDEX IF NOT EXISTS ix_bol_items_bol_commodity ON bol_items(bol_id, commodity_id);",
        "CREATE INDEX IF NOT EXISTS ix_containers_number ON containers(container_number);",
        "CREATE INDEX IF NOT EXISTS ix_containers_number_nocase ON containers(container_number COLLATE NOCASE);",
        "CREATE INDEX IF NOT EXISTS ix_containers_bol_id ON containers(bol_id);",
        # Trucks & Shipments
        "CREATE INDEX IF NOT EXISTS ix_trucks_number_nocase ON trucks(truck_number COLLATE NOCASE);",
        "CREATE INDEX IF NOT EXISTS ix_shipments_status_created ON shipments(status, created_at DESC);",
        "CREATE INDEX IF NOT EXISTS ix_shipments_bol_status ON shipments(bol_id, status);",
        # Invoices
        "CREATE INDEX IF NOT EXISTS ix_invoices_status_created ON invoices(status, created_at DESC);",
        "CREATE INDEX IF NOT EXISTS ix_invoices_cust_date ON invoices(customer_id, issue_date);",
        "CREATE INDEX IF NOT EXISTS ix_invoice_items_inv_amount ON invoice_items(invoice_id, amount);",
        # Documents
        "CREATE INDEX IF NOT EXISTS ix_documents_bol_type ON documents(bol_id, document_type);",
        "CREATE INDEX IF NOT EXISTS ix_documents_type_created ON documents(document_type, created_at DESC);",
        # Ledger indexes
        "CREATE INDEX IF NOT EXISTS ix_ledger_records_acc_date_id ON ledger_records(account_id, transaction_date, id);",
        "CREATE INDEX IF NOT EXISTS ix_ledger_records_acc_date_covering ON ledger_records(account_id, transaction_date, debit, credit);",
        "CREATE INDEX IF NOT EXISTS ix_ledger_records_date_id ON ledger_records(transaction_date, id);",
        "CREATE INDEX IF NOT EXISTS ix_ledger_records_curr_date_id ON ledger_records(currency, transaction_date, id);",
        "CREATE INDEX IF NOT EXISTS ix_ledger_records_curr_acc_date_id ON ledger_records(currency, account_id, transaction_date, id);",
        "CREATE INDEX IF NOT EXISTS ix_ledger_records_curr_acc_date_cov ON ledger_records(currency, account_id, transaction_date, debit, credit);",
        "CREATE INDEX IF NOT EXISTS ix_ledger_records_curr_acc_date_cov_full ON ledger_records(currency, account_id, transaction_date ASC, id ASC, debit, credit);",
    ]
    for idx_sql in indexes:
        try:
            await conn.execute(text(idx_sql))
        except Exception as exc:
            logger.debug(f"Index creation note ({idx_sql}): {exc}")


async def init_db() -> None:
    """Fast database initialization: check if schema exists; only create if missing."""
    async with engine.begin() as conn:
        def check_alembic_exists(sync_conn):
            from sqlalchemy import inspect
            inspector = inspect(sync_conn)
            return inspector.has_table("alembic_version")

        has_alembic = await conn.run_sync(check_alembic_exists)
        import backend.models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
        await ensure_performance_indexes(conn)

        if has_alembic:
            logger.info("Database schema verified (tables and performance indexes synchronized).")
            return

        await conn.execute(text(
            "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL, PRIMARY KEY (version_num));"
        ))
        res = await conn.execute(text("SELECT version_num FROM alembic_version;"))
        if not res.fetchall():
            await conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('9c12685e0336');"))
    logger.info("Database schema initialized successfully.")


async def verify_db_connection() -> dict:
    """Check database health, returning status and dialect metadata."""
    try:
        async with SessionLocal() as session:
            result = await session.execute(text("SELECT 1;"))
            row = result.scalar()
            if row != 1:
                return {"connected": False, "error": "Unexpected scalar result"}

            if settings.is_sqlite:
                # Read pragmas
                wal_res = await session.execute(text("PRAGMA journal_mode;"))
                journal_mode = wal_res.scalar()

                fk_res = await session.execute(text("PRAGMA foreign_keys;"))
                foreign_keys = fk_res.scalar()

                timeout_res = await session.execute(text("PRAGMA busy_timeout;"))
                busy_timeout = timeout_res.scalar()

                return {
                    "connected": True,
                    "dialect": "sqlite",
                    "journal_mode": journal_mode,
                    "foreign_keys": bool(foreign_keys),
                    "busy_timeout_ms": busy_timeout,
                }
            else:
                ver_res = await session.execute(text("SELECT version();"))
                pg_version = ver_res.scalar()
                return {
                    "connected": True,
                    "dialect": "postgresql",
                    "server_version": pg_version,
                    "pool_size": settings.DB_POOL_SIZE,
                    "max_overflow": settings.DB_MAX_OVERFLOW,
                }
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}", exc_info=True)
        return {"connected": False, "error": str(exc)}
