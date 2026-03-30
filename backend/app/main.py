from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.service_agent import service_agent
from app.core.auth import require_role
from app.core.config import get_settings
from app.core.jwt_utils import create_access_token
from app.db import ClaimRecord, Inventory, ServiceQueue, User, get_db, hash_pw, init_db, seed_default_data, verify_pw
from app.models.schemas import (
    AgentQueryRequest,
    AgentQueryResponse,
    AIOperationsMetricsResponse,
    BookingAssistantRequest,
    BookingAssistantResponse,
    ClaimCorrectionRequest,
    ClaimCorrectionResponse,
    ClaimInboxRecord,
    ClaimInboxResponse,
    DiagnoseResponse,
    ExtractionRecord,
    ExtractionResponse,
    HealthResponse,
    IngestResponse,
    InventoryItem,
    InventoryResponse,
    LoginRequest,
    ManualQueryRequest,
    ManualQueryResponse,
    MyClaimsResponse,
    RegisterRequest,
    RegisterResponse,
    ServiceQueueBookRequest,
    ServiceQueueBookResponse,
    ServiceQueueItem,
    ServiceQueueResponse,
    SmartClaimResponse,
    TokenResponse,
    TokenUsageDashboardResponse,
)
from app.services.pii import sanitize_payload
from app.services.queue_service import fetch_slots_by_date, next_available_slots, to_slot_payload
from app.services.rag_service import rag_service
from app.services.token_router import token_router
from app.services.vision_service import vision_service
from app.tools.service_tools import suggest_alternative_slots


settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("auto-service-api")

os.environ["LANGCHAIN_TRACING_V2"] = "false"
if settings.langsmith_api_key and settings.langsmith_tracing:
    os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project

app = FastAPI(title="Unified Auto-Service Platform API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUEST_LATENCIES_MS: list[float] = []
CLAIM_COST_USD: list[float] = []


class ServiceQueueWSManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, payload: dict) -> None:
        stale: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)


queue_ws_manager = ServiceQueueWSManager()


@app.middleware("http")
async def latency_metrics_middleware(request, call_next):
    started = datetime.now(timezone.utc)
    response = await call_next(request)
    elapsed_ms = (datetime.now(timezone.utc) - started).total_seconds() * 1000
    REQUEST_LATENCIES_MS.append(elapsed_ms)
    if len(REQUEST_LATENCIES_MS) > 500:
        del REQUEST_LATENCIES_MS[:-500]
    return response


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    seed_default_data()
    try:
        if rag_service.is_empty():
                bootstrap_texts = [
                    (
                        "SmartAI Platform Overview: ระบบนี้ประกอบด้วย AI Agent, RAG Chatbot และ Vision AI เพื่อช่วยองค์กร"
                        "ยกระดับงานบริการลูกค้า งานขาย และงานปฏิบัติการ โดยเน้นความแม่นยำ ความเร็ว และการควบคุมต้นทุน"
                    ),
                    (
                        "Prompt Engineering Best Practices: กำหนดบทบาท AI ให้ชัดเจน, ระบุขอบเขตข้อมูล,"
                        "บังคับรูปแบบผลลัพธ์ (เช่น JSON), และเพิ่ม guardrails เพื่อลด hallucination"
                    ),
                    (
                        "RAG for Business Value: ใช้เอกสารภายในองค์กรเป็นแหล่งข้อมูลหลัก ทำให้ AI ตอบได้ตรงนโยบาย"
                        "และอ้างอิงแหล่งข้อมูลได้จริง ช่วยลดเวลา onboarding และลดภาระทีม support"
                    ),
                    (
                        "AI Agent Operations: workflow มาตรฐานประกอบด้วย intent detection, tool execution,"
                        "fallback handling และ human handoff เมื่อความมั่นใจต่ำ"
                    ),
                    (
                        "Vision AI Use Cases: ตรวจสอบเอกสาร, วิเคราะห์รูปหน้างาน, ตรวจความผิดปกติผลิตภัณฑ์,"
                        "และสรุปผลเชิงปฏิบัติการเพื่อนำไปดำเนินการต่อ"
                    ),
                ]
                chunks = rag_service.seed_from_texts(bootstrap_texts, source="builtin_business_playbook")
                logger.info("Bootstrapped built-in RAG knowledge chunks=%s", chunks)
    except Exception as exc:
        logger.warning("Skipped RAG bootstrap during startup: %s", exc)

    # Re-ingest admin feedback corrections into RAG
    feedback_dir = Path(__file__).resolve().parents[1] / "data" / "feedback_loop"
    try:
        fb_chunks = rag_service.ingest_feedback(feedback_dir)
        if fb_chunks:
            logger.info("Ingested feedback corrections into RAG: chunks=%s", fb_chunks)
    except Exception as exc:
        logger.warning("Feedback ingest skipped: %s", exc)


@app.post("/auth/token", response_model=TokenResponse)
def get_access_token(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Issue a signed JWT. Admin/staff roles are demo (no password). User role requires registered credentials."""
    if payload.role not in ("user", "admin", "staff"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be user, admin, or staff")
    if payload.role == "user":
        if not payload.password:
            raise HTTPException(status_code=400, detail="กรุณาระบุรหัสผ่าน")
        db_user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
        if not db_user or not verify_pw(payload.password, db_user.password_hash):
            raise HTTPException(status_code=401, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")
        token = create_access_token(
            email=payload.email,
            role="user",
            secret_key=settings.jwt_secret_key,
            full_name=db_user.full_name,
        )
    else:
        token = create_access_token(
            email=payload.email,
            role=payload.role,
            secret_key=settings.jwt_secret_key,
        )
    return TokenResponse(access_token=token)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.post("/auth/register", response_model=RegisterResponse)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    """Register a new user account and return a JWT for immediate login."""
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น")
    new_user = User(
        email=payload.email,
        password_hash=hash_pw(payload.password),
        full_name=payload.full_name,
        role="user",
        created_at=utc_now_iso(),
    )
    db.add(new_user)
    db.commit()
    token = create_access_token(
        email=payload.email,
        role="user",
        secret_key=settings.jwt_secret_key,
        full_name=payload.full_name,
    )
    return RegisterResponse(access_token=token, token_type="bearer", full_name=payload.full_name, email=payload.email)


@app.get("/my-claims", response_model=MyClaimsResponse)
def get_my_claims(
    auth: dict = Depends(require_role("user")),
    db: Session = Depends(get_db),
) -> MyClaimsResponse:
    """Return all claims belonging to the authenticated user."""
    rows = (
        db.execute(
            select(ClaimRecord)
            .where(ClaimRecord.user_id == auth["user_id"])
            .order_by(ClaimRecord.id.desc())
            .limit(50)
        )
        .scalars()
        .all()
    )
    return MyClaimsResponse(
        claims=[
            {
                "claim_id": r.claim_id,
                "vin": r.vin,
                "policy_status": r.policy_status,
                "severity": r.severity,
                "summary": r.status,
                "estimated_parts": json.loads(r.estimated_parts),
                "ai_markings": json.loads(r.ai_markings),
                "status": r.status,
                "created_at": r.created_at,
            }
            for r in rows
        ]
    )


def extract_vin_from_warranty_bytes(file_bytes: bytes, filename: str) -> str:
    decoded = file_bytes.decode("utf-8", errors="ignore")
    matches = re.findall(r"\b[A-HJ-NPR-Z0-9]{17}\b", decoded)
    if matches:
        return matches[0]
    digest = hashlib.sha1((filename + str(len(file_bytes))).encode("utf-8")).hexdigest().upper()
    return f"{digest[:17]}".replace("I", "1").replace("O", "0")


def derive_policy_status(vin: str) -> str:
    score = sum(ord(char) for char in vin) % 10
    if score <= 5:
        return "active"
    if score <= 7:
        return "review"
    return "expired"


def build_ai_markings(parts: list[str], severity: str) -> list[str]:
    return [f"bbox:{part}:severity={severity}:confidence=0.92" for part in parts[:3]] or [
        f"bbox:general-inspection:severity={severity}:confidence=0.78"
    ]


def avg(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 4)


@app.post("/diagnose-image", response_model=DiagnoseResponse)
async def diagnose_image(file: UploadFile = File(...)) -> DiagnoseResponse:
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image file is required")

    try:
        summary, severity, estimated_parts, model_used, cache_hit, estimated_days, estimated_cost = vision_service.diagnose(
            image_bytes=image_bytes,
            filename=file.filename or "uploaded-image",
        )
    except Exception as exc:
        logger.exception("Image diagnosis failed: %s", sanitize_payload(str(exc)))
        raise HTTPException(status_code=500, detail="Image diagnosis failed") from exc

    return DiagnoseResponse(
        summary=summary,
        severity=severity,
        estimated_parts=estimated_parts,
        model_used=model_used,
        cache_hit=cache_hit,
        estimated_days=estimated_days,
        estimated_cost=estimated_cost,
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="auto-service-backend",
        timestamp=utc_now_iso(),
    )


@app.get("/inventory", response_model=InventoryResponse)
def get_inventory(
    auth: dict = Depends(require_role("admin", "staff")),
    db: Session = Depends(get_db),
) -> InventoryResponse:
    rows = list(db.execute(select(Inventory).order_by(Inventory.part_name)).scalars())
    return InventoryResponse(
        rows=[
            InventoryItem(id=row.id, part_name=row.part_name, part_number=row.part_number, in_stock=row.in_stock)
            for row in rows
        ]
    )


@app.get("/service-queue", response_model=ServiceQueueResponse)
def get_service_queue(
    date: str | None = Query(default=None),
    auth: dict = Depends(require_role("user", "admin", "staff")),
    db: Session = Depends(get_db),
) -> ServiceQueueResponse:
    if date:
        rows = fetch_slots_by_date(db, date)
    else:
        rows = next_available_slots(db, limit=30)

    return ServiceQueueResponse(rows=[ServiceQueueItem(**to_slot_payload(row)) for row in rows])


@app.post("/service-queue/book", response_model=ServiceQueueBookResponse)
async def book_service_slot(
    payload: ServiceQueueBookRequest,
    auth: dict = Depends(require_role("user", "admin", "staff")),
    db: Session = Depends(get_db),
) -> ServiceQueueBookResponse:
    slot = db.get(ServiceQueue, payload.slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.status == "Booked":
        return ServiceQueueBookResponse(success=False, message="Slot already booked", slot=ServiceQueueItem(**to_slot_payload(slot)))

    slot.status = "Booked"
    db.add(slot)
    db.commit()
    db.refresh(slot)

    await queue_ws_manager.broadcast(
        {
            "event": "service_queue_updated",
            "slot": to_slot_payload(slot),
            "updated_by": auth.get("user_id"),
        }
    )

    return ServiceQueueBookResponse(
        success=True,
        message="Booking confirmed",
        slot=ServiceQueueItem(**to_slot_payload(slot)),
    )


@app.websocket("/ws/service-queue")
async def service_queue_ws(websocket: WebSocket):
    await queue_ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        queue_ws_manager.disconnect(websocket)


@app.post("/smart-claim", response_model=SmartClaimResponse)
async def smart_claim(
    full_name: str = Form(...),
    policy_number: str = Form(...),
    damage_photo: UploadFile = File(...),
    auth: dict = Depends(require_role("user", "admin", "staff")),
    db: Session = Depends(get_db),
) -> SmartClaimResponse:
    damage_bytes = await damage_photo.read()
    if not damage_bytes:
        raise HTTPException(status_code=400, detail="Damage photo is required")
    if not full_name.strip() or not policy_number.strip():
        raise HTTPException(status_code=400, detail="Full name and policy number are required")

    vin = policy_number.strip().upper()
    policy_status = derive_policy_status(vin)
    try:
        summary, severity, estimated_parts, model_used, cache_hit, estimated_days, estimated_cost = vision_service.diagnose(
            image_bytes=damage_bytes,
            filename=damage_photo.filename or "damage-photo",
        )
    except Exception as exc:
        logger.exception("Vision analysis failed: %s", sanitize_payload(str(exc)))
        raise HTTPException(status_code=422, detail="วิเคราะห์ภาพไม่สำเร็จ กรุณาตรวจสอบว่าไฟล์เป็นรูปภาพ JPG/PNG และ Gemini API key ถูกต้อง") from exc
    ai_markings = build_ai_markings(estimated_parts, severity)
    claim_id = f"CLM-{uuid4().hex[:8].upper()}"
    created_at = utc_now_iso()

    db_claim = ClaimRecord(
        claim_id=claim_id,
        customer_name=full_name.strip(),
        vin=vin,
        policy_status=policy_status,
        severity=severity,
        estimated_parts=json.dumps(estimated_parts),
        ai_markings=json.dumps(ai_markings),
        status="new",
        created_at=created_at,
        user_id=auth.get("user_id"),
    )
    db.add(db_claim)
    db.commit()

    claim_cost = 0.05 if model_used == settings.model_complex else 0.02
    CLAIM_COST_USD.append(claim_cost)
    if len(CLAIM_COST_USD) > 500:
        del CLAIM_COST_USD[:-500]

    logger.info(
        "Smart claim submitted: %s",
        sanitize_payload(
            {
                "claim_id": claim_id,
                "vin": vin,
                "policy_status": policy_status,
                "severity": severity,
            }
        ),
    )
    return SmartClaimResponse(
        claim={
            "claim_id": claim_id,
            "vin": vin,
            "policy_status": policy_status,
            "severity": severity,
            "summary": summary,
            "estimated_parts": estimated_parts,
            "ai_markings": ai_markings,
            "model_used": model_used,
            "cache_hit": cache_hit,
            "created_at": created_at,
            "estimated_days": estimated_days,
            "estimated_cost": estimated_cost,
        }
    )


@app.post("/manual-query", response_model=ManualQueryResponse)
def manual_query(
    payload: ManualQueryRequest,
    auth: dict = Depends(require_role("user", "admin", "staff")),
) -> ManualQueryResponse:
    try:
        answer, sources, model_used, cache_hit = rag_service.answer(payload.question)
        logger.info(
            "Manual query by %s: %s",
            auth.get("user_id"),
            sanitize_payload(payload.model_dump()),
        )
        return ManualQueryResponse(
            answer=answer,
            sources=sources,
            model_used=model_used,
            cache_hit=cache_hit,
        )
    except Exception as exc:
        logger.exception("Manual query failed: %s", sanitize_payload(str(exc)))
        raise HTTPException(status_code=500, detail="Manual query failed") from exc


@app.post("/booking-assistant", response_model=BookingAssistantResponse)
def booking_assistant(
    payload: BookingAssistantRequest,
    auth: dict = Depends(require_role("user", "admin", "staff")),
) -> BookingAssistantResponse:
    try:
        response, steps, model_used = service_agent.run(payload.request)
        if "No service availability" in response or "No schedule found" in response:
            response = f"{response} Suggested alternatives: {suggest_alternative_slots('next-available')}"
        logger.info("Booking assistant by %s", auth.get("user_id"))
        return BookingAssistantResponse(response=response, steps=steps, model_used=model_used)
    except Exception as exc:
        logger.exception("Booking assistant failed: %s", sanitize_payload(str(exc)))
        raise HTTPException(status_code=500, detail="Booking assistant failed") from exc


@app.post("/agent-query", response_model=AgentQueryResponse)
def agent_query(
    payload: AgentQueryRequest,
    auth: dict = Depends(require_role("user", "admin", "staff")),
) -> AgentQueryResponse:
    booking_result = booking_assistant(BookingAssistantRequest(request=payload.message), auth)
    return AgentQueryResponse(
        response=booking_result.response,
        steps=booking_result.steps,
        model_used=booking_result.model_used,
    )


@app.post("/document-ingest", response_model=IngestResponse)
async def document_ingest(
    files: List[UploadFile] = File(...),
    auth: dict = Depends(require_role("admin", "staff")),
) -> IngestResponse:
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    allowed_suffixes = {".pdf", ".txt", ".md"}
    max_file_size_bytes = 10 * 1024 * 1024
    temp_paths: List[Path] = []

    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            for file in files:
                suffix = Path(file.filename or "").suffix.lower()
                if suffix not in allowed_suffixes:
                    continue

                file_content = await file.read()
                if not file_content:
                    continue
                if len(file_content) > max_file_size_bytes:
                    raise HTTPException(status_code=413, detail=f"File too large: {file.filename}")

                out_path = Path(tmp_dir) / (file.filename or "upload.txt")
                out_path.write_bytes(file_content)
                temp_paths.append(out_path)

            if not temp_paths:
                raise HTTPException(status_code=400, detail="No supported documents were provided")

            files_indexed, chunks_created, collection = rag_service.ingest(temp_paths)
            logger.info(
                "Document ingest by %s (role: %s): %s files -> %s chunks",
                auth.get("user_id"),
                auth.get("role"),
                files_indexed,
                chunks_created,
            )
            return IngestResponse(
                files_indexed=files_indexed,
                chunks_created=chunks_created,
                collection=collection,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Ingest failed: %s", sanitize_payload(str(exc)))
        raise HTTPException(status_code=500, detail="Document ingestion failed") from exc


@app.get("/claims/inbox", response_model=ClaimInboxResponse)
def claims_inbox(
    auth: dict = Depends(require_role("admin", "staff")),
    db: Session = Depends(get_db),
) -> ClaimInboxResponse:
    rows = list(
        db.execute(select(ClaimRecord).order_by(ClaimRecord.id.desc()).limit(500)).scalars()
    )
    result = [
        ClaimInboxRecord(
            claim_id=r.claim_id,
            customer_name=r.customer_name,
            vin=r.vin,
            policy_status=r.policy_status,
            severity=r.severity,
            estimated_parts=json.loads(r.estimated_parts),
            ai_markings=json.loads(r.ai_markings),
            status=r.status,
            created_at=r.created_at,
        )
        for r in rows
    ]
    logger.info("Claims inbox viewed by %s", auth.get("user_id"))
    return ClaimInboxResponse(rows=result)


@app.post("/claims/{claim_id}/correction", response_model=ClaimCorrectionResponse)
def apply_claim_correction(
    claim_id: str,
    payload: ClaimCorrectionRequest,
    auth: dict = Depends(require_role("admin", "staff")),
    db: Session = Depends(get_db),
) -> ClaimCorrectionResponse:
    claim = db.execute(
        select(ClaimRecord).where(ClaimRecord.claim_id == claim_id)
    ).scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    feedback_dir = Path(__file__).resolve().parents[1] / "data" / "feedback_loop"
    feedback_dir.mkdir(parents=True, exist_ok=True)
    feedback_file = feedback_dir / f"{claim_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.json"

    payload_data = {
        "claim_id": claim_id,
        "admin_user": auth.get("user_id"),
        "original_summary": claim.severity,
        "corrected_damage": payload.corrected_damage,
        "notes": payload.notes or "",
        "created_at": utc_now_iso(),
    }
    feedback_file.write_text(json.dumps(payload_data, ensure_ascii=True, indent=2), encoding="utf-8")

    return ClaimCorrectionResponse(success=True, feedback_file=str(feedback_file))


@app.get("/extraction-preview", response_model=ExtractionResponse)
def extraction_preview(auth: dict = Depends(require_role("admin", "staff"))) -> ExtractionResponse:
    sources = rag_service.get_ingested_sources()
    rows = [
        ExtractionRecord(file_name=s, vin="N/A", model="N/A", warranty_id="N/A")
        for s in sources
    ]
    logger.info("Extraction preview viewed by %s (%d sources)", auth.get("user_id"), len(rows))
    return ExtractionResponse(rows=rows)


@app.get("/token-usage", response_model=TokenUsageDashboardResponse)
def token_usage(auth: dict = Depends(require_role("admin", "staff"))) -> TokenUsageDashboardResponse:
    usage = token_router.current_usage()
    breakdown = token_router.model_breakdown()
    estimated_cost = (usage["prompt_tokens"] * 0.0000020) + (usage["completion_tokens"] * 0.0000060)
    logger.info("Token dashboard viewed by %s", auth.get("user_id"))
    return TokenUsageDashboardResponse(
        prompt_tokens=usage["prompt_tokens"],
        completion_tokens=usage["completion_tokens"],
        total_tokens=usage["total_tokens"],
        estimated_cost_usd=round(estimated_cost, 6),
        model_breakdown=breakdown,
    )


@app.get("/ai-operations-monitor", response_model=AIOperationsMetricsResponse)
def ai_operations_monitor(auth: dict = Depends(require_role("admin", "staff"))) -> AIOperationsMetricsResponse:
    return AIOperationsMetricsResponse(
        avg_latency_ms=avg(REQUEST_LATENCIES_MS),
        avg_cost_per_claim_usd=avg(CLAIM_COST_USD),
        model_usage_split=token_router.model_breakdown(),
    )


@app.post("/extract-metadata", response_model=ExtractionResponse)
async def extract_metadata(
    file: UploadFile = File(...),
    auth: dict = Depends(require_role("admin", "staff")),
) -> ExtractionResponse:
    content = (await file.read()).decode("utf-8", errors="ignore")

    vins = re.findall(r"\b[A-HJ-NPR-Z0-9]{17}\b", content)
    models = re.findall(r"\bModel\s+[A-Za-z0-9-]+\b", content)
    warranties = re.findall(r"\b(?:WR|WAR)-?\d{6,12}\b", content, flags=re.IGNORECASE)

    row = ExtractionRecord(
        file_name=file.filename or "uploaded.txt",
        vin=vins[0] if vins else "N/A",
        model=models[0] if models else "N/A",
        warranty_id=warranties[0].upper() if warranties else "N/A",
    )
    logger.info("Metadata extracted by %s: %s", auth.get("user_id"), sanitize_payload(json.dumps(row.model_dump())))
    return ExtractionResponse(rows=[row])
