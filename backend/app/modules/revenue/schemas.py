"""Pydantic schemas for booking analytics, revenue reporting, and passenger manifests."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class RevenueSummaryResponse(BaseModel):
    """Aggregate financial and booking performance metrics for the fleet."""

    gross_revenue: Decimal = Field(
        ...,
        description="Total revenue from all confirmed bookings before refunds.",
        examples=[12500.00],
    )
    refunded_revenue: Decimal = Field(
        ...,
        description="Total amount refunded due to cancelled bookings.",
        examples=[1500.00],
    )
    net_revenue: Decimal = Field(
        ...,
        description="Net revenue (gross minus refunds).",
        examples=[11000.00],
    )
    total_bookings: int = Field(..., description="Total count of all bookings.")
    confirmed_bookings: int = Field(..., description="Count of active confirmed bookings.")
    cancelled_bookings: int = Field(..., description="Count of cancelled bookings.")
    total_seats_sold: int = Field(..., description="Count of seats booked across confirmed trips.")
    average_booking_value: Decimal = Field(
        ...,
        description="Average revenue per confirmed booking.",
        examples=[450.00],
    )


class RouteRevenueBreakdown(BaseModel):
    """Revenue and occupancy statistics aggregated by route."""

    route_id: uuid.UUID
    route_name: str
    origin: str
    destination: str
    total_trips: int
    confirmed_bookings: int
    net_revenue: Decimal


class BusRevenueBreakdown(BaseModel):
    """Revenue and operational statistics aggregated by bus vehicle."""

    bus_id: uuid.UUID
    registration_number: str
    display_name: str
    total_trips: int
    confirmed_bookings: int
    net_revenue: Decimal


class ManifestPassenger(BaseModel):
    """Passenger details for a specific booked seat on a trip manifest."""

    booking_id: uuid.UUID
    seat_id: uuid.UUID
    seat_number: int
    passenger_id: uuid.UUID
    passenger_name: str
    passenger_email: str
    passenger_phone: str | None
    booking_status: str
    fare_paid: Decimal
    booked_at: datetime


class TripManifestResponse(BaseModel):
    """Comprehensive passenger manifest and financial metrics for a specific trip."""

    model_config = ConfigDict(from_attributes=True)

    trip_id: uuid.UUID
    route_name: str
    bus_registration: str
    departure_time: datetime
    arrival_time: datetime
    trip_status: str
    seat_capacity: int
    seats_booked: int
    occupancy_rate_pct: float
    trip_gross_revenue: Decimal
    passengers: list[ManifestPassenger] = Field(default_factory=list)
