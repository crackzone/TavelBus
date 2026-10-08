"""Tests for real-time tracking broker, SSE streaming, and WebSocket connections."""

import asyncio
import json
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import create_app
from app.modules.tracking.broker import tracking_broker
from app.modules.tracking.service import calculate_haversine_distance_km
from tests.unit.test_tracking import create_trip, create_user_and_token


def test_haversine_distance_calculation():
    """Verify haversine formula against known city coordinates."""
    # Bengaluru (12.9716, 77.5946) to Mysuru (12.2958, 76.6394) is ~128-130 km
    dist = calculate_haversine_distance_km(12.9716, 77.5946, 12.2958, 76.6394)
    assert 120.0 < dist < 140.0


@pytest.mark.asyncio
async def test_tracking_broker_subscription_lifecycle():
    """Test connecting, broadcasting, receiving, and disconnecting queues."""
    test_trip_id = uuid.uuid4()
    queue = await tracking_broker.connect(test_trip_id)
    assert tracking_broker.get_subscriber_count(test_trip_id) == 1

    payload = {"event_type": "LOCATION_UPDATED", "trip_id": str(test_trip_id), "lat": 12.5}
    sent = await tracking_broker.broadcast(test_trip_id, payload)
    assert sent == 1

    # Receive from queue
    msg = await asyncio.wait_for(queue.get(), timeout=1.0)
    data = json.loads(msg)
    assert data["event_type"] == "LOCATION_UPDATED"
    assert data["lat"] == 12.5

    # Disconnect
    await tracking_broker.disconnect(test_trip_id, queue)
    assert tracking_broker.get_subscriber_count(test_trip_id) == 0


@pytest.mark.asyncio
async def test_driver_location_broadcasts_to_broker(client: AsyncClient):
    """When driver posts GPS update, connected broker queues receive the event."""
    admin_token, _ = await create_user_and_token(
        client, "Admin", "admin.stream@test.example.com", "ADMIN"
    )
    driver_token, driver_id = await create_user_and_token(
        client, "Driver Stream", "driver.stream@test.example.com", "DRIVER"
    )

    trip_id_str, _, _ = await create_trip(client, admin_token, driver_id=driver_id)
    trip_id = uuid.UUID(trip_id_str)

    # Start trip
    await client.post(
        f"/api/v1/driver/trips/{trip_id}/start",
        headers={"Authorization": f"Bearer {driver_token}"},
    )

    # Connect a listener queue to the trip
    queue = await tracking_broker.connect(trip_id)

    # Driver sends GPS update
    now_ts = datetime.now(timezone.utc).isoformat()  # noqa: UP017
    post_res = await client.post(
        f"/api/v1/driver/trips/{trip_id}/location",
        json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "speed_kmph": 50.0,
            "heading": 90.0,
            "recorded_at": now_ts,
        },
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert post_res.status_code == 201

    # Listener queue should receive the broadcast frame
    raw_frame = await asyncio.wait_for(queue.get(), timeout=2.0)
    frame = json.loads(raw_frame)
    assert frame["event_type"] == "LOCATION_UPDATED"
    assert frame["trip_id"] == str(trip_id)
    assert frame["location"]["latitude"] == 12.9716

    await tracking_broker.disconnect(trip_id, queue)


def test_websocket_tracking_connection():
    """Verify WebSocket endpoint handshake and connection message."""
    app = create_app()
    client = TestClient(app)
    test_trip_id = uuid.uuid4()

    with client.websocket_connect(f"/api/v1/trips/{test_trip_id}/ws/tracking") as ws:
        data = ws.receive_json()
        assert data["event"] == "CONNECTED"
        assert data["trip_id"] == str(test_trip_id)
