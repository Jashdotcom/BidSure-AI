"""
BidSure AI - Tender Listing & Procurement Lifecycle Test Suite
SIH26100 - CPCL Automated Bid Evaluation System

Covers:
- TEST 1: GET /tenders returns complete list of tenders with computed bids_count and verified_count
- TEST 2: Status mapping & filtering (ACTIVE, INACTIVE, DRAFT, ALL)
- TEST 3: Search keyword filtering (ID, title, organization, category, description)
- TEST 4: Category filtering
- TEST 5: Bid count calculation (strictly submitted bids only, excluding drafts)
- TEST 6: Amendment history & Corrigenda list preservation
- TEST 7: Draft tender CPCL/PROC/2026/013 retrieval and properties
- TEST 8: RBAC authentication enforcement on procurement endpoints
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.data.sample_data import SAMPLE_TENDERS, SAMPLE_BIDDERS, reset_to_demo_data

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_demo_data():
    reset_to_demo_data()

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


def test_01_get_all_tenders():
    """TEST 1: GET /tenders returns complete list with valid schema and bid counts"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/tenders", headers=headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    tenders = resp.json()
    assert isinstance(tenders, list)
    assert len(tenders) >= 13, f"Expected at least 13 sample tenders, got {len(tenders)}"

    for t in tenders:
        assert "id" in t
        assert "title" in t
        assert "status" in t
        assert "bids_count" in t
        assert "verified_count" in t
        assert isinstance(t["bids_count"], int)
        assert isinstance(t["verified_count"], int)
        assert "deadline_history" in t
        assert isinstance(t["deadline_history"], list)
        assert "amendments" in t
        assert isinstance(t["amendments"], list)

    print(f"\n  ✓ TEST 1 Passed: Successfully loaded {len(tenders)} tenders with complete metadata.")


def test_02_status_filtering():
    """TEST 2: Status filtering correctly partitions ACTIVE, INACTIVE, and DRAFT tenders"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. ACTIVE Tenders (PUBLISHED, OPEN, ACTIVE)
    resp_active = client.get("/tenders?status=ACTIVE", headers=headers)
    assert resp_active.status_code == 200
    active_tenders = resp_active.json()
    assert len(active_tenders) >= 12
    for t in active_tenders:
        assert t["status"] in ["PUBLISHED", "OPEN", "ACTIVE"]

    # 2. INACTIVE Tenders (CLOSED, CANCELLED, ARCHIVED, INACTIVE)
    resp_inactive = client.get("/tenders?status=INACTIVE", headers=headers)
    assert resp_inactive.status_code == 200
    inactive_tenders = resp_inactive.json()
    assert len(inactive_tenders) >= 1
    for t in inactive_tenders:
        assert t["status"] in ["CLOSED", "CANCELLED", "ARCHIVED", "INACTIVE"]

    # 3. DRAFT Tenders (DRAFT, ANALYZING, REQUIREMENTS_REVIEW)
    resp_draft = client.get("/tenders?status=DRAFT", headers=headers)
    assert resp_draft.status_code == 200
    draft_tenders = resp_draft.json()
    assert len(draft_tenders) >= 1
    for t in draft_tenders:
        assert t["status"] in ["DRAFT", "ANALYZING", "REQUIREMENTS_REVIEW"]

    print("  ✓ TEST 2 Passed: Status filtering for ACTIVE, INACTIVE, and DRAFT verified.")


def test_03_search_keyword_filtering():
    """TEST 3: Search keyword queries accurately match tender ID, title, department, description"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Search by Tender Number
    resp = client.get("/tenders?query=CPCL/PROC/2026/001", headers=headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["tender_number"] == "CPCL/PROC/2026/001"

    # Search by Title Keyword
    resp_title = client.get("/tenders?query=Helmets", headers=headers)
    assert resp_title.status_code == 200
    results_title = resp_title.json()
    assert len(results_title) >= 1
    assert any("Helmets" in t["title"] for t in results_title)

    # Search for closed tender
    resp_closed = client.get("/tenders?query=SAFETY/2024/09", headers=headers)
    assert resp_closed.status_code == 200
    assert len(resp_closed.json()) == 1
    assert resp_closed.json()[0]["status"] == "CLOSED"

    print("  ✓ TEST 3 Passed: Keyword search filters by ID, title, and reference.")


def test_04_category_filtering():
    """TEST 4: Category filter returns only tenders matching the specified category"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/tenders?category=Electrical%20Systems", headers=headers)
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) >= 1
    for t in results:
        assert "Electrical" in t.get("category", "")

    print(f"  ✓ TEST 4 Passed: Category filtering returned {len(results)} matching tenders.")


def test_05_bid_counts_calculation():
    """TEST 5: Bid counts reflect submitted bids only and exclude draft bids"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/tenders", headers=headers)
    assert resp.status_code == 200
    tenders = resp.json()

    # Find TND-2026-001 (has 5 submitted bids in SAMPLE_BIDDERS)
    tnd1 = next((t for t in tenders if t["id"] == "TND-2026-001" or t.get("tender_number") == "CPCL/PROC/2026/001"), None)
    assert tnd1 is not None, "TND-2026-001 must exist"
    assert tnd1["bids_count"] == 5, f"Expected 5 submitted bids for TND-2026-001, got {tnd1['bids_count']}"
    assert tnd1["verified_count"] >= 1

    # Find TND-2026-009 (has 0 submitted bids)
    tnd9 = next((t for t in tenders if t["id"] == "TND-2026-009" or t.get("tender_number") == "CPCL/PROC/2026/009"), None)
    assert tnd9 is not None, "TND-2026-009 must exist"
    assert tnd9["bids_count"] == 0, f"Expected 0 bids for TND-2026-009, got {tnd9['bids_count']}"

    print("  ✓ TEST 5 Passed: Bids count strictly matches submitted bids and excludes drafts.")


def test_06_amendment_history_preservation():
    """TEST 6: Corrigenda and amendments are preserved in deadline_history and amendments arrays"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch closed tender TND-2024-001 with Corrigendum-01
    resp = client.get("/tenders/CPCL%2FPROC%2FSAFETY%2F2024%2F09", headers=headers)
    assert resp.status_code == 200
    tender = resp.json()
    assert tender["status"] == "CLOSED"
    assert len(tender.get("deadline_history", [])) >= 1
    assert len(tender.get("amendments", [])) >= 1
    corrigendum = tender["amendments"][0]
    assert "Corrigendum" in corrigendum.get("amendment_number", "")
    assert corrigendum.get("previous_deadline") is not None
    assert corrigendum.get("new_deadline") is not None

    print("  ✓ TEST 6 Passed: Amendment history & corrigenda accurately preserved.")


def test_07_draft_tender_cpcl_proc_2026_013():
    """TEST 7: Verify draft tender CPCL/PROC/2026/013 exists, has DRAFT status and 0 bids"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/tenders?status=DRAFT", headers=headers)
    assert resp.status_code == 200
    drafts = resp.json()
    t13 = next((t for t in drafts if t.get("tender_number") == "CPCL/PROC/2026/013" or t.get("id") == "TND-2026-013"), None)
    assert t13 is not None, "Draft tender CPCL/PROC/2026/013 must be listed in drafts"
    assert t13["status"] == "DRAFT"
    assert t13["bids_count"] == 0
    assert "Thermal Insulation" in t13["title"]

    print("  ✓ TEST 7 Passed: Draft tender CPCL/PROC/2026/013 retrieved with status DRAFT.")


def test_08_rbac_authorization():
    """TEST 8: Protected procurement endpoints enforce valid authentication"""
    # Unauthenticated list request should fail (401)
    resp_unauth = client.get("/tenders")
    assert resp_unauth.status_code == 401, f"Expected 401 Unauthorized, got {resp_unauth.status_code}"

    # Authenticated officer succeeds
    officer_token = get_officer_token()
    resp_auth = client.get("/tenders", headers={"Authorization": f"Bearer {officer_token}"})
    assert resp_auth.status_code == 200

    print("  ✓ TEST 8 Passed: Authentication & RBAC protection verified.")
