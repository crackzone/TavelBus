"""Bus database repository layer."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.buses.models import Bus, BusStatus


class BusRepository:
    """Encapsulates database access for Bus entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, bus_id: uuid.UUID) -> Bus | None:
        """Fetch bus by primary key."""
        stmt = select(Bus).where(Bus.id == bus_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_registration_number(self, reg_num: str) -> Bus | None:
        """Fetch bus by case-insensitive unique registration number."""
        stmt = select(Bus).where(func.lower(Bus.registration_number) == reg_num.lower().strip())
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self, status: BusStatus | None = None) -> list[Bus]:
        """List all buses with optional status filter."""
        stmt = select(Bus)
        if status:
            stmt = stmt.where(Bus.status == status)
        stmt = stmt.order_by(Bus.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, bus: Bus) -> Bus:
        """Persist a new bus."""
        self.db.add(bus)
        await self.db.commit()
        await self.db.refresh(bus)
        return bus

    async def update(self, bus: Bus) -> Bus:
        """Save changes to an existing bus."""
        bus.updated_at = datetime.now(timezone.utc)  # noqa: UP017
        self.db.add(bus)
        await self.db.commit()
        await self.db.refresh(bus)
        return bus
