"""Auth and User Pydantic v2 validation schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.auth.models import UserRole


class UserRegisterRequest(BaseModel):
    """Payload for user registration."""

    name: str = Field(..., min_length=2, max_length=100, examples=["John Doe"])
    email: EmailStr = Field(..., examples=["passenger@example.com"])
    phone: str | None = Field(default=None, max_length=20, examples=["+1234567890"])
    password: str = Field(..., min_length=8, max_length=128, examples=["SecurePass123!"])
    role: UserRole = Field(default=UserRole.PASSENGER, examples=["PASSENGER"])


class UserLoginRequest(BaseModel):
    """Payload for user login."""

    email: EmailStr = Field(..., examples=["passenger@example.com"])
    password: str = Field(..., min_length=1, examples=["SecurePass123!"])


class UserResponse(BaseModel):
    """Response model for authenticated user details."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    phone: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    """JWT bearer token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse
