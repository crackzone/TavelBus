"""Unit and integration tests for revenue analytics, route summaries, and manifests."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


async def get_tokens(client: AsyncClient) -> tuple[str, str]:
    """Helper to register admin and passenger."""
    suffix = str(uuid.uuid4())[:6]
    admin_res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": f"Finance Admin {suffix}",
            "email": f"finance_{suffix}@admin.example.com",
            "password": "AdminPassword123!",
            "role": "ADMIN",
        },
    )
    passenger_res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": f"Passenger {suffix}",
            "email": f"passenger_{suffix}@user.example.com",
            "password": "UserPassword123!",
            "role": "PASSENGER",
        },
    )
    return admin_res.json()["access_token"], passenger_res.json()["access_token"]


async def setup_trip_and_seats(
    client: AsyncClient,
    admin_token: str,
) -> tuple[str, str, str]:
    """Helper creating a test bus, route, and trip."""
    rand = str(uuid.uuid4())[:6]
    bus_res = await client.post(
        "/api/v1/admin/buses",
        json={
            "registration_number": f"KA-01-REV-{rand}",
            "display_name": f"Rev Bus {rand}",
            "seat_capacity": 20,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    bus_id = bus_res.json()["id"]

    route_res = await client.post(
        "/api/v1/admin/routes",
        json={
            "name": f"Express Highway {rand}",
            "origin": "Bangalore",
            "destination": "Mysore",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    route_id = route_res.json()["id"]

    dep = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()  # noqa: UP017
    arr = (datetime.now(timezone.utc) + timedelta(days=1, hours=3)).isoformat()  # noqa: UP017

    trip_res = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": dep,
            "arrival_time": arr,
            "fare": 500.00,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    trip_id = trip_res.json()["id"]
    return trip_id, bus_id, route_id


@pytest.mark.asyncio
async def test_revenue_summary_with_confirmed_and_cancelled_bookings(client: AsyncClient):
    """Test gross, refunded, and net revenue calculation."""
    admin_token, passenger_token = await get_tokens(client)
    trip_id, _, _ = await setup_trip_and_seats(client, admin_token)

    # Book Seat 1
    book_res1 = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 1},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert book_res1.status_code == 201

    # Book Seat 2
    book_res2 = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 2},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert book_res2.status_code == 201
    booking2_id = book_res2.json()["id"]

    # Cancel Seat 2
    cancel_res = await client.post(
        f"/api/v1/bookings/{booking2_id}/cancel",
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert cancel_res.status_code == 200

    # Query revenue summary as Admin
    summary_res = await client.get(
        "/api/v1/admin/revenue/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert summary_res.status_code == 200
    data = summary_res.json()

    assert float(data["gross_revenue"]) == 1000.00
    assert float(data["refunded_revenue"]) == 500.00
    assert float(data["net_revenue"]) == 500.00
    assert data["total_bookings"] == 2
    assert data["confirmed_bookings"] == 1
    assert data["cancelled_bookings"] == 1


@pytest.mark.asyncio
async def test_revenue_breakdowns_by_route_and_bus(client: AsyncClient):
    """Test route and bus revenue aggregations."""
    admin_token, passenger_token = await get_tokens(client)
    trip_id, bus_id, route_id = await setup_trip_and_seats(client, admin_token)

    # Book a seat
    await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 5},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )

    # By Route
    route_res = await client.get(
        "/api/v1/admin/revenue/by-route",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert route_res.status_code == 200
    routes_data = route_res.json()
    matching_route = next((r for r in routes_data if r["route_id"] == route_id), None)
    assert matching_route is not None
    assert matching_route["confirmed_bookings"] == 1
    assert float(matching_route["net_revenue"]) == 500.00

    # By Bus
    bus_res = await client.get(
        "/api/v1/admin/revenue/by-bus",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert bus_res.status_code == 200
    buses_data = bus_res.json()
    matching_bus = next((b for b in buses_data if b["bus_id"] == bus_id), None)
    assert matching_bus is not None
    assert matching_bus["confirmed_bookings"] == 1
    assert float(matching_bus["net_revenue"]) == 500.00


@pytest.mark.asyncio
async def test_trip_manifest_generation(client: AsyncClient):
    """Test detailed passenger manifest and load factor calculation."""
    admin_token, passenger_token = await get_tokens(client)
    trip_id, _, _ = await setup_trip_and_seats(client, admin_token)

    # Book Seat 7
    await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 7},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )

    manifest_res = await client.get(
        f"/api/v1/admin/trips/{trip_id}/manifest",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert manifest_res.status_code == 200
    manifest = manifest_res.json()

    assert manifest["trip_id"] == trip_id
    assert manifest["seat_capacity"] == 20
    assert manifest["seats_booked"] == 1
    assert manifest["occupancy_rate_pct"] == 5.0
    assert float(manifest["trip_gross_revenue"]) == 500.00
    assert len(manifest["passengers"]) == 1
    assert manifest["passengers"][0]["seat_number"] == 7
    assert manifest["passengers"][0]["booking_status"] == "CONFIRMED"


@pytest.mark.asyncio
async def test_passenger_cannot_access_revenue_endpoints(client: AsyncClient):
    """Passengers should receive HTTP 403 Forbidden on admin revenue routes."""
    _, passenger_token = await get_tokens(client)

    res = await client.get(
        "/api/v1/admin/revenue/summary",
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert res.status_code == 403
