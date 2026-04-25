from pydantic import BaseModel
from typing import List, Dict, Literal, Optional
from datetime import datetime

# PDF Processing Models
class PDFUploadMetadata(BaseModel):
    policy_name: str
    upload_source: str = "frontend"

class ExtractionSummary(BaseModel):
    pages_processed: int
    entities_extracted: int
    nodes_created: int
    relationships_created: int
    embeddings_generated: int

class GraphPreview(BaseModel):
    coverage_types: List[str]
    key_entities: List[str]
    provider_networks: List[str]

class PDFProcessResponse(BaseModel):
    policy_id: str
    status: Literal["completed", "processing", "failed"]
    extraction_summary: ExtractionSummary
    graph_preview: GraphPreview
    processing_time_ms: int

# Chrome Extension Models
class BasicInfo(BaseModel):
    url: str
    title: str
    domain: str
    timestamp: str

class ChecklistItem(BaseModel):
    item: str
    status: str  # ✅ covered, ⚠️ partial, ❌ denied, 📋 required, ℹ️ info
    details: str

class FeasibilityScore(BaseModel):
    score: int  # 0-100
    color: Literal["Green", "Yellow", "Red"]
    message: str

class CostBreakdown(BaseModel):
    session_cost: str
    your_cost: str
    insurance_pays: str
    savings_per_visit: str
    potential_annual_savings: str

class ServiceDetails(BaseModel):
    service_name: str
    coverage_type: str
    copay: str
    renewal_date: str

class AnalyzeRequest(BaseModel):
    basic_info: BasicInfo
    page_content: str

class AnalyzeResponse(BaseModel):
    summary: str
    match_checklist: List[ChecklistItem]
    feasibility: FeasibilityScore
    money_saved: CostBreakdown
    benefits_services: ServiceDetails
    recommendations: List[str]

# Health Check Model
class HealthResponse(BaseModel):
    status: str
    message: str
    timestamp: datetime