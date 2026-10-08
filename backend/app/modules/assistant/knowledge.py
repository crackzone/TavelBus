"""Grounded travel policies and frequently asked questions for AI assistant."""

COMPANY_POLICIES = {
    "baggage": (
        "Each passenger is allowed 1 check-in bag up to 20 kg and 1 cabin personal bag "
        "up to 7 kg free of charge. Excess baggage is charged at ₹50 per additional kilogram, "
        "subject to luggage compartment space."
    ),
    "cancellation": (
        "Cancellation refund schedule:\n"
        "- More than 12 hours before scheduled departure: 100% refund.\n"
        "- Between 2 hours and 12 hours before departure: 50% refund.\n"
        "- Less than 2 hours before departure or after departure: No refund (0%)."
    ),
    "boarding": (
        "Passengers must report to their boarding stop at least 15 minutes before the "
        "scheduled departure time with a valid government photo ID and "
        "booking confirmation SMS/email."
    ),
    "pets": (
        "Small pets in secure carriers are permitted only on select trips with advance notice "
        "and prior permission from the driver and fleet support."
    ),
    "wifi_amenities": (
        "All our fleet buses feature high-speed onboard Wi-Fi, air conditioning, individual USB "
        "charging ports at every seat, and complimentary bottled water."
    ),
}


def search_company_policy(query: str) -> str | None:
    """Retrieve matching company policy grounded text based on keywords."""
    lower_q = query.lower()
    if any(k in lower_q for k in ("bag", "luggage", "weight", "carry")):
        return COMPANY_POLICIES["baggage"]
    if any(k in lower_q for k in ("cancel", "refund", "return money")):
        return COMPANY_POLICIES["cancellation"]
    if any(k in lower_q for k in ("board", "arrive", "time to reach", "report")):
        return COMPANY_POLICIES["boarding"]
    if any(k in lower_q for k in ("pet", "dog", "cat", "animal")):
        return COMPANY_POLICIES["pets"]
    if any(k in lower_q for k in ("wifi", "amenit", "charge", "water", "ac")):
        return COMPANY_POLICIES["wifi_amenities"]
    return None
