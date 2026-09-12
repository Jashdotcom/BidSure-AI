from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class EvidenceItemSchema(BaseModel):
    requirement_id: str
    requirement_code: str
    requirement_name: str
    clause_reference: str
    category: str
    mandatory: bool
    required_value: str
    bidder_value: str
    status: str # PASS | FAIL | REVIEW
    rule_evaluated: str
    evidence_source: str
    page_number: int
    highlight_text: str
    explanation: str
    confidence: float
    weight: int

class SummarySchema(BaseModel):
    pass_count: int
    fail_count: int
    review_count: int
    total_requirements: int

class ComplianceResultSchema(BaseModel):
    bidder_id: str
    bidder_name: str
    tender_id: str
    compliance_score: int
    risk_level: str # LOW | MEDIUM | HIGH
    recommendation: str
    summary: SummarySchema
    evidence_list: List[EvidenceItemSchema]
