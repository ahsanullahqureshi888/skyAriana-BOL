"""Pytest suite configuration and fixtures for backend testing."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from httpx import ASGITransport, AsyncClient
from backend.main import app
from backend.database import init_db


@pytest.fixture
async def setup_test_database():
    """Ensure database schema is created before tests run."""
    await init_db()


@pytest.fixture
async def async_client():
    """Yield an AsyncClient bound to the FastAPI application with test isolation."""
    await init_db()
    from backend.database import SessionLocal
    from backend.models.logistics import BOLModel
    from backend.models.accounting import LedgerModel
    from sqlalchemy import delete

    async with SessionLocal() as session:
        await session.execute(delete(BOLModel).where(BOLModel.bol_number.like("%TEST%")))
        await session.execute(delete(BOLModel).where(BOLModel.bol_number.like("%CLONE%")))
        await session.execute(delete(LedgerModel).where(LedgerModel.account_id == "ACC-AFG-999"))
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
