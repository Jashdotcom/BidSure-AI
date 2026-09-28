"""
CPPP Integration Schemas
Pydantic data models for Central Public Procurement Portal (CPPP) data structures,
responses, and request payloads.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CPPPDocumentLink(BaseModel):
    """Represents an official document associated with a CPPP tender."""
    filename: str = Field(..., description="Document filename (e.g., Tendernotice_1.pdf)")
    url: str = Field(..., description="Full URL to download the document from the official portal")
    file_type: Optional[str] = Field("pdf", description="File extension or MIME type")
    size_bytes: Optional[int] = Field(None, description="Size in bytes if available")
    size_kb: Optional[int] = Field(None, description="Size in KB if available")
    description: Optional[str] = Field(None, description="Document label (e.g. NIT Document, BOQ, Technical Specs)")


class CPPPCorrigendum(BaseModel):
    """Represents a tender corrigendum / addendum from CPPP."""
    corrigendum_id: Optional[str] = Field(None, description="Corrigendum reference or title")
    title: Optional[str] = Field(None, description="Corrigendum subject or type")
    published_date: Optional[str] = Field(None, description="Publication date of the corrigendum")
    details: Optional[str] = Field(None, description="Description of the corrigendum")
    document_url: Optional[str] = Field(None, description="Document URL if available")


class CPPPTenderSummary(BaseModel):
    """Summary of a public tender returned from CPPP listings or search."""
    source_tender_id: str = Field(..., description="Official CPPP / eProcure Tender ID")
    title: str = Field(..., description="Tender Title or Work Description")
    organization: str = Field(..., description="Issuing Organisation / Central PSU / Ministry")
    department: Optional[str] = Field(None, description="Department / Division / Office")
    tender_ref_number: Optional[str] = Field(None, description="Tender Reference Number")
    tender_category: Optional[str] = Field("Goods", description="Tender category: Goods, Works, Services")
    tender_type: Optional[str] = Field("Open Tender", description="Tender type (Open, Limited, etc.)")
    closing_date: Optional[str] = Field(None, description="Bid submission end date/time")
    detail_url: str = Field(..., description="Official URL to view full tender details")
    source_portal: str = Field("Central Public Procurement Portal (eprocure.gov.in)", description="Source portal name")


class CPPPTenderDetail(BaseModel):
    """Comprehensive parsed CPPP tender detail model with full provenance."""
    tender_id: str = Field(..., description="Official CPPP Tender ID (Primary Key)")
    title: str = Field(..., description="Official Title / Name of Work")
    organization: str = Field(..., description="Organisation Chain or Authority")
    department: Optional[str] = Field(None, description="Department / Division / Unit")
    tender_reference_number: Optional[str] = Field(None, description="Tender Reference Number")
    tender_category: Optional[str] = Field(None, description="Category: Goods / Works / Services")
    product_category: Optional[str] = Field(None, description="Product Sub-category (e.g., Computer Software, Civil Works)")
    tender_type: Optional[str] = Field(None, description="Tender Type: Open Tender, Limited, Single Tender")
    contract_type: Optional[str] = Field(None, description="Contract Type: Tender, Item Rate, Percentage")
    location: Optional[str] = Field(None, description="Work location / Pincode")
    publication_date: Optional[str] = Field(None, description="Date & Time tender was published")
    document_download_start_date: Optional[str] = Field(None, description="Document download start date")
    document_download_end_date: Optional[str] = Field(None, description="Document download end date")
    bid_submission_start_date: Optional[str] = Field(None, description="Bid submission start date")
    closing_date: Optional[str] = Field(None, description="Bid submission end / closing date")
    bid_opening_date: Optional[str] = Field(None, description="Technical bid opening date")
    estimated_value: Optional[float] = Field(None, description="Tender estimated value in INR")
    emd_amount: Optional[float] = Field(None, description="Earnest Money Deposit in INR (None if not specified)")
    tender_fee: Optional[float] = Field(None, description="Tender Fee in INR (None if free/not specified)")
    official_detail_url: str = Field(..., description="Direct official portal URL for this tender")
    document_links: List[CPPPDocumentLink] = Field(default_factory=list, description="Official downloadable documents")
    corrigenda: List[CPPPCorrigendum] = Field(default_factory=list, description="List of published corrigenda")
    source_portal: str = Field("Central Public Procurement Portal (eprocure.gov.in)", description="Source portal identifier")
    source_last_checked: str = Field(..., description="ISO timestamp when source data was fetched")
    import_timestamp: str = Field(..., description="ISO timestamp when record was parsed/imported")
    raw_fields: Dict[str, Any] = Field(default_factory=dict, description="Raw key-value pairs extracted from source table")


class CPPPImportRequest(BaseModel):
    """Payload for importing a tender from CPPP by URL or Tender ID."""
    url_or_id: str = Field(..., description="CPPP Tender URL or Tender ID (e.g. 2026_IITG_925833_1)")
    download_documents: bool = Field(True, description="Whether to automatically download available official tender PDFs")


class CPPPSearchRequest(BaseModel):
    """Payload for searching active public tenders on CPPP."""
    query: Optional[str] = Field(None, description="Search term (Tender ID, title, or organisation)")
    page: int = Field(1, ge=1, description="Page number for pagination")


class CPPPSyncResult(BaseModel):
    """Result of a sync/refresh operation for a CPPP tender."""
    tender_id: str
    updated: bool
    changes: List[str] = []
    last_synced_at: str
    message: str
    document_status: Optional[str] = None
