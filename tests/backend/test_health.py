import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoints(async_client: AsyncClient):
    """Verify /api/v1/health and root /health liveness probe."""
    for path in ["/api/v1/health", "/health"]:
        response = await async_client.get(path)
        assert response.status_code == 200, f"Failed on {path}: {response.text}"
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "sky-ariana-backend"
        assert "version" in data
        assert "timestamp" in data
        assert data["uptime_seconds"] >= 0
