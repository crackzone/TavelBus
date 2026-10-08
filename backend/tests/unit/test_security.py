"""Unit tests for password hashing and JWT token logic."""

from datetime import timedelta

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hashing():
    """Verify passwords are correctly hashed and validated."""
    raw_password = "SuperSecretPassword123!"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_token_creation_and_decoding():
    """Verify access token creation and payload decoding."""
    payload = {"sub": "12345", "role": "PASSENGER"}
    token = create_access_token(data=payload, expires_delta=timedelta(minutes=15))

    decoded = decode_access_token(token)
    assert decoded["sub"] == "12345"
    assert decoded["role"] == "PASSENGER"
    assert "exp" in decoded


def test_jwt_token_expired():
    """Verify expired token raises JWTError."""
    payload = {"sub": "expired_user"}
    # Token with negative delta
    token = create_access_token(data=payload, expires_delta=timedelta(minutes=-5))

    with pytest.raises(JWTError):
        decode_access_token(token)
