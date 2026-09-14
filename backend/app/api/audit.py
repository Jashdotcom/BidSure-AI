"""
Audit Trail and Integrity Verification API Router
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Dict, Any, List, Optional
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_all_audit_logs, add_audit_log

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/logs", response_model=List[Dict[str, Any]])
async def get_audit_logs(
    query: Optional[str] = Query(None, description="Search keyword in audit logs"),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns immutable audit logs of all evaluation decisions, document ingestions, and overrides.
    RESTRICTED: Officer role only.
    """
    return get_all_audit_logs(query=query)
