"""FastAPI router endpoints for driver telemetry and passenger trip tracking."""

import asyncio
import json
import logging
import uuid
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.auth.dependencies import require_role
from app.modules.auth.models import User, UserRole
from app.modules.tracking.broker import tracking_broker
from app.modules.tracking.schemas import (
    DriverTripSummary,
    GPSLocationCreate,
    GPSLocationRead,
    TripLocationCurrentRead,
)
from app.modules.tracking.service import TrackingService

logger = logging.getLogger(__name__)

# Driver-specific actions router
driver_router = APIRouter(prefix="/driver", tags=["Driver Trips & Tracking"])

# Public / passenger tracking router
tracking_router = APIRouter(prefix="/trips", tags=["Live Tracking"])


def get_tracking_service(db: AsyncSession = Depends(get_db)) -> TrackingService:
    """Dependency supplying an initialized TrackingService."""
    return TrackingService(db=db)


# -------------------------------------------------------------------------
# Driver Endpoints (Role: DRIVER or ADMIN)
# -------------------------------------------------------------------------


@driver_router.get(
    "/trips",
    response_model=list[DriverTripSummary],
    summary="List trips assigned to the authenticated driver",
)
async def list_assigned_trips(
    current_user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
    service: TrackingService = Depends(get_tracking_service),
) -> list[DriverTripSummary]:
    """Retrieve all trips assigned to the requesting driver."""
    return await service.list_driver_trips(current_user)


@driver_router.post(
    "/trips/{trip_id}/start",
    status_code=status.HTTP_200_OK,
    summary="Start an assigned trip (status -> IN_PROGRESS)",
)
async def start_trip(
    trip_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
    service: TrackingService = Depends(get_tracking_service),
) -> dict[str, str]:
    """Transition trip status to IN_PROGRESS upon departure."""
    trip = await service.start_trip(trip_id=trip_id, user=current_user)
    return {
        "message": "Trip successfully started.",
        "trip_id": str(trip.id),
        "status": trip.status.value,
    }


@driver_router.post(
    "/trips/{trip_id}/finish",
    status_code=status.HTTP_200_OK,
    summary="Finish an assigned trip (status -> COMPLETED)",
)
async def finish_trip(
    trip_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
    service: TrackingService = Depends(get_tracking_service),
) -> dict[str, str]:
    """Transition trip status to COMPLETED upon arrival at the final stop."""
    trip = await service.finish_trip(trip_id=trip_id, user=current_user)
    return {
        "message": "Trip successfully finished.",
        "trip_id": str(trip.id),
        "status": trip.status.value,
    }


@driver_router.post(
    "/trips/{trip_id}/location",
    response_model=GPSLocationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest GPS location update from driver device",
)
async def record_driver_location(
    trip_id: uuid.UUID,
    payload: GPSLocationCreate,
    current_user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
    service: TrackingService = Depends(get_tracking_service),
) -> GPSLocationRead:
    """Ingest real-time GPS coordinate ping for an active in-progress trip."""
    return await service.record_location(trip_id=trip_id, payload=payload, user=current_user)


# -------------------------------------------------------------------------
# Passenger / Public Tracking Endpoints
# -------------------------------------------------------------------------


@tracking_router.get(
    "/{trip_id}/location",
    response_model=TripLocationCurrentRead,
    summary="Passenger view of current bus location and next stop ETA",
)
async def get_trip_location(
    trip_id: uuid.UUID,
    service: TrackingService = Depends(get_tracking_service),
) -> TripLocationCurrentRead:
    """Get the latest recorded GPS coordinate, next stop ETA, and trajectory breadcrumbs."""
    return await service.get_trip_live_location(trip_id)


@tracking_router.get(
    "/{trip_id}/events/tracking",
    summary="Server-Sent Events (SSE) live stream for trip GPS updates",
)
async def stream_trip_events(
    trip_id: uuid.UUID,
    service: TrackingService = Depends(get_tracking_service),
) -> StreamingResponse:
    """Stream real-time GPS updates for a trip using text/event-stream (SSE)."""
    # Verify trip exists first
    await service.get_trip_live_location(trip_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        queue = await tracking_broker.connect(trip_id)
        try:
            # Yield initial handshake comment
            yield ": connected\n\n"
            while True:
                try:
                    # Wait for next location update with periodic keep-alive
                    message = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {message}\n\n"
                except TimeoutError:
                    # Send keep-alive comment to prevent socket timeout
                    yield ": ping\n\n"
        finally:
            await tracking_broker.disconnect(trip_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@tracking_router.websocket("/{trip_id}/ws/tracking")
async def websocket_trip_tracking(
    websocket: WebSocket,
    trip_id: uuid.UUID,
) -> None:
    """WebSocket persistent bidirectional connection streaming GPS coordinates."""
    await websocket.accept()
    queue = await tracking_broker.connect(trip_id)
    try:
        # Initial greeting confirmation
        await websocket.send_text(
            json.dumps({"event": "CONNECTED", "trip_id": str(trip_id)})
        )
        while True:
            # Read telemetry frame from broker and push to client socket
            message = await queue.get()
            await websocket.send_text(message)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for trip %s", trip_id)
    finally:
        await tracking_broker.disconnect(trip_id, queue)
