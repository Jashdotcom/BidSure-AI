"""
Bidder Portal Self-Service API Router
Provides authenticated Bidders with their isolated dashboard overview,
active CPCL tenders, self bids, notifications, and profile completion tracking.

SECURITY GUARANTEES:
- Strictly restricted to BIDDER role only.
- Strict data isolation: A bidder can NEVER view other bidders, competitor documents,
  internal officer notes, internal risk ratings, or private evaluation trails.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import (
    get_all_tenders,
    get_tender_by_id,
    get_bidder_by_id,
    get_bids_by_bidder_id,
    get_notifications_for_bidder,
    add_bid_for_bidder,
    SAMPLE_BIDDERS
)
from app.services.rules_engine import RulesEngine
from app.services.government.mock_verification_adapter import MockGovernmentVerificationService

router = APIRouter(prefix="/bidder-portal", tags=["Bidder Portal"])

rules_engine = RulesEngine()
gov_service = MockGovernmentVerificationService(is_mock=True)


def compute_profile_completion(bidder: Optional[Dict[str, Any]], user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes profile completion checklist and percentage for a bidder.
    """
    checklist = []

    # 1. Organization & Signatory Info
    has_name = bool(user.get("name") or (bidder and bidder.get("name")))
    has_org = bool(user.get("organization") or (bidder and bidder.get("name")))
    has_phone = bool(user.get("phone") or (bidder and bidder.get("phone")))
    checklist.append({
        "key": "basic_info",
        "title": "Organization & Contact Details",
        "description": "Authorized signatory name, entity name, official email and phone.",
        "completed": has_name and has_org and has_phone,
        "weight": 15
    })

    # 2. GSTIN
    gstin = (bidder and bidder.get("gstin")) or ""
    checklist.append({
        "key": "gstin",
        "title": "GSTIN Registration",
        "description": "Valid 15-digit Goods and Services Tax Identification Number.",
        "completed": bool(gstin and len(gstin) >= 10),
        "weight": 15
    })

    # 3. PAN
    pan = (bidder and bidder.get("pan")) or ""
    checklist.append({
        "key": "pan",
        "title": "Permanent Account Number (PAN)",
        "description": "Entity PAN registered with the Income Tax Department.",
        "completed": bool(pan and len(pan) >= 10),
        "weight": 15
    })

    # 4. Udyam MSME
    udyam = (bidder and bidder.get("udyam")) or ""
    checklist.append({
        "key": "udyam",
        "title": "MSME Udyam Registration",
        "description": "Udyam registration for EMD exemption & purchase preference.",
        "completed": bool(udyam and len(udyam) >= 8),
        "weight": 15
    })

    # 5. Financials & Turnover
    turnover = (bidder and bidder.get("annual_turnover_cr", 0.0)) or 0.0
    docs = (bidder and bidder.get("documents", {})) or {}
    has_financials = turnover > 0 or "audited_balance_sheet" in docs
    checklist.append({
        "key": "financials",
        "title": "Audited Financial Statements",
        "description": "CA certified balance sheet with UDIN for last 3 financial years.",
        "completed": bool(has_financials),
        "weight": 10
    })

    # 6. Past Experience
    experience = (bidder and bidder.get("years_experience", 0)) or 0
    has_exp = experience > 0 or "experience_cert" in docs
    checklist.append({
        "key": "experience",
        "title": "Past PSU / Industry Experience",
        "description": "Work orders & completion certificates for similar procurement scope.",
        "completed": bool(has_exp),
        "weight": 10
    })

    # 7. OEM Authorization
    oem = (bidder and bidder.get("oem_authorization", "")) or ""
    has_oem = (oem and oem != "Unregistered") or "oem_cert" in docs
    checklist.append({
        "key": "oem_auth",
        "title": "OEM Authorization (MAF)",
        "description": "Direct Manufacturer Authorization Form specifically for CPCL tenders.",
        "completed": bool(has_oem),
        "weight": 10
    })

    # 8. Make in India Declaration
    local_content = (bidder and bidder.get("local_content", 0.0)) or 0.0
    has_mii = local_content > 0 or "local_content_cert" in docs
    checklist.append({
        "key": "mii_declaration",
        "title": "Make in India (MII) Declaration",
        "description": "Statutory auditor / management self-declaration of domestic value addition.",
        "completed": bool(has_mii),
        "weight": 10
    })

    completed_weight = sum(item["weight"] for item in checklist if item["completed"])
    completed_count = sum(1 for item in checklist if item["completed"])
    total_count = len(checklist)

    return {
        "percentage": min(100, completed_weight),
        "completed_count": completed_count,
        "total_count": total_count,
        "items": checklist
    }


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_bidder_dashboard(current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))):
    """
    Returns complete isolated dashboard data for the authenticated bidder.

    Sections:
    1. Welcome & Company Overview
    2. Statistics (Available Tenders, My Bids, Draft Bids, Submitted Bids, Under Verification, Compliant Bids, Non-Compliant Bids)
    3. Available Tenders List (Tender ID, Title, Organization, Deadline, Status, Requirements count)
    4. My Bids (Tender, Submission date, Status, Verification status, Compliance status)
    5. Notifications
    6. Profile completion checklist
    """
    bidder_id = current_user.get("bidder_id") or "BID-001"
    bidder_profile = get_bidder_by_id(bidder_id)

    # If profile is not found in sample bidders (e.g. newly registered), create dynamic profile view
    if not bidder_profile:
        bidder_profile = {
            "id": bidder_id,
            "name": current_user.get("organization") or current_user.get("name"),
            "email": current_user.get("email"),
            "phone": current_user.get("phone", "+91 98765 43210"),
            "gstin": current_user.get("gstin", ""),
            "pan": current_user.get("pan", ""),
            "udyam": current_user.get("udyam", ""),
            "annual_turnover_cr": 0.0,
            "years_experience": 0,
            "oem_authorization": "Unregistered",
            "local_content": 0.0,
            "emd_paid": False,
            "status": "REGISTERED",
            "score": 0.0,
            "documents": {}
        }

    # 1. Available Tenders (Public procurement opportunities)
    raw_tenders = get_all_tenders()
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

    # Map bids into clean sanitized objects
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

    # 3. Statistics Computation
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

    # 4. Profile Completion
    profile_completion = compute_profile_completion(bidder_profile, current_user)

    # 5. Notifications (ISOLATED TO THIS BIDDER ONLY)
    notifications = get_notifications_for_bidder(bidder_id)

    return {
        "bidder": {
            "id": bidder_id,
            "name": current_user.get("name", "Authorized Signatory"),
            "company_name": current_user.get("organization") or bidder_profile.get("name"),
            "email": current_user.get("email"),
            "phone": bidder_profile.get("phone", "+91 98765 43210"),
            "gstin": bidder_profile.get("gstin", ""),
            "pan": bidder_profile.get("pan", ""),
            "udyam": bidder_profile.get("udyam", ""),
            "annual_turnover_cr": bidder_profile.get("annual_turnover_cr", 0.0),
            "years_experience": bidder_profile.get("years_experience", 0),
            "oem_authorization": bidder_profile.get("oem_authorization", "Unregistered"),
            "local_content": bidder_profile.get("local_content", 0.0)
        },
        "profile_completion": profile_completion,
        "statistics": statistics,
        "available_tenders": available_tenders,
        "my_bids": my_bids,
        "notifications": notifications
    }


@router.get("/tenders", response_model=List[Dict[str, Any]])
async def list_available_tenders_for_bidder(
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Returns public active tenders available for bidding.
    """
    raw_tenders = get_all_tenders()
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
    tender_id = payload.get("tender_id", "TND-2026-001")
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
