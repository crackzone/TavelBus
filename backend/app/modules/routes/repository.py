"""Route and Stop database repositories."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.routes.models import Route, Stop


class RouteRepository:
    """Database operations for Routes."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, route_id: uuid.UUID, load_stops: bool = False) -> Route | None:
        """Fetch route with optional eager-loaded stops."""
        stmt = select(Route).where(Route.id == route_id)
        if load_stops:
            stmt = stmt.options(selectinload(Route.stops))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self, active_only: bool = False) -> list[Route]:
        """List all routes with optional active filter."""
        stmt = select(Route)
        if active_only:
            stmt = stmt.where(Route.is_active.is_(True))
        stmt = stmt.order_by(Route.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, route: Route) -> Route:
        """Persist route."""
        self.db.add(route)
        await self.db.commit()
        await self.db.refresh(route)
        return route

    async def update(self, route: Route) -> Route:
        """Update route."""
        route.updated_at = datetime.now(timezone.utc)  # noqa: UP017
        self.db.add(route)
        await self.db.commit()
        await self.db.refresh(route)
        return route


class StopRepository:
    """Database operations for Stops."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, stop_id: uuid.UUID) -> Stop | None:
        """Fetch stop by ID."""
        stmt = select(Stop).where(Stop.id == stop_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_route_and_sequence(
        self, route_id: uuid.UUID, sequence_number: int
    ) -> Stop | None:
        """Find stop at given route and sequence number."""
        stmt = select(Stop).where(
            Stop.route_id == route_id,
            Stop.sequence_number == sequence_number,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_route(self, route_id: uuid.UUID) -> list[Stop]:
        """Fetch all stops for a route in sequence order."""
        stmt = select(Stop).where(Stop.route_id == route_id).order_by(Stop.sequence_number.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, stop: Stop) -> Stop:
        """Persist stop."""
        self.db.add(stop)
        await self.db.commit()
        await self.db.refresh(stop)
        return stop

    async def update(self, stop: Stop) -> Stop:
        """Update stop."""
        stop.updated_at = datetime.now(timezone.utc)  # noqa: UP017
        self.db.add(stop)
        await self.db.commit()
        await self.db.refresh(stop)
        return stop

    async def delete(self, stop: Stop) -> None:
        """Physically remove a stop."""
        await self.db.delete(stop)
        await self.db.commit()
