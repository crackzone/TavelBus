"""Trip database repository layer."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.trips.models import Trip, TripStatus


class TripRepository:
    """Encapsulates database access for Trips."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, trip_id: uuid.UUID, load_relations: bool = False) -> Trip | None:
        """Fetch trip by ID."""
        stmt = select(Trip).where(Trip.id == trip_id)
        if load_relations:
            stmt = stmt.options(selectinload(Trip.route), selectinload(Trip.bus))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(
        self,
        route_id: uuid.UUID | None = None,
        bus_id: uuid.UUID | None = None,
        status: TripStatus | None = None,
    ) -> list[Trip]:
        """List trips matching optional filters."""
        stmt = select(Trip)
        if route_id:
            stmt = stmt.where(Trip.route_id == route_id)
        if bus_id:
            stmt = stmt.where(Trip.bus_id == bus_id)
        if status:
            stmt = stmt.where(Trip.status == status)

        stmt = stmt.order_by(Trip.departure_time.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def find_overlapping_bus_trip(
        self,
        bus_id: uuid.UUID,
        departure_time: datetime,
        arrival_time: datetime,
        exclude_trip_id: uuid.UUID | None = None,
    ) -> Trip | None:
        """Check if bus is already scheduled on another overlapping trip.

        Overlap rule: new_departure < existing_arrival AND new_arrival > existing_departure
        Cancelled trips are excluded.
        """
        stmt = select(Trip).where(
            Trip.bus_id == bus_id,
            Trip.status != TripStatus.CANCELLED,
            Trip.departure_time < arrival_time,
            Trip.arrival_time > departure_time,
        )
        if exclude_trip_id:
            stmt = stmt.where(Trip.id != exclude_trip_id)

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def find_overlapping_driver_trip(
        self,
        driver_id: uuid.UUID,
        departure_time: datetime,
        arrival_time: datetime,
        exclude_trip_id: uuid.UUID | None = None,
    ) -> Trip | None:
        """Check if driver is already scheduled on an overlapping trip.

        Cancelled trips are excluded.
        """
        stmt = select(Trip).where(
            Trip.driver_id == driver_id,
            Trip.status != TripStatus.CANCELLED,
            Trip.departure_time < arrival_time,
            Trip.arrival_time > departure_time,
        )
        if exclude_trip_id:
            stmt = stmt.where(Trip.id != exclude_trip_id)

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, trip: Trip) -> Trip:
        """Persist new trip."""
        self.db.add(trip)
        await self.db.commit()
        await self.db.refresh(trip)
        return trip

    async def update(self, trip: Trip) -> Trip:
        """Save updated trip."""
        trip.updated_at = datetime.now(timezone.utc)  # noqa: UP017
        self.db.add(trip)
        await self.db.commit()
        await self.db.refresh(trip)
        return trip
