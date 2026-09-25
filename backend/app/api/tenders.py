"""
Tender Management API Router
Provides endpoints for listing, viewing, creating, updating, and publishing procurement tenders.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, UploadFile, File, Form
from typing import List, Dict, Any, Optional
import os
import time
import hashlib
from datetime import datetime
from app.api.auth import get_current_user, require_roles
from app.schemas.tender import (
    TenderCreateSchema, TenderPatchSchema, TenderDeadlineExtensionSchema, TenderCloseSchema,
    TenderAnalysisRequestSchema, RequirementVerifySchema, RequirementUpdateSchema,
    RequirementCreateSchema, RequirementRejectSchema, FinalizeRequirementsSchema,
)
from app.data.sample_data import (
    get_all_tenders,
    get_tender_by_id,
    get_bidders_for_tender,
    add_tender,
    update_tender,
    delete_tender,
    check_tender_id_exists,
    add_audit_log,
    get_next_tender_number,
    extend_tender_deadline,
    close_tender,
    SAMPLE_TENDERS,
    create_analysis_job,
    get_analysis_job,
    verify_analysis_requirement,
    update_analysis_requirement,
    reject_analysis_requirement,
    add_analysis_requirement,
    finalize_tender_requirements,
)
from app.services.ocr_service import OCRService
from app.services.ai_service import AIService
from app.services.ai_providers.base import (
    AIProviderUnavailableError,
    AIModelUnavailableError,
    AIExtractionError,
)
from app.services.tender_sources import CPPPTenderAdapter, ManualTenderAdapter
from app.data.document_store import (
    save_document,
    get_document_bytes,
    get_document_bytes_by_tender,
    get_document_meta,
    list_documents_for_tender,
    associate_document_with_tender,
)
from pydantic import BaseModel, Field

router = APIRouter(prefix="/tenders", tags=["Tenders"])

class TenderImportUrlSchema(BaseModel):
    url: str = Field(..., description="Official CPPP or eProcurement tender public URL")
    title: Optional[str] = None
    estimated_value: Optional[float] = None
    category: Optional[str] = None

@router.post("/import-cppp", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def import_cppp_tender(
    payload: TenderImportUrlSchema,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Ingests a public tender from CPPP / eProcurement portal via URL.
    Enforces SSRF prevention, domain allowlisting (eprocure.gov.in, cppp.gov.in, cpcl.co.in),
    SHA-256 cryptographic document hashing, and duplicate detection.
    RESTRICTED: Officer role only.
    """
    adapter = CPPPTenderAdapter()
    try:
        tender_record = await adapter.fetch_tender(payload.url, metadata=payload.model_dump())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Check for duplicate by SHA-256 hash across existing tenders
    existing_tenders = get_all_tenders()
    doc_hash = tender_record.get("document_hash_sha256")
    for t in existing_tenders:
        if t.get("document_hash_sha256") and t.get("document_hash_sha256") == doc_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate Tender Detected: A tender document with SHA-256 hash '{doc_hash[:16]}...' "
                       f"already exists in the procurement registry ({t.get('tender_number') or t.get('id')})."
            )

    created = add_tender(tender_record)

    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": "TENDER_IMPORTED",
        "entity_type": "TENDER",
        "entity_id": created.get("tender_number") or created.get("id"),
        "details": (
            f"Tender '{created['title']}' ({created.get('tender_number')}) successfully imported "
            f"from CPPP URL '{payload.url}' with SHA-256 hash {doc_hash[:16]}... (Zero automatic AI execution)."
        ),
        "status": "SUCCESS"
    })

    return {
        "message": f"Tender {created.get('tender_number')} imported successfully from CPPP.",
        "tender": created
    }


@router.post("/import-manual", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def import_manual_tender(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    estimated_value: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Ingests a tender via manual PDF document upload with cryptographic SHA-256 hashing
    and duplicate detection.
    RESTRICTED: Officer role only.
    """
    raw_filename = file.filename or "uploaded_tender.pdf"
    if not raw_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF (.pdf) documents are supported for manual tender import."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty (0 bytes)."
        )

    adapter = ManualTenderAdapter()
    metadata = {
        "filename": raw_filename,
        "file_bytes": file_bytes,
        "title": title,
        "estimated_value": estimated_value,
        "category": category
    }

    try:
        tender_record = await adapter.fetch_tender(raw_filename, metadata=metadata)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    doc_hash = tender_record.get("document_hash_sha256")

    # Duplicate check
    existing_tenders = get_all_tenders()
    for t in existing_tenders:
        if t.get("document_hash_sha256") and t.get("document_hash_sha256") == doc_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate Tender Detected: Document SHA-256 hash '{doc_hash[:16]}...' "
                       f"already exists in tender registry ({t.get('tender_number') or t.get('id')})."
            )

    created = add_tender(tender_record)

    # Persist document to durable store and associate with tender
    target_tender_id = created.get("tender_number") or created.get("id")
    try:
        doc_record = save_document(
            file_bytes=file_bytes,
            filename=raw_filename,
            tender_id=target_tender_id,
            uploaded_by=current_user.get("email", "officer@cpcl.gov.in"),
            source="MANUAL_IMPORT",
            metadata={
                "title": created.get("title"),
                "organization": created.get("organization"),
                "estimated_value": created.get("estimated_value"),
            }
        )
        created["documents"] = [doc_record]
        created["file_name"] = doc_record["filename"]
    except Exception:
        pass

    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": "TENDER_IMPORTED",
        "entity_type": "TENDER",
        "entity_id": created.get("tender_number") or created.get("id"),
        "details": (
            f"Manual tender '{created['title']}' ({created.get('tender_number')}) imported via PDF upload "
            f"('{raw_filename}', SHA-256: {doc_hash[:16]}...). Zero automatic AI execution."
        ),
        "status": "SUCCESS"
    })

    return {
        "message": f"Tender {created.get('tender_number')} imported successfully via document upload.",
        "tender": created
    }

@router.get("/next-number", response_model=Dict[str, Any])
async def get_next_tender_number_preview(
    year: Optional[int] = Query(None, description="Procurement year (defaults to current year)"),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns a PREVIEW of the next available Tender ID without reserving it.
    The actual ID is assigned and locked only when the tender is saved/created.
    Safe to call when opening the Create Tender page.
    """
    preview_year = year if year else datetime.utcnow().year
    preview = get_next_tender_number(preview_year)
    return preview

@router.get("", response_model=List[Dict[str, Any]])
async def list_tenders(
    query: Optional[str] = Query(None, description="Search keyword across title, ID, organization, category, description"),
    status: Optional[str] = Query(None, description="Status filter (OPEN, PUBLISHED, EVALUATING, CLOSED, etc.)"),
    category: Optional[str] = Query(None, description="Category filter"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Returns list of active, evaluating, and published tenders with search & filter support."""
    return get_all_tenders(query=query, status=status, category=category)

@router.get("/check-id/{check_tender_id}", response_model=Dict[str, Any])
async def check_tender_id_uniqueness(
    check_tender_id: str,
    exclude_id: Optional[str] = Query(None, description="Exclude existing tender when editing"),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Checks if a Tender ID is available or already in use.
    """
    exists = check_tender_id_exists(check_tender_id, exclude_id=exclude_id)
    return {
        "tender_id": check_tender_id,
        "is_available": not exists,
        "exists": exists
    }

@router.get("/{tender_id}", response_model=Dict[str, Any])
async def get_tender_details(tender_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns specific tender details and requirements."""
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found."
        )
    return tender


@router.get("/{tender_id}/bids", response_model=List[Dict[str, Any]])
async def get_tender_bids(
    tender_id: str,
    eligible_only: bool = Query(True, description="Filter to eligible submitted bids only (exclude drafts)"),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns submitted bidder submissions specifically for the given tender.
    Excludes drafts by default.
    RESTRICTED: Officer role only.
    """
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found."
        )
    return get_bidders_for_tender(tender_id, eligible_only=eligible_only)

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_tender(
    payload: TenderCreateSchema,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Creates a new tender as either DRAFT or PUBLISHED.
    RESTRICTED: Officer role only.

    Tender ID is AUTO-GENERATED by the backend using a year-aware sequential counter.
    Format: CPCL/PROC/{YEAR}/{NUMBER:03d} e.g. CPCL/PROC/2026/012

    Validation rules:
    - If status == 'PUBLISHED':
      - Title, Organization, Category, Description, Deadline, Evaluation Method, and PDF document are mandatory.
    - If status == 'DRAFT':
      - Partial fields allowed for drafting.
    - Tender ID is always assigned by the backend; any value sent by the client is ignored.
    """
    tender_dict = payload.model_dump(exclude_none=False)

    target_status = (tender_dict.get("status") or "DRAFT").strip().upper()

    # 1. Strict validation for PUBLISHED status
    if target_status == "PUBLISHED":
        errors = []
        if not tender_dict.get("title") or len(tender_dict["title"].strip()) < 3:
            errors.append("Tender Title is required (minimum 3 characters).")
        if not tender_dict.get("organization"):
            errors.append("Organization / Procuring Entity is required.")
        if not tender_dict.get("category"):
            errors.append("Tender Category is required.")
        if not tender_dict.get("description") or len(tender_dict["description"].strip()) < 5:
            errors.append("Tender Description is required.")
        if not tender_dict.get("deadline") and not tender_dict.get("closing_date") and not tender_dict.get("submission_deadline"):
            errors.append("Submission Deadline is required.")
        if not tender_dict.get("evaluation_method"):
            errors.append("Evaluation Method is required.")
        if not tender_dict.get("file_name"):
            errors.append("Tender Document (RFP PDF) is mandatory for publishing a tender.")

        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Validation failed for publishing tender.", "errors": errors}
            )

    # 2. Determine procurement year from issue_date
    issue_date = tender_dict.get("issue_date") or tender_dict.get("publish_date") or datetime.utcnow().strftime("%Y-%m-%d")
    try:
        proc_year = int(str(issue_date)[:4])
    except (ValueError, TypeError):
        proc_year = datetime.utcnow().year

    # 3. Format & sanitize stored tender model (ID will be assigned by add_tender)
    submission_deadline = (
        tender_dict.get("submission_deadline")
        or tender_dict.get("closing_date")
        or tender_dict.get("deadline")
        or "2026-10-30"
    )

    # Compute clean deadline display
    deadline_display = submission_deadline
    if "T" in submission_deadline:
        deadline_display = submission_deadline.split("T")[0]

    # Clean estimated value numeric & display
    raw_est = tender_dict.get("estimated_value")
    est_num = 0.0
    if raw_est is not None:
        try:
            if isinstance(raw_est, (int, float)):
                est_num = float(raw_est)
            else:
                est_cleaned = str(raw_est).replace("₹", "").replace(",", "").replace("Cr", "").replace("L", "").strip()
                est_num = float(est_cleaned)
        except Exception:
            est_num = 0.0

    raw_emd = tender_dict.get("emd_amount")
    emd_num = 0.0
    if raw_emd is not None:
        try:
            if isinstance(raw_emd, (int, float)):
                emd_num = float(raw_emd)
            else:
                emd_cleaned = str(raw_emd).replace("₹", "").replace(",", "").replace("L", "").replace("Cr", "").strip()
                emd_num = float(emd_cleaned)
        except Exception:
            emd_num = 0.0

    # Note: id/tender_number/ref/tender_id are intentionally left blank here;
    # add_tender() auto-generates them atomically using generate_and_reserve_tender_number().
    tender_record: Dict[str, Any] = {
        "title": tender_dict.get("title", "").strip(),
        "organization": tender_dict.get("organization") or "Chennai Petroleum Corporation Limited (CPCL)",
        "department": tender_dict.get("department") or "Materials & Procurement Division",
        "category": tender_dict.get("category") or "Goods",
        "status": target_status,
        "description": tender_dict.get("description", "").strip(),
        "issue_date": issue_date,
        "publish_date": f"{issue_date}T09:00:00Z" if "T" not in issue_date else issue_date,
        "submission_deadline": submission_deadline,
        "closing_date": f"{submission_deadline}T17:30:00Z" if "T" not in submission_deadline else submission_deadline,
        "deadline": deadline_display,
        "bid_opening_date": tender_dict.get("bid_opening_date"),
        "estimated_value": est_num,
        "emd_amount": emd_num,
        "evaluation_method": tender_dict.get("evaluation_method") or "L1 / Lowest Price",
        "performance_security": tender_dict.get("performance_security"),
        "file_size_kb": tender_dict.get("file_size_kb") or 3420,
        "bids_count": 0,
        "verified_count": 0,
        "requirements": tender_dict.get("requirements") or [
            {
                "id": "REQ-GEN-01",
                "code": "TURNOVER",
                "clause_reference": "Section II, Clause 3.1",
                "category": "FINANCIAL",
                "title": "Annual Financial Turnover Requirement",
                "description": "Bidder must meet minimum annual average turnover benchmark.",
                "threshold_value": ">= ₹3.00 Cr",
                "mandatory": True,
                "weight": 20
            },
            {
                "id": "REQ-GEN-02",
                "code": "EXPERIENCE",
                "clause_reference": "Section III, Clause 4.2",
                "category": "TECHNICAL",
                "title": "Past Relevant PSU / Sector Experience",
                "description": "Past work orders in similar scope over the last 3-5 years.",
                "threshold_value": ">= 3 Years",
                "mandatory": True,
                "weight": 20
            },
            {
                "id": "REQ-GEN-03",
                "code": "OEM",
                "clause_reference": "Section III, Clause 4.5",
                "category": "OEM_AUTHORIZATION",
                "title": "Manufacturer Authorization Form (MAF)",
                "description": "Direct OEM authorization for tender scope.",
                "threshold_value": "Direct OEM Authorization",
                "mandatory": True,
                "weight": 20
            },
            {
                "id": "REQ-GEN-04",
                "code": "MII",
                "clause_reference": "Section I, Clause 1.4",
                "category": "LOCAL_CONTENT",
                "title": "Make in India (MII) Local Content",
                "description": "Public Procurement Order domestic value addition self-declaration.",
                "threshold_value": ">= 50% (Class-I)",
                "mandatory": True,
                "weight": 20
            }
        ]
    }

    # Set file_name after we'll know the generated tender_number via add_tender
    raw_file_name = tender_dict.get("file_name")
    if raw_file_name:
        tender_record["file_name"] = raw_file_name

    try:
        created = add_tender(tender_record)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

    # Patch file_name now that we have the generated tender_number
    if not created.get("file_name") and target_status == "PUBLISHED":
        created["file_name"] = f"{created['tender_number'].replace('/', '_')}_RFP.pdf"

    # 4. Audit Trail Recording
    generated_tender_id = created.get("tender_number") or created.get("id", "")
    action_type = "TENDER_PUBLISHED" if target_status == "PUBLISHED" else "TENDER_DRAFT_SAVED"
    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": action_type,
        "entity_type": "TENDER",
        "entity_id": generated_tender_id,
        "details": (
            f"Tender '{created['title']}' ({generated_tender_id}) published live to procurement portal."
            if target_status == "PUBLISHED"
            else f"Draft tender '{created['title']}' ({generated_tender_id}) saved by officer."
        ),
        "status": "SUCCESS"
    })

    return {
        "message": "Tender published successfully." if target_status == "PUBLISHED" else "Tender saved as draft.",
        "tender": created
    }

@router.patch("/{tender_id}", response_model=Dict[str, Any])
async def patch_tender(
    tender_id: str,
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Updates, modifies, analyzes, or publishes an existing tender.
    RESTRICTED: Officer role only.

    Lifecycle-aware edit protection:
    - DRAFT / ANALYZING / REQUIREMENTS_REVIEW: all non-ID fields are editable.
    - PUBLISHED: only lifecycle status transitions (CLOSED) are permitted; content changes are blocked.
    - CLOSED / AWARDED: read-only; no edits allowed.
    """
    # Fetch tender first to enforce lifecycle rules
    existing = get_tender_by_id(tender_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found."
        )

    current_status = (existing.get("status") or "DRAFT").strip().upper()

    # Fields that are always immutable (never change after creation)
    IMMUTABLE_FIELDS = {"tender_number", "ref", "tender_id", "id"}

    # Block immutable field changes regardless of status
    immutable_attempted = [f for f in IMMUTABLE_FIELDS if f in payload and payload[f] != existing.get(f)]
    if immutable_attempted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The following fields are immutable and cannot be changed: {', '.join(immutable_attempted)}. "
                   f"Tender ID remains {existing.get('tender_number') or existing.get('id')}."
        )

    # CLOSED / AWARDED: fully locked
    if current_status in ("CLOSED", "AWARDED"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tender with status '{current_status}' is sealed and cannot be edited. "
                   f"No further modifications are permitted."
        )

    # PUBLISHED: only lifecycle status transitions allowed (e.g. CLOSED); content edits blocked
    if current_status == "PUBLISHED":
        new_status_in_payload = (payload.get("status") or "").strip().upper()
        allowed_published_transitions = {"CLOSED"}
        content_fields = set(payload.keys()) - {"status"}
        if content_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "This tender is already published. Critical tender details cannot be edited directly.",
                    "advice": "Create a tender amendment or contact the CPO for published tender modifications.",
                    "allowed_action": "Only status transitions (e.g. CLOSED) are permitted for published tenders."
                }
            )
        if new_status_in_payload and new_status_in_payload not in allowed_published_transitions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Published tender can only transition to CLOSED, not '{new_status_in_payload}'."
            )

    # Validations when publishing a draft via PATCH
    target_status = (payload.get("status") or "").strip().upper()
    if target_status == "PUBLISHED":
        merged = {**existing, **payload}
        errors = []
        if not merged.get("title") or len(str(merged["title"]).strip()) < 3:
            errors.append("Tender Title is required (minimum 3 characters).")
        if not merged.get("organization"):
            errors.append("Organization / Procuring Entity is required.")
        if not merged.get("category"):
            errors.append("Tender Category is required.")
        if not merged.get("description") or len(str(merged["description"]).strip()) < 5:
            errors.append("Tender Description is required.")
        if not merged.get("deadline") and not merged.get("closing_date") and not merged.get("submission_deadline"):
            errors.append("Submission Deadline is required.")
        if not merged.get("evaluation_method"):
            errors.append("Evaluation Method is required.")
        if not merged.get("file_name"):
            errors.append("Tender Document (RFP PDF) is mandatory for publishing a tender.")

        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Validation failed for publishing tender.", "errors": errors}
            )

    try:
        updated = update_tender(tender_id, payload)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found."
        )

    # Audit logging for status change or general update
    new_status = payload.get("status")
    changed_fields = [k for k in payload if k not in IMMUTABLE_FIELDS]
    if new_status == "PUBLISHED":
        action = "TENDER_PUBLISHED"
        details = f"Tender {updated.get('tender_number') or tender_id} published live to procurement registry."
    elif new_status == "CLOSED":
        action = "TENDER_CLOSED"
        details = f"Tender {updated.get('tender_number') or tender_id} closed; bidding archive sealed."
    elif new_status == "ANALYZING":
        action = "TENDER_ANALYSIS_STARTED"
        details = f"AI clause analysis initiated for tender {updated.get('tender_number') or tender_id}."
    else:
        action = "TENDER_UPDATED"
        details = (
            f"Tender {updated.get('tender_number') or tender_id} updated by officer "
            f"({current_user.get('name', current_user.get('email', ''))}). "
            f"Fields modified: {', '.join(changed_fields) or 'status'}."
        )

    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": action,
        "entity_type": "TENDER",
        "entity_id": updated.get("tender_number") or tender_id,
        "details": details,
        "status": "SUCCESS"
    })

    return {
        "message": f"Tender {updated.get('tender_number') or tender_id} updated successfully.",
        "tender": updated
    }


@router.delete("/{tender_id}", response_model=Dict[str, Any])
async def delete_tender_endpoint(
    tender_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Lifecycle-aware tender deletion.
    RESTRICTED: Officer role only.

    Rules:
    - DRAFT with no associated bids: hard delete (permanent removal).
    - PUBLISHED / REQUIREMENTS_REVIEW / ANALYZING / CLOSED / AWARDED: deletion blocked.
    - If the tender has submitted bids: deletion blocked to protect procurement records.
    - Bidders are never authorised to call this endpoint (enforced by RBAC).
    - Audit event TENDER_DELETED is recorded even on successful deletion.
    """
    # Fetch first for audit context
    existing = get_tender_by_id(tender_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id}' not found."
        )

    try:
        deleted = delete_tender(tender_id)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(val_err)
        )
    except KeyError as key_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(key_err)
        )

    # Audit log (intentionally kept even after deletion — never removed alongside the tender)
    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": "TENDER_DELETED",
        "entity_type": "TENDER",
        "entity_id": deleted.get("tender_number") or tender_id,
        "details": (
            f"Draft tender '{deleted.get('tender_number') or tender_id}' "
            f"('{deleted.get('title', 'Untitled')}') permanently deleted by officer "
            f"({current_user.get('name', current_user.get('email', ''))}) "
            f"from status '{deleted.get('status', 'DRAFT')}'."
        ),
        "status": "SUCCESS"
    })

    return {
        "message": f"Draft tender '{deleted.get('tender_number') or tender_id}' deleted successfully.",
        "deleted_tender_id": deleted.get("tender_number") or tender_id,
        "deleted_tender_title": deleted.get("title", ""),
        "previous_status": deleted.get("status", "DRAFT")
    }


@router.post("/{tender_id}/extend-deadline", response_model=Dict[str, Any])
async def extend_tender_deadline_endpoint(
    tender_id: str,
    payload: TenderDeadlineExtensionSchema,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Extends/updates the submission deadline for an active published tender.
    Validates future timestamp, creates a formal corrigendum / amendment record,
    and updates the closing date across the officer and bidder portals.
    RESTRICTED: Officer role only.
    """
    try:
        updated = extend_tender_deadline(
            tender_id=tender_id,
            new_deadline=payload.new_deadline,
            reason=payload.reason,
            officer_user=current_user
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except KeyError as key_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(key_err)
        )

    return {
        "message": f"Submission deadline extended successfully to {updated.get('deadline')}.",
        "tender": updated
    }


@router.post("/{tender_id}/close", response_model=Dict[str, Any])
async def close_tender_endpoint(
    tender_id: str,
    payload: Optional[TenderCloseSchema] = None,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Closes an active tender and seals its bidding archive.
    Transitions tender status to CLOSED and prevents further vendor submissions.
    RESTRICTED: Officer role only.
    """
    close_reason = payload.reason if payload else "Bidding window concluded and sealed by Procurement Officer."
    try:
        updated = close_tender(
            tender_id=tender_id,
            reason=close_reason,
            officer_user=current_user
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except KeyError as key_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(key_err)
        )

    return {
        "message": f"Tender {updated.get('tender_number') or tender_id} has been closed and sealed.",
        "tender": updated
    }


# ─────────────────────────────────────────────────────────────────────────────
# AI Tender Document Analysis & Intelligent Extraction Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/analyze-document", response_model=Dict[str, Any])
async def analyze_tender_document(
    payload: TenderAnalysisRequestSchema,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Executes Smart OCR / IDP + AI requirement extraction on a tender document.
    Accepts a preloaded filename or raw text override.
    Creates an analysis job with extracted requirements ready for human-in-the-loop review.
    """
    filename = payload.filename or "CPCL_Tender_Safety_Helmets_2026.pdf"
    tender_id = payload.tender_id

    # 1. Smart OCR / Intelligent Document Processing
    # Check if we have stored bytes for this tender or filename
    file_bytes = None
    if tender_id:
        doc_data = get_document_bytes_by_tender(tender_id, filename)
        if doc_data:
            file_bytes, _ = doc_data
    if not file_bytes and filename:
        file_bytes = get_document_bytes(filename)

    ocr_service = OCRService()
    doc_profile = await ocr_service.process_document(file_bytes=file_bytes, filename=filename)

    # 2. AI Requirement Extraction
    ai_service = AIService()
    raw_text = payload.raw_text
    try:
        requirements = await ai_service.extract_tender_requirements(
            tender_text=raw_text,
            doc_profile=doc_profile,
            filename=filename,
        )
    except AIProviderUnavailableError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "AI_PROVIDER_UNAVAILABLE",
                "message": err.message or "Local AI provider is unavailable. Start Ollama and ensure the configured model is available.",
                "provider": err.provider,
                "status": "UNAVAILABLE"
            }
        )
    except AIModelUnavailableError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "AI_MODEL_UNAVAILABLE",
                "message": err.message or f"Model '{err.model}' is not available in Ollama. Please run 'ollama pull {err.model}'.",
                "provider": err.provider,
                "model": err.model,
                "status": "MODEL_UNAVAILABLE"
            }
        )
    except AIExtractionError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "AI_EXTRACTION_VALIDATION_FAILED",
                "message": err.message or "AI requirement extraction could not be validated against document grounding.",
                "reason": err.reason,
                "details": err.details
            }
        )

    # Ensure all requirements have review_status defaulting to NEEDS_REVIEW
    for r in requirements:
        if not r.get("review_status"):
            r["review_status"] = "NEEDS_REVIEW"

    # 3. Build analysis job record
    job_id = f"JOB-AI-{int(time.time() * 1000) % 100000:05d}"
    page_count = doc_profile.get("page_count") or 1
    job = create_analysis_job({
        "job_id": job_id,
        "tender_id": tender_id,
        "tender_title": doc_profile.get("title", filename),
        "filename": filename,
        "file_size_kb": doc_profile.get("file_size_kb", 4280),
        "total_pages": page_count,
        "ocr_confidence": doc_profile.get("ocr_confidence", 0.99),
        "document_type": doc_profile.get("document_type", "TENDER_NOTICE_NIT"),
        "organization": doc_profile.get("organization", "Chennai Petroleum Corporation Limited (CPCL)"),
        "detected_sections": doc_profile.get("detected_sections", []),
        "status": "COMPLETED",
        "requirements": requirements,
    })

    # 4. Audit trail
    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": "TENDER_AI_ANALYSIS_STARTED",
        "entity_type": "TENDER_DOCUMENT",
        "entity_id": tender_id or filename,
        "details": (
            f"AI Document Analysis initiated for '{filename}' "
            f"({page_count} pages, {doc_profile.get('ocr_confidence', 0.99)*100:.1f}% OCR). "
            f"Extracted {len(requirements)} evaluation criteria."
        ),
        "status": "SUCCESS"
    })

    return {
        "status": "COMPLETED",
        "job_id": job_id,
        "tender_id": tender_id,
        "title": doc_profile.get("title", filename),
        "tender_title": doc_profile.get("title", filename),
        "organization": doc_profile.get("organization", "CPCL"),
        "filename": filename,
        "file_size_kb": doc_profile.get("file_size_kb", 4280),
        "total_pages": page_count,
        "total_pages_parsed": page_count,
        "ocr_confidence": doc_profile.get("ocr_confidence", 0.99),
        "document_type": doc_profile.get("document_type", "TENDER_NOTICE_NIT"),
        "detected_sections": doc_profile.get("detected_sections", []),
        "extracted_count": len(requirements),
        "requirements": requirements,
        "created_at": job.get("created_at"),
        "message": f"Successfully extracted {len(requirements)} evaluation criteria from '{filename}'."
    }


@router.post("/upload-document", response_model=Dict[str, Any])
async def upload_tender_document(
    file: UploadFile = File(...),
    tender_id: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Uploads a custom tender PDF document and runs OCR + AI extraction pipeline.
    Validates file format (PDF only), size (max 50 MB), and returns extracted requirements
    for human-in-the-loop review.
    RESTRICTED: Officer role only.
    """
    raw_filename = file.filename or "uploaded_tender.pdf"
    clean_filename = os.path.basename(raw_filename).strip() or "uploaded_tender.pdf"
    filename_lower = clean_filename.lower()

    # 1. File Type Validation (PDF only)
    is_pdf = filename_lower.endswith(".pdf") or (file.content_type and "pdf" in file.content_type.lower())
    if not is_pdf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents (.pdf) are supported for tender analysis. Please upload a valid PDF."
        )

    # 2. Read file bytes and validate size
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF file is empty (0 bytes)."
        )

    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    if len(file_bytes) > MAX_FILE_SIZE:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of 50 MB (uploaded {size_mb:.1f} MB)."
        )

    file_size_kb = len(file_bytes) // 1024

    # 3. Smart OCR / Intelligent Document Processing
    ocr_service = OCRService()
    doc_profile = await ocr_service.process_document(file_bytes=file_bytes, filename=clean_filename)

    # 4. AI Requirement Extraction
    ai_service = AIService()
    try:
        requirements = await ai_service.extract_tender_requirements(
            doc_profile=doc_profile, filename=clean_filename
        )
    except AIProviderUnavailableError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "AI_PROVIDER_UNAVAILABLE",
                "message": err.message or "Local AI provider is unavailable. Start Ollama and ensure the configured model is available.",
                "provider": err.provider,
                "status": "UNAVAILABLE"
            }
        )
    except AIModelUnavailableError as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "AI_MODEL_UNAVAILABLE",
                "message": err.message or f"Model '{err.model}' is not available in Ollama. Please run 'ollama pull {err.model}'.",
                "provider": err.provider,
                "model": err.model,
                "status": "MODEL_UNAVAILABLE"
            }
        )
    except AIExtractionError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "AI_EXTRACTION_VALIDATION_FAILED",
                "message": err.message or "AI requirement extraction could not be validated against document grounding.",
                "reason": err.reason,
                "details": err.details
            }
        )
    for r in requirements:
        if not r.get("review_status"):
            r["review_status"] = "NEEDS_REVIEW"

    # 5. Persist Document in durable Document Store
    effective_tender_id = tender_id or doc_profile.get("tender_number")
    doc_record = save_document(
        file_bytes=file_bytes,
        filename=clean_filename,
        tender_id=effective_tender_id,
        uploaded_by=current_user.get("email", "officer@cpcl.gov.in"),
        source="OFFICER_UPLOAD",
        metadata={
            "content_type": file.content_type or "application/pdf",
            "title": doc_profile.get("title"),
            "organization": doc_profile.get("organization"),
            "total_pages": doc_profile.get("page_count", 1),
        }
    )

    if effective_tender_id:
        associate_document_with_tender(doc_record["document_id"], effective_tender_id)
        existing_t = get_tender_by_id(effective_tender_id)
        if existing_t:
            docs = existing_t.get("documents") or []
            if not any(d.get("document_id") == doc_record["document_id"] for d in docs):
                docs.append(doc_record)
            existing_t["documents"] = docs
            existing_t["file_name"] = doc_record["filename"]
            existing_t["document_hash_sha256"] = doc_record["document_hash_sha256"]

    # 6. Audit Trail Logging - Document Upload
    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": "TENDER_DOCUMENT_UPLOADED",
        "entity_type": "TENDER_DOCUMENT",
        "entity_id": doc_record["document_id"],
        "details": (
            f"Tender document '{clean_filename}' ({file_size_kb} KB, SHA-256: {doc_record['document_hash_sha256'][:16]}...) "
            f"uploaded by {current_user.get('email')} and linked to tender '{effective_tender_id or 'UNLINKED'}'."
        ),
        "status": "SUCCESS"
    })

    # 7. Persist Analysis Job
    job_id = f"JOB-AI-{int(time.time() * 1000) % 100000:05d}"
    job_tender_id = effective_tender_id or "TND-2026-001"
    page_count = doc_profile.get("page_count") or 1
    job = create_analysis_job({
        "job_id": job_id,
        "tender_id": job_tender_id,
        "tender_title": doc_profile.get("title", clean_filename),
        "filename": clean_filename,
        "file_size_kb": file_size_kb,
        "total_pages": page_count,
        "ocr_confidence": doc_profile.get("ocr_confidence", 0.99),
        "document_type": doc_profile.get("document_type", "TENDER_NOTICE_NIT"),
        "organization": doc_profile.get("organization", "Chennai Petroleum Corporation Limited (CPCL)"),
        "detected_sections": doc_profile.get("detected_sections", []),
        "status": "COMPLETED",
        "requirements": requirements,
    })

    # 8. Audit Trail Logging - AI Analysis
    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": "TENDER_AI_ANALYSIS_STARTED",
        "entity_type": "TENDER_DOCUMENT",
        "entity_id": job_tender_id or clean_filename,
        "details": (
            f"Custom tender document '{clean_filename}' ({file_size_kb} KB, {page_count} pages) uploaded and analyzed. "
            f"Extracted {len(requirements)} evaluation criteria with {doc_profile.get('ocr_confidence', 0.99)*100:.1f}% OCR confidence."
        ),
        "status": "SUCCESS"
    })

    return {
        "status": "COMPLETED",
        "job_id": job_id,
        "tender_id": effective_tender_id,
        "tender_title": doc_profile.get("title", clean_filename),
        "title": doc_profile.get("title", clean_filename),
        "filename": clean_filename,
        "file_size_kb": file_size_kb,
        "total_pages": page_count,
        "total_pages_parsed": page_count,
        "pages_detected": page_count,
        "page_count": page_count,
        "ocr_confidence": doc_profile.get("ocr_confidence", 0.99),
        "document_type": doc_profile.get("document_type", "TENDER_NOTICE_NIT"),
        "organization": doc_profile.get("organization", "Chennai Petroleum Corporation Limited (CPCL)"),
        "detected_sections": doc_profile.get("detected_sections", []),
        "extracted_count": len(requirements),
        "requirements": requirements,
        "created_at": job.get("created_at") or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "message": f"Document '{clean_filename}' uploaded and analyzed successfully. {len(requirements)} criteria extracted.",
    }


@router.get("/{tender_id}/documents", response_model=Dict[str, Any])
async def get_tender_documents(
    tender_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves all uploaded and associated document records for a given tender.
    """
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id}' not found."
        )

    docs = list_documents_for_tender(tender_id)
    # Also check if tender record has inline documents
    if not docs and tender.get("documents"):
        docs = tender["documents"]
    elif not docs and tender.get("file_name"):
        doc_meta = get_document_meta(tender.get("file_name"))
        if doc_meta:
            docs = [doc_meta]
        else:
            docs = [{
                "document_id": f"DOC-{tender_id}",
                "tender_id": tender_id,
                "filename": tender.get("file_name"),
                "file_size_kb": tender.get("file_size_kb", 0),
                "document_hash_sha256": tender.get("document_hash_sha256", ""),
                "uploaded_at": tender.get("created_at") or tender.get("publish_date"),
                "uploaded_by": "officer@cpcl.gov.in",
                "content_type": "application/pdf",
                "source": tender.get("source_type", "OFFICER_UPLOAD")
            }]

    return {
        "tender_id": tender_id,
        "tender_title": tender.get("title"),
        "total_documents": len(docs),
        "documents": docs
    }


@router.get("/{tender_id}/analysis", response_model=Dict[str, Any])
async def get_tender_analysis(
    tender_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """Returns the current analysis job for a tender, including extracted requirements and review states."""
    job = get_analysis_job(tender_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis job found for '{tender_id}'."
        )
    return job


@router.post("/{tender_id}/requirements/{req_id}/verify", response_model=Dict[str, Any])
async def verify_requirement(
    tender_id: str,
    req_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """Marks an extracted requirement as VERIFIED by the procurement officer."""
    try:
        req = verify_analysis_requirement(tender_id, req_id, officer_user=current_user)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return {"message": f"Requirement '{req.get('name')}' verified.", "requirement": req}


@router.patch("/{tender_id}/requirements/{req_id}", response_model=Dict[str, Any])
async def edit_requirement(
    tender_id: str,
    req_id: str,
    payload: RequirementUpdateSchema,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """Edits an extracted requirement. Preserves original_data for diff tracking."""
    try:
        req = update_analysis_requirement(
            tender_id, req_id,
            update_payload=payload.model_dump(exclude_none=True),
            officer_user=current_user
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return {"message": f"Requirement '{req.get('name')}' updated.", "requirement": req}


@router.post("/{tender_id}/requirements", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def add_requirement(
    tender_id: str,
    payload: RequirementCreateSchema,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """Adds a new officer-authored requirement to the analysis job."""
    try:
        req = add_analysis_requirement(
            tender_id,
            req_data=payload.model_dump(exclude_none=True),
            officer_user=current_user
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return {"message": f"Requirement '{req.get('name')}' added manually.", "requirement": req}


@router.post("/{tender_id}/requirements/{req_id}/reject", response_model=Dict[str, Any])
async def reject_requirement(
    tender_id: str,
    req_id: str,
    payload: RequirementRejectSchema,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """Rejects an extracted requirement with a mandatory justification."""
    try:
        req = reject_analysis_requirement(tender_id, req_id, reason=payload.reason, officer_user=current_user)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": f"Requirement '{req.get('name')}' rejected.", "requirement": req}


@router.post("/{tender_id}/finalize-requirements", response_model=Dict[str, Any])
async def finalize_requirements(
    tender_id: str,
    payload: Optional[FinalizeRequirementsSchema] = None,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Finalizes all non-rejected requirements into the tender's canonical record.
    Updates the tender and enables deterministic RulesEngine evaluation.
    """
    target_tid = (payload.tender_id if payload else None) or tender_id
    override = (payload.override_existing if payload else True)
    try:
        result = finalize_tender_requirements(
            job_id_or_tender_id=tender_id,
            target_tender_id=target_tid,
            override_existing=override,
            officer_user=current_user,
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return result
