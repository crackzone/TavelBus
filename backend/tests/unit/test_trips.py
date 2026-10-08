"""Unit and integration tests for Trips scheduling and overlap validation."""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


async def get_admin_token(client: AsyncClient) -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Trip Dispatcher",
            "email": "dispatcher@trips.example.com",
            "password": "DispatchPassword123!",
            "role": "ADMIN",
        },
    )
    return res.json()["access_token"]


async def setup_bus_and_route(client: AsyncClient, token: str) -> tuple[str, str]:
    """Helper creating a test bus and route."""
    bus_res = await client.post(
        "/api/v1/admin/buses",
        json={
            "registration_number": "KA-51-TRIP-01",
            "display_name": "Trip Bus 01",
            "seat_capacity": 40,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    bus_id = bus_res.json()["id"]

    route_res = await client.post(
        "/api/v1/admin/routes",
        json={"name": "Trip Route 01", "origin": "CityA", "destination": "CityB"},
        headers={"Authorization": f"Bearer {token}"},
    )
    route_id = route_res.json()["id"]

    return bus_id, route_id


@pytest.mark.asyncio
async def test_admin_can_schedule_valid_trip(client: AsyncClient):
    """Ensure valid future trip creation succeeds."""
    token = await get_admin_token(client)
    bus_id, route_id = await setup_bus_and_route(client, token)

    dep = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()  # noqa: UP017
    arr = (datetime.now(timezone.utc) + timedelta(days=2, hours=3)).isoformat()  # noqa: UP017

    res = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": dep,
            "arrival_time": arr,
            "fare": 50.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "SCHEDULED"
    assert float(data["fare"]) == 50.0


@pytest.mark.asyncio
async def test_overlapping_bus_trip_rejected(client: AsyncClient):
    """Ensure overlapping schedule on same bus returns 409 BUS_TRIP_CONFLICT."""
    token = await get_admin_token(client)
    bus_id, route_id = await setup_bus_and_route(client, token)

    t0 = datetime.now(timezone.utc) + timedelta(days=3)  # noqa: UP017
    t1 = t0 + timedelta(hours=4)

    # First trip: 0h to 4h
    res1 = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": t0.isoformat(),
            "arrival_time": t1.isoformat(),
            "fare": 40.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    # Overlapping trip: 2h to 6h (starts before trip1 ends)
    t_overlap_start = t0 + timedelta(hours=2)
    t_overlap_end = t0 + timedelta(hours=6)

    res2 = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": t_overlap_start.isoformat(),
            "arrival_time": t_overlap_end.isoformat(),
            "fare": 40.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 409
    assert res2.json()["error"]["code"] == "BUS_TRIP_CONFLICT"


@pytest.mark.asyncio
async def test_non_overlapping_trips_succeed(client: AsyncClient):
    """Ensure sequential back-to-back trips on same bus succeed."""
    token = await get_admin_token(client)
    bus_id, route_id = await setup_bus_and_route(client, token)

    t0 = datetime.now(timezone.utc) + timedelta(days=5)  # noqa: UP017
    t1 = t0 + timedelta(hours=3)
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=3)

    # Trip 1
    res1 = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": t0.isoformat(),
            "arrival_time": t1.isoformat(),
            "fare": 30.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    # Trip 2 (after Trip 1 has finished)
    res2 = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": t2.isoformat(),
            "arrival_time": t3.isoformat(),
            "fare": 35.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 201


@pytest.mark.asyncio
async def test_inactive_bus_rejected_for_trip(client: AsyncClient):
    """Ensure an inactive bus cannot be assigned to a new trip."""
    token = await get_admin_token(client)
    bus_id, route_id = await setup_bus_and_route(client, token)

    # Deactivate bus
    await client.post(
        f"/api/v1/admin/buses/{bus_id}/deactivate", headers={"Authorization": f"Bearer {token}"}
    )

    t0 = datetime.now(timezone.utc) + timedelta(days=1)  # noqa: UP017
    t1 = t0 + timedelta(hours=3)

    res = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": t0.isoformat(),
            "arrival_time": t1.isoformat(),
            "fare": 50.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "BUS_INACTIVE"


@pytest.mark.asyncio
async def test_admin_can_cancel_trip_and_remains_in_history(client: AsyncClient):
    """Ensure cancelled trip changes status to CANCELLED and is still retrievable."""
    token = await get_admin_token(client)
    bus_id, route_id = await setup_bus_and_route(client, token)

    t0 = datetime.now(timezone.utc) + timedelta(days=2)  # noqa: UP017
    t1 = t0 + timedelta(hours=3)

    create_res = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": t0.isoformat(),
            "arrival_time": t1.isoformat(),
            "fare": 50.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    trip_id = create_res.json()["id"]

    # Cancel trip
    cancel_res = await client.post(
        f"/api/v1/admin/trips/{trip_id}/cancel", headers={"Authorization": f"Bearer {token}"}
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Query public trip endpoint
    pub_res = await client.get(f"/api/v1/trips/{trip_id}")
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "CANCELLED"
