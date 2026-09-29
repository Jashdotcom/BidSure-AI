"""Add a repeatable, non-destructive 25-tender demonstration dataset.

Run from the repository root with:
    python backend/scripts/seed_comprehensive_demo.py

The seed is additive. It uses stable IDs and leaves existing records and
credentials untouched. Demo verification evidence is always labelled synthetic.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


BACKEND = Path(__file__).resolve().parents[1]
STATE_PATH = BACKEND / "app" / "data" / "demo_dataset_state.json"
AUDIT_PATH = BACKEND / "data" / "audit.sqlite3"
SEED_BATCH = "BIDSURE_COMPREHENSIVE_DEMO_2026_V1"
DEMO_MARK = "SYNTHETIC DEMO DATA — NOT A GOVERNMENT VERIFICATION"

# id, title, organization, category, budget (INR), business area
TENDER_SPECS = [
    ("2026_IITG_930101_1", "Supply, Installation and Commissioning of Campus Core Network Switches", "Indian Institute of Technology Guwahati", "IT Infrastructure", 28500000, "campus networking"),
    ("2026_NIC_930102_1", "Establishment of Secure Government Data Centre Firewall Infrastructure", "National Informatics Centre", "Cybersecurity", 64000000, "next generation firewall"),
    ("2026_IISc_930103_1", "Procurement of High Resolution Mass Spectrometer for Central Research Facility", "Indian Institute of Science Bengaluru", "Scientific Equipment", 39800000, "laboratory instrumentation"),
    ("2026_CPWD_930104_1", "Construction of Administrative Block and Internal Roads at Regional Campus", "Central Public Works Department", "Civil Construction", 126000000, "civil works"),
    ("2026_AIIMS_930105_1", "Supply and Commissioning of Digital Radiography and Fluoroscopy Systems", "All India Institute of Medical Sciences Nagpur", "Medical Equipment", 47200000, "diagnostic imaging"),
    ("2026_BHEL_930106_1", "Supply of 33 kV Vacuum Circuit Breakers and Protection Panels", "Bharat Heavy Electricals Limited", "Electrical Equipment", 18400000, "electrical switchgear"),
    ("2026_PHED_930107_1", "Design, Supply and Installation of Water Pumping Stations and SCADA Controls", "Public Health Engineering Department Rajasthan", "Water Supply", 88500000, "water pumping"),
    ("2026_KVS_930108_1", "Supply of STEM Laboratory Kits and Classroom Furniture for Kendriya Vidyalayas", "Kendriya Vidyalaya Sangathan", "Education Supplies", 12600000, "school supplies"),
    ("2026_NIELIT_930109_1", "Supply of Desktop Workstations, Monitors and Network Attached Storage", "National Institute of Electronics and Information Technology", "Computer Hardware", 22100000, "computer hardware"),
    ("2026_CPWD_930110_1", "Comprehensive Annual Maintenance of HVAC and Building Management Systems", "Central Public Works Department", "Annual Maintenance", 17200000, "HVAC maintenance"),
    ("2026_IITM_930111_1", "Supply of Modular Office Workstations and Ergonomic Seating", "Indian Institute of Technology Madras", "Office Furniture", 9400000, "office furniture"),
    ("2026_SECI_930112_1", "Design, Supply and Commissioning of 500 kW Rooftop Solar Plants", "Solar Energy Corporation of India Limited", "Renewable Energy", 36800000, "solar power"),
    ("2026_ONGC_930113_1", "Procurement of CNC Vertical Turning Lathe for Workshop Operations", "Oil and Natural Gas Corporation Limited", "Industrial Machinery", 55300000, "industrial machinery"),
    ("2026_IRCTC_930114_1", "Integrated Passenger and Material Logistics Services for Regional Units", "Indian Railway Catering and Tourism Corporation", "Transportation and Logistics", 29800000, "transport logistics"),
    ("2026_MeITY_930115_1", "Development and Operations of a Unified Grievance Management Platform", "Ministry of Electronics and Information Technology", "Software Services", 41400000, "software platform"),
    ("2026_CDAC_930116_1", "Supply of High Performance Computing Nodes and InfiniBand Fabric", "Centre for Development of Advanced Computing", "IT Infrastructure", 76800000, "HPC network"),
    ("2026_CERTIN_930117_1", "Security Operations Centre Monitoring and Endpoint Protection Subscription", "Indian Computer Emergency Response Team", "Cybersecurity", 24600000, "SOC and endpoint security"),
    ("2026_NABL_930118_1", "Supply of Calibration Standards and Environmental Test Chamber", "National Accreditation Board for Testing and Calibration Laboratories", "Scientific Equipment", 14800000, "calibration equipment"),
    ("2026_NHAI_930119_1", "Rehabilitation of Bridge Approaches and Safety Barriers on National Highway", "National Highways Authority of India", "Civil Construction", 154000000, "highway infrastructure"),
    ("2026_ESIC_930120_1", "Supply of Modular Operation Theatre Lights and Anaesthesia Workstations", "Employees State Insurance Corporation", "Medical Equipment", 32900000, "hospital equipment"),
    ("2026_NTPC_930121_1", "Supply of Power Distribution Transformers and Energy Metering Units", "NTPC Limited", "Electrical Equipment", 43800000, "power distribution"),
    ("2026_CWC_930122_1", "Rehabilitation of Intake Wells and Raw Water Transmission Main", "Central Water Commission", "Water Supply", 61700000, "water infrastructure"),
    ("2026_NVS_930123_1", "Supply of Science Laboratory Consumables and Safety Equipment", "Navodaya Vidyalaya Samiti", "Education Supplies", 7800000, "education laboratory"),
    ("2026_GSI_930124_1", "Supply of Rugged Field Laptops and GIS Workstations", "Geological Survey of India", "Computer Hardware", 19600000, "field computing"),
    ("2026_AAI_930125_1", "Five Year Maintenance of Baggage Handling Conveyors at Regional Airports", "Airports Authority of India", "Annual Maintenance", 71300000, "airport maintenance"),
]

BIDDER_SPECS = [
    ("BID-DEMO-001", "Apex Secure Systems Pvt. Ltd.", "demo001@bidsure.local", "Mumbai", "Maharashtra"),
    ("BID-DEMO-002", "Vertex Industrial Technologies Pvt. Ltd.", "demo002@bidsure.local", "Bengaluru", "Karnataka"),
    ("BID-DEMO-003", "Nova Infra Solutions Pvt. Ltd.", "demo003@bidsure.local", "Chennai", "Tamil Nadu"),
    ("BID-DEMO-004", "BluePeak Engineering Pvt. Ltd.", "demo004@bidsure.local", "Hyderabad", "Telangana"),
    ("BID-DEMO-005", "Orion Technical Systems Pvt. Ltd.", "demo005@bidsure.local", "Pune", "Maharashtra"),
    ("BID-DEMO-006", "Pragati Electrical Solutions Pvt. Ltd.", "demo006@bidsure.local", "New Delhi", "Delhi"),
    ("BID-DEMO-007", "Quantum Facility Technologies Pvt. Ltd.", "demo007@bidsure.local", "Kolkata", "West Bengal"),
    ("BID-DEMO-008", "NexGen Scientific Instruments Pvt. Ltd.", "demo008@bidsure.local", "Ahmedabad", "Gujarat"),
    ("BID-DEMO-009", "Trident Civil Projects Pvt. Ltd.", "demo009@bidsure.local", "Gurugram", "Haryana"),
    ("BID-DEMO-010", "Arya Infrastructure Systems Pvt. Ltd.", "demo010@bidsure.local", "Noida", "Uttar Pradesh"),
    ("BID-DEMO-011", "Crestline Automation Pvt. Ltd.", "demo011@bidsure.local", "Nagpur", "Maharashtra"),
    ("BID-DEMO-012", "Bharat Integrated Engineering Pvt. Ltd.", "demo012@bidsure.local", "Indore", "Madhya Pradesh"),
    ("BID-DEMO-013", "GreenGrid Energy Solutions Pvt. Ltd.", "demo013@bidsure.local", "Jaipur", "Rajasthan"),
    ("BID-DEMO-014", "Meditech Healthcare Systems Pvt. Ltd.", "demo014@bidsure.local", "Lucknow", "Uttar Pradesh"),
    ("BID-DEMO-015", "Precision Industrial Equipment Pvt. Ltd.", "demo015@bidsure.local", "Coimbatore", "Tamil Nadu"),
]

# Counts exercise the complete 0..6 range. Drafts (indices 16-18) have no bids.
BID_COUNTS = [2, 4, 1, 5, 0, 3, 6, 2, 4, 1, 5, 1, 2, 3, 4, 5, 0, 0, 0, 3, 4, 5, 2, 3, 4]
COMPANY_VARIANTS = ["COMPLIANT", "MISSING_EXPERIENCE", "TURNOVER_LOW", "COMPLIANT", "MISSING_OEM", "GST_REVIEW", "COMPLIANT", "LOCAL_CONTENT_LOW", "COMPLIANT", "BLACKLIST_REVIEW", "MISSING_DOCUMENT", "COMPLIANT", "EXPIRED_CERTIFICATE", "TECHNICAL_DEFICIENCY", "COMPLIANT"]


def iso_day(days: int, hour: int = 18) -> str:
    return (datetime.now(timezone.utc).replace(hour=hour, minute=0, second=0, microsecond=0) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")


def tender_status(index: int) -> tuple[str, str]:
    # Closing Soon is a UI-derived state from a published tender's deadline.
    if index < 7:
        return "PUBLISHED", iso_day(60 + index)
    if index < 11:
        return "PUBLISHED", iso_day(3 + index - 7)
    if index < 16:
        return "CLOSED", iso_day(-30 + index)
    if index < 19:
        return "DRAFT", iso_day(45 + index)
    if index < 23:
        return "UNDER_REVIEW", iso_day(-7 - (index - 19))
    return "AWARDED", iso_day(-40 - (index - 23))


def _requirement_set(tender_id: str, area: str) -> list[dict[str, Any]]:
    rows = [
        ("GST", "GST registration and current filing status", "STATUTORY", "GSTIN active; filing current"),
        ("PAN", "PAN identity and legal entity match", "STATUTORY", "PAN mapped to bidding entity"),
        ("UDYAM", "MSME/Udyam registration where claimed", "STATUTORY", "Active Udyam registration or not applicable"),
        ("TURNOVER", "Average annual turnover for previous three financial years", "FINANCIAL", "Minimum 30% of estimated value"),
        ("EXPERIENCE", f"Relevant completed contracts for {area}", "ELIGIBILITY", "At least two similar public-sector contracts"),
        ("OEM", "OEM authorization or manufacturer credentials", "TECHNICAL", "Valid authorization for offered equipment/services"),
        ("MII", "Make in India local content declaration", "TECHNICAL", "Local content percentage supported by declaration"),
        ("EPFO_ESIC", "EPFO and ESIC statutory compliance", "STATUTORY", "Current compliance declaration"),
        ("BLACKLISTING", "Non-blacklisting and integrity declaration", "ELIGIBILITY", "No current debarment"),
        ("TECHNICAL", f"Technical conformity with {area} specifications", "TECHNICAL", "Meets all mandatory technical parameters"),
    ]
    return [{"id": f"{tender_id}-REQ-{code}", "code": code, "title": title, "category": category, "type": category, "description": title, "threshold": 2 if code in ("EXPERIENCE", "TURNOVER") else 0, "threshold_value": threshold, "clause_reference": f"Section {i}, Clause {i}.1", "mandatory": True, "weight": 10, "review_status": "SEEDED_DEMO"} for i, (code, title, category, threshold) in enumerate(rows, 1)]


def _profile_record(spec: tuple[str, str, str, str, str], index: int) -> dict[str, Any]:
    bidder_id, name, email, city, state = spec
    # Reuse prior demo identities. Only the three new identities need a new profile.
    pan = f"DEMO{index:05d}X"
    return {
        "id": bidder_id, "user_id": f"USR-{bidder_id}", "legal_business_name": name,
        "company_name": name, "entity_type": "Private Limited Company",
        "registered_address": f"Plot {index * 11}, Government Industrial Estate, Phase {index % 5 + 1}",
        "business_address": f"Plot {index * 11}, Government Industrial Estate, Phase {index % 5 + 1}",
        "city": city, "state": state, "pincode": f"560{index:03d}",
        "contact_person": f"Authorised Signatory {index}", "authorized_signatory": f"Authorised Signatory {index}",
        "business_email": email, "email": email, "phone": f"+91 98100{index:05d}",
        "pan": pan, "gstin": f"27{pan}1Z5", "udyam": f"UDYAM-{state[:2].upper()}-00-{index:07d}",
        "company_registration": f"U74999MH2020PTC{index:06d}", "epfo_number": f"MH/BAN/{index:06d}/000",
        "annual_turnover_cr": 1.0 if COMPANY_VARIANTS[index - 1] == "TURNOVER_LOW" else (8.0 + index * 1.25),
        "years_experience": 1 if COMPANY_VARIANTS[index - 1] == "MISSING_EXPERIENCE" else (4 + index % 13),
        "local_content_pct": 35 if index in (8, 13) else 65, "oem_status": "SECONDARY_DISTRIBUTOR" if index == 5 else "DIRECT_OEM",
        "status": "ACTIVE", "verification_status": "SYNTHETIC_DEMO", "variant": COMPANY_VARIANTS[index - 1],
        "is_synthetic_demo": True, "demo_watermark": DEMO_MARK,
        "government_verifications": {"pan": {"status": "DEMO_ONLY", "message": DEMO_MARK}, "gstin": {"status": "DEMO_ONLY", "message": DEMO_MARK}, "udyam": {"status": "DEMO_ONLY", "message": DEMO_MARK}, "epfo": {"status": "DEMO_ONLY", "message": DEMO_MARK}},
    }


def _demo_doc_records(profile: dict[str, Any], index: int) -> list[dict[str, Any]]:
    result = []
    for kind in ("PAN", "GST", "EXPERIENCE_CERTIFICATE", "OEM_AUTHORIZATION", "BLACKLISTING_DECLARATION", "EPFO_ESIC"):
        doc_id = f"DOC-{profile['id']}-{kind}"
        result.append({"id": doc_id, "bidder_id": profile["id"], "name": kind.replace("_", " "), "document_type": kind, "category": "PROFILE_DOCUMENT", "status": "SYNTHETIC_DEMO", "verification_status": "PENDING_REVIEW", "uploaded_at": iso_day(-index), "file_name": f"DEMO_{profile['id']}_{kind}.pdf", "is_synthetic_demo": True, "demo_watermark": DEMO_MARK})
    return result


def _evaluation(profile: dict[str, Any], requirement: dict[str, Any], tender_index: int, bidder_index: int) -> tuple[str, str, str]:
    variant = profile.get("variant", "COMPLIANT")
    if variant == "COMPLIANT":
        return "PASS", "VERIFIED_DEMO", DEMO_MARK
    if variant in ("MISSING_EXPERIENCE", "TURNOVER_LOW", "MISSING_OEM", "LOCAL_CONTENT_LOW", "MISSING_DOCUMENT", "TECHNICAL_DEFICIENCY"):
        if (variant == "MISSING_EXPERIENCE" and requirement["code"] == "EXPERIENCE") or (variant == "TURNOVER_LOW" and requirement["code"] == "TURNOVER") or (variant == "MISSING_OEM" and requirement["code"] == "OEM") or (variant == "LOCAL_CONTENT_LOW" and requirement["code"] == "MII") or (variant == "MISSING_DOCUMENT" and requirement["code"] == "EPFO_ESIC") or (variant == "TECHNICAL_DEFICIENCY" and requirement["code"] == "TECHNICAL"):
            return "FAIL", "FAILED_DEMO", DEMO_MARK
    if variant in ("GST_REVIEW", "BLACKLIST_REVIEW", "EXPIRED_CERTIFICATE"):
        return "REVIEW", "PENDING_REVIEW", DEMO_MARK
    # A mix of pending officer action and completed synthetic evaluation.
    return ("PASS", "PENDING_REVIEW", DEMO_MARK) if (tender_index + bidder_index) % 3 == 0 else ("PASS", "VERIFIED_DEMO", DEMO_MARK)


def build_seed_records(state: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    existing_tender_ids = {str(t.get("tender_number") or t.get("id") or t.get("tender_id")) for t in state.get("tenders", [])}
    collisions = [spec[0] for spec in TENDER_SPECS if spec[0] in existing_tender_ids and not any(t.get("seed_batch_id") == SEED_BATCH and (t.get("tender_number") == spec[0] or t.get("id") == spec[0]) for t in state.get("tenders", []))]
    if collisions:
        raise RuntimeError("Stable demo tender IDs already belong to non-seed records: " + ", ".join(collisions))

    profiles = dict(state.get("bidder_profiles") or {})
    users = list(state.get("users") or [])
    bidders = list(state.get("bidders") or [])
    bids = list(state.get("bidder_bids") or [])
    documents = list(state.get("bidder_documents") or [])
    tenders = list(state.get("tenders") or [])
    audits = list(state.get("audit_logs") or [])
    user_emails = {str(u.get("email", "")).lower() for u in users}
    bidder_ids = {str(p.get("id") or key) for key, p in profiles.items()}
    demo_profiles: dict[str, dict[str, Any]] = {}

    for index, spec in enumerate(BIDDER_SPECS, 1):
        bidder_id, name, email, _, _ = spec
        if bidder_id not in profiles:
            profile = _profile_record(spec, index)
            profiles[bidder_id] = profile
            demo_profiles[bidder_id] = profile
            if email.lower() not in user_emails:
                # Reuse the pre-existing demo bidder hash; no existing credential is changed.
                source_user = next((u for u in users if u.get("role") == "BIDDER" and u.get("password_hash")), None)
                if not source_user:
                    raise RuntimeError("No existing demo bidder password hash is available to reuse")
                users.append({"id": f"USR-{bidder_id}", "name": profile["contact_person"], "email": email, "password_hash": source_user["password_hash"], "role": "BIDDER", "bidder_id": bidder_id, "company_name": name, "is_synthetic_demo": True})
                user_emails.add(email.lower())
            bidders.append({"id": bidder_id, "name": name, "email": email, "status": "ACTIVE", "rating": 4.2 + (index % 8) / 10, "is_synthetic_demo": True, "seed_batch_id": SEED_BATCH})
        elif bidder_id not in bidder_ids:
            bidder_ids.add(bidder_id)
        if bidder_id in demo_profiles:
            documents.extend(_demo_doc_records(demo_profiles[bidder_id], index))

    existing_tender_numbers = {str(t.get("tender_number") or t.get("id") or t.get("tender_id")) for t in tenders}
    existing_bid_ids = {str(b.get("id")) for b in bids}
    existing_audit_ids = {str(a.get("id")) for a in audits}
    existing_doc_ids = {str(d.get("id")) for d in documents}
    new_tenders: list[dict[str, Any]] = []
    new_bids: list[dict[str, Any]] = []
    new_submissions: list[dict[str, Any]] = []
    new_audits: list[dict[str, Any]] = []

    def audit(event_id: str, action: str, entity_type: str, entity_id: str, actor: str, details: str, tender_id: str = "", bid_id: str = "", bidder_id: str = "") -> None:
        if event_id in existing_audit_ids:
            return
        event_timestamp = iso_day(-1)
        integrity_source = f"{event_id}:{action}:{entity_id}:{event_timestamp}"
        new_audits.append({"id": event_id, "timestamp": event_timestamp, "user_email": actor, "actor": actor, "user_role": "SYSTEM" if actor == "system@bidsure.demo" else ("PROCUREMENT_OFFICER" if actor.endswith("@bidsure.demo") else "BIDDER"), "action": action, "event_type": action, "entity_type": entity_type, "entity_id": entity_id, "tender_id": tender_id or entity_id, "bid_id": bid_id, "bidder_id": bidder_id, "details": details, "status": "SUCCESS", "integrity_hash": hashlib.sha256(integrity_source.encode("utf-8")).hexdigest(), "data_source": "BIDSURE_DEMO_DATA", "seed_batch_id": SEED_BATCH, "is_synthetic_demo": True})
        existing_audit_ids.add(event_id)

    for bidder_id, name, email, _, _ in BIDDER_SPECS:
        audit(f"{SEED_BATCH}:BIDDER:{bidder_id}:REGISTERED", "BIDDER_REGISTERED", "BIDDER", bidder_id, email, f"Demonstration bidder account/profile: {name}; {DEMO_MARK}.", bidder_id=bidder_id)

    for index, (tender_id, title, organization, category, budget, area) in enumerate(TENDER_SPECS):
        status, deadline = tender_status(index)
        publish_date = iso_day(-90 + index, 9)
        tender = {
            "id": tender_id, "tender_id": tender_id, "tender_number": tender_id, "ref": f"GEM/2026/B/{930101 + index}",
            "title": title, "organization": organization, "department": "Procurement and Materials Division", "category": category,
            "description": f"Open competitive procurement for {area}, including delivery, installation, commissioning, training and warranty support where applicable. Bidders must submit statutory declarations, technical compliance schedules and a sealed commercial quotation. All values in this record are synthetic demonstration data.",
            "estimated_value": budget, "estimated_value_display": f"₹ {budget:,.2f}", "emd_amount": round(budget * 0.02),
            "publish_date": publish_date, "published_date": publish_date, "issue_date": publish_date,
            "closing_date": deadline, "submission_deadline": deadline, "deadline": datetime.fromisoformat(deadline.replace("Z", "+00:00")).strftime("%d %b %Y"),
            "status": status, "seed_status_bucket": "CLOSING_SOON" if 7 <= index < 11 else status,
            "evaluation_stage": "Technical and Commercial", "evaluation_method": "L1 among technically responsive bidders",
            "summary": f"Procurement of {area} by {organization}.", "file_name": "DEMO_TENDER_NOTICE.pdf", "file_size_kb": 0,
            "is_analyzed": True, "requirements": _requirement_set(tender_id, area), "document_references": [],
            "total_bidders_submitted": BID_COUNTS[index], "bids_count": BID_COUNTS[index], "verified_count": 0,
            "is_synthetic_demo": True, "demo_watermark": DEMO_MARK, "seed_batch_id": SEED_BATCH,
        }
        if tender_id not in existing_tender_numbers:
            new_tenders.append(tender)
            existing_tender_numbers.add(tender_id)
            audit(f"{SEED_BATCH}:TENDER:{tender_id}:CREATED", "TENDER_CREATED", "TENDER", tender_id, "system@bidsure.demo", f"Seeded demonstration tender created: {title}.", tender_id=tender_id)
            audit(f"{SEED_BATCH}:TENDER:{tender_id}:PUBLISHED", "TENDER_PUBLISHED" if status in ("PUBLISHED", "CLOSED", "UNDER_REVIEW", "AWARDED") else "TENDER_DRAFTED", "TENDER", tender_id, "officer@bidsure.demo", f"Tender status seeded as {status}; {DEMO_MARK}.", tender_id=tender_id)
            if status in ("CLOSED", "AWARDED"):
                audit(f"{SEED_BATCH}:TENDER:{tender_id}:CLOSED", "TENDER_CLOSED", "TENDER", tender_id, "officer@bidsure.demo", "Demonstration tender lifecycle closed.", tender_id=tender_id)
            if status == "AWARDED":
                audit(f"{SEED_BATCH}:TENDER:{tender_id}:AWARDED", "AWARD_DECLARED", "TENDER", tender_id, "officer@bidsure.demo", "Demonstration award linked to the lowest eligible seed bid.", tender_id=tender_id)

        # Add only records from this batch. Rotating bidders creates realistic participation.
        start_bidder = 11 if index == 24 else index % len(BIDDER_SPECS)
        award_eligible_indices = [i for i, spec in enumerate(BIDDER_SPECS) if profiles[spec[0]].get("variant") == "COMPLIANT"]
        for offset in range(BID_COUNTS[index]):
            bidder_index = award_eligible_indices[(index + offset) % len(award_eligible_indices)] if status == "AWARDED" else (start_bidder + offset) % len(BIDDER_SPECS)
            bidder_id, bidder_name, email, city, region = BIDDER_SPECS[bidder_index]
            profile = profiles[bidder_id]
            bid_id = f"DEMO25-BID-{index + 1:02d}-{offset + 1:02d}"
            if bid_id in existing_bid_ids:
                continue
            variant = profile.get("variant", "COMPLIANT")
            tender_amount = budget * (0.78 + ((index * 7) % 10) / 100 + offset * 0.025)
            requirement_rows = []
            for req in tender["requirements"]:
                outcome, verification, evidence = _evaluation(profile, req, index, bidder_index)
                requirement_rows.append({"requirement_id": req["id"], "code": req["code"], "title": req["title"], "status": outcome, "verification_status": verification, "required_value": req["threshold_value"], "extracted_value": "Seeded scenario evidence" if outcome == "PASS" else "Not established by the demo evidence", "source_clause": req["clause_reference"], "evidence": evidence, "demo_data": True})
            failed_count = sum(row["status"] == "FAIL" for row in requirement_rows)
            review_count = sum(row["status"] == "REVIEW" for row in requirement_rows)
            if status == "AWARDED":
                bid_status = "AWARDED" if offset == 0 else ("COMPLIANT" if failed_count == 0 and review_count == 0 else "NON_COMPLIANT")
            elif status == "UNDER_REVIEW":
                bid_status = "PENDING_REVIEW" if review_count else ("NON_COMPLIANT" if failed_count else "VERIFIED")
            elif status == "CLOSED":
                bid_status = "DISQUALIFIED" if failed_count else ("PENDING_REVIEW" if review_count else "VERIFIED")
            elif status == "PUBLISHED":
                bid_status = ["SUBMITTED", "UNDER_VERIFICATION", "PENDING_REVIEW", "VERIFIED"][offset % 4]
            else:
                continue
            comp_status = "NON_COMPLIANT" if failed_count else ("REQUIRES_REVIEW" if review_count else "COMPLIANT")
            risk = "HIGH" if failed_count else ("MEDIUM" if review_count else "LOW")
            score = round(max(0, 100 - failed_count * 22 - review_count * 7), 1)
            doc_ids = [f"DOC-{bidder_id}-{suffix}" for suffix in ("PAN", "GST", "EXPERIENCE_CERTIFICATE")]
            # Keep the references only if the corresponding seeded document record exists.
            doc_ids = [doc_id for doc_id in doc_ids if doc_id in existing_doc_ids or any(d.get("id") == doc_id for d in documents)]
            document_map = {key: doc_id for key, doc_id in zip(("pan_certificate", "gst_certificate", "experience_cert"), doc_ids)}
            verification_records = [{"credential": code, "status": next((r["verification_status"] for r in requirement_rows if r["code"] == code), "NOT_APPLICABLE"), "demo_data": True, "message": DEMO_MARK} for code in ("GST", "PAN", "UDYAM", "OEM", "MII", "TURNOVER", "EPFO_ESIC", "BLACKLISTING", "TECHNICAL")]
            bid = {
                "id": bid_id, "bid_submission_id": bid_id, "tender_id": tender_id, "tender_number": tender_id,
                "tender_title": title, "bidder_id": bidder_id, "bidder_name": bidder_name, "name": bidder_name,
                "email": email, "contact_person": profile.get("contact_person", f"Authorised Signatory {bidder_index + 1}"),
                "phone": profile.get("phone", f"+91 98100000{bidder_index + 1:02d}"), "location": f"{city}, {region}",
                "submitted_at": iso_day(-1, 10), "submission_date": iso_day(-1, 10), "status": bid_status,
                "compliance_status": comp_status, "compliance_score": score, "verification_status": "PENDING_REVIEW" if review_count else ("FAILED" if failed_count else "SYNTHETIC_DEMO"),
                "evaluation_result": "FAILED" if failed_count else ("REVIEW_REQUIRED" if review_count else "PASSED"), "risk_level": risk,
                "quoted_amount": round(tender_amount, 2), "bid_amount": f"₹ {tender_amount:,.2f}", "estimated_value": budget,
                "documents": doc_ids, "document_ids": doc_ids, "requirements_breakdown": requirement_rows, "verification_records": verification_records,
                "annual_turnover_cr": profile.get("annual_turnover_cr", 0), "years_experience": profile.get("years_experience", 0),
                "gstin": profile.get("gstin", ""), "pan": profile.get("pan", ""), "udyam": profile.get("udyam", ""),
                "oem_status": profile.get("oem_status", "UNVERIFIED"), "local_content": profile.get("local_content_pct", 0),
                "summary": {"pass_count": len(requirement_rows) - failed_count - review_count, "fail_count": failed_count, "review_count": review_count, "total": len(requirement_rows)},
                "is_synthetic_demo": True, "demo_watermark": DEMO_MARK, "seed_batch_id": SEED_BATCH,
            }
            submission = {"id": bid_id, "bid_submission_id": bid_id, "tender_id": tender_id, "tender_number": tender_id, "tender_title": title, "bidder_id": bidder_id, "name": bidder_name, "email": email, "contact_person": bid["contact_person"], "phone": bid["phone"], "location": bid["location"], "bid_amount": bid["bid_amount"], "quoted_amount": bid["quoted_amount"], "submitted_at": bid["submitted_at"], "status": bid_status, "verification_status": bid["verification_status"], "compliance_status": comp_status, "compliance_score": score, "risk_level": risk, "summary": bid["summary"], "evaluation_result": bid["evaluation_result"], "documents": document_map, "document_ids": doc_ids, "requirements_breakdown": requirement_rows, "verification_records": verification_records, "is_draft": False, "is_synthetic_demo": True, "demo_watermark": DEMO_MARK, "seed_batch_id": SEED_BATCH}
            new_bids.append(bid)
            new_submissions.append(submission)
            existing_bid_ids.add(bid_id)
            audit(f"{SEED_BATCH}:BID:{bid_id}:SUBMITTED", "BID_SUBMISSION", "BID", bid_id, email, f"Demonstration bid submitted for {tender_id}; {DEMO_MARK}.", tender_id, bid_id, bidder_id)
            audit(f"{SEED_BATCH}:BID:{bid_id}:DOCUMENTS", "DOCUMENT_UPLOADED", "BID", bid_id, email, f"Synthetic document references attached for demonstration only; {DEMO_MARK}.", tender_id, bid_id, bidder_id)
            audit(f"{SEED_BATCH}:BID:{bid_id}:OCR", "OCR_PROCESSED", "BID", bid_id, "system@bidsure.demo", "Synthetic demo document references processed for display only.", tender_id, bid_id, bidder_id)
            audit(f"{SEED_BATCH}:BID:{bid_id}:EVALUATED", "COMPLIANCE_EVALUATED", "BID", bid_id, "system@bidsure.demo", f"Seeded scenario evaluation result: {comp_status}; {DEMO_MARK}.", tender_id, bid_id, bidder_id)
            if status in ("UNDER_REVIEW", "AWARDED"):
                audit(f"{SEED_BATCH}:BID:{bid_id}:REPORT", "REPORT_GENERATED", "BID", bid_id, "officer@bidsure.demo", "Seeded compliance evaluation report available for this demonstration record.", tender_id, bid_id, bidder_id)
            if review_count or failed_count:
                audit(f"{SEED_BATCH}:BID:{bid_id}:REVIEW", "VERIFICATION_STATUS_CHANGED", "BID", bid_id, "officer@bidsure.demo", f"Seeded verification outcome requires officer review or contains a failed criterion; {DEMO_MARK}.", tender_id, bid_id, bidder_id)

    return {"tenders": new_tenders, "profiles": profiles, "users": users, "bidders": bidders, "bidder_bids": new_bids, "submissions": new_submissions, "documents": documents, "audit_logs": audits, "new_audits": new_audits}


def write_state(state: dict[str, Any], records: dict[str, list[dict[str, Any]]]) -> None:
    # Preserve all unrelated keys and all pre-existing rows.
    state["tenders"] = list(state.get("tenders", [])) + records["tenders"]
    state["bidder_profiles"] = records["profiles"]
    state["users"] = records["users"]
    state["bidders"] = records["bidders"] + records["submissions"]
    state["bidder_bids"] = list(state.get("bidder_bids", [])) + records["bidder_bids"]
    state["bidder_documents"] = records["documents"]
    state["audit_logs"] = list(state.get("audit_logs", [])) + records["new_audits"]
    temporary = STATE_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, STATE_PATH)


def write_audit_sqlite(events: list[dict[str, Any]]) -> None:
    if not events:
        return
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(AUDIT_PATH) as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, user_email TEXT NOT NULL DEFAULT '', user_role TEXT NOT NULL DEFAULT 'UNKNOWN', action TEXT NOT NULL, entity_type TEXT NOT NULL DEFAULT '', entity_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'SUCCESS', integrity_hash TEXT NOT NULL DEFAULT '', payload_json TEXT NOT NULL)""")
        for name in ("timestamp", "action", "user_email"):
            connection.execute(f"CREATE INDEX IF NOT EXISTS idx_audit_{name} ON audit_logs({name})")
        for event in events:
            payload = json.dumps(event, ensure_ascii=False, separators=(",", ":"))
            connection.execute("INSERT OR IGNORE INTO audit_logs (id,timestamp,user_email,user_role,action,entity_type,entity_id,status,integrity_hash,payload_json) VALUES (?,?,?,?,?,?,?,?,?,?)", (event["id"], event["timestamp"], event.get("user_email", ""), event.get("user_role", "UNKNOWN"), event["action"], event.get("entity_type", ""), event.get("entity_id", ""), event.get("status", "SUCCESS"), hashlib.sha256(payload.encode("utf-8")).hexdigest(), payload))


def validate(state: dict[str, Any]) -> dict[str, Any]:
    batch_tenders = [t for t in state["tenders"] if t.get("seed_batch_id") == SEED_BATCH]
    batch_bids = [b for b in state["bidder_bids"] if b.get("seed_batch_id") == SEED_BATCH]
    batch_profiles = [state["bidder_profiles"][spec[0]] for spec in BIDDER_SPECS if spec[0] in state["bidder_profiles"]]
    batch_audits = [a for a in state["audit_logs"] if a.get("seed_batch_id") == SEED_BATCH]
    expected = {"PUBLISHED": 7, "CLOSING_SOON": 4, "CLOSED": 5, "DRAFT": 3, "UNDER_REVIEW": 4, "AWARDED": 2}
    buckets = {bucket: sum(1 for t in batch_tenders if t.get("seed_status_bucket", t.get("status")) == bucket) for bucket in expected}
    if len(batch_tenders) != 25 or buckets != expected:
        raise RuntimeError(f"Seed validation failed: tenders={len(batch_tenders)}, buckets={buckets}")
    if len({t["tender_number"] for t in batch_tenders}) != 25:
        raise RuntimeError("Seed tender IDs are not unique")
    tender_ids = {t["tender_number"] for t in batch_tenders}
    if any(b.get("tender_id") not in tender_ids or b.get("bidder_id") not in state["bidder_profiles"] for b in batch_bids):
        raise RuntimeError("A seeded bid references a missing tender or bidder profile")
    if any(t.get("status") == "DRAFT" and any(b.get("tender_id") == t["tender_number"] for b in batch_bids) for t in batch_tenders):
        raise RuntimeError("A draft tender has submitted bids")
    users_by_bidder = {str(user.get("bidder_id")) for user in state.get("users", []) if user.get("role") == "BIDDER"}
    if any(spec[0] not in users_by_bidder for spec in BIDDER_SPECS):
        raise RuntimeError("A seeded bidder profile is not linked to an existing or seeded BIDDER auth user")
    count_distribution = {count: sum(1 for t in batch_tenders if sum(1 for b in batch_bids if b["tender_id"] == t["tender_number"]) == count) for count in range(7)}
    if any(count_distribution[count] == 0 for count in range(7)):
        raise RuntimeError(f"Missing bidder participation count: {count_distribution}")
    for index, tender in enumerate(batch_tenders):
        tender_bids = [b for b in batch_bids if b["tender_id"] == tender["tender_number"]]
        if len(tender_bids) != BID_COUNTS[index]:
            raise RuntimeError(f"Bid count mismatch for {tender['tender_number']}: {len(tender_bids)} != {BID_COUNTS[index]}")
        if len({b.get("quoted_amount") for b in tender_bids}) != len(tender_bids):
            raise RuntimeError(f"Duplicate commercial quotes for {tender['tender_number']}")
        if tender.get("status") == "AWARDED":
            winners = [b for b in tender_bids if b.get("status") == "AWARDED" and b.get("compliance_status") == "COMPLIANT"]
            if len(winners) != 1 or winners[0]["quoted_amount"] != min(b["quoted_amount"] for b in tender_bids if b["compliance_status"] == "COMPLIANT"):
                raise RuntimeError(f"Award state is not linked to the lowest compliant bidder for {tender['tender_number']}")
    if len(batch_profiles) < 15 or len(batch_bids) != len({b["id"] for b in batch_bids}) or not batch_audits:
        raise RuntimeError("Seed bidder, bid uniqueness or audit validation failed")
    return {"tenders": len(batch_tenders), "status_distribution": buckets, "bidders": len(batch_profiles), "bid_submissions": len(batch_bids), "bidder_count_distribution": count_distribution, "compliance_records": sum(len(b.get("verification_records", [])) for b in batch_bids), "audit_events": len(batch_audits)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Validate the proposed additive seed without writing data")
    args = parser.parse_args()
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    # Validate relationships and status plan before any writes.
    records = build_seed_records(state)
    proposed = dict(state)
    write_state_data = {"tenders": list(state.get("tenders", [])) + records["tenders"], "bidder_profiles": records["profiles"], "users": records["users"], "bidders": records["bidders"] + records["submissions"], "bidder_bids": list(state.get("bidder_bids", [])) + records["bidder_bids"], "bidder_documents": records["documents"], "audit_logs": list(state.get("audit_logs", [])) + records["new_audits"]}
    proposed.update(write_state_data)
    report = validate(proposed)
    print(json.dumps({"mode": "dry-run" if args.dry_run else "seed", "planned_new_tenders": len(records["tenders"]), "planned_new_bid_submissions": len(records["bidder_bids"]), "planned_new_audit_events": len(records["new_audits"]), **report}, indent=2))
    if args.dry_run:
        return
    write_state(state, records)
    write_audit_sqlite([event for event in state["audit_logs"] if event.get("seed_batch_id") == SEED_BATCH])
    print("Seed complete. Run the same command again to verify idempotency; existing seed IDs are skipped.")


if __name__ == "__main__":
    main()
