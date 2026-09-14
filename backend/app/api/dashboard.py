"""
Officer Dashboard Management API Router
Provides aggregated procurement metrics, active tender counts, and verification queue summaries.
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_dashboard_stats, get_all_tenders, get_all_bidders

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=Dict[str, Any])
async def fetch_dashboard_stats(
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns live aggregated statistics for the Procurement Officer Dashboard.
    Calculates live metrics from the shared central database of tenders and bidders.
    """
    return get_dashboard_stats()
