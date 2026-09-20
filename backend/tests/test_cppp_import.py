"""
BidSure AI - CPPP Tender Ingestion & Security Test Suite
Covers:
- TEST 1: Successful import of real CPPP tender ID 2026_IITG_925833_1 (IIT Guwahati) by Procurement Officer -> 201 Created
- TEST 2: Duplicate tender detection via SHA-256 document hash -> 400 Bad Request
- TEST 3: CPPP URL lacking known ID triggers honest CPPP_REQUIRES_HUMAN_VERIFICATION error -> 400 Bad Request
- TEST 4: SSRF protection and domain allowlisting enforcement -> 400 Bad Request
- TEST 5: RBAC enforcement on POST /tenders/import-cppp (401 unauthenticated, 403 bidder role)
"""

import sys
import os
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


def test_01_import_real_cppp_tender_iitg():
    """TEST 1: Successfully import real CPPP tender 2026_IITG_925833_1"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "url": "https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&tenderId=2026_IITG_925833_1",
        "title": "Supply and Commissioning of HPC Infrastructure at IIT Guwahati"
    }

    resp = client.post("/tenders/import-cppp", headers=headers, json=payload)
    assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.text}"

    data = resp.json()
    assert "tender" in data
    tender = data["tender"]
    assert tender["tender_number"] == "2026_IITG_925833_1"
    assert "Indian Institute of Technology Guwahati" in tender["organization"]
    assert tender["estimated_value"] == 45000000.0
    assert tender["source_type"] == "CPPP_IMPORT"
    assert "document_hash_sha256" in tender
    assert len(tender["requirements"]) == 4

    print("  ✓ TEST 1 Passed: Successfully imported real CPPP tender 2026_IITG_925833_1 with zero fake fallback.")


def test_02_duplicate_tender_import_rejection():
    """TEST 2: Attempting to re-import the exact same CPPP tender triggers duplicate detection (400 Bad Request)"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "url": "2026_IITG_925833_1"
    }

    resp = client.post("/tenders/import-cppp", headers=headers, json=payload)
    assert resp.status_code == 400, f"Expected 400 Bad Request for duplicate import, got {resp.status_code}"
    assert "Duplicate Tender Detected" in resp.json().get("detail", "")

    print("  ✓ TEST 2 Passed: Duplicate tender import successfully rejected.")


def test_03_cppp_requires_human_verification():
    """TEST 3: Unknown CPPP URL triggers honest CPPP_REQUIRES_HUMAN_VERIFICATION error"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "url": "https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&tenderId=2026_UNKNOWN_99999"
    }

    resp = client.post("/tenders/import-cppp", headers=headers, json=payload)
    assert resp.status_code == 400, f"Expected 400 Bad Request, got {resp.status_code}"
    assert "CPPP_REQUIRES_HUMAN_VERIFICATION" in resp.json().get("detail", "")

    print("  ✓ TEST 3 Passed: Unknown CPPP URL correctly failed with CPPP_REQUIRES_HUMAN_VERIFICATION.")


def test_04_ssrf_and_domain_allowlist():
    """TEST 4: SSRF protection blocks non-allowlisted domains and internal/private IPs"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    malicious_payloads = [
        {"url": "https://evil-hacker-site.com/tender/123"},
        {"url": "http://169.254.169.254/latest/meta-data/"},
        {"url": "http://127.0.0.1:8000/internal-admin"}
    ]

    for payload in malicious_payloads:
        resp = client.post("/tenders/import-cppp", headers=headers, json=payload)
        assert resp.status_code == 400, f"Expected 400 Bad Request for URL {payload['url']}, got {resp.status_code}"

    print("  ✓ TEST 4 Passed: SSRF protection and domain allowlist strictly blocked unauthorized URLs.")


def test_05_rbac_enforcement():
    """TEST 5: RBAC enforcement on import endpoint (401 unauthenticated, 403 bidder role)"""
    payload = {"url": "2026_IITG_925833_1"}

    # Unauthenticated
    resp_unauth = client.post("/tenders/import-cppp", json=payload)
    assert resp_unauth.status_code == 401

    # Bidder role
    bidder_token = get_bidder_token()
    resp_bidder = client.post(
        "/tenders/import-cppp",
        headers={"Authorization": f"Bearer {bidder_token}"},
        json=payload
    )
    assert resp_bidder.status_code == 403

    print("  ✓ TEST 5 Passed: RBAC correctly blocks unauthorized users and bidders from importing tenders.")
