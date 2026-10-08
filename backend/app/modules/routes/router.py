"""Route and Stop API routers (Admin and Public)."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.auth.dependencies import require_role
from app.modules.auth.models import UserRole
from app.modules.routes.repository import RouteRepository, StopRepository
from app.modules.routes.schemas import (
    RouteCreate,
    RouteDetailResponse,
    RouteListResponse,
    RouteResponse,
    RouteUpdate,
    StopCreate,
    StopResponse,
    StopUpdate,
)
from app.modules.routes.service import RouteService

# Admin Routers
admin_routes_router = APIRouter(
    prefix="/api/v1/admin/routes",
    tags=["Admin - Routes"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)

admin_stops_router = APIRouter(
    prefix="/api/v1/admin/stops",
    tags=["Admin - Stops"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)

# Public Read Routers
public_routes_router = APIRouter(
    prefix="/api/v1/routes",
    tags=["Routes (Public)"],
)


def get_route_service(db: AsyncSession = Depends(get_db)) -> RouteService:
    """Dependency providing RouteService."""
    return RouteService(
        route_repo=RouteRepository(db=db),
        stop_repo=StopRepository(db=db),
    )


# --- Admin Route Endpoints ---
@admin_routes_router.post(
    "",
    response_model=RouteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new transit route",
)
async def create_route(
    payload: RouteCreate,
    service: RouteService = Depends(get_route_service),
) -> RouteResponse:
    """Create a route. Admin only."""
    route = await service.create_route(payload)
    return RouteResponse.model_validate(route)


@admin_routes_router.get(
    "",
    response_model=RouteListResponse,
    summary="List all routes (Admin view)",
)
async def admin_list_routes(
    service: RouteService = Depends(get_route_service),
) -> RouteListResponse:
    """List all routes including inactive. Admin only."""
    routes = await service.list_routes(active_only=False)
    items = [RouteResponse.model_validate(r) for r in routes]
    return RouteListResponse(items=items, total=len(items))


@admin_routes_router.get(
    "/{route_id}",
    response_model=RouteDetailResponse,
    summary="Get route details with stops",
)
async def admin_get_route(
    route_id: uuid.UUID,
    service: RouteService = Depends(get_route_service),
) -> RouteDetailResponse:
    """Get route with stops. Admin only."""
    route = await service.get_route(route_id, load_stops=True)
    return RouteDetailResponse.model_validate(route)


@admin_routes_router.patch(
    "/{route_id}",
    response_model=RouteResponse,
    summary="Update route details",
)
async def admin_update_route(
    route_id: uuid.UUID,
    payload: RouteUpdate,
    service: RouteService = Depends(get_route_service),
) -> RouteResponse:
    """Update route. Admin only."""
    route = await service.update_route(route_id, payload)
    return RouteResponse.model_validate(route)


@admin_routes_router.post(
    "/{route_id}/deactivate",
    response_model=RouteResponse,
    summary="Deactivate route",
)
async def admin_deactivate_route(
    route_id: uuid.UUID,
    service: RouteService = Depends(get_route_service),
) -> RouteResponse:
    """Deactivate route. Admin only."""
    route = await service.deactivate_route(route_id)
    return RouteResponse.model_validate(route)


@admin_routes_router.post(
    "/{route_id}/reactivate",
    response_model=RouteResponse,
    summary="Reactivate route",
)
async def admin_reactivate_route(
    route_id: uuid.UUID,
    service: RouteService = Depends(get_route_service),
) -> RouteResponse:
    """Reactivate route. Admin only."""
    route = await service.reactivate_route(route_id)
    return RouteResponse.model_validate(route)


# --- Admin Route Stops Sub-Endpoints ---
@admin_routes_router.post(
    "/{route_id}/stops",
    response_model=StopResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a stop to a route",
)
async def create_stop(
    route_id: uuid.UUID,
    payload: StopCreate,
    service: RouteService = Depends(get_route_service),
) -> StopResponse:
    """Add a stop to route. Admin only."""
    stop = await service.create_stop(route_id, payload)
    return StopResponse.model_validate(stop)


@admin_routes_router.get(
    "/{route_id}/stops",
    response_model=list[StopResponse],
    summary="List sequenced stops for route",
)
async def admin_list_stops(
    route_id: uuid.UUID,
    service: RouteService = Depends(get_route_service),
) -> list[StopResponse]:
    """List stops for route in sequence order. Admin only."""
    stops = await service.list_stops_for_route(route_id)
    return [StopResponse.model_validate(s) for s in stops]


# --- Admin Stops Endpoints ---
@admin_stops_router.patch(
    "/{stop_id}",
    response_model=StopResponse,
    summary="Update a stop",
)
async def update_stop(
    stop_id: uuid.UUID,
    payload: StopUpdate,
    service: RouteService = Depends(get_route_service),
) -> StopResponse:
    """Update stop details. Admin only."""
    stop = await service.update_stop(stop_id, payload)
    return StopResponse.model_validate(stop)


@admin_stops_router.delete(
    "/{stop_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a stop",
)
async def delete_stop(
    stop_id: uuid.UUID,
    service: RouteService = Depends(get_route_service),
) -> None:
    """Delete a stop. Admin only."""
    await service.delete_stop(stop_id)


# --- Public Read Endpoints ---
@public_routes_router.get(
    "",
    response_model=RouteListResponse,
    summary="Browse active routes",
)
async def public_list_routes(
    service: RouteService = Depends(get_route_service),
) -> RouteListResponse:
    """List active routes for public browsing."""
    routes = await service.list_routes(active_only=True)
    items = [RouteResponse.model_validate(r) for r in routes]
    return RouteListResponse(items=items, total=len(items))


@public_routes_router.get(
    "/{route_id}",
    response_model=RouteDetailResponse,
    summary="View route details and stops",
)
async def public_get_route(
    route_id: uuid.UUID,
    service: RouteService = Depends(get_route_service),
) -> RouteDetailResponse:
    """View route and its stops."""
    route = await service.get_route(route_id, load_stops=True)
    return RouteDetailResponse.model_validate(route)


@public_routes_router.get(
    "/{route_id}/stops",
    response_model=list[StopResponse],
    summary="View sequenced stops on a route",
)
async def public_get_stops(
    route_id: uuid.UUID,
    service: RouteService = Depends(get_route_service),
) -> list[StopResponse]:
    """View stops for a route in order."""
    stops = await service.list_stops_for_route(route_id)
    return [StopResponse.model_validate(s) for s in stops]
