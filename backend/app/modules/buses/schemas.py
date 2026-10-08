"""Bus Pydantic v2 validation schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.buses.models import BusStatus


class BusCreate(BaseModel):
    """Payload to register a new bus."""

    registration_number: str = Field(..., min_length=2, max_length=50, examples=["KA-01-AB-1234"])
    display_name: str = Field(..., min_length=2, max_length=100, examples=["Express Cruiser 01"])
    seat_capacity: int = Field(..., gt=0, le=100, examples=[40])
    status: BusStatus = Field(default=BusStatus.ACTIVE)


class BusUpdate(BaseModel):
    """Payload to update bus properties."""

    display_name: str | None = Field(default=None, min_length=2, max_length=100)
    seat_capacity: int | None = Field(default=None, gt=0, le=100)
    status: BusStatus | None = None


class BusResponse(BaseModel):
    """Response representing a bus."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    registration_number: str
    display_name: str
    seat_capacity: int
    status: BusStatus
    created_at: datetime
    updated_at: datetime


class BusListResponse(BaseModel):
    """List response container for buses."""

    items: list[BusResponse]
    total: int
