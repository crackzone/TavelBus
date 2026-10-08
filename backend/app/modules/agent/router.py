"""FastAPI router endpoints for agentic tool proposals and confirmation."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.agent.schemas import (
    ActionConfirmRequest,
    ActionExecutionResult,
    ActionProposalRequest,
    ActionProposalResponse,
)
from app.modules.agent.service import AgentToolsService
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.bookings.payments import MockPaymentProvider
from app.modules.bookings.repository import BookingRepository
from app.modules.bookings.service import BookingService
from app.modules.trips.repository import TripRepository

router = APIRouter(prefix="/agent/tools", tags=["Agentic Tools & HITL Confirmation"])


def get_agent_tools_service(db: AsyncSession = Depends(get_db)) -> AgentToolsService:
    """Dependency injecting AgentToolsService with BookingService."""
    booking_service = BookingService(
        db=db,
        booking_repo=BookingRepository(db=db),
        trip_repo=TripRepository(db=db),
        payment_provider=MockPaymentProvider(),
    )
    return AgentToolsService(db=db, booking_service=booking_service)


@router.post(
    "/propose",
    response_model=ActionProposalResponse,
    status_code=status.HTTP_200_OK,
    summary="Propose sensitive action requiring human confirmation",
)
async def propose_agent_action(
    request: ActionProposalRequest,
    current_user: User = Depends(get_current_user),
    service: AgentToolsService = Depends(get_agent_tools_service),
) -> ActionProposalResponse:
    """Issue a short-lived cryptographic proposal token for a sensitive action."""
    return await service.propose_action(request=request, user=current_user)


@router.post(
    "/confirm",
    response_model=ActionExecutionResult,
    status_code=status.HTTP_200_OK,
    summary="Confirm or reject proposed sensitive action",
)
async def confirm_agent_action(
    request: ActionConfirmRequest,
    current_user: User = Depends(get_current_user),
    service: AgentToolsService = Depends(get_agent_tools_service),
) -> ActionExecutionResult:
    """Consume single-use token and deterministically execute or abort the action."""
    return await service.confirm_action(request=request, user=current_user)
