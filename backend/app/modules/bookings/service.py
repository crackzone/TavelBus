"""Booking service orchestrating transactional seat reservation and cancellation."""

import secrets
import string
import uuid
from collections.abc import Sequence
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    InactiveResourceError,
    PermissionDeniedError,
    ResourceNotFoundError,
)
from app.modules.bookings.models import (
    Booking,
    BookingStatus,
    PaymentStatus,
    TripSeat,
    TripSeatStatus,
)
from app.modules.bookings.payments import PaymentProvider
from app.modules.bookings.repository import BookingRepository
from app.modules.bookings.schemas import (
    BookingCancelResponse,
    BookingCreate,
    BookingResponse,
)
from app.modules.trips.models import TripStatus
from app.modules.trips.repository import TripRepository


class BookingService:
    """Manages transactional booking operations, seat locking, and cancellation."""

    def __init__(
        self,
        db: AsyncSession,
        booking_repo: BookingRepository,
        trip_repo: TripRepository,
        payment_provider: PaymentProvider,
    ):
        self.db = db
        self.booking_repo = booking_repo
        self.trip_repo = trip_repo
        self.payment_provider = payment_provider

    async def get_or_initialize_trip_seats(self, trip_id: uuid.UUID) -> Sequence[TripSeat]:
        """Fetch seats for trip, automatically initializing them from bus capacity if missing."""
        seats = await self.booking_repo.get_seats_by_trip(trip_id)
        if seats:
            return seats

        trip = await self.trip_repo.get_by_id(trip_id, load_relations=True)
        if not trip:
            raise ResourceNotFoundError(
                message=f"Trip with ID '{trip_id}' not found.",
                code="TRIP_NOT_FOUND",
            )

        bus = trip.bus
        new_seats = [
            TripSeat(trip_id=trip_id, seat_number=num, status=TripSeatStatus.AVAILABLE)
            for num in range(1, bus.seat_capacity + 1)
        ]
        await self.booking_repo.create_trip_seats_bulk(new_seats)
        await self.db.commit()
        return await self.booking_repo.get_seats_by_trip(trip_id)

    async def create_booking(
        self,
        user_id: uuid.UUID,
        data: BookingCreate,
        idempotency_key: str | None = None,
    ) -> BookingResponse:
        """Create a booking safely in a database transaction with pessimistic seat locking."""
        # 1. Check idempotency key first
        if idempotency_key:
            clean_key = idempotency_key.strip()
            existing = await self.booking_repo.get_by_idempotency_key(user_id, clean_key)
            if existing:
                return self._to_booking_response(existing)
        else:
            clean_key = None

        # 2. Validate trip exists and is bookable
        trip = await self.trip_repo.get_by_id(data.trip_id, load_relations=True)
        if not trip:
            raise ResourceNotFoundError(
                message=f"Trip with ID '{data.trip_id}' not found.",
                code="TRIP_NOT_FOUND",
            )

        if trip.status != TripStatus.SCHEDULED:
            raise InactiveResourceError(
                message=f"Trip is not open for booking (status: {trip.status.value}).",
                code="TRIP_NOT_BOOKABLE",
            )

        now = datetime.now(timezone.utc)  # noqa: UP017
        dep_time = trip.departure_time
        if dep_time.tzinfo is None:
            dep_time = dep_time.replace(tzinfo=timezone.utc)  # noqa: UP017
        if dep_time <= now:
            raise BadRequestError(
                message="Cannot book a trip that has already departed.",
                code="TRIP_ALREADY_DEPARTED",
            )

        # 3. Ensure seats are initialized
        await self.get_or_initialize_trip_seats(trip.id)

        # 4. Lock seat row using SELECT FOR UPDATE
        seat = await self.booking_repo.get_seat_for_update(trip.id, data.seat_number)
        if not seat:
            raise ResourceNotFoundError(
                message=f"Seat {data.seat_number} does not exist for this trip.",
                code="SEAT_NOT_FOUND",
            )

        # 5. Check seat availability
        if seat.status != TripSeatStatus.AVAILABLE:
            raise ConflictError(
                message=f"Seat {data.seat_number} is no longer available.",
                code="SEAT_NOT_AVAILABLE",
            )

        # 6. Process mock payment
        booking_ref = self._generate_booking_reference()
        payment_result = await self.payment_provider.process_payment(
            amount=trip.fare,
            currency="INR",
            reference=booking_ref,
        )

        # 7. Create booking & mark seat as BOOKED
        seat.status = TripSeatStatus.BOOKED

        booking = Booking(
            booking_reference=booking_ref,
            user_id=user_id,
            trip_id=trip.id,
            trip_seat_id=seat.id,
            amount=trip.fare,
            status=BookingStatus.CONFIRMED,
            payment_status=PaymentStatus.PAID,
            idempotency_key=clean_key,
        )
        await self.booking_repo.create_booking(booking)

        # 8. Record audit event
        await self.booking_repo.record_audit_event(
            actor_id=user_id,
            event_type="BOOKING_CREATED",
            entity_type="BOOKING",
            entity_id=booking_ref,
            metadata={
                "trip_id": str(trip.id),
                "seat_number": data.seat_number,
                "amount": float(trip.fare),
                "tx_id": payment_result.get("transaction_id"),
            },
        )

        # 9. Commit transaction atomically
        await self.db.commit()
        await self.db.refresh(booking)

        booking.trip_seat = seat
        return self._to_booking_response(booking)

    async def cancel_booking(
        self,
        booking_id: uuid.UUID,
        user_id: uuid.UUID,
        is_admin: bool = False,
    ) -> BookingCancelResponse:
        """Cancel a booking, free the seat, and record an audit event."""
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise ResourceNotFoundError(
                message=f"Booking with ID '{booking_id}' not found.",
                code="BOOKING_NOT_FOUND",
            )

        # Check ownership unless admin
        if not is_admin and booking.user_id != user_id:
            raise PermissionDeniedError(
                message="You do not have permission to cancel this booking.",
                code="UNAUTHORIZED_BOOKING_ACCESS",
            )

        if booking.status == BookingStatus.CANCELLED:
            raise BadRequestError(
                message="Booking is already cancelled.",
                code="BOOKING_ALREADY_CANCELLED",
            )

        # Lock seat and free it
        seat = await self.booking_repo.get_seat_for_update(
            booking.trip_id, booking.trip_seat.seat_number
        )
        if seat:
            seat.status = TripSeatStatus.AVAILABLE

        now = datetime.now(timezone.utc)  # noqa: UP017
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = now
        booking.payment_status = PaymentStatus.REFUNDED

        # Mock refund
        await self.payment_provider.process_refund(
            payment_id=f"ref_{booking.booking_reference}",
            amount=booking.amount,
        )

        # Record audit event
        await self.booking_repo.record_audit_event(
            actor_id=user_id,
            event_type="BOOKING_CANCELLED",
            entity_type="BOOKING",
            entity_id=booking.booking_reference,
            metadata={"amount_refunded": float(booking.amount)},
        )

        await self.db.commit()

        return BookingCancelResponse(
            booking_reference=booking.booking_reference,
            status=BookingStatus.CANCELLED,
            refund_status="PROCESSED",
            cancelled_at=now,
        )

    async def get_booking(
        self,
        booking_id: uuid.UUID,
        user_id: uuid.UUID,
        is_admin: bool = False,
    ) -> BookingResponse:
        """Get single booking details verifying ownership."""
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise ResourceNotFoundError(
                message=f"Booking with ID '{booking_id}' not found.",
                code="BOOKING_NOT_FOUND",
            )

        if not is_admin and booking.user_id != user_id:
            raise PermissionDeniedError(
                message="You do not have permission to view this booking.",
                code="UNAUTHORIZED_BOOKING_ACCESS",
            )

        return self._to_booking_response(booking)

    async def list_user_bookings(self, user_id: uuid.UUID) -> list[BookingResponse]:
        """List bookings made by authenticated user."""
        bookings = await self.booking_repo.list_by_user(user_id)
        return [self._to_booking_response(b) for b in bookings]

    async def list_all_bookings(
        self,
        trip_id: uuid.UUID | None = None,
        status: BookingStatus | None = None,
    ) -> list[BookingResponse]:
        """List all bookings (Admin view)."""
        bookings = await self.booking_repo.list_all(trip_id=trip_id, status=status)
        return [self._to_booking_response(b) for b in bookings]

    def _generate_booking_reference(self) -> str:
        """Generate human-readable 8-char uppercase booking reference."""
        chars = string.ascii_uppercase + string.digits
        return "TB-" + "".join(secrets.choice(chars) for _ in range(8))

    def _to_booking_response(self, booking: Booking) -> BookingResponse:
        """Format ORM booking to response schema."""
        return BookingResponse(
            id=booking.id,
            booking_reference=booking.booking_reference,
            user_id=booking.user_id,
            trip_id=booking.trip_id,
            trip_seat_id=booking.trip_seat_id,
            seat_number=booking.trip_seat.seat_number if booking.trip_seat else 0,
            amount=booking.amount,
            status=booking.status,
            payment_status=booking.payment_status,
            created_at=booking.created_at,
            cancelled_at=booking.cancelled_at,
        )
