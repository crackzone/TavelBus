"""Real-time tracking broker managing WebSocket and SSE subscribers per trip."""

import asyncio
import json
import logging
import uuid
from collections import defaultdict
from typing import Any

logger = logging.getLogger(__name__)


class TrackingBroker:
    """In-memory event hub dispatching GPS telemetry updates to connected clients."""

    def __init__(self) -> None:
        # Maps trip_id -> set of asyncio.Queue instances
        self._subscribers: dict[uuid.UUID, set[asyncio.Queue[str]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, trip_id: uuid.UUID) -> asyncio.Queue[str]:
        """Register a new subscriber queue for a given trip."""
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers[trip_id].add(queue)
            logger.debug(
                "Subscribed client to trip %s (active: %d)",
                trip_id,
                len(self._subscribers[trip_id]),
            )
        return queue

    async def disconnect(self, trip_id: uuid.UUID, queue: asyncio.Queue[str]) -> None:
        """Remove a subscriber queue when client disconnects."""
        async with self._lock:
            subscribers = self._subscribers.get(trip_id)
            if subscribers and queue in subscribers:
                subscribers.remove(queue)
                logger.debug(
                    "Unsubscribed client from trip %s (active: %d)",
                    trip_id,
                    len(subscribers),
                )
                if not subscribers:
                    self._subscribers.pop(trip_id, None)

    async def broadcast(self, trip_id: uuid.UUID, payload: dict[str, Any]) -> int:
        """Deliver GPS update message to all connected subscribers for this trip."""
        message = json.dumps(payload)
        async with self._lock:
            subscribers = list(self._subscribers.get(trip_id, set()))

        sent_count = 0
        for queue in subscribers:
            try:
                # Non-blocking put; drop message if client queue is saturated
                queue.put_nowait(message)
                sent_count += 1
            except asyncio.QueueFull:
                logger.warning("Subscriber queue full for trip %s, dropping frame", trip_id)

        return sent_count

    def get_subscriber_count(self, trip_id: uuid.UUID) -> int:
        """Return the count of active listeners for a trip."""
        return len(self._subscribers.get(trip_id, set()))


# Global singleton broker instance
tracking_broker = TrackingBroker()
