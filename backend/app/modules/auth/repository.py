"""Repository layer for User database operations."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User, UserRole


class UserRepository:
    """Encapsulates database access for users."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Fetch user by primary key ID."""
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Fetch user by unique email address (case-insensitive search)."""
        stmt = select(User).where(User.email == email.lower().strip())
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_user(
        self,
        name: str,
        email: str,
        password_hash: str,
        phone: str | None = None,
        role: UserRole = UserRole.PASSENGER,
    ) -> User:
        """Create and persist a new user."""
        user = User(
            name=name.strip(),
            email=email.lower().strip(),
            password_hash=password_hash,
            phone=phone.strip() if phone else None,
            role=role,
            is_active=True,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
