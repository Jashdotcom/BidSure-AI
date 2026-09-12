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
    refinery_location: str
    department: str
    category: str
    estimated_value: str
    tender_type: str
    published_date: str
    closing_date: str
    evaluation_stage: str
    status: str
    officer_assigned: str
    officer_email: str
    total_bidders_submitted: int
    total_requirements_count: int
    summary: str
    file_name: Optional[str] = "CPCL_Tender_Safety_Helmets_2026.pdf"
    file_size_kb: Optional[int] = 4280
    total_pages: Optional[int] = 14
    is_analyzed: Optional[bool] = True
    requirements: List[RequirementSchema]

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

class TenderUploadResponseSchema(BaseModel):
    status: str
    filename: str
    file_size_kb: int
    pages_detected: int
    tender_id: str
    message: str
