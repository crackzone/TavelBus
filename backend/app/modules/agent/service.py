"""Service layer managing agentic tool proposals and strict human confirmation (HITL)."""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppBaseError
from app.modules.agent.schemas import (
    ActionConfirmRequest,
    ActionExecutionResult,
    ActionProposalRequest,
    ActionProposalResponse,
    AgentActionType,
)
from app.modules.auth.models import User
from app.modules.bookings.schemas import BookingCreate
from app.modules.bookings.service import BookingService


class InvalidProposalTokenError(AppBaseError):
    """Raised when proposal token is invalid, expired, or belongs to another user."""

    def __init__(self, message: str) -> None:
        super().__init__(status_code=400, message=message)


class AgentToolsService:
    """Manages short-lived cryptographic proposal tokens and executes confirmed actions."""

    # In-memory registry of active proposals: token -> proposal metadata
    _proposals: dict[str, dict[str, Any]] = {}

    def __init__(self, db: AsyncSession, booking_service: BookingService) -> None:
        self.db = db
        self.booking_service = booking_service

    async def propose_action(
        self,
        request: ActionProposalRequest,
        user: User,
    ) -> ActionProposalResponse:
        """Create a short-lived proposal for a sensitive action requiring human confirmation."""
        proposal_id = uuid.uuid4()
        token = f"prop_{secrets.token_urlsafe(24)}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # noqa: UP017

        # Generate summary description based on action type
        if request.action_type == AgentActionType.CANCEL_BOOKING:
            booking_id = request.parameters.get("booking_id")
            summary = (
                f"You have requested to CANCEL booking '{booking_id}'. "
                "The reserved seat will be immediately released to the public, "
                "and an applicable refund will be processed to the original payment method."
            )
        elif request.action_type == AgentActionType.BOOK_TICKET:
            trip_id = request.parameters.get("trip_id")
            seat_num = request.parameters.get("seat_number")
            summary = (
                f"You have requested to BOOK seat #{seat_num} on trip '{trip_id}'. "
                "A non-refundable or policy-bound fare will be charged to your account."
            )
        else:
            summary = f"Authorize sensitive operation: {request.action_type.value}."

        self._proposals[token] = {
            "proposal_id": proposal_id,
            "user_id": user.id,
            "user_role": user.role.value,
            "action_type": request.action_type,
            "parameters": request.parameters,
            "expires_at": expires_at,
        }

        return ActionProposalResponse(
            proposal_id=proposal_id,
            proposal_token=token,
            action_type=request.action_type,
            summary=summary,
            expires_at=expires_at,
            requires_confirmation=True,
        )

    async def confirm_action(
        self,
        request: ActionConfirmRequest,
        user: User,
    ) -> ActionExecutionResult:
        """Verify token validity, enforce human authorization, and execute domain mutation."""
        proposal = self._proposals.get(request.proposal_token)
        if not proposal:
            raise InvalidProposalTokenError("Invalid or already consumed proposal token.")

        # Check expiration
        now = datetime.now(timezone.utc)  # noqa: UP017
        if now > proposal["expires_at"]:
            self._proposals.pop(request.proposal_token, None)
            raise InvalidProposalTokenError("Proposal token has expired. Please propose again.")

        # Check user ownership
        if proposal["user_id"] != user.id:
            raise InvalidProposalTokenError(
                "This proposal belongs to a different authenticated user."
            )

        # Single-use consumption
        self._proposals.pop(request.proposal_token, None)

        # Handle user rejection
        if not request.confirmed:
            return ActionExecutionResult(
                success=False,
                action_type=proposal["action_type"],
                message="Action rejected by user. No mutations were applied.",
                details={"aborted": True},
            )

        # Execute confirmed action deterministically
        action_type: AgentActionType = proposal["action_type"]
        params: dict[str, Any] = proposal["parameters"]

        if action_type == AgentActionType.CANCEL_BOOKING:
            booking_id = uuid.UUID(str(params["booking_id"]))
            cancel_res = await self.booking_service.cancel_booking(
                booking_id=booking_id,
                user_id=user.id,
                is_admin=(user.role.value == "ADMIN"),
            )
            msg = f"Booking {cancel_res.booking_reference} cancelled upon confirmation."
            return ActionExecutionResult(
                success=True,
                action_type=action_type,
                message=msg,
                details={
                    "booking_reference": cancel_res.booking_reference,
                    "refund_status": cancel_res.refund_status,
                },
            )

        if action_type == AgentActionType.BOOK_TICKET:
            trip_id = uuid.UUID(str(params["trip_id"]))
            seat_num = int(params["seat_number"])
            book_payload = BookingCreate(trip_id=trip_id, seat_number=seat_num)
            book_res = await self.booking_service.create_booking(
                payload=book_payload,
                user_id=user.id,
            )
            msg = f"Ticket booked upon confirmation. Ref: {book_res.booking_reference}."
            return ActionExecutionResult(
                success=True,
                action_type=action_type,
                message=msg,
                details={
                    "booking_reference": book_res.booking_reference,
                    "seat_number": book_res.seat_number,
                    "amount": float(book_res.amount),
                },
            )

        return ActionExecutionResult(
            success=False,
            action_type=action_type,
            message="Unrecognized action type.",
        )
