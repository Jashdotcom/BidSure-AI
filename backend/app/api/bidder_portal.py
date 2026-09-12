"""
Bidder Portal Self-Service API Router
Allows registered bidders to view active tenders, submit pre-screening documents, and check pre-check status.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_all_tenders, get_tender_by_id, get_bidder_by_id
from app.services.rules_engine import RulesEngine
from app.services.government.mock_verification_adapter import MockGovernmentVerificationService

router = APIRouter(prefix="/bidder-portal", tags=["Bidder Portal"])

rules_engine = RulesEngine()
gov_service = MockGovernmentVerificationService(is_mock=True)

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_bidder_dashboard(current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))):
    """
    Returns dashboard overview for the authenticated bidder.
    RESTRICTED: Bidder role only.
    """
    bidder_id = current_user.get("bidder_id")
    bidder_profile = get_bidder_by_id(bidder_id) if bidder_id else None

    all_tenders = get_all_tenders()

    return {
        "bidder_id": bidder_id,
        "company_name": current_user.get("organization") or current_user.get("name"),
        "email": current_user.get("email"),
        "profile": bidder_profile,
        "active_tenders": all_tenders,
        "my_submissions": [
            {
                "tender_id": "TND-2024-001",
                "tender_title": "Supply of High-Grade Industrial Safety Equipment",
                "status": "SUBMITTED",
                "pre_check_score": 100.0
            }
        ] if bidder_id == "BID-001" else []
    }

@router.post("/pre-check", response_model=Dict[str, Any])
async def run_bidder_pre_check(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_roles(["BIDDER"]))
):
    """
    Allows bidder to simulate a preliminary compliance check before final bid submission.
    """
    tender_id = payload.get("tender_id", "TND-2024-001")
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender not found."
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
