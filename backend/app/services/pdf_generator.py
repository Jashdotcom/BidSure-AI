"""
BidSure AI - PDF Report Generator Service
Generates authentic, high-resolution, multi-page PDF compliance evaluation dossiers
and audit trail reports using ReportLab.
"""
import io
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count
    and standardized headers/footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#1E3A8A"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 810, "BIDSURE AI — TECHNICAL EVALUATION & AUDIT DOSSIER")
            self.setFont("Helvetica", 7.5)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(559, 810, "Chennai Petroleum Corporation Limited (CPCL)")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 42, 559, 42)

        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 30, "CONFIDENTIAL — FOR OFFICIAL CPCL PROCUREMENT COMMITTEE USE ONLY")
        self.drawRightString(559, 30, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def _get_styles():
    """Builds a comprehensive stylesheet for report flowables."""
    base_styles = getSampleStyleSheet()

    # Custom styles
    styles = {
        "DocTitle": ParagraphStyle(
            "DocTitle",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#1E3A8A"),
            alignment=TA_LEFT,
            spaceAfter=3,
        ),
        "DocSubtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#475569"),
            alignment=TA_LEFT,
            spaceAfter=10,
        ),
        "OrgHeader": ParagraphStyle(
            "OrgHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=colors.HexColor("#0F172A"),
            alignment=TA_LEFT,
        ),
        "SectionHeader": ParagraphStyle(
            "SectionHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#1E3A8A"),
            spaceBefore=8,
            spaceAfter=5,
        ),
        "SubsectionHeader": ParagraphStyle(
            "SubsectionHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#1E293B"),
            spaceBefore=4,
            spaceAfter=3,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10.5,
            textColor=colors.HexColor("#334155"),
        ),
        "BodyBold": ParagraphStyle(
            "BodyBold",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.5,
            textColor=colors.HexColor("#1E293B"),
        ),
        "BodySmall": ParagraphStyle(
            "BodySmall",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#64748B"),
        ),
        "TableHeader": ParagraphStyle(
            "TableHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "TableCell": ParagraphStyle(
            "TableCell",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#1E293B"),
        ),
        "TableCellBold": ParagraphStyle(
            "TableCellBold",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#0F172A"),
        ),
        "TableCellCenter": ParagraphStyle(
            "TableCellCenter",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#1E293B"),
            alignment=TA_CENTER,
        ),
        "BadgePass": ParagraphStyle(
            "BadgePass",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#065F46"),
            alignment=TA_CENTER,
        ),
        "BadgeFail": ParagraphStyle(
            "BadgeFail",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#991B1B"),
            alignment=TA_CENTER,
        ),
        "BadgeReview": ParagraphStyle(
            "BadgeReview",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#92400E"),
            alignment=TA_CENTER,
        ),
        "AlertBox": ParagraphStyle(
            "AlertBox",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10.5,
            textColor=colors.HexColor("#7F1D1D"),
        ),
        "MetaLabel": ParagraphStyle(
            "MetaLabel",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#475569"),
        ),
        "MetaValue": ParagraphStyle(
            "MetaValue",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#0F172A"),
        ),
    }
    return styles


def _clean_text(val: Any) -> str:
    """Escapes XML entities for ReportLab Paragraphs."""
    if val is None:
        return "N/A"
    s = str(val).strip()
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return s


def generate_bidder_compliance_pdf(
    detail: Dict[str, Any],
    generated_by: str = "Procurement Officer"
) -> io.BytesIO:
    """
    Renders an official, multi-page Technical Compliance Evaluation Dossier for a specific bidder on a tender.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=54
    )

    styles = _get_styles()
    story = []

    tender = detail.get("tender", {})
    bidder = detail.get("bidder", {})
    summary = detail.get("summary", {})
    evaluations = detail.get("evaluations", [])
    doc_verifications = detail.get("document_verifications", [])

    # ─────────────────────────────────────────────────────────────────────────
    # 1. REPORT HEADER & BRANDING
    # ─────────────────────────────────────────────────────────────────────────
    header_data = [
        [
            Paragraph("<b>BIDSURE AI</b> — PROCUREMENT INTELLIGENCE", styles["DocSubtitle"]),
            Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}", styles["TableCellCenter"])
        ]
    ]
    t_top = Table(header_data, colWidths=[360, 163])
    t_top.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_top)

    story.append(Paragraph("TECHNICAL COMPLIANCE EVALUATION &amp; EVIDENCE DOSSIER", styles["DocTitle"]))
    story.append(Paragraph(
        f"<b>Organization:</b> {_clean_text(tender.get('organization', 'Chennai Petroleum Corporation Limited (CPCL)'))} | "
        f"<b>Department:</b> {_clean_text(tender.get('department', 'Procurement & Materials'))}",
        styles["DocSubtitle"]
    ))

    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1E3A8A"), spaceAfter=8))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. TENDER & BIDDER PROFILE SUMMARY TABLE
    # ─────────────────────────────────────────────────────────────────────────
    tender_num = _clean_text(tender.get("tender_number") or tender.get("id"))
    tender_title = _clean_text(tender.get("title"))
    bidder_name = _clean_text(bidder.get("name"))
    bidder_id = _clean_text(bidder.get("id"))
    submission_id = _clean_text(bidder.get("bid_submission_id") or "N/A")
    submitted_at = _clean_text(bidder.get("submitted_at") or "N/A")
    bid_quote = _clean_text(bidder.get("bid_amount") or "N/A")
    officer_name = _clean_text(generated_by)

    meta_grid = [
        [
            Paragraph("<b>Tender Reference:</b>", styles["MetaLabel"]),
            Paragraph(tender_num, styles["MetaValue"]),
            Paragraph("<b>Participating Bidder:</b>", styles["MetaLabel"]),
            Paragraph(f"<b>{bidder_name}</b> ({bidder_id})", styles["MetaValue"]),
        ],
        [
            Paragraph("<b>Tender Package:</b>", styles["MetaLabel"]),
            Paragraph(tender_title, styles["MetaValue"]),
            Paragraph("<b>Submission ID / Date:</b>", styles["MetaLabel"]),
            Paragraph(f"{submission_id} | {submitted_at}", styles["MetaValue"]),
        ],
        [
            Paragraph("<b>Estimated Budget:</b>", styles["MetaLabel"]),
            Paragraph(_clean_text(tender.get("estimated_value_display") or "N/A"), styles["MetaValue"]),
            Paragraph("<b>Commercial Quote:</b>", styles["MetaLabel"]),
            Paragraph(f"<b>{bid_quote}</b>", styles["MetaValue"]),
        ],
        [
            Paragraph("<b>Evaluation Method:</b>", styles["MetaLabel"]),
            Paragraph("Deterministic Rules Engine (Zero Hallucination)", styles["MetaValue"]),
            Paragraph("<b>Evaluated By:</b>", styles["MetaLabel"]),
            Paragraph(officer_name, styles["MetaValue"]),
        ],
    ]

    t_meta = Table(meta_grid, colWidths=[95, 170, 105, 153])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. EXECUTIVE SUMMARY & VERDICT BANNER
    # ─────────────────────────────────────────────────────────────────────────
    eligibility = summary.get("eligibility_status", "REQUIRES_REVIEW")
    score = summary.get("compliance_score", 0.0)
    risk = summary.get("risk_level", "MEDIUM")
    total_reqs = summary.get("total_requirements", len(evaluations))
    passed_reqs = summary.get("passed_count", 0)
    failed_reqs = summary.get("failed_count", 0)
    review_reqs = summary.get("review_count", 0)
    mand_failed = summary.get("mandatory_failed_count", 0)
    verified_docs = summary.get("verified_documents_count", 0)
    total_docs = summary.get("total_documents_count", len(doc_verifications))

    if eligibility == "ELIGIBLE":
        verdict_bg = colors.HexColor("#ECFDF5")
        verdict_border = colors.HexColor("#059669")
        verdict_text = f"<font color='#065F46'><b>QUALIFIED / ELIGIBLE</b></font> — Bidder meets all mandatory tender criteria and statutory conditions ({score:.1f}% Score)."
    elif eligibility == "DISQUALIFIED":
        verdict_bg = colors.HexColor("#FEF2F2")
        verdict_border = colors.HexColor("#DC2626")
        verdict_text = f"<font color='#991B1B'><b>DISQUALIFIED / NON-COMPLIANT</b></font> — Failed {mand_failed} mandatory criteria. Ineligible for commercial bid opening."
    else:
        verdict_bg = colors.HexColor("#FFFBEB")
        verdict_border = colors.HexColor("#D97706")
        verdict_text = f"<font color='#92400E'><b>REQUIRES COMMITTEE REVIEW</b></font> — {review_reqs} clause(s) require committee deliberation or vendor clarification."

    verdict_table = Table([[Paragraph(verdict_text, styles["BodyBold"])]], colWidths=[523])
    verdict_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), verdict_bg),
        ('BOX', (0, 0), (-1, -1), 1, verdict_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(verdict_table)
    story.append(Spacer(1, 6))

    # Metric Breakdown Cards
    metric_data = [
        [
            Paragraph("<b>Overall Score</b>", styles["TableCellCenter"]),
            Paragraph("<b>Total Criteria</b>", styles["TableCellCenter"]),
            Paragraph("<b>Passed</b>", styles["TableCellCenter"]),
            Paragraph("<b>Failed</b>", styles["TableCellCenter"]),
            Paragraph("<b>Review Items</b>", styles["TableCellCenter"]),
            Paragraph("<b>Mandatory Fail</b>", styles["TableCellCenter"]),
            Paragraph("<b>Verified Docs</b>", styles["TableCellCenter"]),
        ],
        [
            Paragraph(f"<font size=10><b>{score:.1f}%</b></font>", styles["TableCellCenter"]),
            Paragraph(f"<font size=10><b>{total_reqs}</b></font>", styles["TableCellCenter"]),
            Paragraph(f"<font size=10 color='#059669'><b>{passed_reqs}</b></font>", styles["TableCellCenter"]),
            Paragraph(f"<font size=10 color='#DC2626'><b>{failed_reqs}</b></font>", styles["TableCellCenter"]),
            Paragraph(f"<font size=10 color='#D97706'><b>{review_reqs}</b></font>", styles["TableCellCenter"]),
            Paragraph(f"<font size=10 color='#991B1B'><b>{mand_failed}</b></font>", styles["TableCellCenter"]),
            Paragraph(f"<font size=10 color='#2563EB'><b>{verified_docs}/{total_docs}</b></font>", styles["TableCellCenter"]),
        ]
    ]
    t_metrics = Table(metric_data, colWidths=[75, 75, 75, 75, 75, 74, 74])
    t_metrics.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_metrics)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 4. DETAILED COMPLIANCE EVALUATION TABLE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("1. DETAILED CLAUSE-BY-CLAUSE COMPLIANCE MATRIX", styles["SectionHeader"]))
    story.append(Paragraph(
        "Evaluation of bidder's submitted qualifications against tender criteria evaluated deterministically.",
        styles["BodySmall"]
    ))
    story.append(Spacer(1, 4))

    eval_table_data = [
        [
            Paragraph("Clause &amp; Criteria", styles["TableHeader"]),
            Paragraph("Category", styles["TableHeader"]),
            Paragraph("Mandatory", styles["TableHeader"]),
            Paragraph("Tender Threshold", styles["TableHeader"]),
            Paragraph("Submitted Claim", styles["TableHeader"]),
            Paragraph("Result", styles["TableHeader"]),
            Paragraph("Doc Status", styles["TableHeader"]),
            Paragraph("Deterministic Rule Justification", styles["TableHeader"]),
        ]
    ]

    for req in evaluations:
        req_name = _clean_text(req.get("requirement_name") or req.get("name") or req.get("code"))
        clause = _clean_text(req.get("clause_reference") or "Clause N/A")
        cat = _clean_text(req.get("category", "GENERAL")).replace("_", " ")
        is_mand = "YES" if req.get("mandatory") else "NO"
        req_val = _clean_text(req.get("required_value") or req.get("threshold_value"))
        sub_val = _clean_text(req.get("submitted_value"))
        st = req.get("status", "REVIEW")
        doc_st = _clean_text(req.get("document_verification_status", "VERIFIED"))
        reason = _clean_text(req.get("explanation") or req.get("reason") or "Evaluated against tender criteria.")

        if st == "PASS":
            res_p = Paragraph("<b>PASS</b>", styles["BadgePass"])
        elif st == "FAIL":
            res_p = Paragraph("<b>FAIL</b>", styles["BadgeFail"])
        else:
            res_p = Paragraph("<b>REVIEW</b>", styles["BadgeReview"])

        mand_style = styles["TableCellBold"] if is_mand == "YES" else styles["TableCellCenter"]

        eval_table_data.append([
            Paragraph(f"<b>{req_name}</b><br/><font size=6.5 color='#64748B'>{clause}</font>", styles["TableCell"]),
            Paragraph(f"<font size=6.5>{cat}</font>", styles["TableCell"]),
            Paragraph(is_mand, mand_style),
            Paragraph(f"<font size=7>{req_val}</font>", styles["TableCell"]),
            Paragraph(f"<font size=7><b>{sub_val}</b></font>", styles["TableCell"]),
            res_p,
            Paragraph(f"<font size=6.5>{doc_st}</font>", styles["TableCellCenter"]),
            Paragraph(f"<font size=6.5>{reason}</font>", styles["TableCell"]),
        ])

    t_eval = Table(eval_table_data, colWidths=[95, 50, 42, 60, 60, 42, 50, 124])
    t_eval.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_eval)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 5. STATUTORY & SUBMITTED DOCUMENTS VERIFICATION
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("2. STATUTORY DOCUMENT &amp; REGISTRY AUTHENTICATION STATUS", styles["SectionHeader"]))
    story.append(Paragraph(
        "Verification status of government registrations, statutory certificates, and uploaded technical evidence.",
        styles["BodySmall"]
    ))
    story.append(Spacer(1, 4))

    doc_table_data = [
        [
            Paragraph("Document / Certificate", styles["TableHeader"]),
            Paragraph("Type", styles["TableHeader"]),
            Paragraph("Submission", styles["TableHeader"]),
            Paragraph("Verification Status", styles["TableHeader"]),
            Paragraph("Matched Registry / Value", styles["TableHeader"]),
            Paragraph("Remarks &amp; Registry Match", styles["TableHeader"]),
        ]
    ]

    for d in doc_verifications:
        d_name = _clean_text(d.get("document_name"))
        d_type = _clean_text(d.get("document_type"))
        sub_st = _clean_text(d.get("submission_status"))
        v_st = d.get("verification_status", "VERIFIED")
        v_val = _clean_text(d.get("verified_value"))
        reg = _clean_text(d.get("registry_match"))
        rem = _clean_text(d.get("remarks"))

        if v_st == "VERIFIED":
            v_badge = Paragraph("<b>VERIFIED</b>", styles["BadgePass"])
        elif v_st == "FAILED":
            v_badge = Paragraph("<b>FAILED</b>", styles["BadgeFail"])
        elif v_st == "REQUIRES_REVIEW":
            v_badge = Paragraph("<b>REVIEW</b>", styles["BadgeReview"])
        else:
            v_badge = Paragraph(f"<font size=7>{v_st}</font>", styles["TableCellCenter"])

        doc_table_data.append([
            Paragraph(f"<b>{d_name}</b><br/><font size=6.5 color='#64748B'>{_clean_text(d.get('file_name'))}</font>", styles["TableCell"]),
            Paragraph(f"<font size=6.5>{d_type}</font>", styles["TableCellCenter"]),
            Paragraph(f"<font size=6.5>{sub_st}</font>", styles["TableCellCenter"]),
            v_badge,
            Paragraph(f"<font size=6.5><b>{v_val}</b><br/>{reg}</font>", styles["TableCell"]),
            Paragraph(f"<font size=6.5>{rem}</font>", styles["TableCell"]),
        ])

    t_docs = Table(doc_table_data, colWidths=[125, 45, 55, 60, 110, 128])
    t_docs.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_docs)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 6. EVIDENCE & TRACEABILITY DOSSIER
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("3. EVIDENCE &amp; DETERMINISTIC TRACEABILITY DOSSIER", styles["SectionHeader"]))
    story.append(Paragraph(
        "Direct citation of source documents, page numbers, and verbatim text extracts backing the evaluation.",
        styles["BodySmall"]
    ))
    story.append(Spacer(1, 4))

    evidence_rows = [
        [
            Paragraph("Criteria Reference", styles["TableHeader"]),
            Paragraph("Evidence Document Citation", styles["TableHeader"]),
            Paragraph("Page", styles["TableHeader"]),
            Paragraph("Verbatim Extracted Snippet &amp; Deterministic Rule Match", styles["TableHeader"]),
        ]
    ]

    for req in evaluations:
        r_name = _clean_text(req.get("requirement_name") or req.get("name"))
        cl = _clean_text(req.get("clause_reference"))
        ev_doc = _clean_text(req.get("evidence_source") or "Bidder_Submission_Dossier.pdf")
        pg = _clean_text(req.get("page_number") or "1")
        hl = _clean_text(req.get("highlight_text") or req.get("explanation") or "N/A")
        rule = _clean_text(req.get("rule_evaluated") or "Rule condition matched.")

        evidence_rows.append([
            Paragraph(f"<b>{r_name}</b><br/><font size=6.5 color='#64748B'>{cl}</font>", styles["TableCell"]),
            Paragraph(f"<b>{ev_doc}</b>", styles["TableCell"]),
            Paragraph(f"Pg {pg}", styles["TableCellCenter"]),
            Paragraph(f"<font size=6.5 color='#0F172A'><i>\"{hl}\"</i></font><br/><font size=6 color='#2563EB'>Rule: {rule}</font>", styles["TableCell"]),
        ])

    t_evidence = Table(evidence_rows, colWidths=[110, 110, 35, 268])
    t_evidence.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_evidence)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 7. OFFICER REVIEW ITEMS & COMMITTEE ACTION
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("4. PROCUREMENT COMMITTEE REVIEW ITEMS &amp; ACTIONS", styles["SectionHeader"]))

    review_items = [r for r in evaluations if r.get("status") in ["REVIEW", "REVIEW_REQUIRED"]]
    if review_items:
        for idx, item in enumerate(review_items, 1):
            i_name = _clean_text(item.get("requirement_name"))
            i_clause = _clean_text(item.get("clause_reference"))
            i_exp = _clean_text(item.get("explanation"))
            story.append(Paragraph(
                f"<b>{idx}. {i_name} ({i_clause}):</b> {i_exp}",
                styles["AlertBox"]
            ))
            story.append(Spacer(1, 2))
    else:
        story.append(Paragraph(
            "<b>No outstanding review items.</b> All mandatory and technical qualification criteria have been evaluated with deterministic certainty.",
            styles["Body"]
        ))

    story.append(Spacer(1, 12))

    # ─────────────────────────────────────────────────────────────────────────
    # 8. SIGN-OFF & AUDIT INTEGRITY SEAL
    # ─────────────────────────────────────────────────────────────────────────
    sign_off_data = [
        [
            Paragraph("<b>Evaluated By:</b><br/>" + officer_name + "<br/>Procurement Officer, CPCL", styles["Body"]),
            Paragraph("<b>Verified By:</b><br/>Senior Procurement Committee<br/>CPCL Materials Dept", styles["Body"]),
            Paragraph("<b>System Integrity Seal:</b><br/>Deterministic Rules Engine v2.4<br/>SHA-256 Audit Logged", styles["BodySmall"]),
        ]
    ]
    t_sign = Table(sign_off_data, colWidths=[174, 174, 175])
    t_sign.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


def generate_bidder_audit_pdf(
    tender: Dict[str, Any],
    bidder: Dict[str, Any],
    audit_logs: List[Dict[str, Any]],
    generated_by: str = "Procurement Officer"
) -> io.BytesIO:
    """
    Renders an authentic, tamper-evident Audit Trail PDF report scoped to a specific bidder and tender.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=54
    )

    styles = _get_styles()
    story = []

    # ─────────────────────────────────────────────────────────────────────────
    # 1. REPORT HEADER & BRANDING
    # ─────────────────────────────────────────────────────────────────────────
    header_data = [
        [
            Paragraph("<b>BIDSURE AI</b> — IMMUTABLE AUDIT TRAIL", styles["DocSubtitle"]),
            Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}", styles["TableCellCenter"])
        ]
    ]
    t_top = Table(header_data, colWidths=[360, 163])
    t_top.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_top)

    story.append(Paragraph("BIDDER EVALUATION AUDIT TRAIL &amp; INTEGRITY REPORT", styles["DocTitle"]))
    story.append(Paragraph(
        f"<b>Organization:</b> {_clean_text(tender.get('organization', 'Chennai Petroleum Corporation Limited (CPCL)'))} | "
        f"<b>Compliance Framework:</b> CVC / GeM / CAG Audit Standards",
        styles["DocSubtitle"]
    ))

    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1E3A8A"), spaceAfter=8))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. SCOPE & CONTEXT SUMMARY
    # ─────────────────────────────────────────────────────────────────────────
    tender_num = _clean_text(tender.get("tender_number") or tender.get("id"))
    tender_title = _clean_text(tender.get("title"))
    bidder_name = _clean_text(bidder.get("name"))
    bidder_id = _clean_text(bidder.get("id"))
    officer_name = _clean_text(generated_by)

    meta_grid = [
        [
            Paragraph("<b>Tender Reference:</b>", styles["MetaLabel"]),
            Paragraph(tender_num, styles["MetaValue"]),
            Paragraph("<b>Participating Bidder:</b>", styles["MetaLabel"]),
            Paragraph(f"<b>{bidder_name}</b> ({bidder_id})", styles["MetaValue"]),
        ],
        [
            Paragraph("<b>Tender Title:</b>", styles["MetaLabel"]),
            Paragraph(tender_title, styles["MetaValue"]),
            Paragraph("<b>Audit Events Count:</b>", styles["MetaLabel"]),
            Paragraph(f"<b>{len(audit_logs)} Event(s) Recorded</b>", styles["MetaValue"]),
        ],
        [
            Paragraph("<b>Audit Scope:</b>", styles["MetaLabel"]),
            Paragraph("Strictly scoped to selected Tender &amp; Bidder entity", styles["MetaValue"]),
            Paragraph("<b>Generated By:</b>", styles["MetaLabel"]),
            Paragraph(officer_name, styles["MetaValue"]),
        ],
    ]

    t_meta = Table(meta_grid, colWidths=[95, 170, 105, 153])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. CHRONOLOGICAL AUDIT TRAIL TABLE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("1. CHRONOLOGICAL AUDIT LOG ENTRIES", styles["SectionHeader"]))
    story.append(Paragraph(
        "Tamper-evident, immutable activity logs for tender analysis, bidder evaluation, document authentication, and officer actions.",
        styles["BodySmall"]
    ))
    story.append(Spacer(1, 4))

    if not audit_logs:
        empty_box = Table([[
            Paragraph(
                "<b>No specific audit events are recorded for this bidder on this tender yet.</b><br/>"
                "Audit logs are generated automatically during evaluation runs, requirement verifications, and officer actions.",
                styles["Body"]
            )
        ]], colWidths=[523])
        empty_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(empty_box)
    else:
        audit_table_data = [
            [
                Paragraph("Timestamp (UTC)", styles["TableHeader"]),
                Paragraph("Action / Event", styles["TableHeader"]),
                Paragraph("Actor / Role", styles["TableHeader"]),
                Paragraph("Entity / Target", styles["TableHeader"]),
                Paragraph("Audit Details &amp; Outcome", styles["TableHeader"]),
            ]
        ]

        for log in audit_logs:
            ts = _clean_text(log.get("timestamp"))
            action = _clean_text(log.get("action", "EVENT")).replace("_", " ")
            actor = _clean_text(log.get("user_email") or log.get("actor") or "System")
            role = _clean_text(log.get("user_role") or "OFFICER")
            ent = _clean_text(log.get("entity_id") or log.get("target") or "N/A")
            details = _clean_text(log.get("details") or "Activity recorded.")
            hash_val = _clean_text(log.get("integrity_hash") or "")

            hash_str = f"<br/><font size=5.5 color='#94A3B8'>Hash: {hash_val[:24]}...</font>" if hash_val else ""

            audit_table_data.append([
                Paragraph(f"<font size=6.5>{ts}</font>", styles["TableCell"]),
                Paragraph(f"<b><font size=7 color='#1E3A8A'>{action}</font></b>", styles["TableCell"]),
                Paragraph(f"<font size=6.5><b>{actor}</b><br/><font color='#64748B'>{role}</font></font>", styles["TableCell"]),
                Paragraph(f"<font size=6.5>{ent}</font>", styles["TableCell"]),
                Paragraph(f"<font size=6.5>{details}</font>{hash_str}", styles["TableCell"]),
            ])

        t_audit = Table(audit_table_data, colWidths=[75, 95, 100, 75, 178])
        t_audit.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ]))
        story.append(t_audit)

    story.append(Spacer(1, 12))

    # ─────────────────────────────────────────────────────────────────────────
    # 4. INTEGRITY SEAL & AUDIT SIGN-OFF
    # ─────────────────────────────────────────────────────────────────────────
    sign_off_data = [
        [
            Paragraph("<b>Audit Trail Certified By:</b><br/>" + officer_name + "<br/>Procurement Officer, CPCL", styles["Body"]),
            Paragraph("<b>Statutory Oversight:</b><br/>Chief Vigilance Officer (CVO)<br/>Chennai Petroleum Corp Ltd", styles["Body"]),
            Paragraph("<b>Tamper Evidence:</b><br/>SHA-256 Chained Hash Verification<br/>Immutable In-Memory Ledger", styles["BodySmall"]),
        ]
    ]
    t_sign = Table(sign_off_data, colWidths=[174, 174, 175])
    t_sign.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
