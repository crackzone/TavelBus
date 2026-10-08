"""Unit and integration tests for Bus management endpoints."""

import pytest
from httpx import AsyncClient


async def get_admin_token(client: AsyncClient) -> str:
    """Helper to register an admin and return JWT token."""
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Fleet Director",
            "email": "director@fleet.example.com",
            "password": "DirectorPassword123!",
            "role": "ADMIN",
        },
    )
    return res.json()["access_token"]


async def get_passenger_token(client: AsyncClient) -> str:
    """Helper to register a passenger and return JWT token."""
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Regular Passenger",
            "email": "rider@commuter.example.com",
            "password": "RiderPassword123!",
            "role": "PASSENGER",
        },
    )
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_can_create_bus(client: AsyncClient):
    """Ensure an admin can register a new bus."""
    token = await get_admin_token(client)
    payload = {
        "registration_number": "KA-04-TEST-100",
        "display_name": "Test Express 100",
        "seat_capacity": 45,
        "status": "ACTIVE",
    }
    response = await client.post(
        "/api/v1/admin/buses",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["registration_number"] == "KA-04-TEST-100"
    assert data["seat_capacity"] == 45
    assert data["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_non_admin_cannot_create_bus(client: AsyncClient):
    """Ensure a passenger receives 403 Forbidden when creating a bus."""
    token = await get_passenger_token(client)
    payload = {
        "registration_number": "KA-04-ILLEGAL-01",
        "display_name": "Unauthorized Bus",
        "seat_capacity": 30,
        "status": "ACTIVE",
    }
    response = await client.post(
        "/api/v1/admin/buses",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    err = response.json()
    assert err["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_duplicate_registration_number_rejected(client: AsyncClient):
    """Ensure unique constraint rejects duplicate bus registration number."""
    token = await get_admin_token(client)
    payload = {
        "registration_number": "KA-05-DUP-999",
        "display_name": "Duplicate Test 1",
        "seat_capacity": 40,
        "status": "ACTIVE",
    }
    res1 = await client.post(
        "/api/v1/admin/buses", json=payload, headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 201

    res2 = await client.post(
        "/api/v1/admin/buses", json=payload, headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 409
    err = res2.json()
    assert err["error"]["code"] == "BUS_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_invalid_seat_capacity_rejected(client: AsyncClient):
    """Ensure zero or negative seat capacity fails validation."""
    token = await get_admin_token(client)
    payload = {
        "registration_number": "KA-05-ZERO-00",
        "display_name": "Zero Capacity Bus",
        "seat_capacity": 0,
        "status": "ACTIVE",
    }
    response = await client.post(
        "/api/v1/admin/buses",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_can_update_and_deactivate_bus(client: AsyncClient):
    """Ensure admin can patch properties and deactivate a bus."""
    token = await get_admin_token(client)
    bus_res = await client.post(
        "/api/v1/admin/buses",
        json={
            "registration_number": "KA-09-UP-111",
            "display_name": "Before Update",
            "seat_capacity": 35,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    bus_id = bus_res.json()["id"]

    # Patch display name
    patch_res = await client.patch(
        f"/api/v1/admin/buses/{bus_id}",
        json={"display_name": "After Update"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["display_name"] == "After Update"

    # Deactivate
    deact_res = await client.post(
        f"/api/v1/admin/buses/{bus_id}/deactivate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["status"] == "INACTIVE"
