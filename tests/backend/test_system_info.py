import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_system_info_endpoint(async_client: AsyncClient):
    """Verify /api/v1/system/info returns accurate configuration and diagnostics."""
    response = await async_client.get("/api/v1/system/info")
    assert response.status_code == 200, response.text
    data = response.json()

    assert "app_name" in data
    assert "version" in data
    assert "environment" in data
    assert "python_version" in data
    assert "platform" in data
    assert "database_url" in data
    assert "database_engine" in data
    assert data["wal_mode"] is True
    assert "data_directory" in data
    assert "logs_directory" in data
    assert "server_time" in data
    assert data["uptime_seconds"] >= 0
