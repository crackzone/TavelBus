"""Trip Pydantic schemas."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.trips.models import TripStatus


class TripCreate(BaseModel):
    """Payload to create a new trip."""

    route_id: uuid.UUID
    bus_id: uuid.UUID
    driver_id: uuid.UUID | None = None
    departure_time: datetime
    arrival_time: datetime
    fare: Decimal = Field(..., ge=0, examples=[25.50])
    status: TripStatus = Field(default=TripStatus.SCHEDULED)

    @model_validator(mode="after")
    def validate_times(self) -> "TripCreate":
        if self.departure_time >= self.arrival_time:
            raise ValueError("departure_time must be strictly before arrival_time")
        return self


class TripUpdate(BaseModel):
    """Payload to reschedule or update a trip."""

    bus_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None
    departure_time: datetime | None = None
    arrival_time: datetime | None = None
    fare: Decimal | None = Field(default=None, ge=0)
    status: TripStatus | None = None

    @model_validator(mode="after")
    def validate_times(self) -> "TripUpdate":
        if (
            self.departure_time is not None
            and self.arrival_time is not None
            and self.departure_time >= self.arrival_time
        ):
            raise ValueError("departure_time must be strictly before arrival_time")
        return self


class TripResponse(BaseModel):
    """Full trip response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    route_id: uuid.UUID
    bus_id: uuid.UUID
    driver_id: uuid.UUID | None = None
    departure_time: datetime
    arrival_time: datetime
    fare: Decimal
    status: TripStatus
    created_at: datetime
    updated_at: datetime


class TripPublicResponse(BaseModel):
    """Public read-only trip information."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    route_id: uuid.UUID
    departure_time: datetime
    arrival_time: datetime
    fare: Decimal
    status: TripStatus


class TripListResponse(BaseModel):
    """List container for trips."""

    items: list[TripResponse]
    total: int
