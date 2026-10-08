"""Booking and TripSeat Pydantic v2 schemas."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.bookings.models import BookingStatus, PaymentStatus, TripSeatStatus


class TripSeatResponse(BaseModel):
    """Response representing a trip seat."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    trip_id: uuid.UUID
    seat_number: int
    status: TripSeatStatus


class BookingCreate(BaseModel):
    """Payload to create a booking."""

    trip_id: uuid.UUID
    seat_number: int = Field(..., gt=0, examples=[12])


class BookingResponse(BaseModel):
    """Detailed booking response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_reference: str
    user_id: uuid.UUID
    trip_id: uuid.UUID
    trip_seat_id: uuid.UUID
    seat_number: int
    amount: Decimal
    status: BookingStatus
    payment_status: PaymentStatus
    created_at: datetime
    cancelled_at: datetime | None = None


class BookingListResponse(BaseModel):
    """List response container for bookings."""

    items: list[BookingResponse]
    total: int


class BookingCancelResponse(BaseModel):
    """Response confirming booking cancellation."""

    booking_reference: str
    status: BookingStatus
    refund_status: str
    cancelled_at: datetime
