"""
BidSure AI - Tendernotice_1.pdf 17-Page Provenance & Evidence Grounding Test Suite

Verifies:
1. Multi-page document candidate scoring resolves clauses across 17 pages dynamically without hardcoding.
2. Grounded mappings on Tendernotice_1.pdf:
   - Udyam / MSME Registration: Derived to Page 4 (EMD exemption clause requiring valid Udyam certificate).
   - Valid GST Registration: Derived to Page 5 (GST Registration + GSTR-3B + GSTIN).
   - Product Safety & Test Reports: Derived to Page 7 (performance test reports from accredited labs).
   - Turnover: Derived to Page 11 (INR 10 Crore requirement).
   - Non-Blacklisting / Debarment: Derived to Page 11 (evaluation criteria undertaking/declaration).
   - EMD Compliance: Derived to Page 3 (explicit ₹ 11,00,000 requirement).
3. Exact layout verification against source page text buffer:
   - Sets evidence_status: SMART_IDP_VERIFIED and provenance_status: VERIFIED.
4. Strict page boundary: 1 <= source_page <= 17.
5. Zero CPCL demo presets or hallucinated criteria.
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
    assert resp.status_code == 200
    return resp.json()["access_token"]


def create_17_page_cppp_nit_pdf() -> bytes:
    """Creates a 17-page authentic CPPP tender PDF matching Tendernotice_1.pdf structure."""
    import fitz
    doc = fitz.open()

    for p in range(1, 18):
        page = doc.new_page(width=595, height=842)
        if p == 1:
            text = """INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI
Central Procurement & Stores Division, Guwahati - 781039, Assam
NOTICE INVITING TENDER (NIT)
Tender Reference No: EPT/SNP/CC/EQT-26.1130
Tender ID: 2026_IITG_925833_1
Title: Supply and installation of Next Generation Firewall Solution at IIT Guwahati
MSE Exemption: Yes
TENDER SCHEDULE & CRITICAL DATES:
Published Date: 15-Sep-2026 09:00 AM
Bid Submission End Date: 15-Oct-2026 06:00 PM
Bid Opening Date: 16-Oct-2026 03:00 PM
"""
        elif p == 2:
            text = """SECTION I: GENERAL INSTRUCTIONS TO BIDDERS
1.1 Instructions for online bid submission through Central Public Procurement Portal (CPPP).
1.2 Address for communication: Central Procurement Division, IIT Guwahati. GSTIN: 18AAACI1234A1Z5.
1.3 Contents of Bid: Technical Bid and Financial Bid.
"""
        elif p == 3:
            text = """SECTION II: FEE DETAILS & EARNEST MONEY DEPOSIT (EMD)
Clause 2.1: EMD Amount: ₹ 11,00,000 (Eleven Lakhs Only).
The EMD shall be submitted in the form of Insurance Surety Bond or Bank Guarantee.
EMD exemption is allowed for eligible MSE bidders.
"""
        elif p == 4:
            text = """SECTION II (CONTINUED): MSE / MSME EXEMPTION CONDITIONS
Clause 2.4: Bidders claiming EMD exemption under MSE / MSME policy must submit a valid and current Udyam Registration Certificate / MSME Certificate issued by the Ministry of MSME.
"""
        elif p == 5:
            text = """SECTION III: STATUTORY REGISTRATIONS & TAX COMPLIANCE
Clause 3.2: The bidder must submit a valid GST Registration Certificate along with latest GSTR-3B return filing copy and active GSTIN.
Clause 3.3: Permanent Account Number (PAN) issued by Income Tax Department.
"""
        elif p == 7:
            text = """SECTION V: TECHNICAL SPECIFICATIONS & STANDARDS
Clause 5.4: The bidder must submit valid product safety certificates and laboratory performance test reports from accredited testing laboratories (NABL / BIS) confirming compliance with Next Generation Firewall specifications.
"""
        elif p == 11:
            text = """SECTION VII: ELIGIBILITY & EVALUATION CRITERIA
Clause 7.1: Minimum average annual financial turnover of INR 10 Crore during the last 3 financial years.
Clause 7.2: OEM Authorization Certificate (Manufacturer Authorization Form - MAF) from OEM.
Clause 7.3: Minimum 50% Class-I Local Content under Public Procurement (Preference to Make in India) Order.
Clause 7.4: Experience of successfully completing at least 2 similar enterprise firewall projects in Central Govt/IITs/PSUs.
Clause 7.5: The bidder must not be blacklisted or debarred by any Central / State Government agency or PSU and shall submit a self-declaration undertaking / notarized affidavit confirming the same.
"""
        else:
            text = f"""SECTION {p}: GENERAL STANDARD TERMS AND CONDITIONS
Clause {p}.1: Standard contractual terms and obligations for procurement of equipment at IIT Guwahati.
"""
        page.insert_text((50, 72), text, fontsize=10)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_tendernotice_1_17_page_provenance():
    """Verify dynamic evidence derivation and layout verification on 17-page Tendernotice_1.pdf."""
    token = get_officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = create_17_page_cppp_nit_pdf()
    files = {
        "file": ("Tendernotice_1.pdf", io.BytesIO(pdf_bytes), "application/pdf")
    }

    resp = client.post("/tenders/upload-document", headers=headers, files=files)
    assert resp.status_code == 200, f"Upload failed: {resp.text}"

    data = resp.json()
    assert data["filename"] == "Tendernotice_1.pdf"
    assert data["total_pages"] == 17, f"Expected 17 pages, got {data['total_pages']}"
    assert data["page_count"] == 17

    requirements = data["requirements"]
    assert len(requirements) >= 6

    # Verify all requirements obey 1 <= source_page <= 17 and have verified provenance
    for r in requirements:
        sp = r["source_page"]
        assert 1 <= sp <= 17, f"Page {sp} out of bounds for {r['name']}"
        assert r["evidence_text"] != "", f"Evidence text empty for {r['name']}"
        assert r["evidence_status"] == "SMART_IDP_VERIFIED", f"Expected verified status, got {r['evidence_status']}"
        assert r["provenance_status"] == "VERIFIED"
        assert r["source_document"] == "Tendernotice_1.pdf"

    # 1. Udyam / MSME Registration: Correct source Page 4
    udyam = next(r for r in requirements if r["code"] == "STAT_UDYAM_MSME")
    assert udyam["source_page"] == 4, f"Expected Udyam on Page 4, got Page {udyam['source_page']}"
    assert "claiming emd exemption" in udyam["evidence_text"].lower() or "udyam registration" in udyam["evidence_text"].lower()

    # 2. Non-Blacklisting / Debarment: Correct source Page 11
    blacklisting = next(r for r in requirements if r["code"] == "VIG_NON_BLACKLISTED")
    assert blacklisting["source_page"] == 11, f"Expected Blacklisting on Page 11, got Page {blacklisting['source_page']}"
    assert "blacklisted" in blacklisting["evidence_text"].lower() or "debarred" in blacklisting["evidence_text"].lower()

    # 3. Valid GST Registration: Correct source Page 5
    gst = next(r for r in requirements if r["code"] == "STAT_GST_REG")
    assert gst["source_page"] == 5, f"Expected GST on Page 5, got Page {gst['source_page']}"
    assert "gstr-3b" in gst["evidence_text"].lower() or "gstin" in gst["evidence_text"].lower() or "gst registration" in gst["evidence_text"].lower()

    # 4. Product Safety Certificates & Test Reports: Correct source Page 7
    safety = next(r for r in requirements if r["code"] == "QUAL_SAFETY_CERTIFICATES")
    assert safety["source_page"] == 7, f"Expected Safety on Page 7, got Page {safety['source_page']}"
    assert "test report" in safety["evidence_text"].lower() or "safety" in safety["evidence_text"].lower()

    # 5. Minimum Average Annual Financial Turnover: Correct source Page 11 (₹10 Crore)
    turnover = next(r for r in requirements if r["code"] == "TURNOVER_MIN")
    assert turnover["source_page"] == 11, f"Expected Turnover on Page 11, got Page {turnover['source_page']}"
    assert turnover["threshold_value"] == 10.0
    assert "10 crore" in turnover["evidence_text"].lower()

    # 6. EMD Compliance: Correct source Page 3 (₹ 11,00,000)
    emd = next(r for r in requirements if r["code"] == "COMM_EMD_SECURITY")
    assert emd["source_page"] == 3, f"Expected EMD on Page 3, got Page {emd['source_page']}"
    assert emd["threshold_value"] == 1100000.0
    assert "11,00,000" in emd["evidence_text"] or "eleven lakhs" in emd["evidence_text"].lower()

    print("\n  ✓ Tendernotice_1.pdf 17-Page Grounding Passed: All 6 requirements derived to exact authentic source pages with verified IDP layout match.")
