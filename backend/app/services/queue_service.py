from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import asc, select
from sqlalchemy.orm import Session

from app.db import ServiceQueue


def normalize_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def fetch_slots_by_date(db: Session, requested_date: str) -> list[ServiceQueue]:
    target_date = normalize_date(requested_date)
    return list(
        db.execute(
            select(ServiceQueue)
            .where(ServiceQueue.service_date == target_date)
            .order_by(asc(ServiceQueue.time_slot))
        ).scalars()
    )


def next_available_slots(db: Session, limit: int = 3) -> list[ServiceQueue]:
    return list(
        db.execute(
            select(ServiceQueue)
            .where(ServiceQueue.status == "Available")
            .order_by(asc(ServiceQueue.service_date), asc(ServiceQueue.time_slot))
            .limit(limit)
        ).scalars()
    )


def to_slot_payload(slot: ServiceQueue) -> dict[str, Any]:
    return {
        "id": slot.id,
        "date": slot.service_date.isoformat(),
        "time_slot": slot.time_slot.strftime("%H:%M"),
        "tech_id": slot.tech_id,
        "status": slot.status,
    }
