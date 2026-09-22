"""
BidSure AI - Manual Tender PDF Import Test Suite
Covers:
- TEST 1: Successful manual import of authentic NIT tender PDF with real metadata (IIT Guwahati) -> 201 Created
- TEST 2: Duplicate manual upload rejection via SHA-256 document hash -> 400 Bad Request
- TEST 3: Unparseable/invalid PDF lacking tender metadata triggers honest TENDER_METADATA_EXTRACTION_FAILED -> 400 Bad Request
- TEST 4: Non-PDF file upload rejection -> 400 Bad Request
- TEST 5: RBAC enforcement on POST /tenders/import-manual (401 unauthenticated, 403 bidder role)
"""

import sys
import os
import io
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

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


def create_authentic_nit_pdf() -> bytes:
    """Creates a sample authentic NIT PDF matching Indian tender conventions."""
    import fitz
    doc = fitz.open()

    p1 = doc.new_page(width=595, height=842)
    p1_text = """INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI
Central Procurement & Stores Division, Guwahati - 781039, Assam

NOTICE INVITING TENDER (NIT)
Tender Reference No: EPT/SNP/CC/EQT-26.1134
Tender ID: 2026_IITG_925834_1
Title / Work Description: Supply and installation of Next Generation Firewall Solution at IIT Guwahati

TENDER SCHEDULE & CRITICAL DATES:
Published Date: 15-Sep-2026 09:00 AM
Bid Submission End Date: 15-Oct-2026 06:00 PM
Bid Opening Date: 16-Oct-2026 03:00 PM

ESTIMATED VALUE & EMD:
Tender Value: NA
EMD Amount: ₹ 11,00,000 (Eleven Lakhs Only)

ELIGIBILITY CRITERIA & REQUIREMENTS:
1. Minimum average annual financial turnover of INR 10 Crore during the last 3 financial years.
2. OEM Authorization Certificate (Manufacturer Authorization Form) from OEM.
3. Minimum 50% Class-I Local Content under Public Procurement (Preference to Make in India) Order.
4. Experience of successfully completing at least 2 similar enterprise firewall projects in Central Govt/IITs/PSUs.
"""
    p1.insert_text((50, 72), p1_text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_01_import_authentic_manual_tender_pdf():
    """TEST 1: Successfully import authentic NIT PDF with real extracted metadata"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = create_authentic_nit_pdf()
    files = {
        "file": ("Tender 1.pdf", io.BytesIO(pdf_bytes), "application/pdf")
    }

    resp = client.post("/tenders/import-manual", headers=headers, files=files)
    assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.text}"

    data = resp.json()
    assert "tender" in data
    tender = data["tender"]

    # Verify extracted metadata
    assert tender["tender_number"] == "2026_IITG_925834_1"
    assert "Indian Institute of Technology Guwahati" in tender["organization"]
    assert "Next Generation Firewall" in tender["title"]
    assert tender["emd_amount"] == 1100000.0
    assert tender["estimated_value_display"] == "NA"
    assert tender["deadline"] == "15 Oct 2026"
    assert "2026-10-15" in tender["closing_date"]
    assert tender["source_type"] == "MANUAL_UPLOAD"
    assert "document_hash_sha256" in tender
    assert len(tender["requirements"]) >= 3

    print("  ✓ TEST 1 Passed: Successfully imported authentic manual tender PDF with real metadata.")


def test_02_duplicate_manual_import_rejection():
    """TEST 2: Attempting to re-upload identical PDF triggers duplicate detection (400 Bad Request)"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = create_authentic_nit_pdf()
    files = {
        "file": ("Tender_1_Duplicate.pdf", io.BytesIO(pdf_bytes), "application/pdf")
    }

    resp = client.post("/tenders/import-manual", headers=headers, files=files)
    assert resp.status_code == 400, f"Expected 400 Bad Request, got {resp.status_code}: {resp.text}"
    assert "Duplicate Tender Detected" in resp.json().get("detail", "")

    print("  ✓ TEST 2 Passed: Duplicate manual tender upload correctly rejected by SHA-256 hash.")


def test_03_unparseable_pdf_triggers_honest_extraction_failed():
    """TEST 3: Unparseable PDF lacking tender metadata triggers honest TENDER_METADATA_EXTRACTION_FAILED"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    import fitz
    doc = fitz.open()
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 72), "Random grocery shopping list: Milk, Eggs, Bread, Butter.", fontsize=12)
    unparseable_bytes = doc.tobytes()
    doc.close()

    files = {
        "file": ("Shopping_List.pdf", io.BytesIO(unparseable_bytes), "application/pdf")
    }

    resp = client.post("/tenders/import-manual", headers=headers, files=files)
    assert resp.status_code == 400, f"Expected 400 Bad Request, got {resp.status_code}: {resp.text}"
    assert "TENDER_METADATA_EXTRACTION_FAILED" in resp.json().get("detail", "")

    print("  ✓ TEST 3 Passed: Non-tender document correctly rejected with TENDER_METADATA_EXTRACTION_FAILED.")


def test_04_reject_non_pdf():
    """TEST 4: Non-PDF manual upload is rejected with 400 Bad Request"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    files = {
        "file": ("tender_document.docx", io.BytesIO(b"Fake docx bytes"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }

    resp = client.post("/tenders/import-manual", headers=headers, files=files)
    assert resp.status_code == 400, f"Expected 400 Bad Request, got {resp.status_code}"
    assert "PDF" in resp.json().get("detail", "")

    print("  ✓ TEST 4 Passed: Non-PDF format correctly rejected.")


def test_05_rbac_enforcement():
    """TEST 5: RBAC enforcement on POST /tenders/import-manual (401 unauthenticated, 403 bidder)"""
    pdf_bytes = create_authentic_nit_pdf()

    # 1. Unauthenticated
    files1 = {"file": ("tender.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    resp_unauth = client.post("/tenders/import-manual", files=files1)
    assert resp_unauth.status_code == 401

    # 2. Bidder role
    bidder_token = get_bidder_token()
    files2 = {"file": ("tender.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    resp_bidder = client.post(
        "/tenders/import-manual",
        headers={"Authorization": f"Bearer {bidder_token}"},
        files=files2
    )
    assert resp_bidder.status_code == 403

    print("  ✓ TEST 5 Passed: RBAC properly prevents unauthorized users and bidders from manual import.")
