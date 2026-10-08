"""Core configuration module using Pydantic Settings."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings validated via environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore", 
    )

    # General
    PROJECT_NAME: str = "TravelBus Manager"
    VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "staging", "production", "testing"] = "development"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = ""

    # Security
    SECRET_KEY: str = Field(
        default="change_this_to_a_super_secret_key_in_production_32_bytes_min",
        description="Secret key for JWT token generation and validation",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/travelbus_db",
        description="Async SQLAlchemy database connection string",
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_PRE_PING: bool = True

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_async_db_url(cls, v: str) -> str:
        """Ensure standard postgres:// or postgresql:// URLs use the asyncpg dialect."""
        if not v:
            return v
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # GCP & AI
    GCP_PROJECT_ID: str = "travelbus-manager-dev"
    GCP_LOCATION: str = "us-central1"
    PUBSUB_TOPIC_BUS_LOCATIONS: str = "bus-location-events"
    PUBSUB_SUBSCRIPTION_TRACKING: str = "tracking-worker-subscription"
    GCS_BUCKET_DOCUMENTS: str = "travelbus-policy-docs"
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GEMINI_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
