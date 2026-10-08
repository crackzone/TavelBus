"""Trip API routers (Admin and Public)."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.auth.dependencies import require_role
from app.modules.auth.models import UserRole
from app.modules.buses.repository import BusRepository
from app.modules.routes.repository import RouteRepository
from app.modules.trips.models import TripStatus
from app.modules.trips.repository import TripRepository
from app.modules.trips.schemas import (
    TripCreate,
    TripListResponse,
    TripPublicResponse,
    TripResponse,
    TripUpdate,
)
from app.modules.trips.service import TripService

# Admin Router
admin_trips_router = APIRouter(
    prefix="/api/v1/admin/trips",
    tags=["Admin - Trips"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)

# Public Read Router
public_trips_router = APIRouter(
    prefix="/api/v1/trips",
    tags=["Trips (Public)"],
)


def get_trip_service(db: AsyncSession = Depends(get_db)) -> TripService:
    """Dependency providing TripService."""
    return TripService(
        trip_repo=TripRepository(db=db),
        bus_repo=BusRepository(db=db),
        route_repo=RouteRepository(db=db),
    )


# --- Admin Trip Endpoints ---
@admin_trips_router.post(
    "",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a new trip",
)
async def create_trip(
    payload: TripCreate,
    service: TripService = Depends(get_trip_service),
) -> TripResponse:
    """Create a new trip with overlap and status validation. Admin only."""
    trip = await service.create_trip(payload)
    return TripResponse.model_validate(trip)


@admin_trips_router.get(
    "",
    response_model=TripListResponse,
    summary="List all trips with optional filters",
)
async def admin_list_trips(
    route_id: uuid.UUID | None = Query(default=None),
    bus_id: uuid.UUID | None = Query(default=None),
    trip_status: TripStatus | None = Query(default=None, alias="status"),
    service: TripService = Depends(get_trip_service),
) -> TripListResponse:
    """List trips. Admin only."""
    trips = await service.list_trips(route_id=route_id, bus_id=bus_id, status=trip_status)
    items = [TripResponse.model_validate(t) for t in trips]
    return TripListResponse(items=items, total=len(items))


@admin_trips_router.get(
    "/{trip_id}",
    response_model=TripResponse,
    summary="Get trip details",
)
async def admin_get_trip(
    trip_id: uuid.UUID,
    service: TripService = Depends(get_trip_service),
) -> TripResponse:
    """Get trip details. Admin only."""
    trip = await service.get_trip(trip_id)
    return TripResponse.model_validate(trip)


@admin_trips_router.patch(
    "/{trip_id}",
    response_model=TripResponse,
    summary="Update or reschedule a trip",
)
async def admin_update_trip(
    trip_id: uuid.UUID,
    payload: TripUpdate,
    service: TripService = Depends(get_trip_service),
) -> TripResponse:
    """Update trip schedule or details. Admin only."""
    trip = await service.update_trip(trip_id, payload)
    return TripResponse.model_validate(trip)


@admin_trips_router.post(
    "/{trip_id}/cancel",
    response_model=TripResponse,
    summary="Cancel a scheduled trip",
)
async def admin_cancel_trip(
    trip_id: uuid.UUID,
    service: TripService = Depends(get_trip_service),
) -> TripResponse:
    """Cancel trip without physical deletion. Admin only."""
    trip = await service.cancel_trip(trip_id)
    return TripResponse.model_validate(trip)


# --- Public Read Endpoint ---
@public_trips_router.get(
    "/{trip_id}",
    response_model=TripPublicResponse,
    summary="View public trip details",
)
async def public_get_trip(
    trip_id: uuid.UUID,
    service: TripService = Depends(get_trip_service),
) -> TripPublicResponse:
    """View trip schedule and fare for passengers without internal admin info."""
    trip = await service.get_trip(trip_id)
    return TripPublicResponse.model_validate(trip)
