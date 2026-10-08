"""Route and Stop domain service."""

import uuid

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.modules.routes.models import Route, Stop
from app.modules.routes.repository import RouteRepository, StopRepository
from app.modules.routes.schemas import RouteCreate, RouteUpdate, StopCreate, StopUpdate


class RouteService:
    """Business logic for Routes and Route Stops."""

    def __init__(self, route_repo: RouteRepository, stop_repo: StopRepository):
        self.route_repo = route_repo
        self.stop_repo = stop_repo

    # --- Route Operations ---
    async def create_route(self, data: RouteCreate) -> Route:
        """Create new route."""
        route = Route(
            name=data.name.strip(),
            origin=data.origin.strip(),
            destination=data.destination.strip(),
            distance_km=data.distance_km,
            estimated_duration_minutes=data.estimated_duration_minutes,
            is_active=data.is_active,
        )
        return await self.route_repo.create(route)

    async def get_route(self, route_id: uuid.UUID, load_stops: bool = False) -> Route:
        """Get route or raise 404."""
        route = await self.route_repo.get_by_id(route_id, load_stops=load_stops)
        if not route:
            raise ResourceNotFoundError(
                message=f"Route with ID '{route_id}' not found.",
                code="ROUTE_NOT_FOUND",
            )
        return route

    async def list_routes(self, active_only: bool = False) -> list[Route]:
        """List routes."""
        return await self.route_repo.list_all(active_only=active_only)

    async def update_route(self, route_id: uuid.UUID, data: RouteUpdate) -> Route:
        """Update route fields."""
        route = await self.get_route(route_id)
        if data.name is not None:
            route.name = data.name.strip()
        if data.origin is not None:
            route.origin = data.origin.strip()
        if data.destination is not None:
            route.destination = data.destination.strip()
        if data.distance_km is not None:
            route.distance_km = data.distance_km
        if data.estimated_duration_minutes is not None:
            route.estimated_duration_minutes = data.estimated_duration_minutes
        if data.is_active is not None:
            route.is_active = data.is_active

        return await self.route_repo.update(route)

    async def deactivate_route(self, route_id: uuid.UUID) -> Route:
        """Deactivate a route."""
        route = await self.get_route(route_id)
        route.is_active = False
        return await self.route_repo.update(route)

    async def reactivate_route(self, route_id: uuid.UUID) -> Route:
        """Reactivate a route."""
        route = await self.get_route(route_id)
        route.is_active = True
        return await self.route_repo.update(route)

    # --- Stop Operations ---
    async def create_stop(self, route_id: uuid.UUID, data: StopCreate) -> Stop:
        """Add a stop to a route with sequence uniqueness verification."""
        await self.get_route(route_id)  # Validate route exists

        existing_seq = await self.stop_repo.get_by_route_and_sequence(
            route_id, data.sequence_number
        )
        if existing_seq:
            raise ConflictError(
                message=f"Stop with sequence {data.sequence_number} already exists on this route.",
                code="DUPLICATE_STOP_SEQUENCE",
            )

        stop = Stop(
            route_id=route_id,
            name=data.name.strip(),
            sequence_number=data.sequence_number,
            latitude=data.latitude,
            longitude=data.longitude,
        )
        return await self.stop_repo.create(stop)

    async def list_stops_for_route(self, route_id: uuid.UUID) -> list[Stop]:
        """Fetch sequenced stops for a route."""
        await self.get_route(route_id)
        return await self.stop_repo.list_by_route(route_id)

    async def get_stop(self, stop_id: uuid.UUID) -> Stop:
        """Get stop by ID or raise 404."""
        stop = await self.stop_repo.get_by_id(stop_id)
        if not stop:
            raise ResourceNotFoundError(
                message=f"Stop with ID '{stop_id}' not found.",
                code="STOP_NOT_FOUND",
            )
        return stop

    async def update_stop(self, stop_id: uuid.UUID, data: StopUpdate) -> Stop:
        """Update stop information."""
        stop = await self.get_stop(stop_id)

        if data.sequence_number is not None and data.sequence_number != stop.sequence_number:
            conflict = await self.stop_repo.get_by_route_and_sequence(
                stop.route_id, data.sequence_number
            )
            if conflict:
                raise ConflictError(
                    message=f"Stop sequence {data.sequence_number} already exists on this route.",
                    code="DUPLICATE_STOP_SEQUENCE",
                )
            stop.sequence_number = data.sequence_number

        if data.name is not None:
            stop.name = data.name.strip()
        if data.latitude is not None:
            stop.latitude = data.latitude
        if data.longitude is not None:
            stop.longitude = data.longitude

        return await self.stop_repo.update(stop)

    async def delete_stop(self, stop_id: uuid.UUID) -> None:
        """Delete a stop."""
        stop = await self.get_stop(stop_id)
        await self.stop_repo.delete(stop)
