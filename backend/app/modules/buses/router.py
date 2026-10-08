"""Admin Bus API router."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.auth.dependencies import require_role
from app.modules.auth.models import UserRole
from app.modules.buses.models import BusStatus
from app.modules.buses.repository import BusRepository
from app.modules.buses.schemas import BusCreate, BusListResponse, BusResponse, BusUpdate
from app.modules.buses.service import BusService

router = APIRouter(
    prefix="/api/v1/admin/buses",
    tags=["Admin - Buses"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)


def get_bus_service(db: AsyncSession = Depends(get_db)) -> BusService:
    """Dependency providing BusService with database session."""
    return BusService(bus_repo=BusRepository(db=db))


@router.post(
    "",
    response_model=BusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new bus in the fleet",
)
async def create_bus(
    payload: BusCreate,
    service: BusService = Depends(get_bus_service),
) -> BusResponse:
    """Create a new bus. Admin only."""
    bus = await service.create_bus(payload)
    return BusResponse.model_validate(bus)


@router.get(
    "",
    response_model=BusListResponse,
    summary="List all buses with optional status filter",
)
async def list_buses(
    status_filter: BusStatus | None = Query(default=None, alias="status"),
    service: BusService = Depends(get_bus_service),
) -> BusListResponse:
    """List buses. Admin only."""
    buses = await service.list_buses(status=status_filter)
    items = [BusResponse.model_validate(b) for b in buses]
    return BusListResponse(items=items, total=len(items))


@router.get(
    "/{bus_id}",
    response_model=BusResponse,
    summary="Get bus by ID",
)
async def get_bus(
    bus_id: uuid.UUID,
    service: BusService = Depends(get_bus_service),
) -> BusResponse:
    """Fetch bus details. Admin only."""
    bus = await service.get_bus(bus_id)
    return BusResponse.model_validate(bus)


@router.patch(
    "/{bus_id}",
    response_model=BusResponse,
    summary="Update bus details",
)
async def update_bus(
    bus_id: uuid.UUID,
    payload: BusUpdate,
    service: BusService = Depends(get_bus_service),
) -> BusResponse:
    """Update bus properties. Admin only."""
    bus = await service.update_bus(bus_id, payload)
    return BusResponse.model_validate(bus)


@router.post(
    "/{bus_id}/deactivate",
    response_model=BusResponse,
    summary="Deactivate a bus from service",
)
async def deactivate_bus(
    bus_id: uuid.UUID,
    service: BusService = Depends(get_bus_service),
) -> BusResponse:
    """Deactivate bus. Admin only."""
    bus = await service.deactivate_bus(bus_id)
    return BusResponse.model_validate(bus)
