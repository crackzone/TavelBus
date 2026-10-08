"""Custom exception classes and unified error representation."""

from typing import Any

from fastapi import Request, status
from fastapi.responses import JSONResponse


class AppBaseError(Exception):
    """Base application exception with error code and HTTP status code."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Any = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class DatabaseConnectionError(AppBaseError):
    """Raised when external database connectivity fails."""

    def __init__(self, message: str = "Unable to connect to database", details: Any = None):
        super().__init__(
            message=message,
            code="DATABASE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class AuthenticationError(AppBaseError):
    """Raised when authentication fails (invalid credentials, expired token, etc.)."""

    def __init__(self, message: str = "Invalid credentials", details: Any = None):
        super().__init__(
            message=message,
            code="AUTHENTICATION_FAILED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class PermissionDeniedError(AppBaseError):
    """Raised when an authenticated user lacks required role permissions."""

    def __init__(
        self,
        message: str = "Permission denied",
        code: str = "FORBIDDEN",
        details: Any = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ResourceNotFoundError(AppBaseError):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found", details: Any = None):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ConflictError(AppBaseError):
    """Raised when an operation conflicts with existing data (e.g. overlapping trip)."""

    def __init__(
        self, message: str = "Resource conflict", code: str = "CONFLICT", details: Any = None
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class BadRequestError(AppBaseError):
    """Raised when client sends invalid request logic."""

    def __init__(
        self, message: str = "Bad request", code: str = "BAD_REQUEST", details: Any = None
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class InactiveResourceError(AppBaseError):
    """Raised when an action requires an active entity (bus, route) that is inactive."""

    def __init__(
        self,
        message: str = "Resource is inactive",
        code: str = "RESOURCE_INACTIVE",
        details: Any = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


async def app_exception_handler(request: Request, exc: AppBaseError) -> JSONResponse:
    """Format AppBaseError into the project standard error envelope."""
    request_id = getattr(request.state, "request_id", "unknown")
    content = {
        "error": {
            "code": exc.code,
            "message": exc.message,
            "request_id": request_id,
        }
    }
    if exc.details is not None:
        content["error"]["details"] = exc.details
    return JSONResponse(status_code=exc.status_code, content=content)
