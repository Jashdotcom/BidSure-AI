"""
Reports and Executive Summary API Router
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, Optional
import io
import re

from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_tender_by_id, get_bidder_by_id, get_bidders_for_tender, get_all_audit_logs, add_audit_log
from app.services.pdf_generator import generate_bidder_compliance_pdf, generate_bidder_audit_pdf

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


@router.get("/tender/{tender_id}/bidder/{bidder_id}/audit/pdf")
async def download_reports_bidder_audit_pdf(
    tender_id: str,
    bidder_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Generates and streams authentic bidder audit trail PDF via Reports router.
    """
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail=f"Tender '{tender_id}' not found.")
    bidder = get_bidder_by_id(bidder_id)
    if not bidder:
        raise HTTPException(status_code=404, detail=f"Bidder '{bidder_id}' not found.")

    all_logs = get_all_audit_logs()
    b_keys = {bidder_id.lower(), (bidder.get("name") or "").lower(), (bidder.get("bid_submission_id") or "").lower()}
    b_keys.discard("")
    t_keys = {tender_id.lower(), (tender.get("tender_number") or "").lower()}
    t_keys.discard("")

    matched = []
    for l in all_logs:
        ent = (l.get("entity_id") or "").lower()
        det = (l.get("details") or "").lower()
        if any(k in ent or k in det for k in b_keys) or any(k in ent or k in det for k in t_keys):
            matched.append(l)

    officer_name = current_user.get("name") or "Procurement Officer"
    buf = generate_bidder_audit_pdf(tender, bidder, matched, generated_by=officer_name)
    t_num = str(tender.get("tender_number") or tender_id).replace("/", "_").replace(" ", "_")
    b_name = str(bidder.get("name") or bidder_id).replace(" ", "_").replace("/", "_")
    filename = f"BidSure_Audit_{t_num}_{b_name}.pdf"

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
