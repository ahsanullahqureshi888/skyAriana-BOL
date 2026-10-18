from __future__ import annotations

import os
from pathlib import Path
import pytest
from sqlalchemy import create_engine, inspect
from alembic import command
from alembic.config import Config


@pytest.fixture
def temp_alembic_db(tmp_path: Path):
    """Provide a temporary SQLite database path for migration testing."""
    db_file = tmp_path / "alembic_test.db"
    db_url = f"sqlite:///{db_file.as_posix()}"
    yield db_url
    if db_file.exists():
        try:
            db_file.unlink()
        except Exception:
            pass


def test_alembic_migration_upgrade_and_downgrade(temp_alembic_db: str):
    """Verify that Alembic migrations cleanly apply ('head') and rollback ('base')

    on a fresh SQLite database, creating and dropping all 36 tables without errors.
    """
    alembic_ini_path = Path(__file__).resolve().parent.parent.parent / "backend" / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option("sqlalchemy.url", temp_alembic_db)

    # 1. Upgrade to HEAD
    command.upgrade(alembic_cfg, "head")

    engine = create_engine(temp_alembic_db)
    with engine.connect() as conn:
        inspector = inspect(conn)
        tables = set(inspector.get_table_names())

        required_tables = {
            "companies",
            "shippers",
            "consignees",
            "notify_parties",
            "agents",
            "customers",
            "clients",
            "suppliers",
            "bol_records",
            "bol_items",
            "shipments",
            "containers",
            "trucks",
            "drivers",
            "routes",
            "ports",
            "locations",
            "commodities",
            "ledgers",
            "ledger_records",
            "invoices",
            "invoice_items",
            "payments",
            "expenses",
            "freight_charges",
            "discounts",
            "packing_lists",
            "transit_papers",
            "phytosanitary_certificates",
            "documents",
            "attachments",
            "reports",
            "users",
            "settings",
            "audit_logs",
            "backups",
            "alembic_version",
        }
        assert required_tables.issubset(tables), f"Missing tables after upgrade: {required_tables - tables}"

    # 2. Downgrade to BASE
    command.downgrade(alembic_cfg, "base")

    with engine.connect() as conn:
        inspector = inspect(conn)
        tables_after_downgrade = set(inspector.get_table_names())
        # Only alembic_version (or empty) should remain
        remaining = tables_after_downgrade - {"alembic_version"}
        assert len(remaining) == 0, f"Tables still remain after downgrade base: {remaining}"

    # 3. Upgrade to HEAD again to verify idempotency
    command.upgrade(alembic_cfg, "head")

    with engine.connect() as conn:
        inspector = inspect(conn)
        tables_reupgraded = set(inspector.get_table_names())
        assert required_tables.issubset(tables_reupgraded)

    engine.dispose()
