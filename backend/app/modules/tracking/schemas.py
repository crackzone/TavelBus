"""Pydantic request and response schemas for tracking and GPS telemetry."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GPSLocationCreate(BaseModel):
    """Payload submitted by a driver's device containing real-time GPS telemetry."""

    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude in decimal degrees (-90.0 to 90.0).",
        examples=[12.9716],
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude in decimal degrees (-180.0 to 180.0).",
        examples=[77.5946],
    )
    speed_kmph: float = Field(
        default=0.0,
        ge=0.0,
        description="Vehicle speed in km/h.",
        examples=[45.5],
    )
    heading: float | None = Field(
        default=None,
        ge=0.0,
        le=360.0,
        description="Heading direction in degrees (0.0 to 360.0).",
        examples=[182.0],
    )
    recorded_at: datetime = Field(
        ...,
        description="Timestamp when the coordinate was recorded on the device.",
    )


class GPSLocationRead(BaseModel):
    """Schema for returning recorded GPS ping coordinates."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    trip_id: uuid.UUID
    latitude: float
    longitude: float
    speed_kmph: float
    heading: float | None
    recorded_at: datetime
    created_at: datetime


class NextStopEta(BaseModel):
    """Estimated arrival information for upcoming stop."""

    stop_id: uuid.UUID
    stop_name: str
    sequence_number: int
    distance_km: float
    estimated_minutes_away: float | None = None


class TripLocationCurrentRead(BaseModel):
    """Schema representing the latest known location of a trip for passengers."""

    trip_id: uuid.UUID
    trip_status: str
    latest_location: GPSLocationRead | None
    next_stop: NextStopEta | None = None
    recent_breadcrumbs: list[GPSLocationRead] = Field(default_factory=list)


class DriverTripSummary(BaseModel):
    """Schema summarizing trips assigned to a driver."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    route_id: uuid.UUID
    bus_id: uuid.UUID
    departure_time: datetime
    arrival_time: datetime
    fare: float
    status: str
