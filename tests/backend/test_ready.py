import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ready_endpoints(async_client: AsyncClient):
    """Verify /api/v1/ready and root /ready readiness probe."""
    for path in ["/api/v1/ready", "/ready"]:
        response = await async_client.get(path)
        assert response.status_code == 200, f"Failed on {path}: {response.text}"
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"] == "connected"
        assert data["storage"] == "ready"
        assert "checks" in data
        assert data["checks"]["database"]["connected"] is True
        assert data["checks"]["storage"]["writable"] is True
