from __future__ import annotations

from datetime import date, time
import hashlib
import logging
import secrets as _secrets
from typing import Generator, Optional

from sqlalchemy import Boolean, Date, Integer, String, Text, Time, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    part_name: Mapped[str] = mapped_column(String(120), nullable=False)
    part_number: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    in_stock: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ServiceQueue(Base):
    __tablename__ = "service_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    time_slot: Mapped[time] = mapped_column(Time, nullable=False)
    tech_id: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Available")


class ClaimRecord(Base):
    __tablename__ = "claim_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    vin: Mapped[str] = mapped_column(String(20), nullable=False)
    policy_status: Mapped[str] = mapped_column(String(20), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    estimated_parts: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    ai_markings: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new")
    created_at: Mapped[str] = mapped_column(String(50), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(300), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    created_at: Mapped[str] = mapped_column(String(50), nullable=False)


def hash_pw(password: str) -> str:
    """Hash a password with PBKDF2-HMAC-SHA256 + random salt."""
    salt = _secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 260_000)
    return f"{salt}${key.hex()}"


def verify_pw(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored hash; returns False on any error."""
    try:
        salt, key_hex = stored_hash.split("$", 1)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 260_000)
        return _secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


logger = logging.getLogger("auto-service-db")
settings = get_settings()


def _build_engine():
    try:
        eng = create_engine(settings.database_url, pool_pre_ping=True)
        # Verify the connection is actually reachable before committing to it
        with eng.connect():
            pass
        return eng
    except Exception as exc:
        logger.warning("Cannot connect to DATABASE_URL. Falling back to SQLite: %s", exc)
        return create_engine("sqlite:///./auto_agentic.db", pool_pre_ping=True)


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def seed_default_data() -> None:
    with SessionLocal() as db:
        has_inventory = db.execute(select(Inventory.id).limit(1)).first()
        if not has_inventory:
            db.add_all(
                [
                    Inventory(part_name="Front Bumper", part_number="BUM-FR-2026", in_stock=True),
                    Inventory(part_name="Rear Door", part_number="DR-RR-2026", in_stock=False),
                    Inventory(part_name="Headlight Assembly", part_number="HL-ASM-2026", in_stock=True),
                ]
            )

        has_queue = db.execute(select(ServiceQueue.id).limit(1)).first()
        if not has_queue:
            db.add_all(
                [
                    ServiceQueue(service_date=date(2026, 4, 1), time_slot=time(9, 0), tech_id="TECH-101", status="Available"),
                    ServiceQueue(service_date=date(2026, 4, 1), time_slot=time(10, 0), tech_id="TECH-204", status="Booked"),
                    ServiceQueue(service_date=date(2026, 4, 2), time_slot=time(9, 0), tech_id="TECH-204", status="Available"),
                    ServiceQueue(service_date=date(2026, 4, 3), time_slot=time(9, 0), tech_id="TECH-333", status="Booked"),
                    ServiceQueue(service_date=date(2026, 4, 4), time_slot=time(13, 0), tech_id="TECH-555", status="Available"),
                ]
            )

        db.commit()
