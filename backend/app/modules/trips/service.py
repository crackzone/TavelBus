"""Trip domain service implementing scheduling rules and overlap detection."""

import uuid
from datetime import datetime, timezone

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    InactiveResourceError,
    ResourceNotFoundError,
)
from app.modules.buses.models import BusStatus
from app.modules.buses.repository import BusRepository
from app.modules.routes.repository import RouteRepository
from app.modules.trips.models import Trip, TripStatus
from app.modules.trips.repository import TripRepository
from app.modules.trips.schemas import TripCreate, TripUpdate


class TripService:
    """Business logic for trip schedules, overlaps, and cancellations."""

    def __init__(
        self,
        trip_repo: TripRepository,
        bus_repo: BusRepository,
        route_repo: RouteRepository,
    ):
        self.trip_repo = trip_repo
        self.bus_repo = bus_repo
        self.route_repo = route_repo

    async def create_trip(self, data: TripCreate) -> Trip:
        """Create and schedule a new trip."""
        # 1. Validate departure time vs arrival time
        if data.departure_time >= data.arrival_time:
            raise BadRequestError(
                message="departure_time must be strictly before arrival_time.",
                code="INVALID_TRIP_TIME",
            )

        # 2. Prevent creating past trips as normal scheduled trips
        now = datetime.now(timezone.utc)  # noqa: UP017
        if data.departure_time < now:
            raise BadRequestError(
                message="Cannot schedule a trip with departure time in the past.",
                code="INVALID_TRIP_TIME",
            )

        # 3. Validate fare
        if data.fare < 0:
            raise BadRequestError(
                message="Fare must be greater than or equal to zero.",
                code="INVALID_FARE",
            )

        # 4. Validate bus exists and is ACTIVE
        bus = await self.bus_repo.get_by_id(data.bus_id)
        if not bus:
            raise ResourceNotFoundError(
                message=f"Bus with ID '{data.bus_id}' not found.",
                code="BUS_NOT_FOUND",
            )
        if bus.status != BusStatus.ACTIVE:
            raise InactiveResourceError(
                message=f"Bus '{bus.registration_number}' is not active ({bus.status.value}).",
                code="BUS_INACTIVE",
            )

        # 5. Validate route exists and is ACTIVE
        route = await self.route_repo.get_by_id(data.route_id)
        if not route:
            raise ResourceNotFoundError(
                message=f"Route with ID '{data.route_id}' not found.",
                code="ROUTE_NOT_FOUND",
            )
        if not route.is_active:
            raise InactiveResourceError(
                message=f"Route '{route.name}' is inactive.",
                code="ROUTE_INACTIVE",
            )

        # 6. Check for bus overlap
        bus_conflict = await self.trip_repo.find_overlapping_bus_trip(
            bus_id=data.bus_id,
            departure_time=data.departure_time,
            arrival_time=data.arrival_time,
        )
        if bus_conflict:
            raise ConflictError(
                message=f"Bus '{bus.registration_number}' has conflicting trip {bus_conflict.id}.",
                code="BUS_TRIP_CONFLICT",
            )

        # 7. Check for driver overlap if driver assigned
        if data.driver_id:
            driver_conflict = await self.trip_repo.find_overlapping_driver_trip(
                driver_id=data.driver_id,
                departure_time=data.departure_time,
                arrival_time=data.arrival_time,
            )
            if driver_conflict:
                raise ConflictError(
                    message=f"Driver '{data.driver_id}' has conflicting trip {driver_conflict.id}.",
                    code="DRIVER_TRIP_CONFLICT",
                )

        trip = Trip(
            route_id=data.route_id,
            bus_id=data.bus_id,
            driver_id=data.driver_id,
            departure_time=data.departure_time,
            arrival_time=data.arrival_time,
            fare=data.fare,
            status=data.status,
        )
        return await self.trip_repo.create(trip)

    async def get_trip(self, trip_id: uuid.UUID) -> Trip:
        """Fetch trip or raise 404."""
        trip = await self.trip_repo.get_by_id(trip_id, load_relations=True)
        if not trip:
            raise ResourceNotFoundError(
                message=f"Trip with ID '{trip_id}' not found.",
                code="TRIP_NOT_FOUND",
            )
        return trip

    async def list_trips(
        self,
        route_id: uuid.UUID | None = None,
        bus_id: uuid.UUID | None = None,
        status: TripStatus | None = None,
    ) -> list[Trip]:
        """List trips matching filter criteria."""
        return await self.trip_repo.list_all(route_id=route_id, bus_id=bus_id, status=status)

    async def update_trip(self, trip_id: uuid.UUID, data: TripUpdate) -> Trip:
        """Update or reschedule trip."""
        trip = await self.get_trip(trip_id)

        target_dep = data.departure_time or trip.departure_time
        target_arr = data.arrival_time or trip.arrival_time
        target_bus = data.bus_id or trip.bus_id
        target_driver = data.driver_id if data.driver_id is not None else trip.driver_id

        if target_dep >= target_arr:
            raise BadRequestError(
                message="departure_time must be strictly before arrival_time.",
                code="INVALID_TRIP_TIME",
            )

        if data.fare is not None and data.fare < 0:
            raise BadRequestError(
                message="Fare must be non-negative.",
                code="INVALID_FARE",
            )

        # Validate bus if changed
        if data.bus_id and data.bus_id != trip.bus_id:
            bus = await self.bus_repo.get_by_id(data.bus_id)
            if not bus or bus.status != BusStatus.ACTIVE:
                raise InactiveResourceError(
                    message="Assigned bus must be active.", code="BUS_INACTIVE"
                )

        # Validate overlaps excluding self
        bus_conflict = await self.trip_repo.find_overlapping_bus_trip(
            bus_id=target_bus,
            departure_time=target_dep,
            arrival_time=target_arr,
            exclude_trip_id=trip.id,
        )
        if bus_conflict:
            raise ConflictError(
                message="Bus has an overlapping trip scheduled during this period.",
                code="BUS_TRIP_CONFLICT",
            )

        if target_driver:
            driver_conflict = await self.trip_repo.find_overlapping_driver_trip(
                driver_id=target_driver,
                departure_time=target_dep,
                arrival_time=target_arr,
                exclude_trip_id=trip.id,
            )
            if driver_conflict:
                raise ConflictError(
                    message="Driver has an overlapping trip scheduled during this period.",
                    code="DRIVER_TRIP_CONFLICT",
                )

        if data.bus_id:
            trip.bus_id = data.bus_id
        if data.driver_id is not None:
            trip.driver_id = data.driver_id
        if data.departure_time:
            trip.departure_time = data.departure_time
        if data.arrival_time:
            trip.arrival_time = data.arrival_time
        if data.fare is not None:
            trip.fare = data.fare
        if data.status:
            trip.status = data.status

        return await self.trip_repo.update(trip)

    async def cancel_trip(self, trip_id: uuid.UUID) -> Trip:
        """Cancel a trip while preserving it in history."""
        trip = await self.get_trip(trip_id)
        if trip.status == TripStatus.CANCELLED:
            raise BadRequestError(
                message="Trip is already cancelled.",
                code="TRIP_ALREADY_CANCELLED",
            )
        trip.status = TripStatus.CANCELLED
        return await self.trip_repo.update(trip)
