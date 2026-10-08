"""Service layer orchestrating the GenAI assistant with deterministic domain lookups."""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.integrations.gemini_client import gemini_client
from app.modules.assistant.knowledge import search_company_policy
from app.modules.assistant.schemas import ChatRequest, ChatResponse
from app.modules.auth.models import User
from app.modules.bookings.models import Booking, BookingStatus
from app.modules.tracking.service import TrackingService
from app.modules.trips.models import Trip, TripStatus

logger = logging.getLogger(__name__)


class AssistantService:
    """Orchestrates natural language intent recognition with domain database execution."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.tracking_service = TrackingService(db)

    async def handle_chat(self, req: ChatRequest, user: User) -> ChatResponse:
        """Process conversational prompt through policy, domain data, or general knowledge."""
        msg_lower = req.message.lower().strip()

        # 1. Company Policy Intent
        policy_text = search_company_policy(msg_lower)
        if policy_text:
            return ChatResponse(
                response=policy_text,
                intent="POLICY_QUERY",
                data_context={"matched_policy": True},
            )

        # 2. Check My Booking Status Intent
        if any(k in msg_lower for k in ("my booking", "booking status", "ticket", "reservation")):
            return await self._handle_booking_status_query(user)

        # 3. Live Bus Location Tracking Intent
        loc_triggers = ("where is my bus", "bus location", "track bus", "bus live", "eta")
        if any(k in msg_lower for k in loc_triggers):
            return await self._handle_live_bus_location_query(user)

        # 4. Search Trips Intent
        search_triggers = ("search trip", "bus to", "find trip", "schedule", "available bus")
        if any(k in msg_lower for k in search_triggers):
            return await self._handle_trip_search_query(msg_lower)

        # 5. General Q&A (Try Gemini with fallback)
        system_prompt = (
            "You are a helpful travel assistant for TravelBus Manager. "
            "Answer concisely and politely. "
            "If asked about changing or creating bookings, inform passenger to use portal."
        )
        ai_reply = await gemini_client.generate_response(
            system_instruction=system_prompt,
            user_prompt=req.message,
        )
        if ai_reply:
            return ChatResponse(
                response=ai_reply,
                intent="GENERAL_QA",
                data_context={"engine": "vertex_ai_gemini"},
            )

        # Fallback response
        return ChatResponse(
            response=(
                "I am your TravelBus Assistant. I can help you with:\n"
                "1. Company policies (baggage, cancellations, refunds, boarding, pet policy).\n"
                "2. Your active booking details and seat numbers.\n"
                "3. Real-time GPS location and next-stop ETA for your bus.\n"
                "4. Available bus trips and schedules.\n"
                "How may I assist you today?"
            ),
            intent="GENERAL_QA",
            data_context={"engine": "rule_based_fallback"},
        )

    async def _handle_booking_status_query(self, user: User) -> ChatResponse:
        """Retrieve latest bookings for authenticated user."""
        query = (
            select(Booking)
            .options(
                selectinload(Booking.trip_seat),
                selectinload(Booking.trip).selectinload(Trip.route),
            )
            .where(Booking.user_id == user.id)
            .order_by(Booking.created_at.desc())
            .limit(3)
        )
        result = await self.db.execute(query)
        bookings = result.scalars().all()

        if not bookings:
            return ChatResponse(
                response=f"Hello {user.name}, you have no active or past bookings on record.",
                intent="BOOKING_STATUS",
                data_context={"bookings_count": 0},
            )

        lines = [f"Hello {user.name}, here are your recent bookings:"]
        serialized_bookings = []
        for b in bookings:
            route_name = b.trip.route.name if b.trip and b.trip.route else "Scheduled Trip"
            seat_num = b.trip_seat.seat_number if b.trip_seat else "?"
            dep_time = b.trip.departure_time.strftime("%d %b %Y, %H:%M UTC") if b.trip else "N/A"
            lines.append(
                f"- Ref: {b.booking_reference} | Route: {route_name} | Seat: {seat_num} | "
                f"Status: {b.status.value} | Departure: {dep_time}"
            )
            serialized_bookings.append(
                {
                    "reference": b.booking_reference,
                    "status": b.status.value,
                    "seat_number": seat_num,
                }
            )

        return ChatResponse(
            response="\n".join(lines),
            intent="BOOKING_STATUS",
            data_context={"bookings": serialized_bookings},
        )

    async def _handle_live_bus_location_query(self, user: User) -> ChatResponse:
        """Find active trip for user's confirmed booking and report location."""
        active_statuses = [TripStatus.IN_PROGRESS, TripStatus.BOARDING, TripStatus.SCHEDULED]
        query = (
            select(Booking)
            .join(Trip, Booking.trip_id == Trip.id)
            .where(
                Booking.user_id == user.id,
                Booking.status == BookingStatus.CONFIRMED,
                Trip.status.in_(active_statuses),
            )
            .order_by(Trip.departure_time.asc())
            .limit(1)
        )
        result = await self.db.execute(query)
        booking = result.scalar_one_or_none()

        if not booking:
            return ChatResponse(
                response=(
                    f"Hello {user.name}, you do not have an active upcoming trip in progress. "
                    "Once you book a seat and the bus starts, live tracking appears here."
                ),
                intent="BUS_LOCATION",
                data_context={"active_trip_found": False},
            )

        tracking_data = await self.tracking_service.get_trip_live_location(booking.trip_id)
        if not tracking_data.latest_location:
            return ChatResponse(
                response=(
                    f"Your trip (Ref: {booking.booking_reference}) is {tracking_data.trip_status}. "
                    "The driver has not yet broadcasted GPS telemetry coordinates."
                ),
                intent="BUS_LOCATION",
                data_context={
                    "trip_id": str(booking.trip_id),
                    "status": tracking_data.trip_status,
                },
            )

        loc = tracking_data.latest_location
        eta_msg = ""
        if tracking_data.next_stop:
            ns = tracking_data.next_stop
            eta_msg = (
                f" Approaching stop '{ns.stop_name}' (distance: {ns.distance_km} km, "
                f"approx ETA: {ns.estimated_minutes_away} mins)."
            )

        resp_text = (
            f"Your bus for booking {booking.booking_reference} is at "
            f"({loc.latitude:.4f}, {loc.longitude:.4f}) at {loc.speed_kmph:.1f} km/h.{eta_msg}"
        )
        return ChatResponse(
            response=resp_text,
            intent="BUS_LOCATION",
            data_context={
                "trip_id": str(booking.trip_id),
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "speed_kmph": loc.speed_kmph,
            },
        )

    async def _handle_trip_search_query(self, query_text: str) -> ChatResponse:
        """Search available scheduled future trips."""
        query = (
            select(Trip)
            .options(selectinload(Trip.route), selectinload(Trip.bus))
            .where(Trip.status == TripStatus.SCHEDULED)
            .order_by(Trip.departure_time.asc())
            .limit(3)
        )
        result = await self.db.execute(query)
        trips = result.scalars().all()

        if not trips:
            return ChatResponse(
                response="There are currently no upcoming scheduled trips available in the system.",
                intent="TRIP_SEARCH",
                data_context={"trips_found": 0},
            )

        lines = ["Here are the upcoming scheduled bus trips:"]
        serialized_trips = []
        for t in trips:
            route_str = (
                f"{t.route.origin} -> {t.route.destination}" if t.route else "Scheduled Trip"
            )
            dep_str = t.departure_time.strftime("%d %b, %H:%M UTC")
            lines.append(f"- Route: {route_str} | Departs: {dep_str} | Fare: ₹{t.fare}")
            serialized_trips.append(
                {"trip_id": str(t.id), "route": route_str, "fare": float(t.fare)}
            )

        return ChatResponse(
            response="\n".join(lines),
            intent="TRIP_SEARCH",
            data_context={"trips": serialized_trips},
        )
