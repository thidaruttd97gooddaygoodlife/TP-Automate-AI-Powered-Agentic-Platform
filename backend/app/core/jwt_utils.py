"""JWT token creation and verification helpers."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt  # noqa: F401 – JWTError re-exported for callers

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def create_access_token(email: str, role: str, secret_key: str, full_name: str = "") -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload: dict = {
        "sub": email,
        "role": role,
        "exp": expire,
    }
    if full_name:
        payload["name"] = full_name
    return jwt.encode(payload, secret_key, algorithm=ALGORITHM)


def decode_token(token: str, secret_key: str) -> dict:
    """Decode and verify a JWT. Raises jose.JWTError on failure."""
    return jwt.decode(token, secret_key, algorithms=[ALGORITHM])
