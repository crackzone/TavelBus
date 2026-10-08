"""Google Cloud Pub/Sub messaging client with local development fallback."""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class PubSubPublisher:
    """Pub/Sub event publisher with resilient fallback to local in-memory log."""

    def __init__(self) -> None:
        self.project_id = settings.GCP_PROJECT_ID
        self.client = None
        self._initialized = False

    def _get_client(self) -> Any:
        if not self._initialized:
            if self.project_id and self.project_id != "local-project":
                try:
                    from google.cloud import pubsub_v1

                    self.client = pubsub_v1.PublisherClient()
                    logger.info(
                        "Initialized Google Cloud Pub/Sub PublisherClient for project %s",
                        self.project_id,
                    )
                except Exception as exc:
                    logger.warning(
                        "GCP Pub/Sub client unavailable: %s. Using local fallback publisher.",
                        exc,
                    )
                    self.client = None
            else:
                self.client = None
            self._initialized = True
        return self.client

    async def publish_bus_location_event(
        self,
        trip_id: uuid.UUID,
        bus_id: uuid.UUID,
        latitude: float,
        longitude: float,
        speed_kmph: float,
        heading: float | None,
        recorded_at: datetime,
    ) -> str:
        """Publish a BUS_LOCATION_UPDATED event to Google Cloud Pub/Sub or local stream."""
        payload = {
            "event_type": "BUS_LOCATION_UPDATED",
            "event_id": str(uuid.uuid4()),
            "trip_id": str(trip_id),
            "bus_id": str(bus_id),
            "latitude": latitude,
            "longitude": longitude,
            "speed_kmph": speed_kmph,
            "heading": heading,
            "recorded_at": recorded_at.isoformat(),
            "published_at": datetime.now(timezone.utc).isoformat(),  # noqa: UP017
        }

        client = self._get_client()
        topic_name = "bus-location-updates"

        if client and self.project_id:
            try:
                topic_path = client.topic_path(self.project_id, topic_name)
                data = json.dumps(payload).encode("utf-8")
                future = client.publish(topic_path, data)
                message_id = future.result(timeout=5.0)
                logger.info(
                    "Published location event to Pub/Sub topic %s, message_id=%s",
                    topic_path,
                    message_id,
                )
                return str(message_id)
            except Exception as exc:
                logger.warning(
                    "Failed to publish to GCP Pub/Sub: %s. Falling back to local logging.",
                    exc,
                )

        # Local development / CI fallback
        logger.info(
            "[MOCK PUBSUB] Event published to topic '%s': %s",
            topic_name,
            json.dumps(payload),
        )
        return f"mock-msg-{uuid.uuid4()}"


pubsub_publisher = PubSubPublisher()
