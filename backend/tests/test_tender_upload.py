"""
BidSure AI - Tender Document Upload & Grounded IDP OCR Test Suite
SIH26100 - CPCL Automated Bid Evaluation System

Covers:
- TEST 1: POST /tenders/upload-document with valid PDF by Procurement Officer -> 200 OK with extracted clauses
- TEST 2: Rejection of non-PDF files (.txt / .exe / .docx) -> 400 Bad Request
- TEST 3: Rejection of empty (0-byte) PDF files -> 400 Bad Request
- TEST 4: Rejection of files exceeding 50 MB limit -> 413 Request Entity Too Large
- TEST 5: RBAC enforcement - unauthenticated (401) and bidder role (403)
- TEST 6: POST /tenders/analyze-document preset pipeline backwards compatibility
- TEST 7: Audit log recording for document upload & AI extraction
- TEST 8: Grounded extraction of all 11 explicit requirements from 3-page CPCL_Industrial_PPE_Tender_Demo_2026.pdf
          with strict 1 <= source_page <= 3 boundary and zero template hallucination.
"""

import sys
import os
import io
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.data.sample_data import SAMPLE_AUDIT_LOGS

client = TestClient(app)

def get_officer_token() -> str:
    resp = client.post("/auth/login", json={
        "email": "officer@cpcl.gov.in",
        "password": "admin123"
    })
    assert resp.status_code == 200, f"Officer login failed: {resp.text}"
    return resp.json()["access_token"]

def get_bidder_token() -> str:
    resp = client.post("/auth/login", json={
        "email": "vendor@chennaisafety.com",
        "password": "password123"
    })
    assert resp.status_code == 200, f"Bidder login failed: {resp.text}"
    return resp.json()["access_token"]


def test_01_upload_valid_pdf():
    """TEST 1: Upload a valid custom PDF returns 200 OK and extracted requirements"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    fake_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Title (CPCL Custom Tender Notice) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    files = {
        "file": ("CPCL_Custom_Turbine_Procurement_2026.pdf", io.BytesIO(fake_pdf_content), "application/pdf")
    }
    data = {
        "tender_id": "TND-2026-001"
    }

    resp = client.post("/tenders/upload-document", headers=headers, files=files, data=data)
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}: {resp.text}"

    result = resp.json()
    assert result["status"] == "COMPLETED"
    assert "job_id" in result
    assert result["job_id"].startswith("JOB-AI-")
    assert result["filename"] == "CPCL_Custom_Turbine_Procurement_2026.pdf"
    assert result["tender_id"] == "TND-2026-001"
    assert "requirements" in result
    assert isinstance(result["requirements"], list)
    assert len(result["requirements"]) > 0
    assert result["ocr_confidence"] >= 0.95
    assert result["total_pages"] >= 1

    # Verify each requirement has expected keys
    for req in result["requirements"]:
        assert "id" in req
        assert "name" in req
        assert "category" in req
        assert "mandatory" in req
        assert "clause_reference" in req
        assert "evidence_text" in req
        assert req["review_status"] in ["NEEDS_REVIEW", "VERIFIED"]

    print(f"\n  ✓ TEST 1 Passed: Successfully uploaded PDF and extracted {len(result['requirements'])} requirements.")


def test_02_reject_non_pdf():
    """TEST 2: Rejection of non-PDF document formats with 400 Bad Request"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    files = {
        "file": ("tender_specifications.txt", io.BytesIO(b"Sample text tender"), "text/plain")
    }
    resp = client.post("/tenders/upload-document", headers=headers, files=files)
    assert resp.status_code == 400, f"Expected 400 Bad Request for .txt file, got {resp.status_code}"
    assert "PDF" in resp.json().get("detail", "")

    files_exe = {
        "file": ("malicious_script.sh", io.BytesIO(b"#!/bin/bash\necho hi"), "application/x-sh")
    }
    resp_exe = client.post("/tenders/upload-document", headers=headers, files=files_exe)
    assert resp_exe.status_code == 400
    assert "PDF" in resp_exe.json().get("detail", "")

    print("  ✓ TEST 2 Passed: Non-PDF file uploads rejected with 400 Bad Request.")


def test_03_reject_empty_file():
    """TEST 3: Rejection of 0-byte empty PDF files with 400 Bad Request"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    files = {
        "file": ("empty_tender.pdf", io.BytesIO(b""), "application/pdf")
    }
    resp = client.post("/tenders/upload-document", headers=headers, files=files)
    assert resp.status_code == 400, f"Expected 400 Bad Request for 0-byte file, got {resp.status_code}"
    assert "empty" in resp.json().get("detail", "").lower()

    print("  ✓ TEST 3 Passed: 0-byte empty PDF files rejected with 400 Bad Request.")


def test_04_reject_oversized_file():
    """TEST 4: Rejection of files exceeding 50 MB limit with 413 Entity Too Large"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    oversized_bytes = b"%PDF-1.4\n" + b"0" * (50 * 1024 * 1024 + 1024)
    files = {
        "file": ("huge_tender_rfp.pdf", io.BytesIO(oversized_bytes), "application/pdf")
    }
    resp = client.post("/tenders/upload-document", headers=headers, files=files)
    assert resp.status_code == 413, f"Expected 413 Request Entity Too Large, got {resp.status_code}: {resp.text}"
    assert "50 MB" in resp.json().get("detail", "")

    print("  ✓ TEST 4 Passed: Files exceeding 50 MB limit rejected with 413 Payload Too Large.")


def test_05_rbac_enforcement():
    """TEST 5: Protected upload endpoint requires Procurement Officer credentials"""
    fake_pdf = io.BytesIO(b"%PDF-1.4\nValid minimal PDF content\n%%EOF")

    resp_unauth = client.post("/tenders/upload-document", files={"file": ("tender.pdf", fake_pdf, "application/pdf")})
    assert resp_unauth.status_code == 401, f"Expected 401 Unauthorized, got {resp_unauth.status_code}"

    bidder_token = get_bidder_token()
    fake_pdf.seek(0)
    resp_bidder = client.post(
        "/tenders/upload-document",
        headers={"Authorization": f"Bearer {bidder_token}"},
        files={"file": ("tender.pdf", fake_pdf, "application/pdf")}
    )
    assert resp_bidder.status_code == 403, f"Expected 403 Forbidden for bidder, got {resp_bidder.status_code}"

    print("  ✓ TEST 5 Passed: RBAC properly prevents unauthorized and bidder access (401/403).")


def test_06_analyze_preset_backward_compatibility():
    """TEST 6: Existing /analyze-document preset endpoint remains operational"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "filename": "CPCL_Fire_Safety_Tender_2026.pdf",
        "tender_id": "TND-2026-003"
    }
    resp = client.post("/tenders/analyze-document", headers=headers, json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "COMPLETED"
    assert data["tender_id"] == "TND-2026-003"
    assert len(data["requirements"]) >= 2

    print("  ✓ TEST 6 Passed: Preloaded preset analysis endpoint operates smoothly.")


def test_07_audit_trail_logging():
    """TEST 7: Document upload generates immutable audit trail record"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = b"%PDF-1.4\nAudit Log Test Document\n%%EOF"
    files = {
        "file": ("Audit_Verification_Tender.pdf", io.BytesIO(pdf_bytes), "application/pdf")
    }
    resp = client.post("/tenders/upload-document", headers=headers, files=files)
    assert resp.status_code == 200

    audit_matches = [
        log for log in SAMPLE_AUDIT_LOGS
        if log.get("action") == "TENDER_AI_ANALYSIS_STARTED" and "Audit_Verification_Tender.pdf" in log.get("details", "")
    ]
    assert len(audit_matches) >= 1, "Audit log must contain record of uploaded tender document analysis"
    latest_log = audit_matches[-1]
    assert latest_log["status"] == "SUCCESS"
    assert latest_log["user_role"] in ["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]

    print("  ✓ TEST 7 Passed: Audit trail recorded with officer ID, action, and document details.")


def test_08_grounded_ppe_tender_extraction_11_requirements():
    """
    TEST 8: Upload 3-page CPCL_Industrial_PPE_Tender_Demo_2026.pdf.
    Verifies:
    1. Exactly 11 explicit requirements extracted:
       1. At least 5 years relevant experience in supply of industrial safety equipment.
       2. At least 3 similar contracts during the last 5 financial years.
       3. Minimum average annual turnover of INR 5 Crore during the last 3 financial years.
       4. Valid PAN.
       5. Valid GST registration.
       6. Valid Udyam/MSME registration where applicable.
       7. OEM authorization.
       8. Minimum 20% local content.
       9. Valid EPFO and ESIC registration.
       10. Non-blacklisting declaration.
       11. Product safety certificates/test reports.
    2. Zero hallucinated criteria (no PSU/Hydrocarbon requirement, no Debarment & Vigilance Integrity Clearance, no EMD / MSME exemption).
    3. Source pages strictly bounded: 1 <= source_page <= 3 (NO Page 4 references!).
    4. Each requirement contains: id, name, category, mandatory, threshold_value, unit, source_page, evidence_text, confidence.
    """
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Construct a 3-page PDF with PyMuPDF or synthetically formatted pages
    import fitz
    doc = fitz.open()

    # Page 1 text: 4 requirements
    p1 = doc.new_page(width=595, height=842)
    p1_text = """CHENNAI PETROLEUM CORPORATION LIMITED (CPCL)
NOTICE INVITING TENDER: CPCL/PROC/2026/001
Title: Supply of Industrial PPE & Safety Helmets

SECTION II: PRE-QUALIFICATION CRITERIA (PQC) - MANDATORY REQUIREMENTS
1. At least 5 years relevant experience in supply of industrial safety equipment.
2. At least 3 similar contracts during the last 5 financial years.
3. Minimum average annual turnover of INR 5 Crore during the last 3 financial years.
4. Valid PAN issued by the Income Tax Department."""
    p1.insert_text((50, 72), p1_text, fontsize=11)

    # Page 2 text: 4 requirements
    p2 = doc.new_page(width=595, height=842)
    p2_text = """SECTION II (CONTINUED): STATUTORY & COMMERCIAL REQUIREMENTS
5. Valid GST registration certificate with active filing status.
6. Valid Udyam/MSME registration where applicable for statutory exemptions.
7. Valid direct OEM authorization letter (Manufacturer Authorization Form - MAF).
8. Minimum 20% local content declaration conforming to Make in India (MII) order."""
    p2.insert_text((50, 72), p2_text, fontsize=11)

    # Page 3 text: 3 requirements
    p3 = doc.new_page(width=595, height=842)
    p3_text = """SECTION III: VIGILANCE, STATUTORY & QUALITY COMPLIANCE
9. Valid EPFO and ESIC registration compliance with current challans.
10. Non-blacklisting declaration affidavit confirming bidder is not debarred.
11. Product safety certificates/test reports from accredited testing laboratories."""
    p3.insert_text((50, 72), p3_text, fontsize=11)

    pdf_bytes = doc.tobytes()
    doc.close()

    files = {
        "file": ("CPCL_Industrial_PPE_Tender_Demo_2026.pdf", io.BytesIO(pdf_bytes), "application/pdf")
    }
    data = {
        "tender_id": "TND-2026-001"
    }

    resp = client.post("/tenders/upload-document", headers=headers, files=files, data=data)
    assert resp.status_code == 200, f"Upload failed: {resp.text}"

    result = resp.json()
    assert result["filename"] == "CPCL_Industrial_PPE_Tender_Demo_2026.pdf"
    assert result["total_pages"] == 3, f"Expected 3 pages, got {result['total_pages']}"
    assert result["page_count"] == 3

    requirements = result["requirements"]
    assert len(requirements) == 11, f"Expected exactly 11 grounded requirements, got {len(requirements)}: {[r['name'] for r in requirements]}"

    # Verify Page bounds for all requirements: 1 <= source_page <= 3
    for r in requirements:
        sp = r["source_page"]
        assert 1 <= sp <= 3, f"Source page {sp} is outside valid 3-page range for requirement {r['name']}"
        assert r["evidence_text"] != "", f"Evidence text must be non-empty for {r['name']}"
        assert r["mandatory"] is True

    # 1. Experience Years requirement (5 years)
    exp_years = [r for r in requirements if r["code"] == "EXP_YEARS_MIN"]
    assert len(exp_years) == 1, "Must contain Experience Years requirement"
    assert exp_years[0]["threshold_value"] == 5
    assert exp_years[0]["unit"] == "Years"
    assert exp_years[0]["source_page"] == 1
    assert "5 years relevant experience" in exp_years[0]["evidence_text"].lower()

    # 2. Similar Contracts requirement (3 contracts)
    sim_contracts = [r for r in requirements if r["code"] == "EXP_SIMILAR_CONTRACTS"]
    assert len(sim_contracts) == 1, "Must contain Similar Contracts requirement"
    assert sim_contracts[0]["threshold_value"] == 3
    assert sim_contracts[0]["unit"] == "Contracts"
    assert sim_contracts[0]["source_page"] == 1
    assert "3 similar contracts" in sim_contracts[0]["evidence_text"].lower()

    # 3. Turnover requirement (5.0 Crore)
    turnover = [r for r in requirements if r["code"] == "TURNOVER_MIN"]
    assert len(turnover) == 1, "Must contain Turnover requirement"
    assert turnover[0]["threshold_value"] == 5.0
    assert turnover[0]["unit"] == "Crore INR"
    assert turnover[0]["source_page"] == 1
    assert "5 crore" in turnover[0]["evidence_text"].lower()

    # 4. PAN requirement
    pan_req = [r for r in requirements if r["code"] == "STAT_PAN_VALID"]
    assert len(pan_req) == 1, "Must contain PAN requirement"
    assert pan_req[0]["source_page"] == 1
    assert "pan" in pan_req[0]["evidence_text"].lower()

    # 5. GST registration
    gst_req = [r for r in requirements if r["code"] == "STAT_GST_REG"]
    assert len(gst_req) == 1, "Must contain GST requirement"
    assert gst_req[0]["source_page"] == 2
    assert "gst" in gst_req[0]["evidence_text"].lower()

    # 6. Udyam / MSME registration
    udyam_req = [r for r in requirements if r["code"] == "STAT_UDYAM_MSME"]
    assert len(udyam_req) == 1, "Must contain Udyam/MSME requirement"
    assert udyam_req[0]["source_page"] == 2
    assert "udyam" in udyam_req[0]["evidence_text"].lower() or "msme" in udyam_req[0]["evidence_text"].lower()

    # 7. OEM authorization
    oem_req = [r for r in requirements if r["code"] == "OEM_AUTHORIZATION"]
    assert len(oem_req) == 1, "Must contain OEM authorization requirement"
    assert oem_req[0]["source_page"] == 2
    assert "oem" in oem_req[0]["evidence_text"].lower() or "authorization" in oem_req[0]["evidence_text"].lower()

    # 8. Local Content (20%)
    lc_req = [r for r in requirements if r["code"] == "MII_LOCAL_CONTENT"]
    assert len(lc_req) == 1, "Must contain Local Content requirement"
    assert lc_req[0]["threshold_value"] == 20.0
    assert lc_req[0]["unit"] == "Percentage"
    assert lc_req[0]["source_page"] == 2
    assert "20%" in lc_req[0]["evidence_text"].lower()

    # 9. EPFO and ESIC
    epfo_req = [r for r in requirements if r["code"] == "STAT_EPFO_ESIC"]
    assert len(epFO_len := len(epfo_req)) == 1, "Must contain EPFO & ESIC requirement"
    assert epfo_req[0]["source_page"] == 3
    assert "epfo" in epfo_req[0]["evidence_text"].lower() or "esic" in epfo_req[0]["evidence_text"].lower()

    # 10. Non-blacklisting declaration
    vig_req = [r for r in requirements if r["code"] == "VIG_NON_BLACKLISTED"]
    assert len(vig_req) == 1, "Must contain Non-blacklisting requirement"
    assert vig_req[0]["source_page"] == 3
    assert "blacklisting" in vig_req[0]["evidence_text"].lower() or "debarred" in vig_req[0]["evidence_text"].lower()

    # 11. Product safety certificates/test reports
    cert_req = [r for r in requirements if r["code"] == "QUAL_SAFETY_CERTIFICATES"]
    assert len(cert_req) == 1, "Must contain Product safety certificates requirement"
    assert cert_req[0]["source_page"] == 3
    assert "safety" in cert_req[0]["evidence_text"].lower() or "certificates" in cert_req[0]["evidence_text"].lower()

    # CRITICAL: Verify NO hallucinated criteria from other presets
    req_names = [r["name"].lower() for r in requirements]
    assert not any("hydrocarbon" in name for name in req_names), "No PSU/Hydrocarbon sector requirement should appear"
    assert not any("earnest money" in name or "emd" in name for name in req_names), "No EMD requirement should appear"
    assert not any("debarment & vigilance integrity clearance" in name for name in req_names), "No template Vigilance clearance should appear"

    # CRITICAL: Verify NO Page 4 references
    for r in requirements:
        assert r["source_page"] <= 3, f"Requirement {r['name']} references Page {r['source_page']} which exceeds document length of 3 pages"

    print("\n  ✓ TEST 8 Passed: All 11 explicit requirements extracted with 100% source grounding and zero hallucinations.")
