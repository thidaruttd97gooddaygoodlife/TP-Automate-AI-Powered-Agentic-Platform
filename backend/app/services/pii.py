import re
from typing import Any


EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\b(?:\+\d{1,2}\s?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b")
VIN_RE = re.compile(r"\b[A-HJ-NPR-Z0-9]{17}\b")
WARRANTY_RE = re.compile(r"\b(?:WR|WAR)-?\d{6,12}\b", flags=re.IGNORECASE)


def redact_pii(text: str) -> str:
    text = EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    text = PHONE_RE.sub("[REDACTED_PHONE]", text)
    text = VIN_RE.sub("[REDACTED_VIN]", text)
    text = WARRANTY_RE.sub("[REDACTED_WARRANTY]", text)
    return text


def sanitize_payload(payload: Any) -> Any:
    if isinstance(payload, str):
        return redact_pii(payload)
    if isinstance(payload, dict):
        return {key: sanitize_payload(value) for key, value in payload.items()}
    if isinstance(payload, list):
        return [sanitize_payload(item) for item in payload]
    return payload
