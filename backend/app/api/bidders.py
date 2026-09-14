"""
Bidders Management API Router
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_all_bidders, get_bidders_for_tender, get_bidder_by_id

router = APIRouter(prefix="/bidders", tags=["Bidders"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_bidders(
    query: Optional[str] = Query(None, description="Search keyword across bidder name, bid ID, tender number, contact person"),
    tender_id: Optional[str] = Query(None, description="Filter by Tender ID / Reference"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, SUBMITTED, UNDER_VERIFICATION, REVIEW, COMPLETED)"),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns list of bidder submissions with multi-field search and filter support.
    RESTRICTED: Officer role only.
    """
    return get_all_bidders(query=query, tender_id=tender_id, status=status)

@router.get("/{bidder_id}", response_model=Dict[str, Any])
async def get_bidder_details(
    bidder_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns specific bidder profile and submission details.
    Bidders can only view their own profile; Officers can view any.
    """
    user_role = current_user.get("role")
    user_bidder_id = current_user.get("bidder_id")

    if user_role == "BIDDER" and user_bidder_id != bidder_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Bidders cannot view other bidders' profiles."
        )

    bidder = get_bidder_by_id(bidder_id)
    if not bidder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bidder {bidder_id} not found."
        )
    return bidder
