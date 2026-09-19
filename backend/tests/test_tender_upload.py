"""
BidSure AI - Tender Document Upload & IDP OCR Test Suite
SIH26100 - CPCL Automated Bid Evaluation System

Covers:
- TEST 1: POST /tenders/upload-document with valid PDF by Procurement Officer -> 200 OK with extracted clauses
- TEST 2: Rejection of non-PDF files (.txt / .exe / .docx) -> 400 Bad Request
- TEST 3: Rejection of empty (0-byte) PDF files -> 400 Bad Request
- TEST 4: Rejection of files exceeding 50 MB limit -> 413 Request Entity Too Large
- TEST 5: RBAC enforcement - unauthenticated (401) and bidder role (403)
- TEST 6: POST /tenders/analyze-document preset pipeline backwards compatibility
- TEST 7: Audit log recording for document upload & AI extraction
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

    # Create dummy PDF bytes
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

    # Attempt to upload a .txt file
    files = {
        "file": ("tender_specifications.txt", io.BytesIO(b"Sample text tender"), "text/plain")
    }
    resp = client.post("/tenders/upload-document", headers=headers, files=files)
    assert resp.status_code == 400, f"Expected 400 Bad Request for .txt file, got {resp.status_code}"
    assert "PDF" in resp.json().get("detail", "")

    # Attempt to upload an executable or script
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

    # Create dummy bytes slightly above 50 MB: 50 * 1024 * 1024 + 1024 bytes
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

    # 1. Unauthenticated request -> 401
    resp_unauth = client.post("/tenders/upload-document", files={"file": ("tender.pdf", fake_pdf, "application/pdf")})
    assert resp_unauth.status_code == 401, f"Expected 401 Unauthorized, got {resp_unauth.status_code}"

    # 2. Bidder role request -> 403
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
    assert len(data["requirements"]) >= 4

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

    # Verify audit log in sample data
    audit_matches = [
        log for log in SAMPLE_AUDIT_LOGS
        if log.get("action") == "TENDER_AI_ANALYSIS_STARTED" and "Audit_Verification_Tender.pdf" in log.get("details", "")
    ]
    assert len(audit_matches) >= 1, "Audit log must contain record of uploaded tender document analysis"
    latest_log = audit_matches[-1]
    assert latest_log["status"] == "SUCCESS"
    assert latest_log["user_role"] in ["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]

    print("  ✓ TEST 7 Passed: Audit trail recorded with officer ID, action, and document details.")
