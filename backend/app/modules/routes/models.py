"""Route and Stop SQLAlchemy models."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.trips.models import Trip


class Route(Base, TimestampMixin):
    """Bus transit route between origin and destination."""

    __tablename__ = "routes"
    __table_args__ = (
        CheckConstraint("distance_km > 0", name="chk_route_distance_positive"),
        CheckConstraint("estimated_duration_minutes > 0", name="chk_route_duration_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    origin: Mapped[str] = mapped_column(String(100), nullable=False)
    destination: Mapped[str] = mapped_column(String(100), nullable=False)
    distance_km: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    stops: Mapped[list["Stop"]] = relationship(
        "Stop",
        back_populates="route",
        cascade="all, delete-orphan",
        order_by="Stop.sequence_number",
    )
    trips: Mapped[list["Trip"]] = relationship(
        "Trip",
        back_populates="route",
        passive_deletes=False,
    )

    def __repr__(self) -> str:
        return f"<Route id={self.id} name={self.name} origin={self.origin} dest={self.destination}>"


class Stop(Base, TimestampMixin):
    """Specific transit stop belonging to a route."""

    __tablename__ = "stops"
    __table_args__ = (
        UniqueConstraint("route_id", "sequence_number", name="uq_stops_route_sequence"),
        CheckConstraint("sequence_number > 0", name="chk_stop_sequence_positive"),
        CheckConstraint("latitude BETWEEN -90.0 AND 90.0", name="chk_stop_latitude_range"),
        CheckConstraint("longitude BETWEEN -180.0 AND 180.0", name="chk_stop_longitude_range"),
        Index("ix_stops_route_id", "route_id"),
        Index("ix_stops_route_sequence", "route_id", "sequence_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("routes.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    route: Mapped["Route"] = relationship("Route", back_populates="stops")

    def __repr__(self) -> str:
        return f"<Stop id={self.id} route={self.route_id} seq={self.sequence_number}>"
