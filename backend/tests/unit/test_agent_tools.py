"""Unit and integration tests for agentic tools with strict human-in-the-loop confirmation."""

import pytest
from httpx import AsyncClient

from tests.unit.test_revenue import get_tokens, setup_trip_and_seats


@pytest.mark.asyncio
async def test_agentic_cancel_booking_proposal_and_confirmation(client: AsyncClient):
    """Test full 2-phase proposal and confirmation flow for cancelling a ticket."""
    admin_token, passenger_token = await get_tokens(client)
    trip_id, _, _ = await setup_trip_and_seats(client, admin_token)

    # 1. Passenger books a seat first
    book_res = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 9},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert book_res.status_code == 201
    booking_id = book_res.json()["id"]

    # 2. Phase 1: Propose cancellation
    prop_res = await client.post(
        "/api/v1/agent/tools/propose",
        json={
            "action_type": "CANCEL_BOOKING",
            "parameters": {"booking_id": booking_id},
        },
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert prop_res.status_code == 200
    proposal = prop_res.json()
    assert proposal["requires_confirmation"] is True
    assert "CANCEL booking" in proposal["summary"]
    token = proposal["proposal_token"]

    # 3. Phase 2: Confirm cancellation
    confirm_res = await client.post(
        "/api/v1/agent/tools/confirm",
        json={
            "proposal_token": token,
            "confirmed": True,
        },
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert confirm_res.status_code == 200
    res_data = confirm_res.json()
    assert res_data["success"] is True
    assert res_data["action_type"] == "CANCEL_BOOKING"
    assert "PROCESSED" in res_data["details"]["refund_status"]

    # 4. Seat should now be freed and available again
    seats_res = await client.get(f"/api/v1/trips/{trip_id}/seats")
    seat_9 = next((s for s in seats_res.json() if s["seat_number"] == 9), None)
    assert seat_9 is not None
    assert seat_9["status"] == "AVAILABLE"


@pytest.mark.asyncio
async def test_agentic_proposal_rejection(client: AsyncClient):
    """If user rejects the confirmation, no state change occurs."""
    admin_token, passenger_token = await get_tokens(client)
    trip_id, _, _ = await setup_trip_and_seats(client, admin_token)

    # Book seat 10
    book_res = await client.post(
        "/api/v1/bookings",
        json={"trip_id": trip_id, "seat_number": 10},
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    booking_id = book_res.json()["id"]

    # Propose cancellation
    prop_res = await client.post(
        "/api/v1/agent/tools/propose",
        json={
            "action_type": "CANCEL_BOOKING",
            "parameters": {"booking_id": booking_id},
        },
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    token = prop_res.json()["proposal_token"]

    # Reject (confirmed = False)
    reject_res = await client.post(
        "/api/v1/agent/tools/confirm",
        json={
            "proposal_token": token,
            "confirmed": False,
        },
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["success"] is False
    assert "rejected" in reject_res.json()["message"]

    # Seat 10 remains BOOKED
    seats_res = await client.get(f"/api/v1/trips/{trip_id}/seats")
    seat_10 = next((s for s in seats_res.json() if s["seat_number"] == 10), None)
    assert seat_10["status"] == "BOOKED"


@pytest.mark.asyncio
async def test_invalid_or_hijacked_proposal_token_rejected(client: AsyncClient):
    """Tokens cannot be confirmed by a different user."""
    admin_token, passenger_token = await get_tokens(client)
    trip_id, _, _ = await setup_trip_and_seats(client, admin_token)

    # Passenger 1 proposes an action
    prop_res = await client.post(
        "/api/v1/agent/tools/propose",
        json={
            "action_type": "BOOK_TICKET",
            "parameters": {"trip_id": trip_id, "seat_number": 12},
        },
        headers={"Authorization": f"Bearer {passenger_token}"},
    )
    token = prop_res.json()["proposal_token"]

    # Admin (different user) attempts to confirm Passenger 1's token
    hijack_res = await client.post(
        "/api/v1/agent/tools/confirm",
        json={"proposal_token": token, "confirmed": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert hijack_res.status_code == 400
    assert "different authenticated user" in hijack_res.json()["error"]["message"]
