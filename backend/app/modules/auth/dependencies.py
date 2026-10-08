"""FastAPI authentication and role-based authorization dependencies."""

import uuid
from collections.abc import Callable

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.core.security import decode_access_token
from app.db.database import get_db
from app.modules.auth.models import User, UserRole
from app.modules.auth.repository import UserRepository
from app.modules.auth.service import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    """Dependency that supplies a UserRepository instance."""
    return UserRepository(db=db)


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
) -> AuthService:
    """Dependency that supplies an AuthService instance."""
    return AuthService(user_repo=user_repo)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    """Decode JWT token, validate existence, and return the active user."""
    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise AuthenticationError(message="Invalid token payload.")
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError) as exc:
        raise AuthenticationError(message="Could not validate credentials.") from exc

    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise AuthenticationError(message="User not found.")

    if not user.is_active:
        raise AuthenticationError(message="User account is deactivated.")

    return user


def require_role(*allowed_roles: UserRole) -> Callable[[User], User]:
    """Factory creating a dependency that checks if current user has an allowed role."""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            role_names = ", ".join(r.value for r in allowed_roles)
            raise PermissionDeniedError(
                message=f"Access denied. Requires one of roles: [{role_names}].",
                details={"user_role": current_user.role.value},
            )
        return current_user

    return role_checker
