"""
Compliance Evaluation API Router
Orchestrates AI extraction, deterministic rules engine, and government registry verification.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_tender_by_id, get_bidder_by_id, get_bidders_for_tender
from app.services.rules_engine import RulesEngine
from app.services.government.mock_verification_adapter import MockGovernmentVerificationService

router = APIRouter(prefix="/compliance", tags=["Compliance"])

rules_engine = RulesEngine()
gov_service = MockGovernmentVerificationService(is_mock=True)

@router.post("/evaluate/{tender_id}/{bidder_id}", response_model=Dict[str, Any])
async def evaluate_bidder_compliance(
    tender_id: str,
    bidder_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Evaluates a specific bidder submission against tender requirements.
    RESTRICTED: Officer role only.
    """
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found."
        )

    bidder = get_bidder_by_id(bidder_id)
    if not bidder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bidder {bidder_id} not found."
        )

    # 1. Run statutory government verification
    gov_results = await gov_service.verify_all_for_bidder(bidder)

    # 2. Evaluate with deterministic rules engine
    evaluation = rules_engine.evaluate_submission(
        tender=tender,
        bidder=bidder,
        gov_verification=gov_results
    )

    return evaluation

@router.get("/summary/{tender_id}", response_model=Dict[str, Any])
async def get_tender_compliance_summary(
    tender_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns comparative compliance summary across all bidders for a tender.
    RESTRICTED: Officer role only.
    """
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found."
        )

    bidders = get_bidders_for_tender(tender_id)
    evaluations = []

    for bidder in bidders:
        gov_res = await gov_service.verify_all_for_bidder(bidder)
        eval_res = rules_engine.evaluate_submission(tender, bidder, gov_verification=gov_res)
        evaluations.append(eval_res)

    return {
        "tender_id": tender_id,
        "tender_title": tender.get("title"),
        "total_bidders": len(bidders),
        "compliant_count": sum(1 for e in evaluations if e["overall_status"] == "COMPLIANT"),
        "non_compliant_count": sum(1 for e in evaluations if e["overall_status"] == "NON_COMPLIANT"),
        "review_required_count": sum(1 for e in evaluations if e["overall_status"] == "REQUIRES_REVIEW"),
        "evaluations": evaluations
    }
