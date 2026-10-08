"""Seed script for TravelBus Manager Phase 3.

Creates:
- 1 Admin user (if not exists)
- 4 Sample Buses (if not exist)
- 1 Active Route with 3 sequenced stops (if not exists)
- 2 Non-overlapping sample trips (if not exist)

Idempotent: Safe to execute repeatedly without duplicating data.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.database import AsyncSessionLocal, engine
from app.modules.auth.models import User, UserRole
from app.modules.buses.models import Bus, BusStatus
from app.modules.routes.models import Route, Stop
from app.modules.trips.models import Trip, TripStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


async def seed_data(db: AsyncSession) -> None:
    """Seed initial demonstration data idempotently."""
    logger.info("Starting database seed...")

    # 1. Admin User
    admin_email = "admin@travelbus.example.com"
    res = await db.execute(select(User).where(User.email == admin_email))
    admin = res.scalar_one_or_none()
    if not admin:
        admin = User(
            name="Fleet Administrator",
            email=admin_email,
            password_hash=hash_password("AdminSecure2026!"),
            phone="+919876543210",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        logger.info("Created Admin user: %s", admin_email)
    else:
        logger.info("Admin user already exists: %s", admin_email)

    # 2. Four Sample Buses
    sample_buses = [
        {"reg": "KA-01-EA-1001", "name": "Vayu Express 01", "cap": 40, "status": BusStatus.ACTIVE},
        {"reg": "KA-01-EA-1002", "name": "Vayu Express 02", "cap": 40, "status": BusStatus.ACTIVE},
        {
            "reg": "KA-01-EA-1003",
            "name": "Kaveri Comfort 01",
            "cap": 36,
            "status": BusStatus.ACTIVE,
        },
        {
            "reg": "KA-01-EA-1004",
            "name": "Kaveri Comfort 02",
            "cap": 36,
            "status": BusStatus.MAINTENANCE,
        },
    ]

    persisted_buses: dict[str, Bus] = {}
    for b_data in sample_buses:
        stmt = select(Bus).where(Bus.registration_number == b_data["reg"])
        bus = (await db.execute(stmt)).scalar_one_or_none()
        if not bus:
            bus = Bus(
                registration_number=b_data["reg"],
                display_name=b_data["name"],
                seat_capacity=b_data["cap"],
                status=b_data["status"],
            )
            db.add(bus)
            logger.info("Created Bus: %s (%s)", b_data["reg"], b_data["name"])
        persisted_buses[b_data["reg"]] = bus

    await db.flush()

    # 3. Sample Route: Bangalore to Mysore
    route_name = "Bangalore - Mysore Express Highway"
    stmt = select(Route).where(Route.name == route_name)
    route = (await db.execute(stmt)).scalar_one_or_none()
    if not route:
        route = Route(
            name=route_name,
            origin="Bangalore (Majestic)",
            destination="Mysore (Suburban Stand)",
            distance_km=145.5,
            estimated_duration_minutes=180,
            is_active=True,
        )
        db.add(route)
        await db.flush()
        logger.info("Created Route: %s", route_name)

        # 4. Sequenced Stops
        sample_stops = [
            {"name": "Majestic Central Bus Station", "seq": 1, "lat": 12.9767, "lng": 77.5713},
            {"name": "Kengeri Satellite Terminal", "seq": 2, "lat": 12.9110, "lng": 77.4830},
            {"name": "Mandya Express Stop", "seq": 3, "lat": 12.5242, "lng": 76.8958},
            {"name": "Mysore Suburban Bus Stand", "seq": 4, "lat": 12.3090, "lng": 76.6573},
        ]
        for s_data in sample_stops:
            stop = Stop(
                route_id=route.id,
                name=s_data["name"],
                sequence_number=s_data["seq"],
                latitude=s_data["lat"],
                longitude=s_data["lng"],
            )
            db.add(stop)
            logger.info("  Added Stop seq %d: %s", s_data["seq"], s_data["name"])
    else:
        logger.info("Route already exists: %s", route_name)

    await db.flush()

    # 5. Two Sample Trips for Tomorrow (Non-overlapping)
    primary_bus = persisted_buses["KA-01-EA-1001"]
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)  # noqa: UP017
    trip_1_dep = tomorrow.replace(hour=8, minute=0, second=0, microsecond=0)
    trip_1_arr = trip_1_dep + timedelta(hours=3)

    trip_2_dep = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)
    trip_2_arr = trip_2_dep + timedelta(hours=3)

    stmt = select(Trip).where(
        Trip.bus_id == primary_bus.id,
        Trip.departure_time == trip_1_dep,
    )
    if not (await db.execute(stmt)).scalar_one_or_none():
        trip1 = Trip(
            route_id=route.id,
            bus_id=primary_bus.id,
            departure_time=trip_1_dep,
            arrival_time=trip_1_arr,
            fare=Decimal("350.00"),
            status=TripStatus.SCHEDULED,
        )
        db.add(trip1)
        logger.info("Created Morning Trip: Departure %s", trip_1_dep.isoformat())

    stmt2 = select(Trip).where(
        Trip.bus_id == primary_bus.id,
        Trip.departure_time == trip_2_dep,
    )
    if not (await db.execute(stmt2)).scalar_one_or_none():
        trip2 = Trip(
            route_id=route.id,
            bus_id=primary_bus.id,
            departure_time=trip_2_dep,
            arrival_time=trip_2_arr,
            fare=Decimal("380.00"),
            status=TripStatus.SCHEDULED,
        )
        db.add(trip2)
        logger.info("Created Afternoon Trip: Departure %s", trip_2_dep.isoformat())

    await db.commit()
    logger.info("Seed completed successfully!")


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed_data(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
