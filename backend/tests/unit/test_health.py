"""Tests for health and readiness probes."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_liveness_probe(client: AsyncClient):
    """Ensure /health returns 200 OK with expected payload."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "service" in data
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time" in response.headers


@pytest.mark.asyncio
async def test_ready_readiness_probe(client: AsyncClient):
    """Ensure /ready succeeds when database is reachable."""
    response = await client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
