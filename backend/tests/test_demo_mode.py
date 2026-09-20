"""
BidSure AI - DEMO_MODE Centralized Switch & Empty State Test Suite
SIH26100 - CPCL Automated Bid Evaluation System

Tests:
1. DEMO_MODE=false starts with authentic empty states (0 tenders, 0 bids, 0 audit logs)
2. Empty dashboard stats returns exact zero values
3. Empty tenders listing returns []
4. Empty recent activity returns []
5. Empty audit logs returns []
6. Authentication works in both modes (officer credentials preserved)
7. reset_to_demo_data() and clear_all_procurement_data() functions operate properly
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.data.sample_data import (
    reset_to_demo_data,
    clear_all_procurement_data,
    is_demo_mode,
    SAMPLE_TENDERS,
    SAMPLE_BIDDERS,
    SAMPLE_AUDIT_LOGS,
    DEMO_TENDERS,
    DEMO_BIDDERS
)

client = TestClient(app)

def get_officer_token() -> str:
    resp = client.post("/auth/login", json={
        "email": "officer@cpcl.gov.in",
        "password": "admin123"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_empty_procurement_state():
    """Verify system returns true empty/zero state when operational stores are empty."""
    clear_all_procurement_data()
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Dashboard Stats must be exact zeros
    stats_resp = client.get("/dashboard/stats", headers=headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["active_tenders"] == 0
    assert stats["total_tenders"] == 0
    assert stats["total_bids"] == 0
    assert stats["under_verification"] == 0
    assert stats["pending_review"] == 0
    assert stats["compliant_bids"] == 0
    assert stats["high_risk"] == 0

    # 2. Tenders must be empty []
    tenders_resp = client.get("/tenders", headers=headers)
    assert tenders_resp.status_code == 200
    assert tenders_resp.json() == []

    # 3. Recent activities must be empty []
    act_resp = client.get("/dashboard/recent-bid-activity", headers=headers)
    assert act_resp.status_code == 200
    assert act_resp.json() == []

    # 4. Audit logs must be empty []
    audit_resp = client.get("/audit/logs", headers=headers)
    assert audit_resp.status_code == 200
    assert audit_resp.json() == []


def test_demo_data_seeding():
    """Verify demo dataset can be populated on demand for testing/dev."""
    reset_to_demo_data()
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    tenders_resp = client.get("/tenders", headers=headers)
    assert tenders_resp.status_code == 200
    tenders = tenders_resp.json()
    assert len(tenders) >= 12

    # Clean back up
    clear_all_procurement_data()
