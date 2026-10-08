"""Unit tests for Google Cloud integrations: Secret Manager and Cloud Logging."""

import json
import logging
import os

from app.core.logging import GoogleCloudJsonFormatter
from app.integrations.secret_manager import SecretManagerClient


def test_secret_manager_local_env_override():
    """Verify SecretManagerClient uses local environment variables when present."""
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://mock:pass@localhost:5432/mockdb"
    client = SecretManagerClient(project_id="test-proj")

    secret_val = client.get_secret("DATABASE_URL")
    assert secret_val == "postgresql+asyncpg://mock:pass@localhost:5432/mockdb"


def test_secret_manager_default_fallback_without_gcp():
    """Verify fallback value is returned when secret is not in env and GCP client unavailable."""
    client = SecretManagerClient(project_id="test-proj")
    client._client = None

    val = client.get_secret("NON_EXISTENT_KEY", default="fallback_value")
    assert val == "fallback_value"


def test_cloud_logging_json_formatter():
    """Verify GoogleCloudJsonFormatter outputs structured JSON with expected Cloud Logging keys."""
    formatter = GoogleCloudJsonFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.ERROR,
        pathname="app/main.py",
        lineno=42,
        msg="Database connectivity failed",
        args=(),
        exc_info=None,
        func="lifespan",
    )
    record.request_id = "req-uuid-12345"

    formatted_str = formatter.format(record)
    data = json.loads(formatted_str)

    assert data["severity"] == "ERROR"
    assert data["message"] == "Database connectivity failed"
    assert data["request_id"] == "req-uuid-12345"
    assert "time" in data
    assert data["logging.googleapis.com/sourceLocation"]["line"] == 42
