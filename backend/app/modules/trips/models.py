"""Trip SQLAlchemy model and TripStatus enum."""

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.buses.models import Bus
    from app.modules.routes.models import Route


class TripStatus(str, enum.Enum):  # noqa: UP042
    """Lifecycle status of a scheduled trip."""

    SCHEDULED = "SCHEDULED"
    BOARDING = "BOARDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Trip(Base, TimestampMixin):
    """Trip schedule instance linking route, bus, and optional driver."""

    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("departure_time < arrival_time", name="chk_trip_departure_before_arrival"),
        CheckConstraint("fare >= 0", name="chk_trip_fare_non_negative"),
        Index("ix_trips_bus_id", "bus_id"),
        Index("ix_trips_driver_id", "driver_id"),
        Index("ix_trips_route_id", "route_id"),
        Index("ix_trips_departure_time", "departure_time"),
        Index("ix_trips_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("routes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    bus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    departure_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    arrival_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    fare: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus, native_enum=False, length=20),
        default=TripStatus.SCHEDULED,
        nullable=False,
    )

    # Relationships
    route: Mapped["Route"] = relationship("Route", back_populates="trips")
    bus: Mapped["Bus"] = relationship("Bus", back_populates="trips")

    def __repr__(self) -> str:
        return f"<Trip id={self.id} bus={self.bus_id} status={self.status}>"
