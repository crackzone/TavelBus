"""Unit and integration tests for GenAI Assistant intent routing and domain retrieval."""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from tests.unit.test_revenue import get_tokens, setup_trip_and_seats


@pytest.mark.asyncio
async def test_assistant_answers_baggage_policy(client: AsyncClient):
    """Assistant answers baggage questions from grounded knowledge."""
    _, passenger_token = await get_tokens(client)

    res = await client.post(
        "/api/v1/assistant/chat",
        json={"message": "What is the baggage allowance for my travel?"},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "POLICY_QUERY"
    assert "20 kg" in data["response"]
    assert "₹50" in data["response"]


@pytest.mark.asyncio
async def test_assistant_answers_cancellation_policy(client: AsyncClient):
    """Assistant answers cancellation refund policy from grounded knowledge."""
    _, passenger_token = await get_tokens(client)

    res = await client.post(
        "/api/v1/assistant/chat",
        json={"message": "What is your refund policy if I cancel my ticket?"},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "POLICY_QUERY"
    assert "100% refund" in data["response"]
    assert "50% refund" in data["response"]


@pytest.mark.asyncio
async def test_assistant_checks_passenger_booking_status(client: AsyncClient):
    """Assistant returns user's active bookings when asked."""
    admin_token, passenger_token = await get_tokens(client)
    trip_id, _, _ = await setup_trip_and_seats(client, admin_token)

    # Initially before booking
    res_before = await client.post(
        "/api/v1/assistant/chat",
        json={"message": "Check my booking status"},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert res_before.status_code == 200
    assert "no active or past bookings" in res_before.json()["response"]

    # Book a seat
    book_res = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 3},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert book_res.status_code == 201
    booking_ref = book_res.json()["booking_reference"]

    # Inquire again
    res_after = await client.post(
        "/api/v1/assistant/chat",
        json={"message": "Show my bookings and ticket details"},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert res_after.status_code == 200
    data = res_after.json()
    assert data["intent"] == "BOOKING_STATUS"
    assert booking_ref in data["response"]
    assert "CONFIRMED" in data["response"]


@pytest.mark.asyncio
async def test_assistant_checks_live_bus_location(client: AsyncClient):
    """Assistant fetches real-time GPS telemetry and stop proximity for passenger's bus."""
    admin_token, passenger_token = await get_tokens(client)
    trip_id, _, _ = await setup_trip_and_seats(client, admin_token)

    # Book seat
    await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 4},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )

    # Start trip
    await client.post(
        f"/api/v1/driver/trips/{trip_id}/start",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Ingest location
    now_ts = datetime.now(timezone.utc).isoformat()  # noqa: UP017
    await client.post(
        f"/api/v1/driver/trips/{trip_id}/location",
        json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "speed_kmph": 52.0,
            "heading": 180.0,
            "recorded_at": now_ts,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Ask assistant where the bus is
    res = await client.post(
        "/api/v1/assistant/chat",
        json={"message": "Where is my bus right now?"},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "BUS_LOCATION"
    assert "12.9716" in data["response"]
    assert "52.0 km/h" in data["response"]


@pytest.mark.asyncio
async def test_assistant_trip_search(client: AsyncClient):
    """Assistant finds scheduled trips."""
    admin_token, passenger_token = await get_tokens(client)
    await setup_trip_and_seats(client, admin_token)

    res = await client.post(
        "/api/v1/assistant/chat",
        json={"message": "Find available bus trips"},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "TRIP_SEARCH"
    assert "Route:" in data["response"]


@pytest.mark.asyncio
async def test_unauthenticated_user_rejected(client: AsyncClient):
    """Anonymous requests to /assistant/chat return HTTP 401."""
    res = await client.post(
        "/api/v1/assistant/chat",
        json={"message": "What is the pet policy?"},
    )
    assert res.status_code == 401
