import pytest
from sqlalchemy import text
from backend.database import SessionLocal, verify_db_connection


@pytest.mark.asyncio
async def test_database_connection_and_pragmas(setup_test_database):
    """Verify SQLite WAL mode, foreign keys, and busy timeout."""
    check = await verify_db_connection()
    assert check["connected"] is True
    assert check["journal_mode"].lower() == "wal"
    assert check["foreign_keys"] is True
    assert check["busy_timeout_ms"] == 10000


@pytest.mark.asyncio
async def test_database_session_rollback(setup_test_database):
    """Verify session rollback behavior on error."""
    async with SessionLocal() as session:
        try:
            # Intentionally bad query
            await session.execute(text("SELECT * FROM non_existent_table_xyz;"))
        except Exception:
            await session.rollback()

        # Session should still be usable after rollback
        res = await session.execute(text("SELECT 1;"))
        assert res.scalar() == 1


@pytest.mark.asyncio
async def test_database_entity_tables_registered_and_created(setup_test_database):
    """Verify that all core entity tables are successfully created in SQLite."""
    async with SessionLocal() as session:
        result = await session.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        )
        table_names = {row[0] for row in result.fetchall()}

        required_tables = {
            "bol_records",
            "ledger_records",
            "companies",
            "customers",
            "shipments",
        }
        for table in required_tables:
            assert table in table_names, f"Table {table} was not created in database! Tables: {table_names}"
