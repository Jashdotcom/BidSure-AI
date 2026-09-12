"""
Tender Management API Router
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any, Optional
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_all_tenders, get_tender_by_id

router = APIRouter(prefix="/tenders", tags=["Tenders"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_tenders(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns list of active and evaluating tenders."""
    return get_all_tenders()

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

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_tender(
    tender_payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Creates a new tender.
    RESTRICTED: Officer role only.
    """
    return {
        "message": "Tender created successfully.",
        "tender": tender_payload
    }
