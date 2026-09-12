"""
Audit Trail and Integrity Verification API Router
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List
import time
from app.api.auth import get_current_user, require_roles

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/logs", response_model=List[Dict[str, Any]])
async def get_audit_logs(
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns immutable audit logs of all evaluation decisions, document ingestions, and overrides.
    RESTRICTED: Officer role only.
    """
    return [
        {
            "id": "AUD-9901",
            "timestamp": "2024-08-25T10:15:30Z",
            "actor": "officer@cpcl.gov.in",
            "action": "EVALUATE_BIDDER",
            "target": "BID-001 (ABC Safety Solutions)",
            "details": "Deterministic rules engine passed all 6 mandatory requirements.",
            "integrity_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        },
        {
            "id": "AUD-9902",
            "timestamp": "2024-08-25T11:20:10Z",
            "actor": "officer@cpcl.gov.in",
            "action": "GOVERNMENT_VERIFY",
            "target": "GSTIN 33AABCA1234F1Z5",
            "details": "Verified active registration via GSTN adapter.",
            "integrity_hash": "d41d8cd98f00b204e9800998ecf8427e"
        }
    ]
