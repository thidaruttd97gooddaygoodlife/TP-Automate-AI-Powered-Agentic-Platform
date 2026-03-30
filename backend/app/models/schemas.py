from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# Auth & User Schemas
class UserRole(BaseModel):
    role: str = Field(..., description="user | admin | staff")
    user_id: str = Field(..., description="Unique user identifier from frontend auth")


class AuthHeader(BaseModel):
    x_user_id: str = Field(..., alias="x-user-id")
    x_user_role: str = Field(..., alias="x-user-role")


# API Request/Response Schemas
class ManualQueryRequest(BaseModel):
    question: str = Field(..., min_length=2)


class ManualQueryResponse(BaseModel):
    answer: str
    sources: List[str]
    model_used: str
    cache_hit: bool


class AgentQueryRequest(BaseModel):
    message: str = Field(..., min_length=1)


class AgentStep(BaseModel):
    action: str
    detail: str


class AgentQueryResponse(BaseModel):
    response: str
    steps: List[AgentStep]
    model_used: str


class DiagnoseResponse(BaseModel):
    summary: str
    severity: str
    estimated_parts: List[str]
    model_used: str
    cache_hit: bool
    estimated_days: int = 0
    estimated_cost: float = 0.0


class IngestResponse(BaseModel):
    files_indexed: int
    chunks_created: int
    collection: str


class TokenUsageResponse(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    period: Optional[str] = "session"


class ExtractionRecord(BaseModel):
    file_name: str
    vin: str
    model: str
    warranty_id: str


class ExtractionResponse(BaseModel):
    rows: List[ExtractionRecord]


# Health & Service Schemas
class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: Optional[str] = None


class ClaimSummary(BaseModel):
    claim_id: str
    vin: str
    policy_status: Literal["active", "review", "expired"]
    severity: Literal["low", "medium", "high"]
    summary: str
    estimated_parts: List[str]
    ai_markings: List[str]
    model_used: str
    cache_hit: bool
    created_at: str
    estimated_days: int = 0
    estimated_cost: float = 0.0


class ClaimInboxRecord(BaseModel):
    claim_id: str
    customer_name: str
    vin: str
    policy_status: Literal["active", "review", "expired"]
    severity: Literal["low", "medium", "high"]
    estimated_parts: List[str]
    ai_markings: List[str]
    status: Literal["new", "reviewing", "approved"]
    created_at: str


class ClaimInboxResponse(BaseModel):
    rows: List[ClaimInboxRecord]


class ModelUsageBreakdown(BaseModel):
    model: str
    requests: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class TokenUsageDashboardResponse(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    period: Optional[str] = "session"
    model_breakdown: List[ModelUsageBreakdown]


class BookingAssistantRequest(BaseModel):
    request: str = Field(..., min_length=3)


class BookingAssistantResponse(BaseModel):
    response: str
    steps: List[AgentStep]
    model_used: str


class SmartClaimResponse(BaseModel):
    claim: ClaimSummary


class InventoryItem(BaseModel):
    id: int
    part_name: str
    part_number: str
    in_stock: bool


class InventoryResponse(BaseModel):
    rows: List[InventoryItem]


class ServiceQueueItem(BaseModel):
    id: int
    date: str
    time_slot: str
    tech_id: str
    status: Literal["Available", "Booked"]


class ServiceQueueResponse(BaseModel):
    rows: List[ServiceQueueItem]


class ServiceQueueBookRequest(BaseModel):
    slot_id: int


class ServiceQueueBookResponse(BaseModel):
    success: bool
    message: str
    slot: Optional[ServiceQueueItem] = None


class ClaimCorrectionRequest(BaseModel):
    corrected_damage: str = Field(..., min_length=2)
    notes: Optional[str] = None


class ClaimCorrectionResponse(BaseModel):
    success: bool
    feedback_file: str


class AIOperationsMetricsResponse(BaseModel):
    avg_latency_ms: float
    avg_cost_per_claim_usd: float
    model_usage_split: List[ModelUsageBreakdown]


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    role: str = Field(..., description="user | admin | staff")
    password: str = Field(default="", description="Required when role is user")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=8)


class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    full_name: str
    email: str


class MyClaimRecord(BaseModel):
    claim_id: str
    vin: str
    policy_status: Literal["active", "review", "expired"]
    severity: Literal["low", "medium", "high"]
    summary: str
    estimated_parts: List[str]
    ai_markings: List[str]
    status: str
    created_at: str


class MyClaimsResponse(BaseModel):
    claims: List[MyClaimRecord]
