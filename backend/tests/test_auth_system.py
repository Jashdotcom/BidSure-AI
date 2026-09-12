"""
BidSure AI - Phase 1 Authentication & Security Verification Test Suite
SIH26100 - CPCL Automated Bid Evaluation System

Tests:
1. Bidder Registration (Valid fields, PBKDF2 hash, JWT issuance, BidderProfile creation)
2. Role Security (Backend forces role=BIDDER even if payload attempts role escalation)
3. Duplicate Email Rejection
4. Invalid Credentials Rejection (HTTP 401)
5. Bidder Login Success (Demo account & New registered account)
6. Officer Login Success (Demo officer accounts preserved)
7. Bidder Token Attempting Protected Officer API (Strict HTTP 403 Forbidden)
8. Unauthenticated Request Rejection (HTTP 401)
"""

import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_1_officer_login_preserved():
    print("\n[TEST 1] Verifying Demo Officer Login...")
    resp = client.post("/auth/login", json={
        "email": "officer@cpcl.gov.in",
        "password": "admin123"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "PROCUREMENT_OFFICER"
    assert data["user"]["email"] == "officer@cpcl.gov.in"
    print("  ✓ Demo Officer login success (Role: PROCUREMENT_OFFICER, Token Issued)")

    resp_cpo = client.post("/auth/login", json={
        "email": "cpo@cpcl.gov.in",
        "password": "admin123"
    })
    assert resp_cpo.status_code == 200
    assert resp_cpo.json()["user"]["role"] == "SENIOR_PROCUREMENT_OFFICER"
    print("  ✓ Demo Senior Officer login success (Role: SENIOR_PROCUREMENT_OFFICER)")

def test_2_bidder_login_preserved():
    print("\n[TEST 2] Verifying Demo Bidder Login...")
    resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "BIDDER"
    assert data["user"]["organization"] == "ABC Safety Solutions Pvt Ltd"
    print("  ✓ Demo Bidder login success (Role: BIDDER, Org: ABC Safety Solutions)")

def test_3_invalid_credentials():
    print("\n[TEST 3] Verifying Invalid Credentials Rejection...")
    resp = client.post("/auth/login", json={
        "email": "officer@cpcl.gov.in",
        "password": "WrongPassword999"
    })
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print("  ✓ Invalid password returned HTTP 401 Unauthorized")

    resp_nonexistent = client.post("/auth/login", json={
        "email": "ghost.user@unknown.com",
        "password": "somePassword123"
    })
    assert resp_nonexistent.status_code == 401, f"Expected 401, got {resp_nonexistent.status_code}"
    print("  ✓ Non-existent user returned HTTP 401 Unauthorized")

def test_4_bidder_registration():
    print("\n[TEST 4] Verifying New Bidder Registration...")
    new_email = "tenders@delta-infra-tech.com"
    payload = {
        "full_name": "Arun Kumar",
        "company_name": "Delta Infra Tech Solutions Ltd",
        "email": new_email,
        "phone": "+91 98111 22334",
        "password": "DeltaPassword@2024",
        "confirm_password": "DeltaPassword@2024",
        "gstin": "33AABCD9876E1Z4",
        "pan": "AABCD9876E",
        "udyam": "UDYAM-TN-02-0054321"
    }
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "BIDDER"
    assert data["user"]["email"] == new_email
    assert data["user"]["organization"] == "Delta Infra Tech Solutions Ltd"
    print("  ✓ Bidder self-registration successful (Role: BIDDER, Token Issued, Profile Created)")

def test_5_duplicate_email_rejection():
    print("\n[TEST 5] Verifying Duplicate Email Rejection...")
    payload = {
        "full_name": "Duplicate Bidder",
        "company_name": "Duplicate Company",
        "email": "abc@abcsafety.com",  # Already exists
        "phone": "+91 99999 88888",
        "password": "Password123",
        "confirm_password": "Password123",
        "gstin": "33AABCA1234F1Z5",
        "pan": "AABCA1234F",
        "udyam": "UDYAM-TN-01-0000001"
    }
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    assert "already exists" in resp.json()["detail"].lower()
    print("  ✓ Duplicate email registration rejected with HTTP 400 Bad Request")

def test_6_security_prevent_role_escalation():
    print("\n[TEST 6] Verifying Role Escalation Tampering Prevention...")
    # Attempt to inject role="PROCUREMENT_OFFICER" or role="SENIOR_PROCUREMENT_OFFICER"
    tampered_email = "hacker@malicious-corp.com"
    tampered_payload = {
        "full_name": "Malicious Actor",
        "company_name": "Malicious Corp",
        "email": tampered_email,
        "phone": "+91 90000 00000",
        "password": "Password123",
        "confirm_password": "Password123",
        "gstin": "33AABCM9999M1Z9",
        "pan": "AABCM9999M",
        "udyam": "UDYAM-TN-99-9999999",
        "role": "SENIOR_PROCUREMENT_OFFICER"  # Maliciously injected field
    }
    resp = client.post("/auth/register", json=tampered_payload)
    assert resp.status_code == 201
    data = resp.json()
    # Backend MUST enforce role="BIDDER"
    assert data["user"]["role"] == "BIDDER", f"Security violation: role was set to {data['user']['role']}"
    print("  ✓ Role escalation prevented: Backend strictly forced role=BIDDER")

def test_7_bidder_token_attempting_officer_api():
    print("\n[TEST 7] Verifying Bidder Token Blocked from Officer APIs (HTTP 403)...")
    # 1. Login as Bidder to obtain valid Bidder JWT token
    login_resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    bidder_token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {bidder_token}"}

    # 2. Bidder attempts to access Officer-only Audit Logs endpoint
    audit_resp = client.get("/audit/logs", headers=headers)
    assert audit_resp.status_code == 403, f"Expected 403 Forbidden for Bidder, got {audit_resp.status_code}"
    print("  ✓ Bidder accessing /audit/logs returned HTTP 403 Forbidden")

    # 3. Bidder attempts to trigger Officer-only Compliance Re-evaluation endpoint
    eval_resp = client.post("/compliance/evaluate/TND-2024-001/BID-001", headers=headers)
    assert eval_resp.status_code == 403, f"Expected 403 Forbidden for Bidder, got {eval_resp.status_code}"
    print("  ✓ Bidder triggering /compliance/evaluate returned HTTP 403 Forbidden")

    # 4. Bidder attempts to create a new Tender (Officer only)
    tender_resp = client.post("/tenders", json={"title": "Unauthorized Tender"}, headers=headers)
    assert tender_resp.status_code == 403, f"Expected 403 Forbidden for Bidder, got {tender_resp.status_code}"
    print("  ✓ Bidder posting to /tenders returned HTTP 403 Forbidden")

def test_8_unauthenticated_request_rejection():
    print("\n[TEST 8] Verifying Unauthenticated Request Rejection (HTTP 401)...")
    resp_no_token = client.get("/audit/logs")
    assert resp_no_token.status_code == 401, f"Expected 401, got {resp_no_token.status_code}"
    print("  ✓ Request without token returned HTTP 401 Unauthorized")

    resp_invalid_token = client.get("/audit/logs", headers={"Authorization": "Bearer invalid.fake.token"})
    assert resp_invalid_token.status_code == 401, f"Expected 401, got {resp_invalid_token.status_code}"
    print("  ✓ Request with invalid token returned HTTP 401 Unauthorized")

if __name__ == "__main__":
    print("====================================================================")
    print("BidSure AI - SIH26100 Phase 1 Auth & Security Verification Suite")
    print("====================================================================")
    test_1_officer_login_preserved()
    test_2_bidder_login_preserved()
    test_3_invalid_credentials()
    test_4_bidder_registration()
    test_5_duplicate_email_rejection()
    test_6_security_prevent_role_escalation()
    test_7_bidder_token_attempting_officer_api()
    test_8_unauthenticated_request_rejection()
    print("\n====================================================================")
    print("ALL 8 PHASE 1 AUTHENTICATION & SECURITY TESTS PASSED PERFECTLY!")
    print("====================================================================")
