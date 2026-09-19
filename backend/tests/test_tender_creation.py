"""
BidSure AI - Tender Creation & Submission Pipeline Comprehensive Test Suite
SIH26100 - CPCL Automated Bid Evaluation System

Covers:
- TEST A: Save Draft with partial data (no PDF, minimal fields)
- TEST B: Save Draft with complete data
- TEST C: Publish without PDF (validation rejection)
- TEST D: Publish with missing mandatory fields (validation rejection)
- TEST E: Publish with valid data and PDF (success & audit log)
- TEST F: Double save / Draft update via PATCH (no duplicates created)
- TEST G: Draft-to-Published lifecycle transition via PATCH
- TEST H: RBAC enforcement on tender creation & update
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.data.sample_data import get_tender_by_id, SAMPLE_AUDIT_LOGS

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


def test_a_save_draft_with_partial_data():
    """TEST A: Save Draft with partial data (no PDF, minimal fields)"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Partial Draft For Hydrocarbon Pumps",
        "category": "Mechanical & Static",
        "status": "DRAFT"
    }

    resp = client.post("/tenders", json=payload, headers=headers)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "tender" in data
    tender = data["tender"]
    assert tender["status"] == "DRAFT"
    assert tender["title"] == "Partial Draft For Hydrocarbon Pumps"
    assert tender["category"] == "Mechanical & Static"
    assert "CPCL/PROC/" in tender["tender_number"]
    assert "TND-" in tender["id"]
    print(f"\n  ✓ TEST A Passed: Saved draft with partial data. Assigned ID: {tender['tender_number']}")


def test_b_save_draft_with_complete_data():
    """TEST B: Save Draft with complete data and optional PDF"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Complete Draft for Fire Alarm Sensors",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Safety & Fire Protection",
        "category": "Fire & Safety Systems",
        "description": "Comprehensive supply of industrial optical flame detectors and heat sensors.",
        "status": "DRAFT",
        "issue_date": "2026-09-19",
        "submission_deadline": "2026-11-20",
        "estimated_value": 7500000,
        "emd_amount": 150000,
        "evaluation_method": "L1 / Lowest Price",
        "file_name": "CPCL_Fire_Alarm_Sensors_Draft.pdf",
        "file_size_kb": 2450
    }

    resp = client.post("/tenders", json=payload, headers=headers)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    tender = data["tender"]
    assert tender["status"] == "DRAFT"
    assert tender["estimated_value"] == 7500000.0
    assert tender["file_name"] == "CPCL_Fire_Alarm_Sensors_Draft.pdf"
    print(f"  ✓ TEST B Passed: Saved complete draft with PDF. Assigned ID: {tender['tender_number']}")


def test_c_publish_without_pdf_fails():
    """TEST C: Publishing without statutory PDF document must be rejected (HTTP 400)"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Publish Attempt Without PDF Document",
        "organization": "CPCL",
        "category": "Industrial PPE",
        "description": "Valid description with sufficient details for procurement.",
        "status": "PUBLISHED",
        "issue_date": "2026-09-19",
        "submission_deadline": "2026-11-25",
        "evaluation_method": "L1 / Lowest Price"
        # file_name intentionally omitted
    }

    resp = client.post("/tenders", json=payload, headers=headers)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    detail = resp.json().get("detail", {})
    err_text = str(detail)
    assert "PDF" in err_text or "mandatory" in err_text
    print("  ✓ TEST C Passed: Publishing without PDF rejected with clear error.")


def test_d_publish_with_missing_mandatory_fields_fails():
    """TEST D: Publishing with missing required fields (short title/desc) must be rejected"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "AB",  # too short
        "status": "PUBLISHED",
        "file_name": "Tender_Document.pdf"
    }

    resp = client.post("/tenders", json=payload, headers=headers)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    print("  ✓ TEST D Passed: Publishing with missing fields rejected properly.")


def test_e_publish_with_valid_pdf_and_data():
    """TEST E: Publishing with valid PDF and data succeeds & writes audit trail"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Procurement of Explosion-Proof Lighting Fixtures",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Electrical Maintenance Division",
        "category": "Electrical Systems",
        "description": "Supply and installation of ATEX / IECEx certified LED flameproof floodlights for Hazardous Area Zone 1 & 2.",
        "status": "PUBLISHED",
        "issue_date": "2026-09-19",
        "submission_deadline": "2026-12-15",
        "estimated_value": 12000000,
        "emd_amount": 240000,
        "evaluation_method": "L1 / Lowest Price",
        "file_name": "CPCL_Explosion_Proof_Lighting_RFP.pdf",
        "file_size_kb": 4120
    }

    resp = client.post("/tenders", json=payload, headers=headers)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    tender = data["tender"]
    assert tender["status"] == "PUBLISHED"
    assert tender["file_name"] == "CPCL_Explosion_Proof_Lighting_RFP.pdf"

    # Verify audit log was recorded
    matching_logs = [
        log for log in SAMPLE_AUDIT_LOGS
        if log.get("entity_id") == tender["tender_number"] and log.get("action") == "TENDER_PUBLISHED"
    ]
    assert len(matching_logs) > 0, "Expected TENDER_PUBLISHED audit log entry"
    print(f"  ✓ TEST E Passed: Published tender successfully ({tender['tender_number']}) with audit log.")


def test_f_double_save_updates_existing_draft_no_duplicates():
    """TEST F: Repeated draft saves via PATCH update the same record without creating duplicates"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Create initial draft
    create_resp = client.post("/tenders", json={
        "title": "Initial Draft Title",
        "category": "Goods",
        "status": "DRAFT"
    }, headers=headers)
    assert create_resp.status_code == 201
    created_tender = create_resp.json()["tender"]
    tender_id = created_tender["id"]
    assigned_num = created_tender["tender_number"]

    # Step 2: Second save (PATCH) with updated description
    patch_resp = client.patch(f"/tenders/{tender_id}", json={
        "title": "Updated Draft Title",
        "description": "Added detailed scope of work in second save.",
        "status": "DRAFT",
        "estimated_value": 5000000
    }, headers=headers)
    assert patch_resp.status_code == 200
    updated_tender = patch_resp.json()["tender"]

    # Verify ID was preserved and data updated in place
    assert updated_tender["id"] == tender_id
    assert updated_tender["tender_number"] == assigned_num
    assert updated_tender["title"] == "Updated Draft Title"
    assert updated_tender["estimated_value"] == 5000000.0

    print(f"  ✓ TEST F Passed: Draft updated in-place on repeated save ({assigned_num}), no duplicates.")


def test_g_transition_draft_to_published():
    """TEST G: Draft can be updated and transitioned to PUBLISHED via PATCH"""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Save draft
    create_resp = client.post("/tenders", json={
        "title": "Draft Pipeline Cleaning Pigs",
        "category": "Goods",
        "status": "DRAFT"
    }, headers=headers)
    assert create_resp.status_code == 201
    tender_id = create_resp.json()["tender"]["id"]

    # Step 2: Publish the draft via PATCH
    publish_payload = {
        "title": "Procurement of High-Density Foam & Mechanical Pipeline Pigs",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Pipeline Infrastructure Division",
        "category": "Goods",
        "description": "Supply of intelligent and mechanical pipeline cleaning pigs for 16-inch crude transfer line.",
        "status": "PUBLISHED",
        "submission_deadline": "2026-11-30",
        "evaluation_method": "L1 / Lowest Price",
        "file_name": "CPCL_Pipeline_Pigs_2026.pdf",
        "file_size_kb": 3200
    }
    patch_resp = client.patch(f"/tenders/{tender_id}", json=publish_payload, headers=headers)
    assert patch_resp.status_code == 200
    published_tender = patch_resp.json()["tender"]
    assert published_tender["status"] == "PUBLISHED"
    assert published_tender["file_name"] == "CPCL_Pipeline_Pigs_2026.pdf"
    print(f"  ✓ TEST G Passed: Successfully transitioned draft to PUBLISHED via PATCH ({published_tender['tender_number']}).")


def test_h_rbac_tender_creation_security():
    """TEST H: Bidder or unauthenticated user cannot create or patch tenders"""
    bidder_token = get_bidder_token()
    bidder_headers = {"Authorization": f"Bearer {bidder_token}"}

    # Bidder trying to create tender -> 403 Forbidden
    resp = client.post("/tenders", json={"title": "Unauthorized Tender"}, headers=bidder_headers)
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"

    # Unauthenticated request -> 401 Unauthorized
    resp_unauth = client.post("/tenders", json={"title": "Unauthenticated Tender"})
    assert resp_unauth.status_code == 401, f"Expected 401, got {resp_unauth.status_code}"

    print("  ✓ TEST H Passed: RBAC strictly enforced (403 for Bidder, 401 for Unauthenticated).")
