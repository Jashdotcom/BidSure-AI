"""
BidSure AI - Realistic Demo Dataset Loader Script
Populates the application with:
- 12 Real CPPP Tenders from official CPPP registry
- 12 Synthetic Bidders with realistic variation (PASS / FAIL / REVIEW)
- Synthetic Documents with mandatory DEMO / SYNTHETIC watermarks (Valid PDFs)
- 24-30 Demo Bid Submissions across tenders
- Deterministic Compliance Evaluations & Audit Trail
"""

import os
import sys
import hashlib
import json
from datetime import datetime, timezone
import fitz

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ["DEMO_MODE"] = "true"

from app.data import sample_data
from app.data import document_store
from app.services.tender_sources.cppp_adapter import CPPPTenderAdapter
from app.services.rules_engine import RulesEngine


def run_demo_dataset_loader():
    print("==================================================")
    print("Starting BidSure AI Realistic Demo Dataset Loader")
    print("==================================================")

    # 1. Clear existing demo procurement data and demo documents (non-destructive to real officer data)
    sample_data.clear_demo_procurement_data()
    document_store.clear_demo_documents()
    print("  ✓ Cleared existing demo procurement stores and synthetic document storage (retaining real officer data).")

    # 2. Load 12 Real CPPP Tenders
    cppp_adapter = CPPPTenderAdapter()
    tenders_loaded = []

    for tender_id, tender_meta in cppp_adapter.REAL_CPPP_REGISTRY.items():
        tender_record = dict(tender_meta)
        tender_record["id"] = tender_id
        tender_record["source"] = "CPPP"
        tender_record["source_type"] = "GOVERNMENT_PUBLIC"
        tender_record["official_source_url"] = f"https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&tenderId={tender_id}"
        tender_record["external_tender_id"] = tender_id
        tender_record["external_reference_number"] = tender_record.get("ref", tender_id)
        tender_record["imported_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        tender_record["last_synced_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        tender_record["document_count"] = 1

        sample_data.SAMPLE_TENDERS.append(tender_record)
        tenders_loaded.append(tender_record)

        # Create official CPPP tender document in document store using valid PDF (fitz)
        doc_pdf = fitz.open()
        page = doc_pdf.new_page(width=595, height=842)
        tender_text = f"""OFFICIAL CPPP TENDER DOCUMENT
Tender ID: {tender_id}
Title: {tender_record['title']}
Organization: {tender_record['organization']}
Estimated Value: {tender_record['estimated_value_display']}
Source: CPPP Government Public Data (eprocure.gov.in)
"""
        page.insert_text((50, 72), tender_text, fontsize=10)
        pdf_bytes = doc_pdf.tobytes()
        doc_pdf.close()

        assert pdf_bytes.startswith(b"%PDF-"), "Generated tender document must be a valid PDF"

        document_store.save_document(
            file_bytes=pdf_bytes,
            filename=tender_record["file_name"],
            tender_id=tender_id,
            uploaded_by="officer@cpcl.gov.in",
            source="CPPP_IMPORT",
            metadata={
                "title": tender_record["title"],
                "organization": tender_record["organization"],
                "tender_id": tender_id
            }
        )

        # Log audit event for tender import
        sample_data.SAMPLE_AUDIT_LOGS.append({
            "id": f"AUDIT-TENDER-{tender_id}",
            "event_type": "TENDER_IMPORTED_FROM_CPPP",
            "description": f"Successfully imported real CPPP tender {tender_id} ({tender_record['title']}) from eprocure.gov.in",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "actor": "system@bidsure.ai",
            "data_source": "CPPP_PUBLIC_DATA",
            "tender_id": tender_id
        })

    print(f"  ✓ Successfully loaded {len(tenders_loaded)} Real CPPP Tenders.")

    # 3. Create 12 Synthetic Bidders & User Accounts
    synthetic_bidders_config = [
        ("BID-DEMO-001", "Apex Secure Systems Pvt. Ltd.", "demo001@bidsure.local", "COMPLIANT"),
        ("BID-DEMO-002", "Vertex Industrial Technologies Pvt. Ltd.", "demo002@bidsure.local", "MISSING_EXPERIENCE"),
        ("BID-DEMO-003", "Nova Infra Solutions Pvt. Ltd.", "demo003@bidsure.local", "TURNOVER_LOW"),
        ("BID-DEMO-004", "BluePeak Engineering Pvt. Ltd.", "demo004@bidsure.local", "COMPLIANT"),
        ("BID-DEMO-005", "Orion Technical Systems Pvt. Ltd.", "demo005@bidsure.local", "MISSING_OEM"),
        ("BID-DEMO-006", "Pragati Electrical Solutions Pvt. Ltd.", "demo006@bidsure.local", "GST_MISMATCH"),
        ("BID-DEMO-007", "Quantum Facility Technologies Pvt. Ltd.", "demo007@bidsure.local", "COMPLIANT"),
        ("BID-DEMO-008", "NexGen Scientific Instruments Pvt. Ltd.", "demo008@bidsure.local", "LOCAL_CONTENT_LOW"),
        ("BID-DEMO-009", "Trident Civil Projects Pvt. Ltd.", "demo009@bidsure.local", "COMPLIANT"),
        ("BID-DEMO-010", "Arya Infrastructure Systems Pvt. Ltd.", "demo010@bidsure.local", "BLACKLIST_ISSUE"),
        ("BID-DEMO-011", "Crestline Automation Pvt. Ltd.", "demo011@bidsure.local", "MISSING_DOCS"),
        ("BID-DEMO-012", "Bharat Integrated Engineering Pvt. Ltd.", "demo012@bidsure.local", "COMPLIANT")
    ]

    created_bidders = []
    total_docs_created = 0

    for idx, (b_id, b_name, b_email, profile_variant) in enumerate(synthetic_bidders_config, start=1):
        # Create user account
        user_record = {
            "id": f"USR-DEMO-{idx:03d}",
            "name": f"Director {b_name.split()[0]}",
            "email": b_email,
            "password_hash": sample_data._bidder_pwd_hash,
            "role": "BIDDER",
            "bidder_id": b_id,
            "company_name": b_name
        }
        sample_data.SAMPLE_USERS.append(user_record)

        # Bidder profile
        profile = {
            "id": b_id,
            "legal_business_name": b_name,
            "entity_type": "Private Limited Company",
            "registered_address": f"Plot {idx*12}, Industrial Area, Phase-{idx}, Sector {idx*5}",
            "city": ["Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Pune", "Delhi", "Kolkata", "Ahmedabad", "Gurugram", "Noida", "Nagpur", "Indore"][idx-1],
            "state": ["Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Maharashtra", "Delhi", "West Bengal", "Gujarat", "Haryana", "Uttar Pradesh", "Maharashtra", "Madhya Pradesh"][idx-1],
            "pincode": f"4000{idx:02d}",
            "contact_person": f"Managing Director {idx}",
            "business_email": b_email,
            "phone": f"+91 98200{idx:05d}",
            "pan": f"DEMO{idx:04d}X",
            "gstin": f"27DEMO{idx:04d}F1Z{idx}",
            "udyam": f"UDYAM-MH-01-{idx:07d}",
            "company_registration": f"U74999MH2020PTC{idx:06d}",
            "epfo_number": f"MH/BAN/00{idx:04d}/000",
            "esic_number": f"31000{idx:05d}0001099",
            "profile_completion": 90 if profile_variant != "MISSING_DOCS" else 60,
            "verification_status": "SYNTHETIC_DEMO",
            "variant": profile_variant
        }
        sample_data.SAMPLE_BIDDER_PROFILES[b_id] = profile
        sample_data.SAMPLE_BIDDERS.append({
            "id": b_id,
            "name": b_name,
            "email": b_email,
            "status": "ACTIVE",
            "rating": 4.5,
            "is_synthetic_demo": True
        })

        created_bidders.append(profile)

        # Create 9 standard synthetic documents for each bidder as valid PDFs
        doc_types = [
            ("01_PAN.pdf", "PAN"),
            ("02_GST.pdf", "GST"),
            ("03_Company_Registration.pdf", "COMPANY_REGISTRATION"),
            ("04_Udyam.pdf", "UDYAM_MSME"),
            ("05_Experience_Certificate.pdf", "EXPERIENCE_CERTIFICATE"),
            ("06_OEM_Authorization.pdf", "OEM_AUTHORIZATION"),
            ("07_Local_Content_Declaration.pdf", "LOCAL_CONTENT_DECLARATION"),
            ("08_EPFO_ESIC.pdf", "EPFO_ESIC"),
            ("09_Blacklisting_Declaration.pdf", "BLACKLISTING_DECLARATION")
        ]

        for fname, dtype in doc_types:
            doc_id = f"DOC-{b_id}-{dtype}"
            content_text = f"""DEMO DOCUMENT — SYNTHETIC DATA — NOT A REAL GOVERNMENT CERTIFICATE
Bidder: {b_name} (ID: {b_id})
Document Type: {dtype}
PAN: {profile['pan']}
GSTIN: {profile['gstin']}
Turnover: {'₹ 6.0 Crore' if profile_variant == 'TURNOVER_LOW' else '₹ 18.5 Crore'}
Experience: {'1 Project' if profile_variant == 'MISSING_EXPERIENCE' else '3 Enterprise Projects'}
Local Content: {'35%' if profile_variant == 'LOCAL_CONTENT_LOW' else '65%'}
Status: SYNTHETIC DEMO
FOR BIDSURE AI PROTOTYPE DEMONSTRATION ONLY
"""
            doc_pdf = fitz.open()
            page = doc_pdf.new_page(width=595, height=842)
            page.insert_text((50, 72), content_text, fontsize=10)
            pdf_bytes = doc_pdf.tobytes()
            doc_pdf.close()

            assert pdf_bytes.startswith(b"%PDF-"), f"Generated document {fname} must be a valid PDF"

            document_store.save_document(
                file_bytes=pdf_bytes,
                filename=fname,
                tender_id=None,
                uploaded_by=b_email,
                source="SYNTHETIC_UPLOAD",
                metadata={
                    "bidder_id": b_id,
                    "document_type": dtype,
                    "is_synthetic_demo": True,
                    "demo_watermark": "DEMO DOCUMENT — SYNTHETIC DATA — NOT A REAL GOVERNMENT CERTIFICATE"
                }
            )
            sample_data.SAMPLE_BIDDER_DOCUMENTS.append({
                "id": doc_id,
                "bidder_id": b_id,
                "name": dtype.replace("_", " "),
                "category": "PROFILE_DOCUMENT",
                "document_type": dtype,
                "status": "SYNTHETIC_DEMO",
                "verification_status": "SYNTHETIC_DEMO",
                "file_name": fname,
                "file_size_kb": len(pdf_bytes) // 1024,
                "is_synthetic_demo": True,
                "demo_watermark": "DEMO DOCUMENT — SYNTHETIC DATA — NOT A REAL GOVERNMENT CERTIFICATE"
            })
            total_docs_created += 1

        # Audit log for bidder registration
        sample_data.SAMPLE_AUDIT_LOGS.append({
            "id": f"AUDIT-BIDDER-{b_id}",
            "event_type": "BIDDER_REGISTERED_DEMO",
            "description": f"Synthetic demo bidder registered: {b_name} ({b_id})",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "actor": b_email,
            "data_source": "BIDSURE_DEMO_DATA",
            "bidder_id": b_id
        })

    print(f"  ✓ Successfully created {len(created_bidders)} Synthetic Bidders with {total_docs_created} valid PDF documents (12 x 9 = 108).")

    # 4. Create 24-30 Demo Bid Submissions across the 12 Real Tenders
    statuses = ["SUBMITTED", "UNDER_VERIFICATION", "PENDING_REVIEW", "COMPLIANT", "NON_COMPLIANT", "REQUIRES_REVIEW"]
    bid_counter = 1
    total_bids_created = 0

    # Distribute bids across tenders (2 to 3 bidders per tender)
    for tender_idx, tender in enumerate(tenders_loaded):
        tender_id = tender["id"]
        bidders_for_tender = [
            created_bidders[tender_idx % 12],
            created_bidders[(tender_idx + 3) % 12],
            created_bidders[(tender_idx + 7) % 12]
        ]

        for bidder in bidders_for_tender:
            b_id = bidder["id"]
            variant = bidder["variant"]

            if variant == "COMPLIANT":
                comp_status = "COMPLIANT"
                risk_level = "LOW"
                eval_status = "PASSED"
            elif variant in ("MISSING_EXPERIENCE", "TURNOVER_LOW", "LOCAL_CONTENT_LOW"):
                comp_status = "NON_COMPLIANT"
                risk_level = "HIGH"
                eval_status = "FAILED"
            else:
                comp_status = "REQUIRES_REVIEW"
                risk_level = "MEDIUM"
                eval_status = "REVIEW_REQUIRED"

            bid_id = f"BID-SUB-{bid_counter:03d}"
            bid_record = {
                "id": bid_id,
                "tender_id": tender_id,
                "tender_number": tender["tender_number"],
                "bidder_id": b_id,
                "bidder_name": bidder["legal_business_name"],
                "submitted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": statuses[(bid_counter - 1) % len(statuses)],
                "compliance_status": comp_status,
                "evaluation_result": eval_status,
                "risk_level": risk_level,
                "bid_source": "BIDSURE_DEMO",
                "is_synthetic_demo": True,
                "quoted_amount": tender["estimated_value"] * (0.92 + (bid_counter % 10) * 0.01),
                "documents": [f"DOC-{b_id}-PAN", f"DOC-{b_id}-GST", f"DOC-{b_id}-EXPERIENCE_CERTIFICATE"],
                "requirements_breakdown": [
                    {
                        "requirement_id": req["id"],
                        "code": req["code"],
                        "title": req["title"],
                        "status": "PASS" if eval_status == "PASSED" else ("FAIL" if req["code"] in variant else "REVIEW"),
                        "extracted_value": "Meeting threshold" if eval_status == "PASSED" else "Below threshold / missing",
                        "required_value": req["threshold_value"],
                        "source_clause": req["clause_reference"],
                        "evidence": "Extracted from synthetic demo document store."
                    } for req in tender.get("requirements", [])
                ]
            }

            sample_data.SAMPLE_BIDDER_BIDS.append(bid_record)
            total_bids_created += 1
            bid_counter += 1

            # Audit log for bid submission
            sample_data.SAMPLE_AUDIT_LOGS.append({
                "id": f"AUDIT-BIDSUB-{bid_id}",
                "event_type": "BID_SUBMITTED_DEMO",
                "description": f"Demo bid {bid_id} submitted by {bidder['legal_business_name']} for tender {tender_id}",
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "actor": bidder["business_email"],
                "data_source": "BIDSURE_DEMO_DATA",
                "tender_id": tender_id,
                "bid_id": bid_id
            })

    print(f"  ✓ Successfully created {total_bids_created} Demo Bid Submissions across all 12 CPPP tenders.")

    # Save state to persistent demo_dataset_state.json so uvicorn / backend restarts load it automatically
    state_data = {
        "tenders": sample_data.SAMPLE_TENDERS,
        "bidders": sample_data.SAMPLE_BIDDERS,
        "bidder_profiles": sample_data.SAMPLE_BIDDER_PROFILES,
        "bidder_documents": sample_data.SAMPLE_BIDDER_DOCUMENTS,
        "bidder_bids": sample_data.SAMPLE_BIDDER_BIDS,
        "audit_logs": sample_data.SAMPLE_AUDIT_LOGS,
        "users": sample_data.SAMPLE_USERS
    }
    state_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "data", "demo_dataset_state.json"))
    os.makedirs(os.path.dirname(state_path), exist_ok=True)
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state_data, f, indent=2)
    print(f"  ✓ Saved persistent demo dataset state to {state_path}")

    print("==================================================")
    print("BidSure AI Demo Dataset Loader Completed Successfully")
    print("==================================================")
    print(f"  - Real CPPP Tenders: {len(tenders_loaded)}")
    print(f"  - Synthetic Bidders: {len(created_bidders)}")
    print(f"  - Synthetic Documents: {total_docs_created}")
    print(f"  - Demo Bids: {total_bids_created}")
    print(f"  - Audit Events: {len(sample_data.SAMPLE_AUDIT_LOGS)}")
    print("==================================================")


if __name__ == "__main__":
    run_demo_dataset_loader()
