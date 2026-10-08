"""Mock payment provider interface."""

import uuid
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any


class PaymentProvider(ABC):
    """Abstract interface for payment processing."""

    @abstractmethod
    async def process_payment(
        self,
        amount: Decimal,
        currency: str,
        reference: str,
    ) -> dict[str, Any]:
        """Charge payment."""
        pass

    @abstractmethod
    async def process_refund(
        self,
        payment_id: str,
        amount: Decimal,
    ) -> dict[str, Any]:
        """Issue refund."""
        pass


class MockPaymentProvider(PaymentProvider):
    """Simulated payment provider for development and testing."""

    async def process_payment(
        self,
        amount: Decimal,
        currency: str = "INR",
        reference: str = "",
    ) -> dict[str, Any]:
        """Simulate successful payment authorization."""
        return {
            "success": True,
            "transaction_id": f"mock_tx_{uuid.uuid4().hex[:12]}",
            "amount": amount,
            "currency": currency,
            "reference": reference,
            "status": "PAID",
        }

    async def process_refund(
        self,
        payment_id: str,
        amount: Decimal,
    ) -> dict[str, Any]:
        """Simulate successful refund."""
        return {
            "success": True,
            "refund_id": f"mock_rf_{uuid.uuid4().hex[:12]}",
            "payment_id": payment_id,
            "amount": amount,
            "status": "REFUNDED",
        }
