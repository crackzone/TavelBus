"""Auth service handling business logic for authentication and user accounts."""

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.models import User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

settings = get_settings()


class AuthService:
    """Coordinates user registration, credential validation, and JWT issuing."""

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def register(self, data: UserRegisterRequest) -> TokenResponse:
        """Register a new user, verifying uniqueness of email."""
        existing_user = await self.user_repo.get_by_email(data.email)
        if existing_user is not None:
            raise ConflictError(
                message=f"A user with email '{data.email}' already exists.",
                details={"field": "email"},
            )

        password_hash = hash_password(data.password)
        user = await self.user_repo.create_user(
            name=data.name,
            email=data.email,
            password_hash=password_hash,
            phone=data.phone,
            role=data.role,
        )

        return self._build_token_response(user)

    async def login(self, data: UserLoginRequest) -> TokenResponse:
        """Authenticate user credentials and issue an access token."""
        user = await self.user_repo.get_by_email(data.email)
        if user is None:
            raise AuthenticationError(message="Invalid email or password.")

        if not user.is_active:
            raise AuthenticationError(message="User account is deactivated.")

        if not verify_password(data.password, user.password_hash):
            raise AuthenticationError(message="Invalid email or password.")

        return self._build_token_response(user)

    def _build_token_response(self, user: User) -> TokenResponse:
        """Generate JWT and token response container."""
        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
        token = create_access_token(data=token_payload)
        user_response = UserResponse.model_validate(user)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=user_response,
        )
