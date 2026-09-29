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
    action: Optional[str] = Query(None),
    user: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns immutable audit logs of all evaluation decisions, document ingestions, and overrides.
    RESTRICTED: Officer role only.
    """
    logs = get_all_audit_logs(query=query)
    if action:
        logs = [log for log in logs if str(log.get("action", "")).lower() == action.lower()]
    if user:
        logs = [log for log in logs if user.lower() in str(log.get("user_email", log.get("actor", ""))).lower()]
    if date_from:
        logs = [log for log in logs if str(log.get("timestamp", ""))[:10] >= date_from]
    if date_to:
        logs = [log for log in logs if str(log.get("timestamp", ""))[:10] <= date_to]
    return logs
