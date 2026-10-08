"""Authentication HTTP API router."""

from fastapi import APIRouter, Depends, status

from app.modules.auth.dependencies import get_auth_service, get_current_user
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new passenger, driver, or admin",
)
async def register(
    payload: UserRegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Register user with email, password, and role. Returns JWT token."""
    return await service.register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and obtain JWT token",
)
async def login(
    payload: UserLoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Validate credentials and return JWT bearer token."""
    return await service.login(payload)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Retrieve details of the currently authenticated user."""
    return UserResponse.model_validate(current_user)
