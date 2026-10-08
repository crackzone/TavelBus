"""Logging configuration with Google Cloud Logging JSON formatter."""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

from app.core.config import get_settings

settings = get_settings()


class GoogleCloudJsonFormatter(logging.Formatter):
    """Formats log records as structured JSON compatible with Google Cloud Logging."""

    def format(self, record: logging.LogRecord) -> str:
        # Map Python logging levels to Google Cloud Logging severities
        severity_map = {
            "DEBUG": "DEBUG",
            "INFO": "INFO",
            "WARNING": "WARNING",
            "ERROR": "ERROR",
            "CRITICAL": "CRITICAL",
        }
        severity = severity_map.get(record.levelname, "DEFAULT")

        log_entry: dict[str, Any] = {
            "severity": severity,
            "message": record.getMessage(),
            "time": datetime.now(timezone.utc).isoformat(),  # noqa: UP017
            "logging.googleapis.com/sourceLocation": {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            },
        }

        # Include request ID if present
        request_id = getattr(record, "request_id", None)
        if request_id:
            log_entry["request_id"] = request_id

        # Include exception trace if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logging() -> None:
    """Configure root logger with either structured Cloud JSON or human-readable format."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    # Clear existing handlers
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if settings.ENVIRONMENT == "production":
        handler.setFormatter(GoogleCloudJsonFormatter())
    else:
        dev_format = (
            "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s"
        )
        handler.setFormatter(logging.Formatter(dev_format))

    root_logger.addHandler(handler)

    # Silence noisy 3rd-party loggers if not debugging
    if not settings.DEBUG:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
