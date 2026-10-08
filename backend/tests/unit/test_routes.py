"""Unit and integration tests for Route and Stop endpoints."""

import pytest
from httpx import AsyncClient


async def get_admin_token(client: AsyncClient) -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Route Master",
            "email": "routes@admin.example.com",
            "password": "MasterPassword123!",
            "role": "ADMIN",
        },
    )
    return res.json()["access_token"]


async def get_passenger_token(client: AsyncClient) -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Passenger User",
            "email": "routepassenger@test.example.com",
            "password": "RiderPassword123!",
            "role": "PASSENGER",
        },
    )
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_can_create_route_and_stops_in_sequence(client: AsyncClient):
    """Ensure route creation and ordered stop addition works."""
    token = await get_admin_token(client)

    route_res = await client.post(
        "/api/v1/admin/routes",
        json={
            "name": "Chennai to Pondicherry Coastal",
            "origin": "Chennai",
            "destination": "Pondicherry",
            "distance_km": 150.0,
            "estimated_duration_minutes": 210,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert route_res.status_code == 201
    route_id = route_res.json()["id"]

    # Add stop 1
    stop1_res = await client.post(
        f"/api/v1/admin/routes/{route_id}/stops",
        json={
            "name": "Chennai CMBT",
            "sequence_number": 1,
            "latitude": 13.0694,
            "longitude": 80.2057,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert stop1_res.status_code == 201

    # Add stop 2
    stop2_res = await client.post(
        f"/api/v1/admin/routes/{route_id}/stops",
        json={
            "name": "Mahabalipuram",
            "sequence_number": 2,
            "latitude": 12.6269,
            "longitude": 80.1927,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert stop2_res.status_code == 201

    # Fetch sequenced stops through public endpoint
    stops_res = await client.get(f"/api/v1/routes/{route_id}/stops")
    assert stops_res.status_code == 200
    stops = stops_res.json()
    assert len(stops) == 2
    assert stops[0]["sequence_number"] == 1
    assert stops[1]["sequence_number"] == 2


@pytest.mark.asyncio
async def test_non_admin_cannot_create_route(client: AsyncClient):
    """Ensure passenger cannot create a route."""
    token = await get_passenger_token(client)
    res = await client.post(
        "/api/v1/admin/routes",
        json={"name": "Unauthorized Route", "origin": "CityA", "destination": "CityB"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_duplicate_stop_sequence_rejected(client: AsyncClient):
    """Ensure two stops cannot share the same sequence number on the same route."""
    token = await get_admin_token(client)
    route_res = await client.post(
        "/api/v1/admin/routes",
        json={"name": "Seq Test Route", "origin": "CityA", "destination": "CityB"},
        headers={"Authorization": f"Bearer {token}"},
    )
    route_id = route_res.json()["id"]

    await client.post(
        f"/api/v1/admin/routes/{route_id}/stops",
        json={"name": "Stop Alpha", "sequence_number": 1, "latitude": 12.0, "longitude": 77.0},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Duplicate sequence 1
    dup_res = await client.post(
        f"/api/v1/admin/routes/{route_id}/stops",
        json={"name": "Stop Beta", "sequence_number": 1, "latitude": 12.1, "longitude": 77.1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dup_res.status_code == 409
    assert dup_res.json()["error"]["code"] == "DUPLICATE_STOP_SEQUENCE"


@pytest.mark.asyncio
async def test_invalid_coordinates_rejected(client: AsyncClient):
    """Ensure latitude beyond 90 or longitude beyond 180 is rejected."""
    token = await get_admin_token(client)
    route_res = await client.post(
        "/api/v1/admin/routes",
        json={"name": "Coord Test Route", "origin": "CityA", "destination": "CityB"},
        headers={"Authorization": f"Bearer {token}"},
    )
    route_id = route_res.json()["id"]

    # Invalid lat > 90
    res = await client.post(
        f"/api/v1/admin/routes/{route_id}/stops",
        json={
            "name": "North Pole Extreme",
            "sequence_number": 1,
            "latitude": 95.0,
            "longitude": 77.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_admin_can_deactivate_and_reactivate_route(client: AsyncClient):
    """Ensure route status transitions work."""
    token = await get_admin_token(client)
    route_res = await client.post(
        "/api/v1/admin/routes",
        json={"name": "Seasonal Hill Route", "origin": "Coimbatore", "destination": "Ooty"},
        headers={"Authorization": f"Bearer {token}"},
    )
    route_id = route_res.json()["id"]

    # Deactivate
    deact_res = await client.post(
        f"/api/v1/admin/routes/{route_id}/deactivate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Reactivate
    react_res = await client.post(
        f"/api/v1/admin/routes/{route_id}/reactivate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert react_res.status_code == 200
    assert react_res.json()["is_active"] is True
