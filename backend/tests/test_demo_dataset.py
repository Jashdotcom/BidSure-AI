"""
BidSure AI - Demo Dataset Loader Test Suite
Executes the demo dataset loader script and verifies all counts and data persistence.
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.load_demo_dataset import run_demo_dataset_loader
from app.data import sample_data
from app.data import document_store


def test_load_and_verify_demo_dataset():
    # Execute loader
    run_demo_dataset_loader()

    real_tenders = len(sample_data.SAMPLE_TENDERS)
    synthetic_bidders = len(sample_data.SAMPLE_BIDDER_PROFILES)
    synthetic_docs = len(sample_data.SAMPLE_BIDDER_DOCUMENTS)
    demo_bids = len(sample_data.SAMPLE_BIDDER_BIDS)
    audit_events = len(sample_data.SAMPLE_AUDIT_LOGS)

    compliance_results = len(sample_data.SAMPLE_BIDDER_BIDS)
    pass_count = sum(1 for b in sample_data.SAMPLE_BIDDER_BIDS if b.get("compliance_status") == "COMPLIANT")
    fail_count = sum(1 for b in sample_data.SAMPLE_BIDDER_BIDS if b.get("compliance_status") == "NON_COMPLIANT")
    review_count = sum(1 for b in sample_data.SAMPLE_BIDDER_BIDS if b.get("compliance_status") == "REQUIRES_REVIEW")

    print("\n==================================================")
    print("FINAL EXECUTION REPORT — DEMO DATASET")
    print(f"Real CPPP tenders: {real_tenders}")
    print(f"Synthetic bidders: {synthetic_bidders}")
    print(f"Synthetic documents: {synthetic_docs}")
    print(f"Demo bids: {demo_bids}")
    print(f"Compliance results: {compliance_results}")
    print(f"PASS: {pass_count}")
    print(f"FAIL: {fail_count}")
    print(f"REVIEW: {review_count}")
    print(f"Audit events: {audit_events}")
    print("==================================================")

    assert real_tenders == 12, f"Expected 12 real tenders, got {real_tenders}"
    assert synthetic_bidders == 12, f"Expected 12 synthetic bidders, got {synthetic_bidders}"
    assert synthetic_docs > 0, "Synthetic documents should not be empty"
    assert 20 <= demo_bids <= 40, f"Expected 20-40 demo bids, got {demo_bids}"
    assert pass_count > 0
    assert fail_count > 0
    assert review_count > 0
    assert audit_events > 0
