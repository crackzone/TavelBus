"""Booking API router for passengers and admins."""

import uuid

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.auth.models import User, UserRole
from app.modules.bookings.models import BookingStatus
from app.modules.bookings.payments import MockPaymentProvider
from app.modules.bookings.repository import BookingRepository
from app.modules.bookings.schemas import (
    BookingCancelResponse,
    BookingCreate,
    BookingListResponse,
    BookingResponse,
    TripSeatResponse,
)
from app.modules.bookings.service import BookingService
from app.modules.trips.repository import TripRepository

router = APIRouter(tags=["Bookings"])


def get_booking_service(db: AsyncSession = Depends(get_db)) -> BookingService:
    """Dependency injecting BookingService with database and mock payment provider."""
    return BookingService(
        db=db,
        booking_repo=BookingRepository(db=db),
        trip_repo=TripRepository(db=db),
        payment_provider=MockPaymentProvider(),
    )


# --- Passenger & Public Seat Endpoints ---
@router.get(
    "/api/v1/trips/{trip_id}/seats",
    response_model=list[TripSeatResponse],
    summary="Get seat availability map for a trip",
)
async def get_trip_seats(
    trip_id: uuid.UUID,
    service: BookingService = Depends(get_booking_service),
) -> list[TripSeatResponse]:
    """Retrieve seat map and current availability for trip."""
    seats = await service.get_or_initialize_trip_seats(trip_id)
    return [TripSeatResponse.model_validate(s) for s in seats]


# --- Passenger Booking Endpoints ---
@router.post(
    "/api/v1/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a seat booking with transaction lock & idempotency",
)
async def create_booking(
    payload: BookingCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
) -> BookingResponse:
    """Book a seat atomically. Supports Idempotency-Key header."""
    return await service.create_booking(
        user_id=current_user.id,
        data=payload,
        idempotency_key=idempotency_key,
    )


@router.get(
    "/api/v1/bookings",
    response_model=BookingListResponse,
    summary="List bookings of current passenger",
)
async def list_my_bookings(
    current_user: User = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
) -> BookingListResponse:
    """View authenticated user's bookings."""
    bookings = await service.list_user_bookings(user_id=current_user.id)
    return BookingListResponse(items=bookings, total=len(bookings))


@router.get(
    "/api/v1/bookings/{booking_id}",
    response_model=BookingResponse,
    summary="Get single booking details",
)
async def get_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
) -> BookingResponse:
    """View details of a booking owned by user (or any if admin)."""
    is_admin = current_user.role == UserRole.ADMIN
    return await service.get_booking(
        booking_id=booking_id,
        user_id=current_user.id,
        is_admin=is_admin,
    )


@router.post(
    "/api/v1/bookings/{booking_id}/cancel",
    response_model=BookingCancelResponse,
    summary="Cancel a booking and release seat",
)
async def cancel_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
) -> BookingCancelResponse:
    """Cancel booking and refund mock payment."""
    is_admin = current_user.role == UserRole.ADMIN
    return await service.cancel_booking(
        booking_id=booking_id,
        user_id=current_user.id,
        is_admin=is_admin,
    )


# --- Admin Booking Endpoints ---
@router.get(
    "/api/v1/admin/bookings",
    response_model=BookingListResponse,
    summary="List all bookings across the platform (Admin only)",
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def admin_list_bookings(
    trip_id: uuid.UUID | None = Query(default=None),
    booking_status: BookingStatus | None = Query(default=None, alias="status"),
    service: BookingService = Depends(get_booking_service),
) -> BookingListResponse:
    """Admin view of all bookings."""
    bookings = await service.list_all_bookings(trip_id=trip_id, status=booking_status)
    return BookingListResponse(items=bookings, total=len(bookings))
