"""Pydantic schemas for the GenAI chat assistant."""

import uuid
from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Passenger or driver conversational prompt."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User natural language message.",
        examples=["What is the baggage allowance?", "Where is my bus?", "Show my bookings"],
    )
    conversation_id: uuid.UUID | None = Field(
        default=None,
        description="Optional session ID for multi-turn conversational context.",
    )


class ChatResponse(BaseModel):
    """Assistant structured reply with identified intent and factual citations."""

    response: str = Field(..., description="Natural language answer generated for the user.")
    intent: str = Field(
        ...,
        description="Identified user intent category (POLICY_QUERY, BOOKING_STATUS, etc).",
    )
    data_context: dict[str, Any] | None = Field(
        default=None,
        description="Structured domain data used to construct the answer.",
    )
