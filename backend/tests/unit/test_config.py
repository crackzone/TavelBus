"""Tests for core configuration loading and defaults."""

from app.core.config import Settings


def test_settings_default_values():
    """Verify settings initialize with expected defaults."""
    settings = Settings(
        SECRET_KEY="temporary_test_secret_key_long_enough",
        DATABASE_URL="sqlite+aiosqlite:///:memory:",
    )
    assert settings.PROJECT_NAME == "TravelBus Manager"
    assert settings.ENVIRONMENT in ["development", "testing"]
    assert settings.PORT == 8000
    assert settings.ALGORITHM == "HS256"
