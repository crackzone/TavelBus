"""Repository layer for database operations on GPS locations."""

import uuid

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tracking.models import GPSLocation


class TrackingRepository:
    """Handles persistence and retrieval of GPS pings."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_location(self, location: GPSLocation) -> GPSLocation:
        """Persist a new GPS telemetry ping."""
        self.db.add(location)
        await self.db.flush()
        await self.db.refresh(location)
        return location

    async def get_latest_location(self, trip_id: uuid.UUID) -> GPSLocation | None:
        """Retrieve the most recent GPS ping recorded for a trip."""
        query = (
            select(GPSLocation)
            .where(GPSLocation.trip_id == trip_id)
            .order_by(desc(GPSLocation.recorded_at))
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_recent_locations(self, trip_id: uuid.UUID, limit: int = 10) -> list[GPSLocation]:
        """Retrieve the recent breadcrumb trajectory points for a trip."""
        query = (
            select(GPSLocation)
            .where(GPSLocation.trip_id == trip_id)
            .order_by(desc(GPSLocation.recorded_at))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
