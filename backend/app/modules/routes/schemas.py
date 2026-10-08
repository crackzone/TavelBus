"""Route and Stop Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- Stop Schemas ---
class StopCreate(BaseModel):
    """Payload to create a stop."""

    name: str = Field(..., min_length=2, max_length=100, examples=["Central Station"])
    sequence_number: int = Field(..., gt=0, examples=[1])
    latitude: float = Field(..., ge=-90.0, le=90.0, examples=[12.9716])
    longitude: float = Field(..., ge=-180.0, le=180.0, examples=[77.5946])


class StopUpdate(BaseModel):
    """Payload to modify a stop."""

    name: str | None = Field(default=None, min_length=2, max_length=100)
    sequence_number: int | None = Field(default=None, gt=0)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)


class StopResponse(BaseModel):
    """Response representing a stop."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    route_id: uuid.UUID
    name: str
    sequence_number: int
    latitude: float
    longitude: float
    created_at: datetime
    updated_at: datetime


# --- Route Schemas ---
class RouteCreate(BaseModel):
    """Payload to create a route."""

    name: str = Field(..., min_length=2, max_length=100, examples=["Bangalore - Mysore Express"])
    origin: str = Field(..., min_length=2, max_length=100, examples=["Bangalore"])
    destination: str = Field(..., min_length=2, max_length=100, examples=["Mysore"])
    distance_km: float | None = Field(default=None, gt=0, examples=[145.5])
    estimated_duration_minutes: int | None = Field(default=None, gt=0, examples=[180])
    is_active: bool = Field(default=True)


class RouteUpdate(BaseModel):
    """Payload to update a route."""

    name: str | None = Field(default=None, min_length=2, max_length=100)
    origin: str | None = Field(default=None, min_length=2, max_length=100)
    destination: str | None = Field(default=None, min_length=2, max_length=100)
    distance_km: float | None = Field(default=None, gt=0)
    estimated_duration_minutes: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


class RouteResponse(BaseModel):
    """Response representing a route with summary."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    origin: str
    destination: str
    distance_km: float | None = None
    estimated_duration_minutes: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class RouteDetailResponse(RouteResponse):
    """Route with ordered stop list."""

    stops: list[StopResponse] = []


class RouteListResponse(BaseModel):
    """Paginated or listed routes."""

    items: list[RouteResponse]
    total: int
