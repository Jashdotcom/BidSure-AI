from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict, Union

class ConstraintSchema(BaseModel):
    field: str
    operator: str  # equals, >=, <=, in, contains, boolean_not, etc.
    value: Any
    type: Optional[str] = "text"  # boolean, numeric, enum, text, date

class RequirementSchema(BaseModel):
    id: str
    code: str
    name: str
    clause_reference: str
    category: str
    type: str
    mandatory: bool
    description: str
    threshold_value: Any
    unit: Optional[str] = None
    validation_source: str
    weight: int = 10
    constraint_type: Optional[str] = "text"  # boolean, numeric, enum, text, date
    constraint: Optional[Dict[str, Any]] = None
    source_document: Optional[str] = "CPCL_Tender_Safety_Helmets_2026.pdf"
    source_page: Optional[int] = 1
    confidence: Optional[float] = 0.95
    review_status: Optional[str] = "VERIFIED"
    evidence_text: Optional[str] = None
    original_data: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None

class AnalysisRequirementSchema(BaseModel):
    id: str
    code: str
    name: str
    clause_reference: str
    category: str
    type: Optional[str] = "GENERAL"
    mandatory: bool = True
    description: str
    threshold_value: Any
    unit: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    review_status: str = Field("NEEDS_REVIEW", description="NEEDS_REVIEW, VERIFIED, EDITED, ADDED_MANUALLY, REJECTED")
    source_document: str = "Tender_Document.pdf"
    source_page: int = 1
    evidence_text: str = ""
    validation_source: Optional[str] = "Tender Document Analysis"
    weight: int = 10
    original_data: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None

class RequirementCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, description="Requirement name / title")
    code: Optional[str] = None
    clause_reference: str = Field(..., min_length=2, description="Clause reference number (e.g. Clause 4.1.2)")
    category: str = Field("TECHNICAL", description="FINANCIAL, TECHNICAL, OEM_AUTHORIZATION, LOCAL_CONTENT, STATUTORY, VIGILANCE, COMMERCIAL")
    type: Optional[str] = "GENERAL"
    mandatory: bool = True
    description: str = Field(..., min_length=5, description="Detailed clause specification")
    threshold_value: Any = Field(..., description="Target threshold or required qualification value")
    unit: Optional[str] = None
    validation_source: Optional[str] = "Manual Tender Clause Addition"
    weight: Optional[int] = 10
    source_document: Optional[str] = "Manual_Addition.pdf"
    source_page: Optional[int] = 1
    confidence: Optional[float] = 1.0

class RequirementUpdateSchema(BaseModel):
    name: Optional[str] = None
    clause_reference: Optional[str] = None
    category: Optional[str] = None
    mandatory: Optional[bool] = None
    description: Optional[str] = None
    threshold_value: Optional[Any] = None
    unit: Optional[str] = None
    weight: Optional[int] = None
    edit_reason: Optional[str] = Field(None, description="Officer's justification for modifying the AI extracted clause")

class RequirementVerifySchema(BaseModel):
    officer_notes: Optional[str] = None

class RequirementRejectSchema(BaseModel):
    reason: str = Field(..., min_length=3, description="Mandatory official justification for excluding/rejecting this clause")

class FinalizeRequirementsSchema(BaseModel):
    tender_id: Optional[str] = Field(None, description="Target tender ID to attach finalized requirements to (e.g. TND-2026-001)")
    override_existing: Optional[bool] = Field(True, description="Whether to replace current requirements on the tender")
    notes: Optional[str] = Field(None, description="Procurement officer's finalization summary notes")

class TenderAnalysisRequestSchema(BaseModel):
    filename: Optional[str] = Field("CPCL_Tender_Safety_Helmets_2026.pdf", description="Preloaded or uploaded PDF document name")
    tender_id: Optional[str] = Field(None, description="Optional target tender ID to associate with analysis")
    raw_text: Optional[str] = Field(None, description="Optional raw document text override")

class DocumentSectionSchema(BaseModel):
    title: str
    page_start: int
    page_end: int
    type: str

class TenderAnalysisResponseSchema(BaseModel):
    status: str
    job_id: str
    tender_id: Optional[str] = None
    title: str
    organization: str
    filename: str
    file_size_kb: int
    total_pages_parsed: int
    ocr_confidence: float
    detected_sections: List[DocumentSectionSchema] = []
    extracted_count: int
    requirements: List[AnalysisRequirementSchema]
    message: str

class TenderDetailSchema(BaseModel):
    id: str
    tender_id: str
    title: str
    organization: str
    refinery_location: Optional[str] = "Manali Refinery, Chennai"
    department: str
    category: str
    estimated_value: Union[str, float, int]
    tender_type: Optional[str] = "Open Competitive Bidding"
    published_date: Optional[str] = None
    closing_date: Optional[str] = None
    evaluation_stage: Optional[str] = "Technical & Commercial"
    status: str
    officer_assigned: Optional[str] = "Rajesh Kumar"
    officer_email: Optional[str] = "officer@cpcl.gov.in"
    total_bidders_submitted: Optional[int] = 0
    total_requirements_count: Optional[int] = 0
    summary: Optional[str] = ""
    file_name: Optional[str] = "CPCL_Tender_Document.pdf"
    file_size_kb: Optional[int] = 4280
    total_pages: Optional[int] = 14
    is_analyzed: Optional[bool] = True
    requirements: Optional[List[RequirementSchema]] = []

class TenderCreateSchema(BaseModel):
    id: Optional[str] = None
    tender_id: Optional[str] = None
    tender_number: Optional[str] = None
    ref: Optional[str] = None
    title: Optional[str] = Field("Untitled Procurement Tender Draft", description="Tender Title")
    organization: Optional[str] = "Chennai Petroleum Corporation Limited (CPCL)"
    department: Optional[str] = "Materials & Procurement Division"
    category: Optional[str] = "Goods"
    description: Optional[str] = ""
    status: Optional[str] = "DRAFT"  # DRAFT, ANALYZING, REQUIREMENTS_REVIEW, PUBLISHED, CLOSED

    # Section B: Timeline
    issue_date: Optional[str] = None
    publish_date: Optional[str] = None
    submission_deadline: Optional[str] = None
    closing_date: Optional[str] = None
    deadline: Optional[str] = None
    bid_opening_date: Optional[str] = None

    # Section C: Procurement & Evaluation
    estimated_value: Optional[Union[float, int, str]] = None
    emd_amount: Optional[Union[float, int, str]] = None
    evaluation_method: Optional[str] = "L1 / Lowest Price"
    performance_security: Optional[Union[float, int, str]] = None

    # Section D: Tender Document
    file_name: Optional[str] = None
    file_size_kb: Optional[int] = None
    document_url: Optional[str] = None

    # Requirements / Metadata
    requirements: Optional[List[Dict[str, Any]]] = None

class TenderPatchSchema(BaseModel):
    title: Optional[str] = None
    organization: Optional[str] = None
    department: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[str] = None
    closing_date: Optional[str] = None
    issue_date: Optional[str] = None
    bid_opening_date: Optional[str] = None
    estimated_value: Optional[Union[float, int, str]] = None
    emd_amount: Optional[Union[float, int, str]] = None
    evaluation_method: Optional[str] = None
    performance_security: Optional[Union[float, int, str]] = None
    file_name: Optional[str] = None
    file_size_kb: Optional[int] = None
    requirements: Optional[List[Dict[str, Any]]] = None

class TenderDeadlineExtensionSchema(BaseModel):
    new_deadline: str = Field(..., description="New submission deadline (ISO timestamp or YYYY-MM-DD format)")
    reason: str = Field(..., min_length=3, description="Official justification or amendment rationale for deadline extension")

class TenderCloseSchema(BaseModel):
    reason: Optional[str] = Field("Bidding window concluded and sealed by Procurement Officer.", description="Reason for closing tender")

class TenderUploadResponseSchema(BaseModel):
    status: str
    filename: str
    file_size_kb: int
    pages_detected: int
    tender_id: str
    message: str
