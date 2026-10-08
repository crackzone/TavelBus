"""Unit and integration tests for driver trip lifecycle and live GPS telemetry."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


async def create_user_and_token(
    client: AsyncClient,
    name: str,
    email: str,
    role: str,
) -> tuple[str, str]:
    """Helper to register user and obtain bearer token and user_id."""
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "Password123!",
            "role": role,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    return data["access_token"], data["user"]["id"]


async def create_trip(
    client: AsyncClient,
    admin_token: str,
    driver_id: str | None = None,
) -> tuple[str, str, str]:
    """Helper creating a test bus, route, and trip assigned to an optional driver."""
    rand_suffix = str(uuid.uuid4())[:6]
    bus_res = await client.post(
        "/api/v1/admin/buses",
        json={
            "registration_number": f"KA-51-GPS-{rand_suffix}",
            "display_name": f"Express Bus {rand_suffix}",
            "seat_capacity": 30,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert bus_res.status_code == 201
    bus_id = bus_res.json()["id"]

    route_res = await client.post(
        "/api/v1/admin/routes",
        json={
            "name": f"Bengaluru - Mysuru {rand_suffix}",
            "origin": "Bengaluru",
            "destination": "Mysuru",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert route_res.status_code == 201
    route_id = route_res.json()["id"]

    dep = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()  # noqa: UP017
    arr = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()  # noqa: UP017

    trip_payload = {
        "route_id": route_id,
        "bus_id": bus_id,
        "driver_id": driver_id,
        "departure_time": dep,
        "arrival_time": arr,
        "fare": 350.00,
    }

    trip_res = await client.post(
        "/api/v1/admin/trips",
        json=trip_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert trip_res.status_code == 201
    trip_id = trip_res.json()["id"]

    return trip_id, bus_id, route_id


@pytest.mark.asyncio
async def test_driver_can_list_assigned_trips(client: AsyncClient):
    """Driver should only see trips assigned to them."""
    admin_token, _ = await create_user_and_token(
        client, "Fleet Admin", "admin.driver@test.example.com", "ADMIN"
    )
    driver1_token, driver1_id = await create_user_and_token(
        client, "Driver One", "driver1@test.example.com", "DRIVER"
    )
    _, driver2_id = await create_user_and_token(
        client, "Driver Two", "driver2@test.example.com", "DRIVER"
    )

    # Trip 1 assigned to driver 1
    trip1_id, _, _ = await create_trip(client, admin_token, driver_id=driver1_id)
    # Trip 2 assigned to driver 2
    trip2_id, _, _ = await create_trip(client, admin_token, driver_id=driver2_id)

    # Query driver 1's trips
    res = await client.get(
        "/api/v1/driver/trips",
        headers={"Authorization": f"Bearer {driver1_token}"},
    )
    assert res.status_code == 200
    trips = res.json()
    assert len(trips) == 1
    assert trips[0]["id"] == trip1_id
    assert trips[0]["id"] != trip2_id


@pytest.mark.asyncio
async def test_driver_cannot_start_unassigned_trip(client: AsyncClient):
    """Driver cannot start another driver's trip."""
    admin_token, _ = await create_user_and_token(
        client, "Admin", "admin2@test.example.com", "ADMIN"
    )
    driver1_token, driver1_id = await create_user_and_token(
        client, "Driver One", "driver1.auth@test.example.com", "DRIVER"
    )
    _, driver2_id = await create_user_and_token(
        client, "Driver Two", "driver2.auth@test.example.com", "DRIVER"
    )

    trip_id, _, _ = await create_trip(client, admin_token, driver_id=driver2_id)

    # Driver 1 attempts to start Driver 2's trip
    res = await client.post(
        f"/api/v1/driver/trips/{trip_id}/start",
        headers={"Authorization": f"Bearer {driver1_token}"},
    )
    assert res.status_code == 403
    assert "not assigned to you" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_trip_start_and_finish_lifecycle(client: AsyncClient):
    """Test standard trip start -> in progress -> finish lifecycle."""
    admin_token, _ = await create_user_and_token(
        client, "Admin", "admin.life@test.example.com", "ADMIN"
    )
    driver_token, driver_id = await create_user_and_token(
        client, "Driver Life", "driver.life@test.example.com", "DRIVER"
    )

    trip_id, _, _ = await create_trip(client, admin_token, driver_id=driver_id)

    # Start trip
    start_res = await client.post(
        f"/api/v1/driver/trips/{trip_id}/start",
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_PROGRESS"

    # Ingest GPS coordinate during IN_PROGRESS
    gps_time = datetime.now(timezone.utc).isoformat()  # noqa: UP017
    loc_res = await client.post(
        f"/api/v1/driver/trips/{trip_id}/location",
        json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "speed_kmph": 55.4,
            "heading": 180.0,
            "recorded_at": gps_time,
        },
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert loc_res.status_code == 201
    assert loc_res.json()["latitude"] == 12.9716
    assert loc_res.json()["speed_kmph"] == 55.4

    # Finish trip
    finish_res = await client.post(
        f"/api/v1/driver/trips/{trip_id}/finish",
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert finish_res.status_code == 200
    assert finish_res.json()["status"] == "COMPLETED"

    # Once completed, sending further GPS updates fails
    subsequent_loc_res = await client.post(
        f"/api/v1/driver/trips/{trip_id}/location",
        json={
            "latitude": 12.9800,
            "longitude": 77.6000,
            "speed_kmph": 0.0,
            "heading": 180.0,
            "recorded_at": datetime.now(timezone.utc).isoformat(),  # noqa: UP017
        },
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert subsequent_loc_res.status_code == 400


@pytest.mark.asyncio
async def test_passenger_can_query_live_location(client: AsyncClient):
    """Passenger public endpoint retrieves current trip location and breadcrumbs."""
    admin_token, _ = await create_user_and_token(
        client, "Admin", "admin.pass@test.example.com", "ADMIN"
    )
    driver_token, driver_id = await create_user_and_token(
        client, "Driver Track", "driver.track@test.example.com", "DRIVER"
    )

    trip_id, _, _ = await create_trip(client, admin_token, driver_id=driver_id)

    # Initially before start, location is null
    init_res = await client.get(f"/api/v1/trips/{trip_id}/location")
    assert init_res.status_code == 200
    assert init_res.json()["latest_location"] is None
    assert init_res.json()["recent_breadcrumbs"] == []

    # Start trip and send multiple pings
    await client.post(
        f"/api/v1/driver/trips/{trip_id}/start",
        headers={"Authorization": f"Bearer {driver_token}"},
    )

    pings = [
        (12.9716, 77.5946, 30.0, 90.0),
        (12.9750, 77.6000, 45.0, 95.0),
        (12.9800, 77.6100, 60.0, 100.0),
    ]

    for lat, lon, spd, hd in pings:
        now_ts = datetime.now(timezone.utc).isoformat()  # noqa: UP017
        await client.post(
            f"/api/v1/driver/trips/{trip_id}/location",
            json={
                "latitude": lat,
                "longitude": lon,
                "speed_kmph": spd,
                "heading": hd,
                "recorded_at": now_ts,
            },
            headers={"Authorization": f"Bearer {driver_token}"},
        )

    # Query public tracking
    track_res = await client.get(f"/api/v1/trips/{trip_id}/location")
    assert track_res.status_code == 200
    data = track_res.json()
    assert data["trip_status"] == "IN_PROGRESS"
    assert data["latest_location"] is not None
    assert data["latest_location"]["latitude"] == 12.9800
    assert len(data["recent_breadcrumbs"]) == 3


@pytest.mark.asyncio
async def test_invalid_coordinates_rejected(client: AsyncClient):
    """Payloads violating coordinate boundaries return HTTP 422."""
    admin_token, _ = await create_user_and_token(
        client, "Admin", "admin.val@test.example.com", "ADMIN"
    )
    driver_token, driver_id = await create_user_and_token(
        client, "Driver Val", "driver.val@test.example.com", "DRIVER"
    )

    trip_id, _, _ = await create_trip(client, admin_token, driver_id=driver_id)
    await client.post(
        f"/api/v1/driver/trips/{trip_id}/start",
        headers={"Authorization": f"Bearer {driver_token}"},
    )

    # Invalid latitude > 90
    res_lat = await client.post(
        f"/api/v1/driver/trips/{trip_id}/location",
        json={
            "latitude": 95.0,
            "longitude": 77.5946,
            "speed_kmph": 50.0,
            "heading": 180.0,
            "recorded_at": datetime.now(timezone.utc).isoformat(),  # noqa: UP017
        },
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert res_lat.status_code == 422

    # Negative speed < 0
    res_speed = await client.post(
        f"/api/v1/driver/trips/{trip_id}/location",
        json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "speed_kmph": -5.0,
            "heading": 180.0,
            "recorded_at": datetime.now(timezone.utc).isoformat(),  # noqa: UP017
        },
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert res_speed.status_code == 422
