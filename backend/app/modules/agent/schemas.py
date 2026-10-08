"""Pydantic schemas for agentic tools with strict human confirmation."""

import enum
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AgentActionType(str, enum.Enum):  # noqa: UP042
    """Enumeration of sensitive agentic actions requiring explicit confirmation."""

    BOOK_TICKET = "BOOK_TICKET"
    CANCEL_BOOKING = "CANCEL_BOOKING"


class ActionProposalRequest(BaseModel):
    """Request initiated by user or AI assistant to propose a sensitive mutation."""

    action_type: AgentActionType = Field(
        ...,
        description="The sensitive action to execute (BOOK_TICKET or CANCEL_BOOKING).",
    )
    parameters: dict[str, Any] = Field(
        ...,
        description="Parameters required for action (e.g. booking_id or trip_id and seat_number).",
    )


class ActionProposalResponse(BaseModel):
    """Proposal response containing cryptographic confirmation token and summary of impact."""

    proposal_id: uuid.UUID = Field(..., description="Unique proposal identifier.")
    proposal_token: str = Field(..., description="Single-use confirmation token.")
    action_type: AgentActionType
    summary: str = Field(
        ...,
        description="Human-readable summary of proposed action and consequences.",
    )
    expires_at: datetime = Field(..., description="UTC timestamp when confirmation token expires.")
    requires_confirmation: bool = Field(
        default=True,
        description="Always true for sensitive operations.",
    )


class ActionConfirmRequest(BaseModel):
    """Payload submitted by user to confirm or reject the proposed action."""

    proposal_token: str = Field(..., description="Confirmation token issued during proposal phase.")
    confirmed: bool = Field(
        ...,
        description="Set to true to authorize and execute the action, false to abort.",
    )


class ActionExecutionResult(BaseModel):
    """Outcome of confirmed action execution."""

    success: bool
    action_type: AgentActionType
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
