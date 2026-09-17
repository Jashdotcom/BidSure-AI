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

class RequirementCreateSchema(BaseModel):
    name: str
    code: Optional[str] = None
    clause_reference: str
    category: str = "Technical"
    type: str = "VALUE_MATCH"
    mandatory: bool = True
    description: str
    threshold_value: Any
    unit: Optional[str] = None
    validation_source: str = "Tender Compliance Scrutiny"
    weight: int = 10
    constraint_type: str = "text"
    constraint: Optional[Dict[str, Any]] = None
    source_document: Optional[str] = "Uploaded_Tender.pdf"
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
    constraint_type: Optional[str] = None
    constraint: Optional[Dict[str, Any]] = None

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
    title: str = Field(..., min_length=2, description="Tender Title")
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

class TenderAnalysisResponseSchema(BaseModel):
    status: str
    tender_id: str
    title: str
    organization: str
    estimated_value: str
    total_pages_parsed: int
    extracted_count: int
    requirements: List[RequirementSchema]
    message: str

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
