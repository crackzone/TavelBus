"""FastAPI router endpoints for admin revenue analytics and passenger manifests."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.auth.dependencies import require_role
from app.modules.auth.models import User, UserRole
from app.modules.revenue.schemas import (
    BusRevenueBreakdown,
    RevenueSummaryResponse,
    RouteRevenueBreakdown,
    TripManifestResponse,
)
from app.modules.revenue.service import RevenueService

admin_revenue_router = APIRouter(
    prefix="/admin/revenue",
    tags=["Admin Revenue & Analytics"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)

admin_manifest_router = APIRouter(
    prefix="/admin/trips",
    tags=["Admin Trip Manifest"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)


def get_revenue_service(db: AsyncSession = Depends(get_db)) -> RevenueService:
    """Dependency supplying an initialized RevenueService."""
    return RevenueService(db=db)


@admin_revenue_router.get(
    "/summary",
    response_model=RevenueSummaryResponse,
    summary="Get overall fleet gross, refund, and net revenue metrics",
)
async def get_revenue_summary(
    start_date: datetime | None = Query(
        None,
        description="Filter bookings from this UTC timestamp",
    ),
    end_date: datetime | None = Query(None, description="Filter bookings up to this UTC timestamp"),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    service: RevenueService = Depends(get_revenue_service),
) -> RevenueSummaryResponse:
    """Return system-wide revenue, refunds, bookings count, and average booking value."""
    return await service.get_summary(start_date=start_date, end_date=end_date)


@admin_revenue_router.get(
    "/by-route",
    response_model=list[RouteRevenueBreakdown],
    summary="Get revenue and booking metrics aggregated by route",
)
async def get_revenue_by_route(
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    service: RevenueService = Depends(get_revenue_service),
) -> list[RouteRevenueBreakdown]:
    """Return net revenue and booking totals grouped by transit route."""
    return await service.get_by_route()


@admin_revenue_router.get(
    "/by-bus",
    response_model=list[BusRevenueBreakdown],
    summary="Get revenue and booking metrics aggregated by vehicle",
)
async def get_revenue_by_bus(
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    service: RevenueService = Depends(get_revenue_service),
) -> list[BusRevenueBreakdown]:
    """Return net revenue and booking totals grouped by bus vehicle."""
    return await service.get_by_bus()


@admin_manifest_router.get(
    "/{trip_id}/manifest",
    response_model=TripManifestResponse,
    summary="Get detailed passenger manifest and load factor for a trip",
)
async def get_trip_manifest(
    trip_id: uuid.UUID,
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    service: RevenueService = Depends(get_revenue_service),
) -> TripManifestResponse:
    """Return passenger list, seat allocations, occupancy rate, and revenue for a trip."""
    return await service.get_trip_manifest(trip_id=trip_id)
