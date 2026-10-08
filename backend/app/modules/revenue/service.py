"""Service layer for revenue management and operational analytics."""

import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppBaseError
from app.modules.revenue.repository import RevenueRepository
from app.modules.revenue.schemas import (
    BusRevenueBreakdown,
    RevenueSummaryResponse,
    RouteRevenueBreakdown,
    TripManifestResponse,
)


class TripNotFoundError(AppBaseError):
    """Raised when trip is not found for manifest query."""

    def __init__(self, trip_id: uuid.UUID) -> None:
        super().__init__(status_code=404, message=f"Trip '{trip_id}' not found.")


class RevenueService:
    """Business logic coordinator for revenue reports and manifests."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = RevenueRepository(db)

    async def get_summary(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> RevenueSummaryResponse:
        """Retrieve overall revenue and booking statistics."""
        return await self.repo.get_overall_summary(start_date=start_date, end_date=end_date)

    async def get_by_route(self) -> list[RouteRevenueBreakdown]:
        """Retrieve route-level revenue and performance aggregations."""
        return await self.repo.get_revenue_by_route()

    async def get_by_bus(self) -> list[BusRevenueBreakdown]:
        """Retrieve bus-level revenue and performance aggregations."""
        return await self.repo.get_revenue_by_bus()

    async def get_trip_manifest(self, trip_id: uuid.UUID) -> TripManifestResponse:
        """Retrieve detailed passenger manifest for a specific trip."""
        manifest = await self.repo.get_trip_manifest(trip_id)
        if not manifest:
            raise TripNotFoundError(trip_id)
        return manifest
