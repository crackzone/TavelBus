"""Health and Readiness probes."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.database import get_db

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def liveness_probe() -> dict[str, str]:
    """Liveness probe: verifies process is alive and responding."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/ready")
async def readiness_probe(db: AsyncSession = Depends(get_db)) -> Any:
    """Readiness probe: validates external dependencies (PostgreSQL)."""
    try:
        # Check active database connection
        await db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
        }
    except Exception as exc:
        logger.error("Database readiness check failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "detail": "Failed to connect to primary database",
            },
        )
