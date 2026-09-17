from pydantic import BaseModel, Field
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
    compliance_score: float
    risk_level: str # LOW | MEDIUM | HIGH
    recommendation: str
    summary: SummarySchema
    evidence_list: List[EvidenceItemSchema]

class DetailedRequirementEvaluationSchema(BaseModel):
    requirement_id: str
    requirement_code: str
    requirement_name: str
    clause_reference: str
    category: str
    mandatory: bool
    required_value: str
    submitted_value: str
    status: str # PASS | FAIL | REVIEW | REVIEW_REQUIRED
    document_verification_status: str # VERIFIED | REQUIRES_REVIEW | FAILED | NOT_SUBMITTED | PENDING
    rule_evaluated: str
    explanation: str
    evidence_source: str
    page_number: int
    highlight_text: str
    confidence: float
    weight: float
    source_type: str = "AI_EXTRACTED" # AI_EXTRACTED | OFFICER_EDITED | MANUALLY_ADDED | FINALIZED
    original_data: Optional[Dict[str, Any]] = None

class DocumentVerificationDetailSchema(BaseModel):
    document_name: str
    document_type: str
    file_name: str
    submission_status: str # SUBMITTED | NOT_SUBMITTED
    verification_status: str # VERIFIED | REQUIRES_REVIEW | FAILED | PENDING
    verified_value: Optional[str] = None
    registry_match: Optional[str] = None
    verified_at: Optional[str] = None
    remarks: str

class DocumentRequirementTraceabilitySchema(BaseModel):
    requirement_id: str
    requirement_name: str
    clause_reference: str
    document_name: str
    extracted_value: str
    verification_status: str
    rule_math: str
    result: str

class ComplianceSummaryDetailSchema(BaseModel):
    total_requirements: int
    passed_count: int
    failed_count: int
    review_count: int
    mandatory_failed_count: int
    verified_documents_count: int
    total_documents_count: int
    compliance_score: float
    eligibility_status: str # ELIGIBLE | REQUIRES_REVIEW | DISQUALIFIED
    risk_level: str # LOW | MEDIUM | HIGH
    formula_explanation: str

class BidderComplianceDetailResponseSchema(BaseModel):
    tender: Dict[str, Any]
    bidder: Dict[str, Any]
    summary: ComplianceSummaryDetailSchema
    evaluations: List[DetailedRequirementEvaluationSchema]
    document_verifications: List[DocumentVerificationDetailSchema]
    traceability_chain: List[DocumentRequirementTraceabilitySchema]
    generated_at: str
