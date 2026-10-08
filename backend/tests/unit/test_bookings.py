"""Unit and integration tests for seat availability, booking transactions, and cancellation."""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


async def get_passenger_token(
    client: AsyncClient, email: str = "rider@passenger.example.com"
) -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Booking Passenger",
            "email": email,
            "password": "PassengerPassword123!",
            "role": "PASSENGER",
        },
    )
    return res.json()["access_token"]


async def get_admin_token(client: AsyncClient) -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Booking Admin",
            "email": "booking_admin@admin.example.com",
            "password": "AdminPassword123!",
            "role": "ADMIN",
        },
    )
    return res.json()["access_token"]


async def create_active_trip(client: AsyncClient, admin_token: str) -> str:
    """Create bus, route, and scheduled trip."""
    bus_res = await client.post(
        "/api/v1/admin/buses",
        json={
            "registration_number": f"KA-01-BK-{datetime.now(timezone.utc).timestamp()}",  # noqa: UP017
            "display_name": "Booking Cruiser",
            "seat_capacity": 30,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    bus_id = bus_res.json()["id"]

    route_res = await client.post(
        "/api/v1/admin/routes",
        json={"name": "Booking Route", "origin": "CityOne", "destination": "CityTwo"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    route_id = route_res.json()["id"]

    dep = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()  # noqa: UP017
    arr = (datetime.now(timezone.utc) + timedelta(days=2, hours=4)).isoformat()  # noqa: UP017

    trip_res = await client.post(
        "/api/v1/admin/trips",
        json={
            "route_id": route_id,
            "bus_id": bus_id,
            "departure_time": dep,
            "arrival_time": arr,
            "fare": 150.00,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    return trip_res.json()["id"]


@pytest.mark.asyncio
async def test_get_trip_seats_initialization(client: AsyncClient):
    """Ensure accessing seat map auto-initializes seats matching bus capacity."""
    admin_token = await get_admin_token(client)
    trip_id = await create_active_trip(client, admin_token)

    res = await client.get(f"/api/v1/trips/{trip_id}/seats")
    assert res.status_code == 200
    seats = res.json()
    assert len(seats) == 30
    assert seats[0]["seat_number"] == 1
    assert seats[0]["status"] == "AVAILABLE"


@pytest.mark.asyncio
async def test_successful_booking_creation(client: AsyncClient):
    """Ensure passenger can book an available seat successfully."""
    admin_token = await get_admin_token(client)
    passenger_token = await get_passenger_token(client, email="alice_book@example.com")
    trip_id = await create_active_trip(client, admin_token)

    booking_payload = {"trip_id": trip_id, "seat_number": 5}
    res = await client.post(
        "/api/v1/bookings",
        json=booking_payload,
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert res.status_code == 201
    booking = res.json()
    assert booking["booking_reference"].startswith("TB-")
    assert booking["seat_number"] == 5
    assert booking["status"] == "CONFIRMED"
    assert booking["payment_status"] == "PAID"
    assert float(booking["amount"]) == 150.00

    # Verify seat is now BOOKED
    seats_res = await client.get(f"/api/v1/trips/{trip_id}/seats")
    seat_5 = next(s for s in seats_res.json() if s["seat_number"] == 5)
    assert seat_5["status"] == "BOOKED"


@pytest.mark.asyncio
async def test_duplicate_seat_booking_rejected(client: AsyncClient):
    """Ensure booking an already-booked seat returns 409 SEAT_NOT_AVAILABLE."""
    admin_token = await get_admin_token(client)
    p1_token = await get_passenger_token(client, email="p1@example.com")
    p2_token = await get_passenger_token(client, email="p2@example.com")
    trip_id = await create_active_trip(client, admin_token)

    # First passenger books seat 10
    res1 = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 10},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert res1.status_code == 201

    # Second passenger attempts to book the same seat 10
    res2 = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 10},
        headers={"Authorization": f"Bearer {p2_token}"},
    )
    assert res2.status_code == 409
    assert res2.json()["error"]["code"] == "SEAT_NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_idempotent_booking_request(client: AsyncClient):
    """Ensure replaying request with same Idempotency-Key returns existing booking."""
    admin_token = await get_admin_token(client)
    passenger_token = await get_passenger_token(client, email="idempotent@example.com")
    trip_id = await create_active_trip(client, admin_token)

    headers = {
        "Authorization": f"Bearer {passenger_token}",
        "Idempotency-Key": "unique-idemp-key-xyz-123",
    }
    payload = {"trip_id": trip_id, "seat_number": 12}

    # First attempt
    res1 = await client.post("/api/v1/bookings", json=payload, headers=headers)
    assert res1.status_code == 201
    ref1 = res1.json()["booking_reference"]

    # Replay identical request with same idempotency key
    res2 = await client.post("/api/v1/bookings", json=payload, headers=headers)
    assert res2.status_code == 200 or res2.status_code == 201
    ref2 = res2.json()["booking_reference"]

    assert ref1 == ref2


@pytest.mark.asyncio
async def test_booking_cancellation_frees_seat(client: AsyncClient):
    """Ensure cancelling booking updates status to CANCELLED and marks seat AVAILABLE."""
    admin_token = await get_admin_token(client)
    passenger_token = await get_passenger_token(client, email="canceller@example.com")
    trip_id = await create_active_trip(client, admin_token)

    # Book seat 15
    book_res = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 15},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    booking_id = book_res.json()["id"]

    # Cancel booking
    cancel_res = await client.post(
        f"/api/v1/bookings/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
    assert cancel_res.json()["refund_status"] == "PROCESSED"

    # Verify seat is freed back to AVAILABLE
    seats_res = await client.get(f"/api/v1/trips/{trip_id}/seats")
    seat_15 = next(s for s in seats_res.json() if s["seat_number"] == 15)
    assert seat_15["status"] == "AVAILABLE"


@pytest.mark.asyncio
async def test_unauthorized_cancellation_rejected(client: AsyncClient):
    """Ensure a user cannot cancel another user's booking."""
    admin_token = await get_admin_token(client)
    victim_token = await get_passenger_token(client, email="victim@example.com")
    attacker_token = await get_passenger_token(client, email="attacker@example.com")
    trip_id = await create_active_trip(client, admin_token)

    book_res = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 20},
        headers={"Authorization": f"Bearer {victim_token}"},
    )
    booking_id = book_res.json()["id"]

    # Attacker tries to cancel victim's booking
    cancel_res = await client.post(
        f"/api/v1/bookings/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {attacker_token}"},
    )
    assert cancel_res.status_code == 403
    assert cancel_res.json()["error"]["code"] == "UNAUTHORIZED_BOOKING_ACCESS"
