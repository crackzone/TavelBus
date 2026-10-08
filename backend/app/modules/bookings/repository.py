"""Database repository for TripSeats, Bookings, and AuditEvents."""

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.bookings.models import (
    AuditEvent,
    Booking,
    BookingStatus,
    TripSeat,
)


class BookingRepository:
    """Encapsulates transactional database access with row locking for bookings and seats."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Seat Operations ---
    async def get_seats_by_trip(self, trip_id: uuid.UUID) -> Sequence[TripSeat]:
        """Fetch all seats for a trip ordered by seat number."""
        stmt = (
            select(TripSeat).where(TripSeat.trip_id == trip_id).order_by(TripSeat.seat_number.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_seat_for_update(
        self,
        trip_id: uuid.UUID,
        seat_number: int,
    ) -> TripSeat | None:
        """Lock and return specific trip seat using SELECT FOR UPDATE."""
        stmt = (
            select(TripSeat)
            .where(TripSeat.trip_id == trip_id, TripSeat.seat_number == seat_number)
            .with_for_update()
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_trip_seats_bulk(self, seats: list[TripSeat]) -> None:
        """Insert initial set of trip seats."""
        self.db.add_all(seats)
        await self.db.flush()

    # --- Booking Operations ---
    async def get_by_id(self, booking_id: uuid.UUID) -> Booking | None:
        """Fetch booking by primary key with trip seat loaded."""
        stmt = (
            select(Booking).where(Booking.id == booking_id).options(selectinload(Booking.trip_seat))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_reference(self, reference: str) -> Booking | None:
        """Fetch booking by unique booking reference."""
        stmt = (
            select(Booking)
            .where(Booking.booking_reference == reference)
            .options(selectinload(Booking.trip_seat))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(
        self,
        user_id: uuid.UUID,
        key: str,
    ) -> Booking | None:
        """Fetch existing booking by user and idempotency key."""
        stmt = (
            select(Booking)
            .where(Booking.user_id == user_id, Booking.idempotency_key == key)
            .options(selectinload(Booking.trip_seat))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> Sequence[Booking]:
        """List all bookings for a user."""
        stmt = (
            select(Booking)
            .where(Booking.user_id == user_id)
            .options(selectinload(Booking.trip_seat))
            .order_by(Booking.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_all(
        self,
        trip_id: uuid.UUID | None = None,
        status: BookingStatus | None = None,
    ) -> Sequence[Booking]:
        """List all bookings across the system with optional filters."""
        stmt = select(Booking).options(selectinload(Booking.trip_seat))
        if trip_id:
            stmt = stmt.where(Booking.trip_id == trip_id)
        if status:
            stmt = stmt.where(Booking.status == status)
        stmt = stmt.order_by(Booking.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_booking(self, booking: Booking) -> Booking:
        """Add new booking to active transaction."""
        self.db.add(booking)
        await self.db.flush()
        return booking

    async def record_audit_event(
        self,
        actor_id: uuid.UUID | None,
        event_type: str,
        entity_type: str,
        entity_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Log an immutable audit trail event."""
        event = AuditEvent(
            actor_user_id=actor_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            event_metadata=metadata,
        )
        self.db.add(event)
        await self.db.flush()
