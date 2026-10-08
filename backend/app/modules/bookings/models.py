"""Booking, TripSeat, and AuditEvent SQLAlchemy models."""

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.trips.models import Trip


class TripSeatStatus(str, enum.Enum):  # noqa: UP042
    """Availability status of a seat on a specific trip."""

    AVAILABLE = "AVAILABLE"
    LOCKED = "LOCKED"
    BOOKED = "BOOKED"


class BookingStatus(str, enum.Enum):  # noqa: UP042
    """Lifecycle status of a booking."""

    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class PaymentStatus(str, enum.Enum):  # noqa: UP042
    """Payment settlement status."""

    PENDING = "PENDING"
    PAID = "PAID"
    REFUNDED = "REFUNDED"
    FAILED = "FAILED"


class TripSeat(Base, TimestampMixin):
    """Specific seat allocation belonging to a scheduled trip."""

    __tablename__ = "trip_seats"
    __table_args__ = (
        UniqueConstraint("trip_id", "seat_number", name="uq_trip_seat_number"),
        CheckConstraint("seat_number > 0", name="chk_trip_seat_number_positive"),
        Index("ix_trip_seats_trip_id", "trip_id"),
        Index("ix_trip_seats_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
    )
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[TripSeatStatus] = mapped_column(
        Enum(TripSeatStatus, native_enum=False, length=20),
        default=TripSeatStatus.AVAILABLE,
        nullable=False,
    )

    # Relationships
    booking: Mapped["Booking | None"] = relationship(
        "Booking", back_populates="trip_seat", uselist=False
    )

    def __repr__(self) -> str:
        return f"<TripSeat id={self.id} seat={self.seat_number} status={self.status}>"


class Booking(Base, TimestampMixin):
    """Passenger booking record for a trip seat."""

    __tablename__ = "bookings"
    __table_args__ = (
        UniqueConstraint("booking_reference", name="uq_booking_reference"),
        CheckConstraint("amount >= 0", name="chk_booking_amount_non_negative"),
        Index("ix_bookings_user_id", "user_id"),
        Index("ix_bookings_trip_id", "trip_id"),
        Index("ix_bookings_reference", "booking_reference"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    booking_reference: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="RESTRICT"),
        nullable=False,
    )
    trip_seat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trip_seats.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, native_enum=False, length=20),
        default=BookingStatus.CONFIRMED,
        nullable=False,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, native_enum=False, length=20),
        default=PaymentStatus.PAID,
        nullable=False,
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    trip_seat: Mapped[TripSeat] = relationship("TripSeat", back_populates="booking")
    trip: Mapped["Trip"] = relationship("Trip")

    def __repr__(self) -> str:
        return f"<Booking ref={self.booking_reference} user={self.user_id} status={self.status}>"


class AuditEvent(Base, TimestampMixin):
    """Immutable audit log for business transactions."""

    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_actor", "actor_user_id"),
        Index("ix_audit_events_entity", "entity_type", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<AuditEvent type={self.event_type} entity={self.entity_type}:{self.entity_id}>"
