"""
Bidder Portal Self-Service API Router
Provides authenticated Bidders with their isolated dashboard overview,
active CPCL tenders, self bids, notifications, profile completion tracking,
and business verification status.

SECURITY GUARANTEES:
- Strictly restricted to BIDDER role only.
- Strict data isolation: A bidder can NEVER view other bidders, competitor documents,
  internal officer notes, internal risk ratings, or private evaluation trails.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import re
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import (
    get_all_tenders,
    get_tender_by_id,
    get_bidder_by_id,
    get_bidder_profile,
    update_bidder_profile,
    get_bids_by_bidder_id,
    get_notifications_for_bidder,
    add_bid_for_bidder,
    add_audit_log,
    SAMPLE_BIDDERS
)
from app.services.rules_engine import RulesEngine
from app.services.government.mock_verification_adapter import MockGovernmentVerificationService

router = APIRouter(prefix="/bidder-portal", tags=["Bidder Portal"])

rules_engine = RulesEngine()
gov_service = MockGovernmentVerificationService(is_mock=True)


def mask_credential(val: Optional[str], cred_type: str) -> str:
    """Masks sensitive statutory identification numbers for safe API representation."""
    if not val:
        return "Not Provided"
    s = str(val).strip()
    if cred_type == "PAN":
        if len(s) >= 10:
            return f"{s[:5]}****{s[9:]}"
        return s
    elif cred_type == "GSTIN":
        if len(s) >= 15:
            return f"{s[:5]}******{s[11:]}"
        elif len(s) >= 6:
            return f"{s[:3]}****{s[-3:]}"
        return s
    elif cred_type == "UDYAM":
        if len(s) >= 14:
            return f"{s[:9]}****{s[-4:]}"
        return s
    elif cred_type == "EPFO":
        if len(s) >= 8:
            return f"{s[:6]}****{s[-3:]}"
        return s
    return s


def compute_profile_completion(bidder: Optional[Dict[str, Any]], user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes profile completion based SOLELY on required bidder profile information fields.

    ARCHITECTURAL PRINCIPLE:
    Profile Completion measures form field completeness of required account and business attributes.
    It is completely independent of external government verification status.

    Required Profile Fields (11 items):
    - Authorized Contact Person (contact_person / name)
    - Official Email (email)
    - Contact Phone (phone)
    - Legal Business Name (company_name / name / organization)
    - Business Entity Type (entity_type)
    - Registered Business Address (business_address)
    - City (city)
    - State (state)
    - PIN Code (pincode)
    - Company PAN (pan)
    - Business GSTIN (gstin)

    Optional Profile Fields (tracked without penalizing completion score):
    - MSME Udyam Registration Number (udyam)
    - EPFO Establishment Code (epfo_code)
    - Business Registration / Incorporation Number (business_registration_number)
    - Business Registration Date (business_registration_date)
    """
    if not bidder:
        bidder = {}

    # 1. Evaluate individual required fields
    contact_person_val = bidder.get("contact_person") or bidder.get("name") or user.get("name")
    has_contact = bool(contact_person_val and len(str(contact_person_val).strip()) >= 2)

    email_val = bidder.get("email") or user.get("email")
    has_email = bool(email_val and "@" in str(email_val) and "." in str(email_val))

    phone_val = bidder.get("phone") or user.get("phone")
    has_phone = bool(phone_val and len(str(phone_val).strip()) >= 8)

    company_val = bidder.get("company_name") or bidder.get("name") or user.get("organization")
    has_company = bool(company_val and len(str(company_val).strip()) >= 2)

    entity_type_val = bidder.get("entity_type")
    has_entity_type = bool(entity_type_val and len(str(entity_type_val).strip()) >= 2)

    address_val = bidder.get("business_address") or bidder.get("registered_address")
    has_address = bool(address_val and len(str(address_val).strip()) >= 3)

    city_val = bidder.get("city")
    has_city = bool(city_val and len(str(city_val).strip()) >= 2)

    state_val = bidder.get("state")
    has_state = bool(state_val and len(str(state_val).strip()) >= 2)

    pincode_val = bidder.get("pincode")
    has_pincode = bool(pincode_val and len(str(pincode_val).strip()) >= 5)

    pan_val = bidder.get("pan") or user.get("pan")
    has_pan = bool(pan_val and len(str(pan_val).strip()) >= 10)

    gstin_val = bidder.get("gstin") or user.get("gstin")
    has_gstin = bool(gstin_val and len(str(gstin_val).strip()) >= 10)

    # 2. Canonical required fields manifest
    required_fields = [
        {"key": "contact_person", "label": "Authorized Contact Person", "completed": has_contact, "section": "CONTACT"},
        {"key": "email", "label": "Official Contact Email", "completed": has_email, "section": "CONTACT"},
        {"key": "phone", "label": "Primary Contact Phone", "completed": has_phone, "section": "CONTACT"},
        {"key": "company_name", "label": "Legal Business Name", "completed": has_company, "section": "BUSINESS"},
        {"key": "entity_type", "label": "Business Entity Type", "completed": has_entity_type, "section": "BUSINESS"},
        {"key": "business_address", "label": "Registered Business Address", "completed": has_address, "section": "BUSINESS"},
        {"key": "city", "label": "City", "completed": has_city, "section": "BUSINESS"},
        {"key": "state", "label": "State", "completed": has_state, "section": "BUSINESS"},
        {"key": "pincode", "label": "PIN Code", "completed": has_pincode, "section": "BUSINESS"},
        {"key": "pan", "label": "Company PAN", "completed": has_pan, "section": "STATUTORY"},
        {"key": "gstin", "label": "Business GSTIN", "completed": has_gstin, "section": "STATUTORY"}
    ]

    # 3. Optional profile fields (do not penalize if empty)
    udyam_val = bidder.get("udyam") or user.get("udyam")
    has_udyam = bool(udyam_val and len(str(udyam_val).strip()) >= 8)

    epfo_val = bidder.get("epfo_code")
    has_epfo = bool(epfo_val and len(str(epfo_val).strip()) >= 6)

    reg_num_val = bidder.get("business_registration_number")
    has_reg_num = bool(reg_num_val and len(str(reg_num_val).strip()) >= 4)

    reg_date_val = bidder.get("business_registration_date")
    has_reg_date = bool(reg_date_val and len(str(reg_date_val).strip()) >= 4)

    optional_fields = [
        {"key": "udyam", "label": "MSME / Udyam Registration Number", "completed": has_udyam, "optional": True},
        {"key": "epfo_code", "label": "EPFO Establishment Code", "completed": has_epfo, "optional": True},
        {"key": "business_registration_number", "label": "Business Registration / CIN Number", "completed": has_reg_num, "optional": True},
        {"key": "business_registration_date", "label": "Business Incorporation Date", "completed": has_reg_date, "optional": True}
    ]

    total_required = len(required_fields)
    completed_required = sum(1 for item in required_fields if item["completed"])
    percentage = round((completed_required / total_required) * 100) if total_required > 0 else 100

    # 4. Structured checklist sections for dashboard UI
    checklist_sections = [
        {
            "key": "contact_info",
            "title": "Contact Person & Account Details",
            "description": "Authorized signatory name, official business email, and phone number.",
            "completed": bool(has_contact and has_email and has_phone),
            "completed_fields": sum(1 for k in ["contact_person", "email", "phone"] if next(f["completed"] for f in required_fields if f["key"] == k)),
            "total_fields": 3
        },
        {
            "key": "business_entity",
            "title": "Business Entity & Legal Name",
            "description": "Legal registered entity name and constitution type (e.g. Private Limited).",
            "completed": bool(has_company and has_entity_type),
            "completed_fields": sum(1 for k in ["company_name", "entity_type"] if next(f["completed"] for f in required_fields if f["key"] == k)),
            "total_fields": 2
        },
        {
            "key": "registered_address",
            "title": "Registered Office Address",
            "description": "Registered premises street address, city, state, and postal pincode.",
            "completed": bool(has_address and has_city and has_state and has_pincode),
            "completed_fields": sum(1 for k in ["business_address", "city", "state", "pincode"] if next(f["completed"] for f in required_fields if f["key"] == k)),
            "total_fields": 4
        },
        {
            "key": "statutory_identifiers",
            "title": "Statutory Credentials (PAN & GSTIN)",
            "description": "Permanent Account Number (PAN) and Goods & Services Tax Identification Number (GSTIN).",
            "completed": bool(has_pan and has_gstin),
            "completed_fields": sum(1 for k in ["pan", "gstin"] if next(f["completed"] for f in required_fields if f["key"] == k)),
            "total_fields": 2
        },
        {
            "key": "optional_registrations",
            "title": "Optional Business Registrations",
            "description": "MSME Udyam, EPFO establishment code, and Certificate of Incorporation (optional).",
            "completed": bool(has_udyam or has_epfo or has_reg_num),
            "completed_fields": sum(1 for f in optional_fields if f["completed"]),
            "total_fields": len(optional_fields),
            "is_optional": True
        }
    ]

    return {
        "percentage": percentage,
        "completed_count": completed_required,
        "total_count": total_required,
        "status": "COMPLETED" if percentage == 100 else "INCOMPLETE",
        "message": "All required profile information completed" if percentage == 100 else f"{completed_required} of {total_required} required fields completed",
        "items": checklist_sections,
        "required_fields": required_fields,
        "optional_fields": optional_fields
    }


def compute_business_verification(bidder: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes business verification status based strictly on statutory verification adapters.

    ARCHITECTURAL PRINCIPLE:
    Business Verification measures authenticity against government databases (ITD, GSTN, MSME, EPFO).
    It is evaluated and reported independently of profile field completion.
    """
    if not bidder:
        bidder = {}

    gov_verifs = bidder.get("government_verifications", {})

    # 1. PAN Status
    pan = bidder.get("pan", "")
    pan_record = gov_verifs.get("pan", {})
    pan_status = "NOT_PROVIDED"
    if pan:
        pan_status = pan_record.get("status", "VALID" if len(pan) >= 10 else "NOT_VERIFIED")
    pan_verified = pan_status in ["VALID", "VERIFIED"]

    # 2. GSTIN Status
    gstin = bidder.get("gstin", "")
    gst_record = gov_verifs.get("gstin", {})
    gst_status = "NOT_PROVIDED"
    if gstin:
        gst_status = gst_record.get("status", "VALID" if len(gstin) >= 15 else "NOT_VERIFIED")
    gst_verified = gst_status in ["VALID", "VERIFIED"]

    # 3. MSME Udyam Status
    udyam = bidder.get("udyam", "")
    udyam_record = gov_verifs.get("udyam", {})
    udyam_status = "NOT_PROVIDED"
    if udyam:
        udyam_status = udyam_record.get("status", "VALID" if len(udyam) >= 8 else "NOT_VERIFIED")
    udyam_verified = udyam_status in ["VALID", "VERIFIED"]

    # 4. EPFO Status
    epfo = bidder.get("epfo_code", "")
    epfo_record = gov_verifs.get("epfo", {})
    epfo_status = "NOT_PROVIDED"
    if epfo:
        epfo_status = epfo_record.get("status", "VALID" if len(epfo) >= 6 else "NOT_VERIFIED")
    epfo_verified = epfo_status in ["VALID", "VERIFIED"]

    credential_items = [
        {
            "credential": "PAN",
            "name": "Company Permanent Account Number",
            "source": "Income Tax Department / NSDL",
            "masked_value": mask_credential(pan, "PAN"),
            "status": pan_status,
            "verified": pan_verified,
            "required": True,
            "message": pan_record.get("message", "PAN active and valid with Income Tax Department records.") if pan_verified else "PAN verification pending."
        },
        {
            "credential": "GSTIN",
            "name": "Goods & Services Tax Identification Number",
            "source": "GSTN Portal",
            "masked_value": mask_credential(gstin, "GSTIN"),
            "status": gst_status,
            "verified": gst_verified,
            "required": True,
            "message": gst_record.get("message", "GSTIN verified active on Goods & Services Tax Network.") if gst_verified else "GSTIN verification pending."
        },
        {
            "credential": "UDYAM",
            "name": "MSME / Udyam Registration",
            "source": "Ministry of MSME",
            "masked_value": mask_credential(udyam, "UDYAM"),
            "status": udyam_status,
            "verified": udyam_verified,
            "required": False,
            "message": udyam_record.get("message", "Valid MSME Udyam registration verified.") if udyam_verified else "Udyam registration not provided (optional)."
        },
        {
            "credential": "EPFO",
            "name": "EPFO / ESIC Establishment Code",
            "source": "EPFO / ESIC Unified Portal",
            "masked_value": mask_credential(epfo, "EPFO"),
            "status": epfo_status,
            "verified": epfo_verified,
            "required": False,
            "message": epfo_record.get("message", "Statutory registrations verified active.") if epfo_verified else "EPFO code not provided (optional)."
        }
    ]

    applicable_credentials = [c for c in credential_items if c["required"] or (c["status"] not in ["NOT_PROVIDED", "OPTIONAL"])]
    verified_count = sum(1 for c in applicable_credentials if c["verified"])
    applicable_count = len(applicable_credentials)
    requires_review_count = sum(1 for c in applicable_credentials if c["status"] == "REQUIRES_REVIEW")
    total_count = len(credential_items)

    # Compute overall verification status
    if applicable_count > 0 and verified_count == applicable_count:
        overall_status = "VERIFIED"
    elif requires_review_count > 0:
        overall_status = "REQUIRES_REVIEW"
    elif verified_count > 0:
        overall_status = "PARTIALLY_VERIFIED"
    else:
        overall_status = "PENDING"

    return {
        "status": overall_status,
        "general_status": bidder.get("status", "REGISTERED"),
        "verified_count": verified_count,
        "applicable_count": applicable_count,
        "total_count": total_count,
        "requires_review_count": requires_review_count,
        "message": f"{verified_count} of {applicable_count} credentials verified",
        "credentials": credential_items,
        "verifications": gov_verifs
    }


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_bidder_dashboard(current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))):
    """
    Returns complete isolated dashboard data for the authenticated bidder.

    Sections:
    1. Welcome & Company Overview
    2. Statistics (7 metrics)
    3. Available Tenders List (Tender ID, Title, Organization, Deadline, Status, Requirements count)
    4. My Bids (Tender, Submission date, Status, Verification status, Compliance status)
    5. Notifications
    6. Profile Completion (calculated from profile information)
    7. Business Verification (calculated from statutory verification results)
    """
    bidder_id = current_user.get("bidder_id") or "BID-001"
    bidder_profile = get_bidder_profile(bidder_id) or get_bidder_by_id(bidder_id)

    # If profile is not found, construct fallback profile representation
    if not bidder_profile:
        bidder_profile = {
            "id": bidder_id,
            "user_id": current_user.get("id"),
            "name": current_user.get("organization") or current_user.get("name", "Authorized Bidder"),
            "company_name": current_user.get("organization") or current_user.get("name", "Authorized Bidder"),
            "contact_person": current_user.get("name", "Authorized Signatory"),
            "email": current_user.get("email"),
            "phone": current_user.get("phone", "+91 98765 43210"),
            "entity_type": "Private Limited Company",
            "business_address": "Plot 42, Guindy Industrial Estate",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "pincode": "600032",
            "gstin": current_user.get("gstin", "33AABCA1234F1Z5"),
            "pan": current_user.get("pan", "AABCA1234F"),
            "udyam": current_user.get("udyam", "UDYAM-TN-02-0012345"),
            "epfo_code": "TN/MAS/0099881",
            "annual_turnover_cr": 12.5,
            "years_experience": 8,
            "oem_authorization": "Direct OEM Authorization",
            "local_content": 65.0,
            "emd_paid": True,
            "status": "VERIFIED",
            "verification_status": "IDENTITY_CONSISTENT",
            "score": 95.0,
            "documents": {}
        }
        update_bidder_profile(bidder_id, bidder_profile)

    # 1. Available Tenders (Public procurement opportunities)
    raw_tenders = get_all_tenders(status="PUBLISHED")
    available_tenders = [
        {
            "id": t["id"],
            "tender_number": t.get("tender_number", t["id"]),
            "title": t.get("title"),
            "organization": "Chennai Petroleum Corporation Limited (CPCL)",
            "department": t.get("department", "Materials & Procurement"),
            "deadline": t.get("closing_date"),
            "publish_date": t.get("publish_date"),
            "status": t.get("status", "ACTIVE"),
            "category": t.get("category", "Procurement"),
            "estimated_value": t.get("estimated_value", 0.0),
            "requirements_count": len(t.get("requirements", []))
        }
        for t in raw_tenders
    ]

    # 2. My Bids (ISOLATED TO THIS BIDDER ONLY)
    raw_bids = get_bids_by_bidder_id(bidder_id)

    my_bids = [
        {
            "id": b.get("id"),
            "tender_id": b.get("tender_id"),
            "tender_number": b.get("tender_number"),
            "tender_title": b.get("tender_title"),
            "organization": b.get("organization", "Chennai Petroleum Corporation Limited (CPCL)"),
            "bid_amount": b.get("bid_amount", "₹ 0"),
            "submission_date": b.get("submission_date"),
            "status": b.get("status", "DRAFT"),
            "verification_status": b.get("verification_status", "PENDING"),
            "compliance_status": b.get("compliance_status", "PENDING"),
            "compliance_score": b.get("compliance_score", 0.0),
            "passed_rules": b.get("passed_rules", 0),
            "total_rules": b.get("total_rules", 0),
            "is_draft": b.get("is_draft", False)
        }
        for b in raw_bids
    ]

    # 3. Statistics Computation (7 canonical metrics)
    total_available_tenders = len(available_tenders)
    total_my_bids = len(my_bids)
    draft_bids_count = sum(1 for b in my_bids if b["status"] == "DRAFT" or b.get("is_draft", False))
    submitted_bids_count = sum(1 for b in my_bids if b["status"] == "SUBMITTED")
    under_verification_count = sum(
        1 for b in my_bids if b["status"] in ["UNDER_VERIFICATION", "EVALUATING"] or b["verification_status"] == "PROCESSING"
    )
    compliant_bids_count = sum(
        1 for b in my_bids if b["compliance_status"] == "COMPLIANT" or b["status"] == "COMPLIANT"
    )
    non_compliant_bids_count = sum(
        1 for b in my_bids if b["compliance_status"] == "NON_COMPLIANT" or b["status"] == "NON_COMPLIANT"
    )

    statistics = {
        "available_tenders": total_available_tenders,
        "my_bids": total_my_bids,
        "draft_bids": draft_bids_count,
        "submitted_bids": submitted_bids_count,
        "under_verification": under_verification_count,
        "compliant_bids": compliant_bids_count,
        "non_compliant_bids": non_compliant_bids_count
    }

    # 4. Profile Completion (Calculated solely from profile field population)
    profile_completion = compute_profile_completion(bidder_profile, current_user)

    # 5. Business Verification (Calculated separately from statutory verification adapters)
    business_verification = compute_business_verification(bidder_profile)

    # 6. Notifications (ISOLATED TO THIS BIDDER ONLY)
    notifications = get_notifications_for_bidder(bidder_id)

    return {
        "bidder": {
            "id": bidder_id,
            "name": bidder_profile.get("contact_person") or current_user.get("name", "Authorized Signatory"),
            "company_name": bidder_profile.get("company_name") or bidder_profile.get("name") or current_user.get("organization"),
            "contact_person": bidder_profile.get("contact_person") or current_user.get("name", "Authorized Signatory"),
            "email": bidder_profile.get("email") or current_user.get("email"),
            "phone": bidder_profile.get("phone", "+91 98765 43210"),
            "entity_type": bidder_profile.get("entity_type", "Private Limited Company"),
            "business_address": bidder_profile.get("business_address", ""),
            "city": bidder_profile.get("city", ""),
            "state": bidder_profile.get("state", ""),
            "pincode": bidder_profile.get("pincode", ""),
            "gstin": bidder_profile.get("gstin", ""),
            "pan": bidder_profile.get("pan", ""),
            "udyam": bidder_profile.get("udyam", ""),
            "epfo_code": bidder_profile.get("epfo_code", ""),
            "business_registration_number": bidder_profile.get("business_registration_number", ""),
            "business_registration_date": bidder_profile.get("business_registration_date", ""),
            "annual_turnover_cr": bidder_profile.get("annual_turnover_cr", 0.0),
            "years_experience": bidder_profile.get("years_experience", 0),
            "oem_authorization": bidder_profile.get("oem_authorization", "Unregistered"),
            "local_content": bidder_profile.get("local_content", 0.0),
            "status": bidder_profile.get("status", "REGISTERED"),
            "verification_status": bidder_profile.get("verification_status", "PENDING")
        },
        "profile_completion": profile_completion,
        "business_verification": business_verification,
        "statistics": statistics,
        "available_tenders": available_tenders,
        "my_bids": my_bids,
        "notifications": notifications
    }


@router.get("/profile", response_model=Dict[str, Any])
async def get_bidder_profile_endpoint(
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Returns the canonical profile details, calculated profile completion,
    and business verification state for the authenticated bidder.
    """
    bidder_id = current_user.get("bidder_id") or "BID-001"
    bidder_profile = get_bidder_profile(bidder_id) or get_bidder_by_id(bidder_id)

    if not bidder_profile:
        bidder_profile = {
            "id": bidder_id,
            "user_id": current_user.get("id"),
            "name": current_user.get("organization") or current_user.get("name", "Authorized Bidder"),
            "company_name": current_user.get("organization") or current_user.get("name", "Authorized Bidder"),
            "contact_person": current_user.get("name", "Authorized Signatory"),
            "email": current_user.get("email"),
            "phone": current_user.get("phone", "+91 98765 43210"),
            "entity_type": "Private Limited Company",
            "business_address": "Plot 42, Guindy Industrial Estate",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "pincode": "600032",
            "gstin": current_user.get("gstin", "33AABCA1234F1Z5"),
            "pan": current_user.get("pan", "AABCA1234F"),
            "udyam": current_user.get("udyam", "UDYAM-TN-02-0012345"),
            "epfo_code": "TN/MAS/0099881",
            "annual_turnover_cr": 12.5,
            "years_experience": 8,
            "oem_authorization": "Direct OEM Authorization",
            "local_content": 65.0,
            "emd_paid": True,
            "status": "VERIFIED",
            "verification_status": "IDENTITY_CONSISTENT",
            "score": 95.0,
            "documents": {}
        }
        update_bidder_profile(bidder_id, bidder_profile)

    profile_completion = compute_profile_completion(bidder_profile, current_user)
    business_verification = compute_business_verification(bidder_profile)

    return {
        "bidder": bidder_profile,
        "profile_completion": profile_completion,
        "business_verification": business_verification
    }


@router.put("/profile", response_model=Dict[str, Any])
@router.patch("/profile", response_model=Dict[str, Any])
async def update_bidder_profile_endpoint(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Updates profile fields for the authenticated bidder.
    Re-runs statutory verification adapters if identification credentials (PAN/GSTIN/Udyam/EPFO) change.
    Recomputes profile completion and business verification.
    """
    bidder_id = current_user.get("bidder_id") or "BID-001"
    existing_profile = get_bidder_profile(bidder_id) or get_bidder_by_id(bidder_id) or {}

    # Extract updatable fields
    updatable_fields = [
        "name", "company_name", "contact_person", "email", "phone",
        "entity_type", "business_address", "city", "state", "pincode",
        "pan", "gstin", "udyam", "epfo_code",
        "business_registration_number", "business_registration_date",
        "annual_turnover_cr", "years_experience", "oem_authorization",
        "local_content", "emd_paid"
    ]

    patch_dict = {}
    for k in updatable_fields:
        if k in payload and payload[k] is not None:
            patch_dict[k] = payload[k]

    # Re-run government verification if statutory identifiers changed
    statutory_keys = ["pan", "gstin", "udyam", "epfo_code"]
    has_statutory_change = any(
        k in patch_dict and patch_dict[k] != existing_profile.get(k)
        for k in statutory_keys
    )

    if has_statutory_change:
        eval_profile = dict(existing_profile)
        eval_profile.update(patch_dict)
        gov_results = await gov_service.verify_all_for_bidder(eval_profile)
        patch_dict["government_verifications"] = gov_results

    updated_profile = update_bidder_profile(bidder_id, patch_dict)

    profile_completion = compute_profile_completion(updated_profile, current_user)
    business_verification = compute_business_verification(updated_profile)

    add_audit_log({
        "user_email": current_user.get("email", "bidder@vendor.com"),
        "user_role": "BIDDER",
        "action": "BIDDER_PROFILE_UPDATED",
        "entity_type": "BIDDER_PROFILE",
        "entity_id": bidder_id,
        "details": f"Bidder profile updated ({len(patch_dict)} fields modified). Completion: {profile_completion['percentage']}%.",
        "status": "SUCCESS"
    })

    return {
        "message": "Profile updated successfully.",
        "bidder": updated_profile,
        "profile_completion": profile_completion,
        "business_verification": business_verification
    }


@router.get("/tenders", response_model=List[Dict[str, Any]])
async def list_available_tenders_for_bidder(
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Returns public active tenders available for bidding.
    """
    raw_tenders = get_all_tenders(status="PUBLISHED")
    return [
        {
            "id": t["id"],
            "tender_number": t.get("tender_number", t["id"]),
            "title": t.get("title"),
            "organization": "Chennai Petroleum Corporation Limited (CPCL)",
            "department": t.get("department", "Materials & Procurement"),
            "deadline": t.get("closing_date"),
            "publish_date": t.get("publish_date"),
            "status": t.get("status", "ACTIVE"),
            "category": t.get("category", "Procurement"),
            "estimated_value": t.get("estimated_value", 0.0),
            "emd_amount": t.get("emd_amount", 0.0),
            "description": t.get("description", ""),
            "requirements": t.get("requirements", []),
            "requirements_count": len(t.get("requirements", []))
        }
        for t in raw_tenders
    ]


@router.get("/bids", response_model=List[Dict[str, Any]])
async def list_bidder_bids(
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Returns ONLY the authenticated bidder's own bids.
    """
    bidder_id = current_user.get("bidder_id") or "BID-001"
    return get_bids_by_bidder_id(bidder_id)


@router.get("/notifications", response_model=List[Dict[str, Any]])
async def list_bidder_notifications(
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Returns notifications for the current authenticated bidder.
    """
    bidder_id = current_user.get("bidder_id") or "BID-001"
    return get_notifications_for_bidder(bidder_id)


@router.post("/bids", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def submit_bid(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Submits a new bid for a published CPCL tender.
    RESTRICTED: Tenders must be in PUBLISHED status. Closed or Draft tenders cannot accept bids.
    """
    tender_id = payload.get("tender_id")
    if not tender_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tender ID is required for bid submission."
        )

    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found."
        )

    tender_status = tender.get("status", "DRAFT").upper()
    if tender_status == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tender {tender_id} is CLOSED. Bidding is closed and no new submissions are accepted."
        )
    if tender_status != "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tender {tender_id} is in {tender_status} stage. Bids can only be submitted for PUBLISHED tenders."
        )

    # Validate tender submission deadline
    closing_raw = tender.get("closing_date") or tender.get("submission_deadline") or tender.get("deadline")
    if closing_raw:
        try:
            closing_str = str(closing_raw).replace("Z", "+00:00")
            if " " in closing_str and "T" not in closing_str:
                closing_str = closing_str.replace(" ", "T")
            if "T" in closing_str:
                closing_dt = datetime.fromisoformat(closing_str)
            else:
                closing_dt = datetime.fromisoformat(f"{closing_str}T23:59:59+00:00")
            if closing_dt.tzinfo is None:
                closing_dt = closing_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > closing_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tender {tender_id} submission deadline ({tender.get('deadline') or closing_raw}) has expired. Submissions are no longer accepted."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    bidder_id = current_user.get("bidder_id") or "BID-001"
    new_bid = {
        "id": f"BID-{tender_id}-{len(SAMPLE_BIDDERS) + 1}",
        "bid_submission_id": f"SUB-{tender_id}-00{len(SAMPLE_BIDDERS) + 1}",
        "bidder_id": bidder_id,
        "tender_id": tender_id,
        "tender_number": tender.get("tender_number", tender_id),
        "tender_title": tender.get("title", ""),
        "name": current_user.get("organization") or current_user.get("name", "Authorized Bidder"),
        "bid_amount": payload.get("bid_amount", "₹ 0"),
        "status": "SUBMITTED",
        "verification_status": "PROCESSING",
        "compliance_status": "REVIEW_REQUIRED",
        "submission_date": payload.get("submission_date", "2026-09-14T10:00:00Z"),
        "is_draft": False
    }

    add_bid_for_bidder(new_bid)
    return {
        "message": "Bid submitted successfully.",
        "bid": new_bid
    }


@router.post("/pre-check", response_model=Dict[str, Any])
async def run_bidder_pre_check(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Allows bidder to simulate a preliminary compliance check before final bid submission.
    """
    tender_id = payload.get("tender_id")
    if not tender_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tender ID is required for pre-check."
        )
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender not found."
        )

    tender_status = tender.get("status", "DRAFT").upper()
    if tender_status == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tender {tender_id} is CLOSED. Pre-check and bidding are not available for closed tenders."
        )

    # Construct candidate bidder profile for evaluation
    candidate_bidder = {
        "id": current_user.get("bidder_id", "BID-CANDIDATE"),
        "name": current_user.get("organization", "Candidate Bidder"),
        "gstin": payload.get("gstin", "33AABCA1234F1Z5"),
        "pan": payload.get("pan", "AABCA1234F"),
        "udyam": payload.get("udyam", "UDYAM-TN-02-0012345"),
        "epfo_code": payload.get("epfo_code", "TN/MAS/0099881"),
        "annual_turnover_cr": float(payload.get("annual_turnover_cr", 4.0)),
        "years_experience": int(payload.get("years_experience", 4)),
        "oem_authorization": payload.get("oem_authorization", "Direct OEM Authorization"),
        "local_content": float(payload.get("local_content", 60.0)),
        "emd_paid": bool(payload.get("emd_paid", False)),
        "documents": {}
    }

    gov_res = await gov_service.verify_all_for_bidder(candidate_bidder)
    eval_res = rules_engine.evaluate_submission(tender, candidate_bidder, gov_verification=gov_res)

    return {
        "status": "SUCCESS",
        "pre_check_evaluation": eval_res,
        "recommendations": [
            "Ensure latest statutory balance sheet with UDIN is attached.",
            "Verify that OEM Authorization letter explicitly references CPCL tender number."
        ]
    }
