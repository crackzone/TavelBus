"""Tracking module models for bus GPS telemetry."""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class GPSLocation(Base, TimestampMixin):
    """Telemetry GPS ping for an active trip."""

    __tablename__ = "gps_locations"
    __table_args__ = (
        CheckConstraint("latitude >= -90.0 AND latitude <= 90.0", name="chk_gps_latitude_range"),
        CheckConstraint(
            "longitude >= -180.0 AND longitude <= 180.0",
            name="chk_gps_longitude_range",
        ),
        CheckConstraint("speed_kmph >= 0.0", name="chk_gps_speed_non_negative"),
        CheckConstraint(
            "heading IS NULL OR (heading >= 0.0 AND heading <= 360.0)",
            name="chk_gps_heading_range",
        ),
        Index("ix_gps_locations_trip_recorded", "trip_id", "recorded_at"),
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
        index=True,
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed_kmph: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    heading: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationship back to Trip
    trip = relationship("Trip", backref="gps_locations")

    def __repr__(self) -> str:
        return f"<GPSLocation trip={self.trip_id} lat={self.latitude} lon={self.longitude}>"
