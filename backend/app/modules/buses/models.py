"""Bus SQLAlchemy models and status enum."""

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Enum, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.trips.models import Trip


class BusStatus(str, enum.Enum):  # noqa: UP042
    """Operational status of a bus."""

    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    MAINTENANCE = "MAINTENANCE"


class Bus(Base, TimestampMixin):
    """Bus entity with fleet details and seat capacity."""

    __tablename__ = "buses"
    __table_args__ = (CheckConstraint("seat_capacity > 0", name="chk_bus_seat_capacity_positive"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    registration_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    seat_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[BusStatus] = mapped_column(
        Enum(BusStatus, native_enum=False, length=20),
        default=BusStatus.ACTIVE,
        nullable=False,
    )

    # Relationships
    trips: Mapped[list["Trip"]] = relationship(
        "Trip",
        back_populates="bus",
        passive_deletes=False,
    )

    def __repr__(self) -> str:
        return f"<Bus id={self.id} reg={self.registration_number} status={self.status}>"
