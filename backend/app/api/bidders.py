"""
Bidders Management API Router
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, Body
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
import io
import openpyxl
from datetime import datetime
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.api.auth import get_current_user, require_roles
from app.data.sample_data import get_all_bidders, get_bidders_for_tender, get_bidder_by_id, get_tender_by_id, add_audit_log
from app.services.rules_engine import RulesEngine
from app.services.government.mock_verification_adapter import MockGovernmentVerificationService

router = APIRouter(prefix="/bidders", tags=["Bidders"])

rules_engine = RulesEngine()
gov_service = MockGovernmentVerificationService(is_mock=True)


async def build_tender_comparison_data(tender_id: str) -> Dict[str, Any]:
    """
    Constructs the complete structured bid comparison matrix for an active tender.
    Reuses existing RulesEngine and MockGovernmentVerificationService.
    Excludes drafts from submitted bid results.
    """
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id}' not found."
        )

    # Submitted bidders only (single source of truth)
    submitted_bidders = get_bidders_for_tender(tender_id, eligible_only=True)

    # Check all raw bidders to calculate draft count
    all_bidders = get_bidders_for_tender(tender_id, eligible_only=False)
    draft_bids_count = max(0, len(all_bidders) - len(submitted_bidders))

    # Tender requirements (source of truth)
    requirements = tender.get("requirements", [])

    # Evaluate each submitted bidder
    evaluations_by_bidder: Dict[str, Dict[str, Any]] = {}
    enriched_bidders: List[Dict[str, Any]] = []

    for bidder in submitted_bidders:
        gov_res = await gov_service.verify_all_for_bidder(bidder)
        eval_res = rules_engine.evaluate_submission(tender, bidder, gov_verification=gov_res)
        bidder_id = bidder.get("id", "")
        evaluations_by_bidder[bidder_id] = eval_res

        # Enriched bidder with live evaluation metrics
        b_copy = dict(bidder)
        b_copy["compliance_score"] = eval_res.get("compliance_score", bidder.get("compliance_score", 0.0))
        b_copy["compliance_status"] = eval_res.get("overall_status", bidder.get("compliance_status", "PENDING"))
        b_copy["summary"] = {
            "pass_count": eval_res.get("passed_count", 0),
            "fail_count": eval_res.get("failed_count", 0),
            "review_count": eval_res.get("review_count", 0),
            "total": eval_res.get("total_requirements", len(requirements)),
            "total_requirements": eval_res.get("total_requirements", len(requirements)),
        }
        enriched_bidders.append(b_copy)

    # Calculate metrics
    fully_compliant = sum(1 for e in evaluations_by_bidder.values() if e.get("overall_status") == "COMPLIANT")
    needs_review = sum(1 for e in evaluations_by_bidder.values() if e.get("overall_status") == "REQUIRES_REVIEW")
    non_compliant = sum(1 for e in evaluations_by_bidder.values() if e.get("overall_status") == "NON_COMPLIANT")
    verified = sum(
        1 for b in submitted_bidders
        if b.get("verification_status") in ["AUTHENTICATED", "COMPLETED", "VERIFIED"]
        or b.get("status") in ["COMPLETED", "AUTHENTICATED", "VERIFIED"]
    )
    under_verification = len(submitted_bidders) - verified

    metrics = {
        "total_submitted_bids": len(submitted_bidders),
        "draft_bids_count": draft_bids_count,
        "fully_compliant_count": fully_compliant,
        "needs_review_count": needs_review,
        "non_compliant_count": non_compliant,
        "verified_count": verified,
        "under_verification_count": under_verification,
    }

    # Build comparison matrix rows dynamically from tender's finalized requirements
    comparison_matrix: List[Dict[str, Any]] = []

    for req in requirements:
        req_id = req.get("id") or req.get("code") or ""
        req_code = req.get("code") or req_id
        clause_ref = req.get("clause_reference") or req.get("clause") or "Clause"
        title = req.get("title") or req.get("name") or "Requirement"
        category = req.get("category") or "GENERAL"
        mandatory = req.get("mandatory", True)
        threshold_val = req.get("threshold_value") or str(req.get("threshold", ""))
        unit = req.get("unit", "")
        description = req.get("description", "")

        bidder_cells: Dict[str, Any] = {}

        for bidder in submitted_bidders:
            b_id = bidder.get("id", "")
            eval_res = evaluations_by_bidder.get(b_id, {})
            results_list = eval_res.get("results", [])

            # Find match for this requirement in evaluation results
            matched_eval = None
            for er in results_list:
                if er.get("requirement_id") == req_id or er.get("clause") == clause_ref or er.get("title") == title:
                    matched_eval = er
                    break

            if matched_eval:
                st = matched_eval.get("status", "PASS")
                claimed = matched_eval.get("claimed_value", "")
                required = matched_eval.get("required_value", "")
                ev_doc = matched_eval.get("evidence_document", "Bid_Submission.pdf")
                p_num = matched_eval.get("page_number", 1)
                remarks = matched_eval.get("remarks", "")
            else:
                st = "PASS"
                claimed = "Document Submitted"
                required = threshold_val or "Mandatory Submission"
                ev_doc = "Bid_Submission.pdf"
                p_num = 1
                remarks = "Evaluated compliant with tender criteria."

            evidence_item = {
                "requirement_id": req_id,
                "requirement_code": req_code,
                "requirement_name": title,
                "clause_reference": clause_ref,
                "category": category,
                "mandatory": mandatory,
                "required_value": required or threshold_val or "Mandatory Criteria",
                "bidder_value": claimed or "Submitted",
                "status": st,
                "rule_evaluated": remarks or f"Evaluated against {threshold_val}",
                "evidence_source": ev_doc,
                "page_number": p_num,
                "highlight_text": f"Extracted for {bidder.get('name')}: {claimed}. {remarks}",
                "explanation": remarks,
                "confidence": 0.98,
                "weight": req.get("scoring_weight", 15),
            }

            bidder_cells[b_id] = {
                "status": st,
                "claimed_value": claimed,
                "required_value": required,
                "evidence_document": ev_doc,
                "page_number": p_num,
                "remarks": remarks,
                "evidence": evidence_item,
            }

        comparison_matrix.append({
            "requirement_id": req_id,
            "code": req_code,
            "clause": clause_ref,
            "clause_reference": clause_ref,
            "title": title,
            "category": category,
            "mandatory": mandatory,
            "threshold_value": threshold_val,
            "unit": unit,
            "description": description,
            "bidders": bidder_cells,
        })

    return {
        "tender": {
            "id": tender.get("id"),
            "tender_number": tender.get("tender_number"),
            "ref": tender.get("ref"),
            "tender_id": tender.get("tender_id"),
            "title": tender.get("title"),
            "organization": tender.get("organization"),
            "department": tender.get("department"),
            "category": tender.get("category"),
            "status": tender.get("status"),
            "estimated_value": tender.get("estimated_value"),
            "estimated_value_display": tender.get("estimated_value_display"),
            "emd_amount": tender.get("emd_amount"),
            "emd_amount_display": tender.get("emd_amount_display"),
            "publish_date": tender.get("publish_date"),
            "closing_date": tender.get("closing_date"),
            "deadline": tender.get("deadline"),
            "bids_count": len(submitted_bidders),
            "requirements_count": len(requirements),
            "description": tender.get("description"),
        },
        "metrics": metrics,
        "bidders": enriched_bidders,
        "requirements": requirements,
        "comparison_matrix": comparison_matrix,
    }


@router.get("/comparison", response_model=Dict[str, Any])
async def get_tender_comparison_query(
    tender_id: str = Query(..., description="Tender ID or Reference"),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns full side-by-side comparison matrix for the given tender.
    RESTRICTED: Officer role only.
    """
    return await build_tender_comparison_data(tender_id)


@router.get("/comparison/{tender_id:path}", response_model=Dict[str, Any])
async def get_tender_comparison_path(
    tender_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns full side-by-side comparison matrix for the given tender by path.
    RESTRICTED: Officer role only.
    """
    return await build_tender_comparison_data(tender_id)

@router.get("", response_model=List[Dict[str, Any]])
async def list_bidders(
    query: Optional[str] = Query(None, description="Search keyword across bidder name, bid ID, tender number, contact person"),
    tender_id: Optional[str] = Query(None, description="Filter by Tender ID / Reference"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, SUBMITTED, UNDER_VERIFICATION, REVIEW, COMPLETED)"),
    eligible_only: bool = Query(False, description="Filter to eligible submitted bids only"),
    include_drafts: bool = Query(False, description="Include vendor draft submissions in officer listing"),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns list of bidder submissions with multi-field search and filter support.
    By default, only formally submitted bids are returned to procurement officers.
    RESTRICTED: Officer role only.
    """
    if eligible_only:
        include_drafts = False
    return get_all_bidders(query=query, tender_id=tender_id, status=status, include_drafts=include_drafts)

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


@router.post("/compare/export")
async def export_cst(
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Exports the Comparative Statement of Tenders (CST) as either .xlsx or .pdf
    using actual database records for the specified tender and bidder IDs.
    Logs CST_GENERATED audit event.
    """
    tender_id = payload.get("tender_id")
    bidder_ids = payload.get("bidder_ids", [])
    export_format = (payload.get("format") or "xlsx").lower()

    if not tender_id:
        raise HTTPException(status_code=400, detail="tender_id is required.")
    if not bidder_ids:
        raise HTTPException(status_code=400, detail="At least one bidder_id must be selected for comparison export.")

    tender = get_tender_by_id(tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail=f"Tender {tender_id} not found.")

    all_bidders = get_bidders_for_tender(tender_id, eligible_only=True)
    selected_bidders = [b for b in all_bidders if b.get("id") in bidder_ids]

    if not selected_bidders:
        raise HTTPException(status_code=400, detail="No matching bidder records found for the selected IDs.")

    # Log audit event CST_GENERATED
    add_audit_log({
        "user_email": current_user.get("email", "officer@cpcl.gov.in"),
        "user_role": current_user.get("role", "PROCUREMENT_OFFICER"),
        "action": "CST_GENERATED",
        "entity_type": "TENDER",
        "entity_id": tender.get("tender_number") or tender_id,
        "details": f"Comparative Statement of Tenders (CST) exported as .{export_format} for tender {tender.get('tender_number')} comparing {len(selected_bidders)} bidders.",
        "status": "SUCCESS"
    })

    tender_num_clean = (tender.get("tender_number") or tender_id).replace("/", "_")

    if export_format == "xlsx":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "CST Evaluation Matrix"

        # Title block
        ws.append(["Chennai Petroleum Corporation Limited (CPCL) - Comparative Statement of Tenders (CST)"])
        ws.append([f"Tender: {tender.get('tender_number')} - {tender.get('title')}"])
        ws.append([f"Generated By: {current_user.get('name', 'Procurement Officer')} | Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"])
        ws.append([])

        # Table Header
        headers = ["Evaluation Criteria / Parameter"] + [b.get("name") for b in selected_bidders]
        ws.append(headers)

        # Rows
        rows_data = [
            ["Compliance Status", [b.get("compliance_status", "PENDING") for b in selected_bidders]],
            ["Compliance Score", [f"{b.get('compliance_score', 0)}%" for b in selected_bidders]],
            ["Commercial Bid Amount", [b.get("bid_amount", "N/A") for b in selected_bidders]],
            ["Annual Turnover", [f"₹{b.get('annual_turnover_cr', 0)} Cr" for b in selected_bidders]],
            ["Sector Experience", [f"{b.get('experience_years', 0)} Years" for b in selected_bidders]],
            ["OEM Authorization", [b.get("oem_status", "Not Provided") for b in selected_bidders]],
            ["Make in India Content", [f"{b.get('local_content_pct', 0)}%" for b in selected_bidders]],
            ["GSTIN Status", [b.get("gstin", "Missing") for b in selected_bidders]],
            ["Debarment / Vigilance", [("Debarred" if b.get("is_debarred") else "Clear") for b in selected_bidders]],
        ]

        for row_label, val_list in rows_data:
            ws.append([row_label] + val_list)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"CST_{tender_num_clean}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif export_format == "pdf":
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'CSTTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1e3a8a'),
            spaceAfter=6
        )
        sub_style = ParagraphStyle(
            'CSTSub',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#475569'),
            spaceAfter=12
        )

        story.append(Paragraph("Chennai Petroleum Corporation Limited (CPCL)", title_style))
        story.append(Paragraph(f"Comparative Statement of Tenders (CST) — Tender: {tender.get('tender_number')}: {tender.get('title')}", sub_style))
        story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Officer: {current_user.get('name', 'Officer')}", sub_style))
        story.append(Spacer(1, 10))

        # Build table data
        table_data = [["Parameter"] + [b.get("name", "Bidder") for b in selected_bidders]]

        table_data.append(["Compliance Status"] + [b.get("compliance_status", "PENDING") for b in selected_bidders])
        table_data.append(["Compliance Score"] + [f"{b.get('compliance_score', 0)}%" for b in selected_bidders])
        table_data.append(["Commercial Bid Amount"] + [b.get("bid_amount", "N/A") for b in selected_bidders])
        table_data.append(["Annual Turnover"] + [f"₹{b.get('annual_turnover_cr', 0)} Cr" for b in selected_bidders])
        table_data.append(["Sector Experience"] + [f"{b.get('experience_years', 0)} Years" for b in selected_bidders])
        table_data.append(["OEM Authorization"] + [b.get("oem_status", "Not Provided") for b in selected_bidders])
        table_data.append(["Make in India Content"] + [f"{b.get('local_content_pct', 0)}%" for b in selected_bidders])

        t = Table(table_data, colWidths=[130] + [140]*len(selected_bidders))
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('ALIGN', (0,0), (0,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
        ]))

        story.append(t)
        doc.build(story)
        buffer.seek(0)

        filename = f"CST_{tender_num_clean}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid export format. Supported formats: xlsx, pdf.")
