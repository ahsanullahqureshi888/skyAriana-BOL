import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_timing_middleware_headers(async_client: AsyncClient):
    """Verify performance timing middleware populates X-Process-Time and Server-Timing."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200

    assert "x-process-time" in response.headers
    process_time = response.headers["x-process-time"]
    assert process_time.endswith("ms")
    # Verify numeric duration is positive
    val = float(process_time.replace("ms", ""))
    assert val >= 0.0

    assert "server-timing" in response.headers
    assert "total;dur=" in response.headers["server-timing"]
