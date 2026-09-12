"""
Reports and Executive Summary API Router
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_tender_by_id, get_bidders_for_tender

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/evaluation/{tender_id}", response_model=Dict[str, Any])
async def generate_evaluation_report(
    tender_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Generates formal technical evaluation committee report for a tender.
    RESTRICTED: Officer role only.
    """
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {tender_id} not found."
        )

    bidders = get_bidders_for_tender(tender_id)

    return {
        "report_id": f"CPCL-EVAL-REP-{tender_id}",
        "tender_number": tender.get("tender_number"),
        "title": tender.get("title"),
        "generated_by": current_user.get("name"),
        "organization": current_user.get("organization"),
        "bidders_evaluated": len(bidders),
        "status": "APPROVED_FOR_FINANCIAL_OPENING"
    }
