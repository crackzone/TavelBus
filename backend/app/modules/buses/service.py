"""Bus domain service implementing fleet business rules."""

import uuid

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.modules.buses.models import Bus, BusStatus
from app.modules.buses.repository import BusRepository
from app.modules.buses.schemas import BusCreate, BusUpdate


class BusService:
    """Manages fleet business logic and state transitions."""

    def __init__(self, bus_repo: BusRepository):
        self.bus_repo = bus_repo

    async def create_bus(self, data: BusCreate) -> Bus:
        """Create a new bus after ensuring unique registration number."""
        clean_reg = data.registration_number.strip().upper()
        existing = await self.bus_repo.get_by_registration_number(clean_reg)
        if existing:
            raise ConflictError(
                message=f"Bus with registration '{clean_reg}' already exists.",
                code="BUS_ALREADY_EXISTS",
            )

        bus = Bus(
            registration_number=clean_reg,
            display_name=data.display_name.strip(),
            seat_capacity=data.seat_capacity,
            status=data.status,
        )
        return await self.bus_repo.create(bus)

    async def get_bus(self, bus_id: uuid.UUID) -> Bus:
        """Fetch bus or raise 404."""
        bus = await self.bus_repo.get_by_id(bus_id)
        if not bus:
            raise ResourceNotFoundError(
                message=f"Bus with ID '{bus_id}' not found.",
                code="BUS_NOT_FOUND",
            )
        return bus

    async def list_buses(self, status: BusStatus | None = None) -> list[Bus]:
        """List buses matching optional status filter."""
        return await self.bus_repo.list_all(status=status)

    async def update_bus(self, bus_id: uuid.UUID, data: BusUpdate) -> Bus:
        """Update display name, seat capacity, or status."""
        bus = await self.get_bus(bus_id)

        if data.display_name is not None:
            bus.display_name = data.display_name.strip()
        if data.seat_capacity is not None:
            bus.seat_capacity = data.seat_capacity
        if data.status is not None:
            bus.status = data.status

        return await self.bus_repo.update(bus)

    async def deactivate_bus(self, bus_id: uuid.UUID) -> Bus:
        """Safely transition a bus to INACTIVE status."""
        bus = await self.get_bus(bus_id)
        bus.status = BusStatus.INACTIVE
        return await self.bus_repo.update(bus)
