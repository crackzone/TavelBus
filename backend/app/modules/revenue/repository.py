"""Database repository for revenue analytics and passenger manifest queries."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.auth.models import User
from app.modules.bookings.models import Booking, BookingStatus, PaymentStatus, TripSeat
from app.modules.buses.models import Bus
from app.modules.revenue.schemas import (
    BusRevenueBreakdown,
    ManifestPassenger,
    RevenueSummaryResponse,
    RouteRevenueBreakdown,
    TripManifestResponse,
)
from app.modules.routes.models import Route
from app.modules.trips.models import Trip


class RevenueRepository:
    """Encapsulates complex database aggregations for revenue and operational reports."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_overall_summary(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> RevenueSummaryResponse:
        """Calculate overall gross revenue, refunds, net revenue, and booking counts."""
        # Total bookings query
        bookings_query = select(Booking)
        if start_date:
            bookings_query = bookings_query.where(Booking.created_at >= start_date)
        if end_date:
            bookings_query = bookings_query.where(Booking.created_at <= end_date)

        result = await self.db.execute(bookings_query)
        all_bookings = result.scalars().all()

        total_bookings = len(all_bookings)
        confirmed_bookings = sum(1 for b in all_bookings if b.status == BookingStatus.CONFIRMED)
        cancelled_bookings = sum(1 for b in all_bookings if b.status == BookingStatus.CANCELLED)

        gross_revenue = sum(
            (
                b.amount
                for b in all_bookings
                if b.payment_status in (PaymentStatus.PAID, PaymentStatus.REFUNDED)
            ),
            Decimal("0.00"),
        )
        refunded_revenue = sum(
            (b.amount for b in all_bookings if b.payment_status == PaymentStatus.REFUNDED),
            Decimal("0.00"),
        )
        net_revenue = gross_revenue - refunded_revenue

        avg_value = (
            round(gross_revenue / confirmed_bookings, 2)
            if confirmed_bookings > 0
            else Decimal("0.00")
        )

        return RevenueSummaryResponse(
            gross_revenue=gross_revenue,
            refunded_revenue=refunded_revenue,
            net_revenue=net_revenue,
            total_bookings=total_bookings,
            confirmed_bookings=confirmed_bookings,
            cancelled_bookings=cancelled_bookings,
            total_seats_sold=confirmed_bookings,
            average_booking_value=avg_value,
        )

    async def get_revenue_by_route(self) -> list[RouteRevenueBreakdown]:
        """Aggregate revenue and trip metrics grouped by route."""
        routes_query = select(Route).options(selectinload(Route.trips))
        routes_res = await self.db.execute(routes_query)
        routes = routes_res.scalars().all()

        breakdowns: list[RouteRevenueBreakdown] = []
        for route in routes:
            trip_ids = [t.id for t in route.trips]
            if not trip_ids:
                breakdowns.append(
                    RouteRevenueBreakdown(
                        route_id=route.id,
                        route_name=route.name,
                        origin=route.origin,
                        destination=route.destination,
                        total_trips=0,
                        confirmed_bookings=0,
                        net_revenue=Decimal("0.00"),
                    )
                )
                continue

            b_query = select(Booking).where(
                Booking.trip_id.in_(trip_ids),
                Booking.status == BookingStatus.CONFIRMED,
            )
            b_res = await self.db.execute(b_query)
            bookings = b_res.scalars().all()

            route_net = sum((b.amount for b in bookings), Decimal("0.00"))
            breakdowns.append(
                RouteRevenueBreakdown(
                    route_id=route.id,
                    route_name=route.name,
                    origin=route.origin,
                    destination=route.destination,
                    total_trips=len(route.trips),
                    confirmed_bookings=len(bookings),
                    net_revenue=route_net,
                )
            )

        return breakdowns

    async def get_revenue_by_bus(self) -> list[BusRevenueBreakdown]:
        """Aggregate revenue and trip metrics grouped by bus vehicle."""
        buses_query = select(Bus).options(selectinload(Bus.trips))
        buses_res = await self.db.execute(buses_query)
        buses = buses_res.scalars().all()

        breakdowns: list[BusRevenueBreakdown] = []
        for bus in buses:
            trip_ids = [t.id for t in bus.trips]
            if not trip_ids:
                breakdowns.append(
                    BusRevenueBreakdown(
                        bus_id=bus.id,
                        registration_number=bus.registration_number,
                        display_name=bus.display_name,
                        total_trips=0,
                        confirmed_bookings=0,
                        net_revenue=Decimal("0.00"),
                    )
                )
                continue

            b_query = select(Booking).where(
                Booking.trip_id.in_(trip_ids),
                Booking.status == BookingStatus.CONFIRMED,
            )
            b_res = await self.db.execute(b_query)
            bookings = b_res.scalars().all()

            bus_net = sum((b.amount for b in bookings), Decimal("0.00"))
            breakdowns.append(
                BusRevenueBreakdown(
                    bus_id=bus.id,
                    registration_number=bus.registration_number,
                    display_name=bus.display_name,
                    total_trips=len(bus.trips),
                    confirmed_bookings=len(bookings),
                    net_revenue=bus_net,
                )
            )

        return breakdowns

    async def get_trip_manifest(self, trip_id: uuid.UUID) -> TripManifestResponse | None:
        """Fetch passenger manifest and financial stats for a given trip."""
        trip_query = (
            select(Trip)
            .options(selectinload(Trip.route), selectinload(Trip.bus))
            .where(Trip.id == trip_id)
        )
        trip_res = await self.db.execute(trip_query)
        trip = trip_res.scalar_one_or_none()
        if not trip:
            return None

        # Fetch bookings with passenger users and seat details
        b_query = (
            select(Booking, User, TripSeat)
            .join(User, Booking.user_id == User.id)
            .join(TripSeat, Booking.trip_seat_id == TripSeat.id)
            .where(Booking.trip_id == trip_id)
            .order_by(TripSeat.seat_number.asc())
        )
        b_res = await self.db.execute(b_query)
        rows = b_res.all()

        passengers: list[ManifestPassenger] = []
        gross_rev = Decimal("0.00")
        confirmed_count = 0

        for booking, user, seat in rows:
            if booking.status == BookingStatus.CONFIRMED:
                gross_rev += booking.amount
                confirmed_count += 1

            passengers.append(
                ManifestPassenger(
                    booking_id=booking.id,
                    seat_id=seat.id,
                    seat_number=seat.seat_number,
                    passenger_id=user.id,
                    passenger_name=user.name,
                    passenger_email=user.email,
                    passenger_phone=user.phone,
                    booking_status=booking.status.value,
                    fare_paid=booking.amount,
                    booked_at=booking.created_at,
                )
            )

        capacity = trip.bus.seat_capacity if trip.bus else 0
        occupancy_pct = (
            round((confirmed_count / capacity) * 100.0, 1) if capacity > 0 else 0.0
        )

        return TripManifestResponse(
            trip_id=trip.id,
            route_name=trip.route.name if trip.route else "Unknown Route",
            bus_registration=trip.bus.registration_number if trip.bus else "Unknown Bus",
            departure_time=trip.departure_time,
            arrival_time=trip.arrival_time,
            trip_status=trip.status.value,
            seat_capacity=capacity,
            seats_booked=confirmed_count,
            occupancy_rate_pct=occupancy_pct,
            trip_gross_revenue=gross_rev,
            passengers=passengers,
        )
