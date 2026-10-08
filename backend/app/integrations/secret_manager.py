"""Google Cloud Secret Manager client helper."""

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


class SecretManagerClient:
    """Retrieves secrets from Google Cloud Secret Manager with local environment fallback."""

    def __init__(self, project_id: str | None = None):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID", "travelbus-manager-dev")
        self._client: Any = None

    def _get_client(self) -> Any:
        """Lazy load SecretManagerServiceClient to prevent local import errors."""
        if self._client is None:
            try:
                from google.cloud import secretmanager  # type: ignore

                self._client = secretmanager.SecretManagerServiceClient()
            except ImportError:
                logger.warning(
                    "google-cloud-secret-manager not installed. Falling back to local env vars."
                )
                return None
        return self._client

    def get_secret(
        self,
        secret_id: str,
        version: str = "latest",
        default: str | None = None,
    ) -> str:
        """Retrieve secret value payload. Falls back to environment variable if unavailable."""
        # 1. Check local environment variable first
        env_val = os.getenv(secret_id.upper())
        if env_val:
            return env_val

        client = self._get_client()
        if client is None:
            if default is not None:
                return default
            return ""

        try:
            name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version}"
            response = client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8")
        except Exception as exc:
            logger.warning(
                "Could not access secret '%s' from Secret Manager: %s. Using default fallback.",
                secret_id,
                exc,
            )
            if default is not None:
                return default
            return ""
