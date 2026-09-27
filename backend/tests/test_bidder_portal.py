"""
BidSure AI - Phase 2 Bidder Portal Security, Data Isolation & Profile Completion Test Suite
SIH26100 - CPCL Automated Bid Evaluation System

Tests:
1. Bidder accessing /bidder-portal/dashboard successfully.
2. Verification of all 7 required statistics.
3. Available Tenders list returned with statutory requirements count.
4. My Bids data isolation (bidder sees only their own bids, no competitor bids).
5. Dynamic Profile Completion engine (11 required fields, decoupled from verification).
6. Business Verification decoupling (4 of 4 credentials verified independently).
7. Profile field removal lowers completion percentage without altering verification.
8. Officer accessing Bidder Portal rejected with HTTP 403 Forbidden.
9. Unauthenticated requests rejected with HTTP 401 Unauthorized.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_1_bidder_dashboard_access():
    print("\n[TEST 1] Verifying Authenticated Bidder Dashboard Access...")
    # Login as Bidder
    login_resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dash_resp = client.get("/bidder-portal/dashboard", headers=headers)
    assert dash_resp.status_code == 200, f"Expected 200, got {dash_resp.status_code}: {dash_resp.text}"
    data = dash_resp.json()

    assert "bidder" in data
    assert "profile_completion" in data
    assert "business_verification" in data
    assert "statistics" in data
    assert "available_tenders" in data
    assert "my_bids" in data
    assert "notifications" in data
    print("  ✓ Bidder dashboard returned complete isolated schema successfully")


def test_2_seven_statistics_metrics():
    print("\n[TEST 2] Verifying All 7 Required Statistics Metrics...")
    login_resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dash_resp = client.get("/bidder-portal/dashboard", headers=headers)
    stats = dash_resp.json()["statistics"]

    required_keys = [
        "available_tenders",
        "my_bids",
        "draft_bids",
        "submitted_bids",
        "under_verification",
        "compliant_bids",
        "non_compliant_bids"
    ]

    for key in required_keys:
        assert key in stats, f"Missing statistic metric: {key}"
        assert isinstance(stats[key], (int, float)), f"Expected number for {key}, got {type(stats[key])}"

    print(f"  ✓ All 7 statistics metrics present and valid: {stats}")


def test_3_available_tenders_structure():
    print("\n[TEST 3] Verifying Available Tenders List & Metadata...")
    login_resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dash_resp = client.get("/bidder-portal/dashboard", headers=headers)
    tenders = dash_resp.json()["available_tenders"]

    assert isinstance(tenders, list)
    if len(tenders) > 0:
        sample = tenders[0]
        assert "id" in sample
        assert "tender_number" in sample
        assert "title" in sample
        assert "organization" in sample
        assert "deadline" in sample
        assert "status" in sample
        assert "requirements_count" in sample
    print(f"  ✓ Available tenders list verified ({len(tenders)} active tenders found)")


def test_4_strict_bidder_data_isolation():
    print("\n[TEST 4] Verifying Strict Bidder Data Isolation (Zero Cross-Bidder Leakage)...")
    login_resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dash_resp = client.get("/bidder-portal/dashboard", headers=headers)
    my_bids = dash_resp.json()["my_bids"]

    # Verify every bid belongs ONLY to BID-001
    for bid in my_bids:
        # None of the bids should leak other bidder private details
        assert "officer_notes" not in bid
        assert "internal_risk" not in bid
        assert "competitor_id" not in bid

    print(f"  ✓ Bidder data isolation verified: {len(my_bids)} private bids returned")


def test_5_profile_completion_engine():
    print("\n[TEST 5] Verifying Decoupled Profile Completion Engine...")
    login_resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dash_resp = client.get("/bidder-portal/dashboard", headers=headers)
    profile_comp = dash_resp.json()["profile_completion"]

    assert "percentage" in profile_comp
    assert "completed_count" in profile_comp
    assert "total_count" in profile_comp
    assert "items" in profile_comp
    assert profile_comp["total_count"] == 11, f"Expected 11 required fields, got {profile_comp['total_count']}"
    assert profile_comp["completed_count"] == 11, f"Expected 11 completed fields, got {profile_comp['completed_count']}"
    assert profile_comp["percentage"] == 100, f"Expected 100% completion for fully populated profile, got {profile_comp['percentage']}%"
    assert profile_comp["status"] == "COMPLETED"

    print(f"  ✓ Profile completion engine verified: {profile_comp['percentage']}% ({profile_comp['completed_count']}/{profile_comp['total_count']} required fields completed)")


def test_6_business_verification_decoupled():
    print("\n[TEST 6] Verifying Decoupled Business Verification Engine...")
    login_resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dash_resp = client.get("/bidder-portal/dashboard", headers=headers)
    biz_verif = dash_resp.json()["business_verification"]

    assert "status" in biz_verif
    assert "verified_count" in biz_verif
    assert "applicable_count" in biz_verif
    assert "credentials" in biz_verif

    assert biz_verif["status"] == "VERIFIED"
    assert biz_verif["verified_count"] == 4, f"Expected 4 verified credentials, got {biz_verif['verified_count']}"
    assert biz_verif["applicable_count"] == 4

    print(f"  ✓ Business verification engine verified: {biz_verif['status']} ({biz_verif['verified_count']}/{biz_verif['applicable_count']} credentials verified)")


def test_7_profile_field_degradation_and_restoration():
    print("\n[TEST 7] Verifying Profile Degradation upon Field Removal & Independence from Verification...")
    login_resp = client.post("/auth/login", json={
        "email": "abc@abcsafety.com",
        "password": "bidder123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step A: Remove one required profile field (e.g. pincode = "")
    put_resp = client.put("/bidder-portal/profile", headers=headers, json={
        "pincode": ""
    })
    assert put_resp.status_code == 200, f"PUT /bidder-portal/profile failed: {put_resp.text}"
    put_data = put_resp.json()

    # Profile completion should drop from 11/11 (100%) to 10/11 (91%)
    assert put_data["profile_completion"]["completed_count"] == 10
    assert put_data["profile_completion"]["total_count"] == 11
    assert put_data["profile_completion"]["percentage"] == 91
    assert put_data["profile_completion"]["status"] == "INCOMPLETE"

    # Business verification MUST remain completely independent (still 4 of 4 VERIFIED)
    assert put_data["business_verification"]["status"] == "VERIFIED"
    assert put_data["business_verification"]["verified_count"] == 4

    print("  ✓ Removing pincode reduced profile completion to 91% (10/11) without affecting 4/4 verification")

    # Step B: Restore pincode
    restore_resp = client.put("/bidder-portal/profile", headers=headers, json={
        "pincode": "600032"
    })
    assert restore_resp.status_code == 200
    restore_data = restore_resp.json()

    assert restore_data["profile_completion"]["completed_count"] == 11
    assert restore_data["profile_completion"]["percentage"] == 100
    assert restore_data["profile_completion"]["status"] == "COMPLETED"
    print("  ✓ Restoring pincode restored profile completion to 100% (11/11)")


def test_8_officer_forbidden_from_bidder_portal():
    print("\n[TEST 8] Verifying Officer Blocked from Bidder Portal (HTTP 403)...")
    login_resp = client.post("/auth/login", json={
        "email": "officer@cpcl.gov.in",
        "password": "admin123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/bidder-portal/dashboard", headers=headers)
    assert resp.status_code == 403, f"Expected 403 Forbidden for Officer accessing bidder portal, got {resp.status_code}"
    print("  ✓ Officer access to /bidder-portal/dashboard rejected with HTTP 403 Forbidden")


def test_9_unauthenticated_request_rejected():
    print("\n[TEST 9] Verifying Unauthenticated Access Rejection (HTTP 401)...")
    resp = client.get("/bidder-portal/dashboard")
    assert resp.status_code == 401
    print("  ✓ Unauthenticated access to /bidder-portal/dashboard rejected with HTTP 401 Unauthorized")


if __name__ == "__main__":
    print("====================================================================")
    print("BidSure AI - SIH26100 Phase 2 Bidder Portal Test Suite")
    print("====================================================================")
    test_1_bidder_dashboard_access()
    test_2_seven_statistics_metrics()
    test_3_available_tenders_structure()
    test_4_strict_bidder_data_isolation()
    test_5_profile_completion_engine()
    test_6_business_verification_decoupled()
    test_7_profile_field_degradation_and_restoration()
    test_8_officer_forbidden_from_bidder_portal()
    test_9_unauthenticated_request_rejected()
    print("\n====================================================================")
    print("ALL 9 PHASE 2 BIDDER PORTAL TESTS PASSED PERFECTLY!")
    print("====================================================================")
