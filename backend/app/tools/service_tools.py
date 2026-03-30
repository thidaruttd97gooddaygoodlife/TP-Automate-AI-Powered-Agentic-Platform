from app.db import SessionLocal
from app.services.queue_service import fetch_slots_by_date, next_available_slots


def check_service_availability(date: str) -> str:
    with SessionLocal() as db:
        slots = fetch_slots_by_date(db, date)

    if slots:
        available = [slot for slot in slots if slot.status == "Available"]
        if available:
            return f"Service slot available on {date}. Remaining slots: {len(available)}."
        alternatives = suggest_alternative_slots(date)
        return f"No service availability on {date}. Smart alternatives: {alternatives}"

    alternatives = suggest_alternative_slots(date)
    return f"No schedule found for {date}. Smart alternatives: {alternatives}"


def suggest_alternative_slots(preferred_date: str) -> str:
    with SessionLocal() as db:
        available_slots = next_available_slots(db, limit=3)

    if not available_slots:
        return "No branch availability found. Offer callback from service desk."

    suggestions = []
    for index, slot in enumerate(available_slots[:3], start=1):
        suggestions.append(
            (
                f"Option {index}: Branch {chr(64 + index)} on {slot.service_date.isoformat()} "
                f"at {slot.time_slot.strftime('%H:%M')} (Tech {slot.tech_id})"
            )
        )
    return "; ".join(suggestions)
