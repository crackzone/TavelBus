"""Unit tests for user registration, authentication, and role authorization."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_passenger_success(client: AsyncClient):
    """Verify passenger registration returns 201 Created and JWT token."""
    payload = {
        "name": "Alice Passenger",
        "email": "alice@example.com",
        "phone": "+1234567890",
        "password": "Password123!",
        "role": "PASSENGER",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["role"] == "PASSENGER"
    assert data["user"]["is_active"] is True


@pytest.mark.asyncio
async def test_register_duplicate_email_fails(client: AsyncClient):
    """Verify registration with already registered email fails with 409 Conflict."""
    payload = {
        "name": "Bob Driver",
        "email": "bob@example.com",
        "password": "Password123!",
        "role": "DRIVER",
    }
    # First registration
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Second registration with same email
    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    err = res2.json()
    assert err["error"]["code"] == "CONFLICT"
    assert "already exists" in err["error"]["message"]


@pytest.mark.asyncio
async def test_login_success_and_me(client: AsyncClient):
    """Verify login with valid credentials and /me endpoint inspection."""
    reg_payload = {
        "name": "Charlie Admin",
        "email": "charlie@example.com",
        "password": "AdminPassword123!",
        "role": "ADMIN",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Login
    login_payload = {
        "email": "charlie@example.com",
        "password": "AdminPassword123!",
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Access /me
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == "charlie@example.com"
    assert user_data["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Verify login fails with 401 when given invalid credentials."""
    reg_payload = {
        "name": "David",
        "email": "david@example.com",
        "password": "CorrectPassword123!",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Wrong password
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "david@example.com", "password": "WrongPassword123!"},
    )
    assert login_res.status_code == 401
    err = login_res.json()
    assert err["error"]["code"] == "AUTHENTICATION_FAILED"


@pytest.mark.asyncio
async def test_me_without_token_fails(client: AsyncClient):
    """Verify accessing /me without token returns 401 Unauthorized."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
