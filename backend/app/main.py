"""Main FastAPI application factory and entry point."""

import logging
import time
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.core.config import get_settings
from app.core.exceptions import AppBaseError, app_exception_handler
from app.core.logging import setup_logging
from app.db.database import engine
from app.modules.agent.router import router as agent_router
from app.modules.assistant.router import router as assistant_router
from app.modules.auth.router import router as auth_router
from app.modules.bookings.router import router as bookings_router
from app.modules.buses.router import router as admin_buses_router
from app.modules.revenue.router import admin_manifest_router, admin_revenue_router
from app.modules.routes.router import (
    admin_routes_router,
    admin_stops_router,
    public_routes_router,
)
from app.modules.tracking.router import driver_router, tracking_router
from app.modules.trips.router import admin_trips_router, public_trips_router

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown hooks."""
    setup_logging()
    logger.info("Starting %s in %s mode...", settings.PROJECT_NAME, settings.ENVIRONMENT)
    try:
        yield
    finally:
        logger.info("Closing database engine pool...")
        await engine.dispose()
        logger.info("Shutdown complete.")


def create_app() -> FastAPI:
    """Initialize and configure the FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        lifespan=lifespan,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    )

    # Cross-Origin Resource Sharing
    if settings.CORS_ORIGINS:
        allowed_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    elif settings.ENVIRONMENT != "production":
        allowed_origins = ["*"]
    else:
        allowed_origins = []

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware: Request ID and Performance Timing
    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start_time = time.perf_counter()

        response = await call_next(request)

        process_time = time.perf_counter() - start_time
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        return response

    # Exception Handlers
    app.add_exception_handler(AppBaseError, app_exception_handler)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        logger.exception("Unhandled server error [request_id=%s]: %s", request_id, exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred.",
                    "request_id": request_id,
                }
            },
        )

    # Register Routers
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(admin_buses_router)
    app.include_router(admin_routes_router)
    app.include_router(admin_stops_router)
    app.include_router(public_routes_router)
    app.include_router(admin_trips_router)
    app.include_router(public_trips_router)
    app.include_router(bookings_router)
    app.include_router(driver_router, prefix="/api/v1")
    app.include_router(tracking_router, prefix="/api/v1")
    app.include_router(admin_revenue_router, prefix="/api/v1")
    app.include_router(admin_manifest_router, prefix="/api/v1")
    app.include_router(assistant_router, prefix="/api/v1")
    app.include_router(agent_router, prefix="/api/v1")

    return app


app = create_app()
