"""Tracking business logic service layer with ETA calculation and real-time dispatch."""

import logging
import math
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppBaseError
from app.integrations.pubsub_client import pubsub_publisher
from app.modules.auth.models import User, UserRole
from app.modules.routes.models import Route, Stop
from app.modules.tracking.broker import tracking_broker
from app.modules.tracking.models import GPSLocation
from app.modules.tracking.repository import TrackingRepository
from app.modules.tracking.schemas import (
    DriverTripSummary,
    GPSLocationCreate,
    GPSLocationRead,
    NextStopEta,
    TripLocationCurrentRead,
)
from app.modules.trips.models import Trip, TripStatus

logger = logging.getLogger(__name__)


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two GPS coordinates in kilometers."""
    radius_earth_km = 6371.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(radius_earth_km * c, 2)


class TripNotFoundError(AppBaseError):
    """Raised when the specified trip cannot be found."""

    def __init__(self, trip_id: uuid.UUID) -> None:
        super().__init__(status_code=404, message=f"Trip '{trip_id}' not found.")


class TripNotAssignedError(AppBaseError):
    """Raised when a driver attempts to manage a trip not assigned to them."""

    def __init__(self, trip_id: uuid.UUID) -> None:
        super().__init__(status_code=403, message=f"Trip '{trip_id}' is not assigned to you.")


class InvalidTripStatusTransitionError(AppBaseError):
    """Raised when an invalid status transition is attempted."""

    def __init__(self, current_status: str, required_status: str) -> None:
        super().__init__(
            status_code=400,
            message=(
                f"Cannot perform action. Trip is '{current_status}', must be '{required_status}'."
            ),
        )


class TrackingService:
    """Manages driver trip lifecycle, GPS ingestion, and live location retrieval."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TrackingRepository(db)

    async def _get_and_authorize_driver_trip(self, trip_id: uuid.UUID, user: User) -> Trip:
        """Fetch trip and assert the current driver or admin has permission."""
        query = select(Trip).where(Trip.id == trip_id)
        result = await self.db.execute(query)
        trip = result.scalar_one_or_none()
        if not trip:
            raise TripNotFoundError(trip_id)

        # Allow ADMIN or the assigned driver
        if user.role != UserRole.ADMIN and trip.driver_id != user.id:
            raise TripNotAssignedError(trip_id)

        return trip

    async def list_driver_trips(self, user: User) -> list[DriverTripSummary]:
        """List all trips assigned to the requesting driver."""
        query = select(Trip)
        if user.role != UserRole.ADMIN:
            query = query.where(Trip.driver_id == user.id)
        query = query.order_by(Trip.departure_time.asc())
        result = await self.db.execute(query)
        trips = result.scalars().all()
        return [
            DriverTripSummary(
                id=t.id,
                route_id=t.route_id,
                bus_id=t.bus_id,
                departure_time=t.departure_time,
                arrival_time=t.arrival_time,
                fare=float(t.fare),
                status=t.status.value,
            )
            for t in trips
        ]

    async def start_trip(self, trip_id: uuid.UUID, user: User) -> Trip:
        """Driver starts the trip: transitions status to IN_PROGRESS."""
        trip = await self._get_and_authorize_driver_trip(trip_id, user)
        if trip.status not in (TripStatus.SCHEDULED, TripStatus.BOARDING):
            raise InvalidTripStatusTransitionError(
                current_status=trip.status.value,
                required_status=f"{TripStatus.SCHEDULED.value} or {TripStatus.BOARDING.value}",
            )

        trip.status = TripStatus.IN_PROGRESS
        trip.updated_at = datetime.now(timezone.utc)  # noqa: UP017
        self.db.add(trip)
        await self.db.commit()
        await self.db.refresh(trip)
        logger.info("Trip %s started by driver %s", trip.id, user.id)

        # Broadcast status transition to connected real-time clients
        await tracking_broker.broadcast(
            trip_id,
            {
                "event_type": "TRIP_STARTED",
                "trip_id": str(trip.id),
                "status": trip.status.value,
            },
        )

        return trip

    async def finish_trip(self, trip_id: uuid.UUID, user: User) -> Trip:
        """Driver completes the trip: transitions status to COMPLETED."""
        trip = await self._get_and_authorize_driver_trip(trip_id, user)
        if trip.status != TripStatus.IN_PROGRESS:
            raise InvalidTripStatusTransitionError(
                current_status=trip.status.value,
                required_status=TripStatus.IN_PROGRESS.value,
            )

        trip.status = TripStatus.COMPLETED
        trip.updated_at = datetime.now(timezone.utc)  # noqa: UP017
        self.db.add(trip)
        await self.db.commit()
        await self.db.refresh(trip)
        logger.info("Trip %s marked as COMPLETED by driver %s", trip.id, user.id)

        # Broadcast completion to connected clients
        await tracking_broker.broadcast(
            trip_id,
            {
                "event_type": "TRIP_COMPLETED",
                "trip_id": str(trip.id),
                "status": trip.status.value,
            },
        )

        return trip

    def _compute_next_stop(
        self,
        stops: list[Stop],
        current_lat: float,
        current_lon: float,
        speed_kmph: float,
    ) -> NextStopEta | None:
        """Find the nearest upcoming stop and compute estimated time of arrival."""
        if not stops:
            return None

        # Sort stops by sequence
        ordered_stops = sorted(stops, key=lambda s: s.sequence_number)

        # Find closest upcoming stop by haversine distance
        nearest_stop = None
        min_dist = float("inf")

        for stop in ordered_stops:
            dist = calculate_haversine_distance_km(
                current_lat, current_lon, stop.latitude, stop.longitude
            )
            if dist < min_dist:
                min_dist = dist
                nearest_stop = stop

        if not nearest_stop:
            return None

        # Estimate arrival minutes: distance / speed * 60 (defaulting to 40 km/h if stopped/zero)
        effective_speed = speed_kmph if speed_kmph > 5.0 else 40.0
        minutes_away = round((min_dist / effective_speed) * 60.0, 1)

        return NextStopEta(
            stop_id=nearest_stop.id,
            stop_name=nearest_stop.name,
            sequence_number=nearest_stop.sequence_number,
            distance_km=min_dist,
            estimated_minutes_away=minutes_away,
        )

    async def record_location(
        self,
        trip_id: uuid.UUID,
        payload: GPSLocationCreate,
        user: User,
    ) -> GPSLocationRead:
        """Record GPS ping, dispatch to Pub/Sub, and broadcast to active subscribers."""
        trip = await self._get_and_authorize_driver_trip(trip_id, user)
        if trip.status != TripStatus.IN_PROGRESS:
            raise InvalidTripStatusTransitionError(
                current_status=trip.status.value,
                required_status=TripStatus.IN_PROGRESS.value,
            )

        location = GPSLocation(
            trip_id=trip.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            speed_kmph=payload.speed_kmph,
            heading=payload.heading,
            recorded_at=payload.recorded_at,
        )
        saved_location = await self.repo.create_location(location)
        await self.db.commit()
        await self.db.refresh(saved_location)

        loc_read = GPSLocationRead.model_validate(saved_location)

        # Real-time WebSocket/SSE broadcast
        broadcast_payload: dict[str, Any] = {
            "event_type": "LOCATION_UPDATED",
            "trip_id": str(trip.id),
            "status": trip.status.value,
            "location": loc_read.model_dump(mode="json"),
        }
        await tracking_broker.broadcast(trip.id, broadcast_payload)

        # Asynchronously dispatch to Pub/Sub event stream
        try:
            await pubsub_publisher.publish_bus_location_event(
                trip_id=trip.id,
                bus_id=trip.bus_id,
                latitude=payload.latitude,
                longitude=payload.longitude,
                speed_kmph=payload.speed_kmph,
                heading=payload.heading,
                recorded_at=payload.recorded_at,
            )
        except Exception as exc:
            logger.warning("PubSub event publishing encountered an issue: %s", exc)

        return loc_read

    async def get_trip_live_location(self, trip_id: uuid.UUID) -> TripLocationCurrentRead:
        """Public/passenger query for current location, next stop ETA, and breadcrumbs."""
        query = (
            select(Trip)
            .options(selectinload(Trip.route).selectinload(Route.stops))
            .where(Trip.id == trip_id)
        )
        result = await self.db.execute(query)
        trip = result.scalar_one_or_none()
        if not trip:
            raise TripNotFoundError(trip_id)

        latest = await self.repo.get_latest_location(trip_id)
        breadcrumbs = await self.repo.get_recent_locations(trip_id, limit=10)

        next_stop = None
        if latest and trip.route and trip.route.stops:
            next_stop = self._compute_next_stop(
                stops=trip.route.stops,
                current_lat=latest.latitude,
                current_lon=latest.longitude,
                speed_kmph=latest.speed_kmph,
            )

        return TripLocationCurrentRead(
            trip_id=trip.id,
            trip_status=trip.status.value,
            latest_location=GPSLocationRead.model_validate(latest) if latest else None,
            next_stop=next_stop,
            recent_breadcrumbs=[GPSLocationRead.model_validate(b) for b in breadcrumbs],
        )
