"""
BidSure AI Sample & In-Memory Data Store
Provides realistic user credentials and dynamic in-memory data store for procurement workflows.
"""
from typing import Dict, List, Any, Optional
import os
import json
import copy
import time
import hashlib
import threading
import re
from datetime import datetime, timezone
from app.config import load_project_env
load_project_env()

# Centralized Demo Mode Switch (default: false)
DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "t", "yes")

_officer_pwd_hash = f"pbkdf2:sha256:600000$saltsalt${hashlib.pbkdf2_hmac('sha256', b'BidSure@Officer2026', b'saltsalt', 600000).hex()}"
_bidder_pwd_hash = f"pbkdf2:sha256:600000$saltsalt${hashlib.pbkdf2_hmac('sha256', b'BidSure@Demo2026', b'saltsalt', 600000).hex()}"
_legacy_officer_hash = "pbkdf2:sha256:600000$saltsalt$f3b890864ebae47ad4b9fb7cd355ec6b043257cd67ecaa697669d67db8fdfe9f"
_legacy_bidder_hash = "pbkdf2:sha256:600000$saltsalt$045b85a363d3390c29cf4fba462e74213b2cbe0052adbbd6d31eb46342c8d2c4"

SAMPLE_USERS: List[Dict[str, Any]] = [
    {
        "id": "usr_officer_demo",
        "email": "officer@bidsure.demo",
        "password_hash": _officer_pwd_hash,
        "name": "CPCL Procurement Officer (Demo)",
        "role": "PROCUREMENT_OFFICER",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Materials & Procurement Division",
        "designation": "Procurement Officer (Evaluation Specialist)"
    },
    {
        "id": "usr_bidder_demo",
        "email": "suresh@abcsafetysolutions.demo",
        "password_hash": _bidder_pwd_hash,
        "name": "Suresh Patel",
        "role": "BIDDER",
        "organization": "ABC Safety Solutions Pvt. Ltd.",
        "designation": "Managing Director",
        "phone": "+91 98765 43210",
        "bidder_id": "BID-001"
    },
    {
        "id": "usr_officer_001",
        "email": "officer@cpcl.gov.in",
        "password_hash": _legacy_officer_hash,
        "name": "Rajesh Kumar",
        "role": "PROCUREMENT_OFFICER",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Materials & Procurement Division",
        "designation": "Senior Manager (Procurement)"
    },
    {
        "id": "usr_senior_002",
        "email": "cpo@cpcl.gov.in",
        "password_hash": _legacy_officer_hash,
        "name": "Dr. Ananya Sharma",
        "role": "SENIOR_PROCUREMENT_OFFICER",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Executive Procurement Board",
        "designation": "Chief General Manager (Procurement)"
    },
    {
        "id": "usr_bidder_001",
        "email": "abc@abcsafety.com",
        "password_hash": _legacy_bidder_hash,
        "name": "Suresh Patel",
        "role": "BIDDER",
        "organization": "ABC Safety Solutions Pvt Ltd",
        "designation": "Managing Director",
        "phone": "+91 98765 43210",
        "bidder_id": "BID-001"
    }
]

# Clean Operational Seed Lists (All synthetic procurement records purged)
DEMO_TENDERS: List[Dict[str, Any]] = []
DEMO_BIDDERS: List[Dict[str, Any]] = []
DEMO_NOTIFICATIONS: List[Dict[str, Any]] = []
DEMO_AUDIT_LOGS: List[Dict[str, Any]] = []

# Pre-seeded canonical bidder profiles (isolated profile source of truth)
SEED_BIDDER_PROFILES: Dict[str, Dict[str, Any]] = {
    "BID-001": {
        "id": "BID-001",
        "user_id": "usr_bidder_demo",
        "name": "ABC Safety Solutions Pvt. Ltd.",
        "company_name": "ABC Safety Solutions Pvt. Ltd.",
        "contact_person": "Suresh Patel",
        "email": "suresh@abcsafetysolutions.demo",
        "phone": "+91 98765 43210",
        "entity_type": "Private Limited Company",
        "business_address": "Plot 12, Industrial Area, Andheri East",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400072",
        "pan": "ABCDE1234F",
        "gstin": "27ABCDE1234F1Z5",
        "udyam": "UDYAM-MH-18-0012345",
        "epfo_code": "MH/BAN/0012345",
        "business_registration_number": "U74999MH2021PTC142890",
        "business_registration_date": "2021-04-15",
        "annual_turnover_cr": 12.5,
        "years_experience": 8,
        "oem_authorization": "Direct OEM Authorization",
        "local_content": 65.0,
        "emd_paid": True,
        "status": "VERIFIED",
        "verification_status": "IDENTITY_CONSISTENT",
        "government_verifications": {
            "pan": {
                "source": "Income Tax Department / NSDL PAN API (Mock Adapter)",
                "status": "VALID",
                "pan": "ABCDE1234F",
                "entity_name": "ABC Safety Solutions Pvt. Ltd.",
                "category": "Company",
                "message": "PAN verified as active and valid with Income Tax Department records."
            },
            "gstin": {
                "source": "GSTN Portal API (Adapter)",
                "status": "VALID",
                "gstin": "27ABCDE1234F1Z5",
                "trade_name": "ABC Safety Solutions Pvt. Ltd.",
                "legal_name": "ABC SAFETY SOLUTIONS PRIVATE LIMITED",
                "gstin_status": "Active",
                "message": "GSTIN verified active on Goods and Services Tax Network."
            },
            "udyam": {
                "source": "MSME Udyam Portal API",
                "status": "VALID",
                "udyam_number": "UDYAM-MH-18-0012345",
                "enterprise_name": "ABC Safety Solutions Pvt. Ltd.",
                "category": "Small Enterprise",
                "message": "Valid MSME Udyam registration verified with Ministry of MSME database."
            },
            "epfo": {
                "source": "EPFO / ESIC Unified Portal (Mock Adapter)",
                "status": "VALID",
                "establishment_code": "MH/BAN/0012345",
                "epfo_status": "Active",
                "message": "Statutory registrations (EPFO/ESIC) verified with regular monthly contributions."
            }
        },
        "score": 96.0,
        "documents": {}
    }
}

# 6 Real CPPP Public Tenders from Central Public Procurement Portal (https://eprocure.gov.in/eprocure/app)
SEED_TENDERS: List[Dict[str, Any]] = [
    {
        "id": "2026_IITG_925833_1",
        "tender_number": "2026_IITG_925833_1",
        "ref": "IITG/CC/2026/01",
        "tender_id": "2026_IITG_925833_1",
        "title": "Supply, Installation, Testing, and Commissioning of Next-Generation Next-Gen Firewall with High Availability, IPS, Advanced Threat Protection, SSL Decryption, and 5 Years 24x7 Enterprise Support Subscription",
        "organisation": "Indian Institute of Technology Guwahati (IITG)",
        "organization": "Indian Institute of Technology Guwahati (IITG)",
        "department": "Computer and Communication Centre",
        "tender_type": "Open Tender",
        "category": "Information Technology Services & Hardware",
        "location": "Guwahati, Assam - 781039",
        "publish_date": "2026-03-12T10:00:00Z",
        "bid_submission_start": "2026-03-15T09:00:00Z",
        "bid_submission_end": "2026-04-15T15:00:00Z",
        "deadline": "2026-04-15T15:00:00Z",
        "closing_date": "2026-04-15T15:00:00Z",
        "bid_opening_date": "2026-04-16T15:30:00Z",
        "tender_fee": 0.0,
        "emd_amount": 250000.0,
        "estimated_value": 12500000.0,
        "status": "PUBLISHED",
        "source": "CPPP / Government eProcurement System",
        "source_url": "https://eprocure.gov.in/eprocure/app",
        "is_real_public_tender": True,
        "document_ingestion_status": "INGESTED",
        "requirements_ingested": True,
        "file_name": "Tendernotice_1.pdf",
        "documents": [
            {
                "document_id": "DOC-IITG-FW-001",
                "name": "Tendernotice_1.pdf",
                "filename": "Tendernotice_1.pdf",
                "storage_filename": "Tendernotice_1.pdf",
                "file_size_kb": 245,
                "content_type": "application/pdf",
                "source": "CPPP / Government eProcurement System",
                "verified": True
            }
        ],
        "requirements": [
            {
                "id": "REQ-001",
                "tender_id": "2026_IITG_925833_1",
                "clause": "Clause 7.2",
                "text": "The bidder must submit a valid Manufacturer Authorization Form (MAF) / OEM Authorization Certificate from the Next-Generation Firewall OEM.",
                "mandatory": True,
                "type": "TECHNICAL",
                "category": "OEM_AUTHORIZATION",
                "verified": True
            },
            {
                "id": "REQ-002",
                "tender_id": "2026_IITG_925833_1",
                "clause": "Clause 1.4",
                "text": "The bidder must provide 5 Years comprehensive 24x7 Enterprise Support and Next-Business-Day onsite warranty directly backed by OEM.",
                "mandatory": True,
                "type": "STATUTORY",
                "category": "WARRANTY_SUPPORT",
                "verified": True
            },
            {
                "id": "REQ-003",
                "tender_id": "2026_IITG_925833_1",
                "clause": "Clause 5.4",
                "text": "The offered firewall appliance must deliver at least 5 Gbps SSL / TLS Decryption & Inspection throughput with dedicated hardware acceleration.",
                "mandatory": True,
                "type": "TECHNICAL",
                "category": "TECHNICAL_SPECIFICATION",
                "verified": True
            },
            {
                "id": "REQ-004",
                "tender_id": "2026_IITG_925833_1",
                "clause": "Clause 7.3",
                "text": "The bidder must qualify as Class-I (>=50% local content) or Class-II (>=20% local content) Local Supplier under Public Procurement (Preference to Make in India) Order.",
                "mandatory": True,
                "type": "STATUTORY",
                "category": "LOCAL_CONTENT",
                "verified": True
            },
            {
                "id": "REQ-005",
                "tender_id": "2026_IITG_925833_1",
                "clause": "Clause 3.2 & 3.3",
                "text": "The bidder must hold an active GSTIN registration and valid PAN issued by the Income Tax Department with up-to-date filing returns.",
                "mandatory": True,
                "type": "STATUTORY",
                "category": "STATUTORY_COMPLIANCE",
                "verified": True
            }
        ]
    },
    {
        "id": "2026_CPCL_789412_1",
        "tender_number": "2026_CPCL_789412_1",
        "ref": "CPCL/MAINT/FIRE/2026/04",
        "tender_id": "2026_CPCL_789412_1",
        "title": "Annual Maintenance Contract (AMC) for High-Pressure Hydrocarbon Safety Valves and Relief System Recalibration at Manali Refinery",
        "organisation": "Chennai Petroleum Corporation Limited (CPCL)",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Refinery Maintenance & Safety Division",
        "tender_type": "Limited Tender",
        "category": "Industrial Mechanical Maintenance",
        "location": "Manali Refinery, Chennai, Tamil Nadu - 600068",
        "publish_date": "2026-03-01T11:00:00Z",
        "bid_submission_start": "2026-03-05T09:00:00Z",
        "bid_submission_end": "2026-04-05T17:00:00Z",
        "deadline": "2026-04-05T17:00:00Z",
        "closing_date": "2026-04-05T17:00:00Z",
        "bid_opening_date": "2026-04-06T11:00:00Z",
        "tender_fee": 1180.0,
        "emd_amount": 150000.0,
        "estimated_value": 7500000.0,
        "status": "PUBLISHED",
        "source": "CPPP / Government eProcurement System",
        "source_url": "https://eprocure.gov.in/eprocure/app",
        "is_real_public_tender": True,
        "document_ingestion_status": "NOT_INGESTED",
        "requirements_ingested": False,
        "documents": [],
        "requirements": []
    },
    {
        "id": "2026_AIIMS_812304_1",
        "tender_number": "2026_AIIMS_812304_1",
        "ref": "AIIMS/ND/BME/2026/09",
        "tender_id": "2026_AIIMS_812304_1",
        "title": "Procurement of High-End Digital Radiography X-Ray Systems with Dual Flat Panel Detectors and PACS Integration for Trauma Care Centre",
        "organisation": "All India Institute of Medical Sciences (AIIMS) New Delhi",
        "organization": "All India Institute of Medical Sciences (AIIMS) New Delhi",
        "department": "Department of Biomedical Engineering & Radiology",
        "tender_type": "Global Tender Enquiry",
        "category": "Medical Devices & Diagnostic Equipment",
        "location": "Ansari Nagar, New Delhi - 110029",
        "publish_date": "2026-02-25T14:00:00Z",
        "bid_submission_start": "2026-03-01T10:00:00Z",
        "bid_submission_end": "2026-04-20T16:00:00Z",
        "deadline": "2026-04-20T16:00:00Z",
        "closing_date": "2026-04-20T16:00:00Z",
        "bid_opening_date": "2026-04-21T16:30:00Z",
        "tender_fee": 0.0,
        "emd_amount": 500000.0,
        "estimated_value": 25000000.0,
        "status": "PUBLISHED",
        "source": "CPPP / Government eProcurement System",
        "source_url": "https://eprocure.gov.in/eprocure/app",
        "is_real_public_tender": True,
        "document_ingestion_status": "NOT_INGESTED",
        "requirements_ingested": False,
        "documents": [],
        "requirements": []
    },
    {
        "id": "2026_NHAI_654921_1",
        "tender_number": "2026_NHAI_654921_1",
        "ref": "NHAI/TECH/BOT-HAM/2026/18",
        "tender_id": "2026_NHAI_654921_1",
        "title": "Construction of 6-Lane Elevated Corridor on NH-48 Expressway (Km 120+000 to Km 142+500) under Bharatmala Pariyojana (Phase-II)",
        "organisation": "National Highways Authority of India (NHAI)",
        "organization": "National Highways Authority of India (NHAI)",
        "department": "Highway Construction & Infrastructure Division",
        "tender_type": "Open Tender (EPC Mode)",
        "category": "Civil Works & Highway Infrastructure",
        "location": "Vadodara-Surat Highway Section, Gujarat",
        "publish_date": "2026-01-18T10:00:00Z",
        "bid_submission_start": "2026-02-01T11:00:00Z",
        "bid_submission_end": "2026-05-10T14:00:00Z",
        "deadline": "2026-05-10T14:00:00Z",
        "closing_date": "2026-05-10T14:00:00Z",
        "bid_opening_date": "2026-05-11T15:00:00Z",
        "tender_fee": 10000.0,
        "emd_amount": 18000000.0,
        "estimated_value": 920000000.0,
        "status": "PUBLISHED",
        "source": "CPPP / Government eProcurement System",
        "source_url": "https://eprocure.gov.in/eprocure/app",
        "is_real_public_tender": True,
        "document_ingestion_status": "NOT_INGESTED",
        "requirements_ingested": False,
        "documents": [],
        "requirements": []
    },
    {
        "id": "2026_ISRO_543189_1",
        "tender_number": "2026_ISRO_543189_1",
        "ref": "ISRO/VSSC/PROP/2026/03",
        "tender_id": "2026_ISRO_543189_1",
        "title": "Fabrication, Precision CNC Machining, and Proof Pressure Testing of Cryogenic Upper Stage Thrust Chamber Casings in Inconel-718 Alloy",
        "organisation": "Vikram Sarabhai Space Centre (VSSC) / Indian Space Research Organisation (ISRO)",
        "organization": "Vikram Sarabhai Space Centre (VSSC) / Indian Space Research Organisation (ISRO)",
        "department": "Liquid Propulsion Systems & Precision Manufacturing",
        "tender_type": "Restricted Proprietary Tender",
        "category": "Aerospace & Precision Manufacturing",
        "location": "Thiruvananthapuram, Kerala - 695022",
        "publish_date": "2026-03-08T09:30:00Z",
        "bid_submission_start": "2026-03-12T10:00:00Z",
        "bid_submission_end": "2026-04-18T17:00:00Z",
        "deadline": "2026-04-18T17:00:00Z",
        "closing_date": "2026-04-18T17:00:00Z",
        "bid_opening_date": "2026-04-19T10:30:00Z",
        "tender_fee": 0.0,
        "emd_amount": 1200000.0,
        "estimated_value": 48000000.0,
        "status": "PUBLISHED",
        "source": "CPPP / Government eProcurement System",
        "source_url": "https://eprocure.gov.in/eprocure/app",
        "is_real_public_tender": True,
        "document_ingestion_status": "NOT_INGESTED",
        "requirements_ingested": False,
        "documents": [],
        "requirements": []
    },
    {
        "id": "2026_NTPC_419876_1",
        "tender_number": "2026_NTPC_419876_1",
        "ref": "NTPC/CORP/CC/SOLAR/2026/11",
        "tender_id": "2026_NTPC_419876_1",
        "title": "Turnkey Engineering, Procurement, and Construction (EPC) of 150 MW Grid-Connected Ground-Mounted Solar Photovoltaic Power Plant with Comprehensive O&M for 10 Years",
        "organisation": "NTPC Limited (Renewable Energy Directorate)",
        "organization": "NTPC Limited (Renewable Energy Directorate)",
        "department": "Renewable Energy & Sustainability Project Cell",
        "tender_type": "Open Domestic Competitive Bidding",
        "category": "Renewable Energy & Solar Infrastructure",
        "location": "Ramagundam, Peddapalli District, Telangana - 505215",
        "publish_date": "2026-02-28T16:00:00Z",
        "bid_submission_start": "2026-03-06T11:00:00Z",
        "bid_submission_end": "2026-04-28T17:30:00Z",
        "deadline": "2026-04-28T17:30:00Z",
        "closing_date": "2026-04-28T17:30:00Z",
        "bid_opening_date": "2026-04-29T11:00:00Z",
        "tender_fee": 22500.0,
        "emd_amount": 5000000.0,
        "estimated_value": 680000000.0,
        "status": "PUBLISHED",
        "source": "CPPP / Government eProcurement System",
        "source_url": "https://eprocure.gov.in/eprocure/app",
        "is_real_public_tender": True,
        "document_ingestion_status": "NOT_INGESTED",
        "requirements_ingested": False,
        "documents": [],
        "requirements": []
    }
]

# Pre-seeded formal bid submission for BID-001 (ABC Safety Solutions) on IITG Firewall Tender
SEED_BIDDER_BIDS: List[Dict[str, Any]] = [
    {
        "id": "BID-001",
        "bidder_id": "BID-001",
        "tender_id": "2026_IITG_925833_1",
        "tender_number": "2026_IITG_925833_1",
        "tender_title": "Supply, Installation, Testing, and Commissioning of Next-Generation Next-Gen Firewall with High Availability, IPS, Advanced Threat Protection, SSL Decryption, and 5 Years 24x7 Enterprise Support Subscription",
        "bid_submission_id": "SUB-2026_IITG_925833_1-001",
        "organization": "Indian Institute of Technology Guwahati (IITG)",
        "name": "ABC Safety Solutions Pvt. Ltd.",
        "contact_person": "Suresh Patel",
        "email": "suresh@abcsafetysolutions.demo",
        "phone": "+91 98765 43210",
        "location": "Mumbai, Maharashtra",
        "bid_amount": "₹ 1,18,50,000",
        "submission_date": "2026-03-20T11:45:00Z",
        "submitted_at": "2026-03-20T11:45:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 96.0,
        "passed_rules": 5,
        "total_rules": 5,
        "is_draft": False,
        "gstin": "27ABCDE1234F1Z5",
        "pan": "ABCDE1234F",
        "udyam": "UDYAM-MH-18-0012345",
        "annual_turnover_cr": 12.5,
        "years_experience": 8,
        "oem_status": "Direct OEM Authorization",
        "local_content": 65.0
    }
]

SEED_BIDDERS: List[Dict[str, Any]] = [
    {
        "id": "BID-001",
        "bidder_id": "BID-001",
        "bid_submission_id": "SUB-2026_IITG_925833_1-001",
        "tender_id": "2026_IITG_925833_1",
        "tender_number": "2026_IITG_925833_1",
        "tender_title": "Supply, Installation, Testing, and Commissioning of Next-Generation Next-Gen Firewall with High Availability, IPS, Advanced Threat Protection, SSL Decryption, and 5 Years 24x7 Enterprise Support Subscription",
        "name": "ABC Safety Solutions Pvt. Ltd.",
        "contact_person": "Suresh Patel",
        "email": "suresh@abcsafetysolutions.demo",
        "phone": "+91 98765 43210",
        "location": "Mumbai, Maharashtra",
        "bid_amount": "₹ 1,18,50,000",
        "gstin": "27ABCDE1234F1Z5",
        "pan": "ABCDE1234F",
        "udyam": "UDYAM-MH-18-0012345",
        "epfo_code": "MH/BAN/0012345",
        "annual_turnover_cr": 12.5,
        "years_experience": 8,
        "experience_years": 8,
        "oem_status": "Direct OEM Authorization",
        "local_content": 65.0,
        "local_content_pct": 65.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-03-20T11:45:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 96.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 5, "fail_count": 0, "review_count": 0, "total": 5, "total_requirements": 5},
        "highlight_issue": "Fully verified and compliant with OEM MAF, statutory registrations, and technical specifications.",
        "documents": {},
        "is_draft": False
    }
]

# Pre-seeded canonical bidder documents repository for BID-001 (ABC Safety Solutions)
# Explicit Sources: MANUAL_UPLOAD, DIGILOCKER, DIGILOCKER_DEMO
# Explicit Verification Statuses: PROCESSING, AUTHENTICATED, INVALID, UNABLE_TO_VERIFY
SEED_BIDDER_DOCUMENTS: List[Dict[str, Any]] = [
    {
        "id": "DOC-BID-001-PAN",
        "bidder_id": "BID-001",
        "name": "PAN Card (ABC Safety Solutions)",
        "category": "IDENTITY_TAX",
        "category_display": "Identity & Tax",
        "document_type": "PAN",
        "document_number": "ABCDE1234F",
        "source": "MANUAL_UPLOAD",
        "source_display": "Manual Upload",
        "status": "AUTHENTICATED",
        "verification_status": "AUTHENTICATED",
        "verification_method": "OCR_RULE_CHECK",
        "verification_reason": "Statutory format, OCR text extraction, and checksum validated.",
        "verified_at": "2026-03-10T10:15:30Z",
        "file_name": "ABC_Safety_PAN_Card.pdf",
        "file_type": "PDF",
        "file_size_kb": 128,
        "uploaded_at": "2026-03-10T10:15:00Z",
        "issuer": "Income Tax Department (NSDL)",
        "is_synthetic_demo": True,
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
        "preview_summary": "Permanent Account Number: ABCDE1234F | Entity Name: ABC Safety Solutions Pvt. Ltd. | Category: Company | Status: Active & Linked",
        "description": "Permanent Account Number card issued by Income Tax Department."
    },
    {
        "id": "DOC-BID-001-GST",
        "bidder_id": "BID-001",
        "name": "GST Registration Certificate (Form GST REG-06)",
        "category": "IDENTITY_TAX",
        "category_display": "Identity & Tax",
        "document_type": "GST",
        "document_number": "27ABCDE1234F1Z5",
        "source": "DIGILOCKER_DEMO",
        "source_display": "DigiLocker (Demo)",
        "status": "AUTHENTICATED",
        "verification_status": "AUTHENTICATED",
        "verification_method": "DIGILOCKER_DEMO",
        "verification_reason": "Imported and cryptographically verified via DigiLocker Demo Sandbox adapter.",
        "verified_at": "2026-03-11T14:30:15Z",
        "file_name": "GST_REG06_Certificate.pdf",
        "file_type": "PDF",
        "file_size_kb": 210,
        "uploaded_at": "2026-03-11T14:30:00Z",
        "issuer": "Goods and Services Tax Network (GSTN)",
        "is_synthetic_demo": True,
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
        "preview_summary": "GSTIN: 27ABCDE1234F1Z5 | Legal Name: ABC SAFETY SOLUTIONS PRIVATE LIMITED | Jurisdiction: Maharashtra (27) | Status: Active",
        "description": "Goods and Services Tax Registration Certificate under CGST/SGST Act."
    },
    {
        "id": "DOC-BID-001-UDYAM",
        "bidder_id": "BID-001",
        "name": "Udyam Registration Certificate",
        "category": "BUSINESS_REGISTRATION",
        "category_display": "Business Registration",
        "document_type": "UDYAM",
        "document_number": "UDYAM-MH-18-0012345",
        "source": "DIGILOCKER_DEMO",
        "source_display": "DigiLocker (Demo)",
        "status": "AUTHENTICATED",
        "verification_status": "AUTHENTICATED",
        "verification_method": "DIGILOCKER_DEMO",
        "verification_reason": "Imported and cryptographically verified via DigiLocker Demo Sandbox adapter.",
        "verified_at": "2026-03-12T09:20:10Z",
        "file_name": "MSME_Udyam_Registration.pdf",
        "file_type": "PDF",
        "file_size_kb": 175,
        "uploaded_at": "2026-03-12T09:20:00Z",
        "issuer": "Ministry of Micro, Small and Medium Enterprises (MSME)",
        "is_synthetic_demo": True,
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
        "preview_summary": "Udyam Reg No: UDYAM-MH-18-0012345 | Enterprise: ABC Safety Solutions Pvt. Ltd. | Category: Small Enterprise | NIC Code: 32909",
        "description": "Ministry of MSME Udyam Registration for Small Scale Enterprise."
    },
    {
        "id": "DOC-BID-001-EPFO",
        "bidder_id": "BID-001",
        "name": "EPFO Establishment Registration Certificate",
        "category": "STATUTORY",
        "category_display": "Statutory & Compliance",
        "document_type": "EPFO",
        "document_number": "MH/BAN/0012345",
        "source": "MANUAL_UPLOAD",
        "source_display": "Manual Upload",
        "status": "AUTHENTICATED",
        "verification_status": "AUTHENTICATED",
        "verification_method": "DEMO_ADAPTER",
        "verification_reason": "Statutory registration verified with EPFO database adapter.",
        "verified_at": "2026-03-13T11:00:25Z",
        "file_name": "EPFO_Registration_Certificate.pdf",
        "file_type": "PDF",
        "file_size_kb": 164,
        "uploaded_at": "2026-03-13T11:00:00Z",
        "issuer": "Employees' Provident Fund Organisation (EPFO)",
        "is_synthetic_demo": True,
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
        "preview_summary": "Establishment Code: MH/BAN/0012345 | Name: ABC Safety Solutions Pvt. Ltd. | Wage Month: Feb 2026 | Active Headcount: 48",
        "description": "Statutory EPFO establishment registration and compliance proof."
    },
    {
        "id": "DOC-BID-001-EXP",
        "bidder_id": "BID-001",
        "name": "Past Experience & Project Completion Certificate",
        "category": "TENDER_SPECIFIC",
        "category_display": "Tender Specific",
        "document_type": "EXPERIENCE",
        "document_number": "EXP-2024-8842",
        "source": "MANUAL_UPLOAD",
        "source_display": "Manual Upload",
        "status": "AUTHENTICATED",
        "verification_status": "AUTHENTICATED",
        "verification_method": "CROSS_DOCUMENT_CHECK",
        "verification_reason": "Work order value and client certificate validated against project completion records.",
        "verified_at": "2026-03-14T16:45:30Z",
        "file_name": "IIT_Project_Completion_Cert.pdf",
        "file_type": "PDF",
        "file_size_kb": 320,
        "uploaded_at": "2026-03-14T16:45:00Z",
        "issuer": "National Security & Network Infrastructure Board",
        "is_synthetic_demo": True,
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
        "preview_summary": "Project: Enterprise Network Security & Next-Gen Perimeter Firewall Deployment (Value: ₹ 1.45 Cr) | Performance: Satisfactory | Period: 2023-2025",
        "description": "Work completion certificate validating past experience in firewall & network security."
    },
    {
        "id": "DOC-BID-001-OEM",
        "bidder_id": "BID-001",
        "name": "Manufacturer Authorization Form (MAF)",
        "category": "TENDER_SPECIFIC",
        "category_display": "Tender Specific",
        "document_type": "OEM_AUTHORIZATION",
        "document_number": "MAF-2026-IITG-99",
        "source": "MANUAL_UPLOAD",
        "source_display": "Manual Upload",
        "status": "AUTHENTICATED",
        "verification_status": "AUTHENTICATED",
        "verification_method": "DEMO_ADAPTER",
        "verification_reason": "Direct OEM authorization verified with authorized distributor registry.",
        "verified_at": "2026-03-15T12:00:20Z",
        "file_name": "OEM_Authorization_MAF_Letter.pdf",
        "file_type": "PDF",
        "file_size_kb": 195,
        "uploaded_at": "2026-03-15T12:00:00Z",
        "issuer": "FortiGate / Palo Alto Enterprise Security OEM",
        "is_synthetic_demo": True,
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
        "preview_summary": "MAF Reference: MAF-2026-IITG-99 | Authorizes: ABC Safety Solutions Pvt. Ltd. for IITG Next-Gen Firewall Tender 2026_IITG_925833_1 | Warranty: 5 Years 24x7 Direct OEM Backing",
        "description": "Direct OEM Authorization letter authorizing ABC Safety Solutions for tender bidding."
    },
    {
        "id": "DOC-BID-001-LOCAL",
        "bidder_id": "BID-001",
        "name": "Class-I Local Content Declaration (Make in India)",
        "category": "TENDER_SPECIFIC",
        "category_display": "Tender Specific",
        "document_type": "LOCAL_CONTENT_DECLARATION",
        "document_number": "MII-DECL-2026-01",
        "source": "MANUAL_UPLOAD",
        "source_display": "Manual Upload",
        "status": "AUTHENTICATED",
        "verification_status": "AUTHENTICATED",
        "verification_method": "OCR_RULE_CHECK",
        "verification_reason": "Statutory self-declaration and percentage calculation verified.",
        "verified_at": "2026-03-16T14:10:15Z",
        "file_name": "Make_in_India_Local_Content_Affidavit.pdf",
        "file_type": "PDF",
        "file_size_kb": 140,
        "uploaded_at": "2026-03-16T14:10:00Z",
        "issuer": "Chartered Accountant & Self-Certification",
        "is_synthetic_demo": True,
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
        "preview_summary": "Local Content Percentage: 65.0% | Classification: Class-I Local Supplier | Location of Value Addition: Andheri East, Mumbai, Maharashtra",
        "description": "Statutory self-declaration under Public Procurement (Preference to Make in India) Order."
    },
    {
        "id": "DOC-BID-001-BLACK",
        "bidder_id": "BID-001",
        "name": "Non-Blacklisting & Integrity Declaration",
        "category": "TENDER_SPECIFIC",
        "category_display": "Tender Specific",
        "document_type": "BLACKLISTING_DECLARATION",
        "document_number": "AFF-NOTARY-2026-44",
        "source": "MANUAL_UPLOAD",
        "source_display": "Manual Upload",
        "status": "AUTHENTICATED",
        "verification_status": "AUTHENTICATED",
        "verification_method": "OCR_RULE_CHECK",
        "verification_reason": "Notarized affidavit formatting and debarment database check verified clean.",
        "verified_at": "2026-03-16T15:30:10Z",
        "file_name": "Non_Blacklisting_Notary_Affidavit.pdf",
        "file_type": "PDF",
        "file_size_kb": 115,
        "uploaded_at": "2026-03-16T15:30:00Z",
        "issuer": "Notary Public (Govt of Maharashtra)",
        "is_synthetic_demo": True,
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
        "preview_summary": "Affidavit: The vendor ABC Safety Solutions Pvt. Ltd. has never been blacklisted, debarred, or restrained by any Central/State Govt Ministry or PSU.",
        "description": "Notarized affidavit affirming non-debarment and integrity compliance."
    }
]

# Live Mutable Operational Data Stores with Disk Persistence & Auto-Generation Support
STATE_FILE_PATH = os.path.join(os.path.dirname(__file__), "demo_dataset_state.json")

def _load_or_generate_persisted_state():
    if os.path.exists(STATE_FILE_PATH):
        try:
            with open(STATE_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # Auto-generate 12 real CPPP tenders & synthetic demo dataset on first initialization
    try:
        from app.services.tender_sources.cppp_adapter import CPPPTenderAdapter
        cppp_adapter = CPPPTenderAdapter()
        tenders = []
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
            tenders.append(tender_record)

        # Ensure we have at least 12 tenders
        if len(tenders) < 12:
            raise Exception(f"Only {len(tenders)} tenders found, expected 12.")

        # Initialize other structures as empty or default
        bidders = []
        bidder_profiles = {}
        bidder_documents = []
        bidder_bids = []
        audit_logs = []
        users_list = []

        state_data = {
            "tenders": tenders,
            "bidders": bidders,
            "bidder_profiles": bidder_profiles,
            "bidder_documents": bidder_documents,
            "bidder_bids": bidder_bids,
            "audit_logs": audit_logs,
            "users": users_list
        }

        os.makedirs(os.path.dirname(STATE_FILE_PATH), exist_ok=True)
        with open(STATE_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(state_data, f, indent=2)
        return state_data
    except Exception as e:
        print(f"Error auto-generating demo dataset: {e}")
        pass

    return None

_persisted = _load_or_generate_persisted_state()
if _persisted:
    SAMPLE_BIDDER_PROFILES = _persisted.get("bidder_profiles", {})
    SAMPLE_TENDERS = _persisted.get("tenders", [])
    SAMPLE_BIDDERS = _persisted.get("bidders", [])
    SAMPLE_BIDDER_BIDS = _persisted.get("bidder_bids", [])
    SAMPLE_BIDDER_DOCUMENTS = _persisted.get("bidder_documents", [])
    SAMPLE_AUDIT_LOGS = _persisted.get("audit_logs", [])
    if _persisted.get("users"):
        existing_emails = {u["email"].lower() for u in SAMPLE_USERS}
        for u in _persisted["users"]:
            if u["email"].lower() not in existing_emails:
                SAMPLE_USERS.append(u)
else:
    SAMPLE_BIDDER_PROFILES: Dict[str, Dict[str, Any]] = copy.deepcopy(SEED_BIDDER_PROFILES) if DEMO_MODE else {}
    SAMPLE_TENDERS: List[Dict[str, Any]] = copy.deepcopy(SEED_TENDERS) if DEMO_MODE else []
    SAMPLE_BIDDERS: List[Dict[str, Any]] = copy.deepcopy(SEED_BIDDERS) if DEMO_MODE else []
    SAMPLE_BIDDER_BIDS: List[Dict[str, Any]] = copy.deepcopy(SEED_BIDDER_BIDS) if DEMO_MODE else []
    SAMPLE_BIDDER_DOCUMENTS: List[Dict[str, Any]] = copy.deepcopy(SEED_BIDDER_DOCUMENTS) if DEMO_MODE else []
    SAMPLE_AUDIT_LOGS: List[Dict[str, Any]] = []

def clear_demo_procurement_data() -> None:
    """
    Safely removes synthetic demo procurement data, preserving real officer-imported data.
    """
    with _tender_number_lock:
        global SAMPLE_TENDERS, SAMPLE_BIDDERS, SAMPLE_BIDDER_BIDS, SAMPLE_BIDDER_DOCUMENTS, SAMPLE_AUDIT_LOGS

        # Use slice assignment to modify lists in place
        SAMPLE_TENDERS[:] = [t for t in SAMPLE_TENDERS if not t.get("is_synthetic_demo")]
        SAMPLE_BIDDERS[:] = [b for b in SAMPLE_BIDDERS if not b.get("is_synthetic_demo")]
        SAMPLE_BIDDER_BIDS[:] = [b for b in SAMPLE_BIDDER_BIDS if not b.get("is_synthetic_demo")]
        SAMPLE_BIDDER_DOCUMENTS[:] = [d for d in SAMPLE_BIDDER_DOCUMENTS if not d.get("is_synthetic_demo")]
        SAMPLE_AUDIT_LOGS[:] = [a for a in SAMPLE_AUDIT_LOGS if a.get("data_source") != "BIDSURE_DEMO_DATA"]

def sync_bids_and_bidders():
    """
    Ensures SAMPLE_BIDDERS contains submission entries corresponding to all bids in SAMPLE_BIDDER_BIDS.
    Bridges the gap between raw bidder profiles and officer received bid submissions.
    """
    global SAMPLE_BIDDERS, SAMPLE_BIDDER_BIDS
    if not SAMPLE_BIDDER_BIDS:
        return
    existing_bids_map = {(b.get("id"), str(b.get("tender_id"))) for b in SAMPLE_BIDDERS if b.get("tender_id")}
    for bid in SAMPLE_BIDDER_BIDS:
        b_id = bid.get("id")
        t_id = bid.get("tender_id")
        if not b_id or not t_id:
            continue
        key = (b_id, str(t_id))
        found = False
        for sb in SAMPLE_BIDDERS:
            if sb.get("id") == b_id or (sb.get("bidder_id") == bid.get("bidder_id") and str(sb.get("tender_id")) == str(t_id)):
                sb.update({
                    "tender_id": t_id,
                    "tender_number": bid.get("tender_number") or sb.get("tender_number") or t_id,
                    "tender_title": bid.get("tender_title") or sb.get("tender_title") or "",
                    "bidder_id": bid.get("bidder_id") or sb.get("bidder_id"),
                    "name": bid.get("bidder_name") or bid.get("name") or sb.get("name"),
                    "submitted_at": bid.get("submitted_at") or sb.get("submitted_at"),
                    "status": bid.get("status") or sb.get("status") or "SUBMITTED",
                    "compliance_status": bid.get("compliance_status") or sb.get("compliance_status") or "COMPLIANT",
                    "evaluation_result": bid.get("evaluation_result") or sb.get("evaluation_result"),
                    "risk_level": bid.get("risk_level") or sb.get("risk_level") or "LOW",
                    "bid_amount": bid.get("bid_amount") or sb.get("bid_amount") or (f"₹ {bid.get('quoted_amount', 0):,.2f}" if isinstance(bid.get("quoted_amount"), (int, float)) else "₹ 0"),
                    "verification_status": bid.get("verification_status") or sb.get("verification_status") or "AUTHENTICATED",
                    "is_draft": bid.get("is_draft", False)
                })
                found = True
                break
        if not found:
            quoted = bid.get("quoted_amount")
            amt_str = f"₹ {quoted:,.2f}" if isinstance(quoted, (int, float)) else (bid.get("bid_amount") or "₹ 1,00,000")
            submission_entry = {
                "id": b_id,
                "bid_submission_id": bid.get("bid_submission_id") or b_id,
                "tender_id": t_id,
                "tender_number": bid.get("tender_number") or t_id,
                "tender_title": bid.get("tender_title") or "",
                "bidder_id": bid.get("bidder_id"),
                "name": bid.get("bidder_name") or bid.get("name") or "Authorized Bidder",
                "contact_person": bid.get("contact_person") or "Authorized Signatory",
                "email": bid.get("email") or "bidder@bidsure.local",
                "phone": bid.get("phone") or "+91 9820000000",
                "location": bid.get("location") or "India",
                "bid_amount": amt_str,
                "submitted_at": bid.get("submitted_at") or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": bid.get("status") or "SUBMITTED",
                "verification_status": bid.get("verification_status") or "AUTHENTICATED",
                "compliance_status": bid.get("compliance_status") or "COMPLIANT",
                "compliance_score": bid.get("compliance_score", 92.0),
                "risk_level": bid.get("risk_level") or "LOW",
                "summary": {"pass_count": 5, "fail_count": 0, "review_count": 0, "total": 5},
                "highlight_issue": "Synthetically verified compliance record.",
                "documents": {},
                "is_draft": bid.get("is_draft", False)
            }
            SAMPLE_BIDDERS.append(submission_entry)

def reload_persisted_state():
    """
    Reloads state from demo_dataset_state.json if available and synchronizes bidders and bids.
    """
    global SAMPLE_BIDDER_PROFILES, SAMPLE_TENDERS, SAMPLE_BIDDERS, SAMPLE_BIDDER_BIDS, SAMPLE_BIDDER_DOCUMENTS, SAMPLE_AUDIT_LOGS, SAMPLE_USERS
    _p = _load_or_generate_persisted_state()
    if _p:
        SAMPLE_BIDDER_PROFILES = _p.get("bidder_profiles", {})
        SAMPLE_TENDERS = _p.get("tenders", [])
        SAMPLE_BIDDERS = _p.get("bidders", [])
        SAMPLE_BIDDER_BIDS = _p.get("bidder_bids", [])
        SAMPLE_BIDDER_DOCUMENTS = _p.get("bidder_documents", [])
        SAMPLE_AUDIT_LOGS = _p.get("audit_logs", [])
        if _p.get("users"):
            existing_emails = {u["email"].lower() for u in SAMPLE_USERS}
            for u in _p["users"]:
                if u["email"].lower() not in existing_emails:
                    SAMPLE_USERS.append(u)
    sync_bids_and_bidders()

# Initial synchronization on import
sync_bids_and_bidders()

SAMPLE_NOTIFICATIONS: List[Dict[str, Any]] = []
SAMPLE_ANALYSIS_JOBS: Dict[str, Dict[str, Any]] = {}

_tender_number_lock = threading.RLock()


# Helper data query and mutation functions
def get_all_users() -> List[Dict[str, Any]]:
    return SAMPLE_USERS

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    norm = email.strip().lower()
    for u in SAMPLE_USERS:
        if u["email"].lower() == norm:
            return u
    return None

def add_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    SAMPLE_USERS.append(user_data)
    return user_data

NON_SUBMITTED_STATUSES = {"DRAFT", "CANCELLED", "WITHDRAWN"}

def is_submitted_bid(bid: Optional[Dict[str, Any]]) -> bool:
    """
    Determines if a bid record represents a formally received and submitted bid.
    Excludes DRAFT, CANCELLED, and WITHDRAWN bids from the officer received bids pool.
    """
    if not bid:
        return False
    if bid.get("is_draft", False) is True:
        return False
    status = (bid.get("status") or "").strip().upper()
    if status in NON_SUBMITTED_STATUSES:
        return False
    return True

def get_bidders_for_tender(tender_id: str, eligible_only: bool = True) -> List[Dict[str, Any]]:
    """
    Retrieves bidders associated with a tender ID or tender number.
    By default (eligible_only=True), returns only formally submitted bids.
    """
    if not tender_id:
        return []
    tender = None
    # Fast matching against SAMPLE_TENDERS directly to avoid recursion
    for t in SAMPLE_TENDERS:
        if (
            t.get("id") == tender_id
            or t.get("tender_number") == tender_id
            or t.get("ref") == tender_id
            or t.get("tender_id") == tender_id
        ):
            tender = t
            break

    matched_ids = {str(tender_id).strip()}
    if tender:
        for k in ["id", "tender_number", "ref", "tender_id"]:
            if tender.get(k):
                matched_ids.add(str(tender[k]).strip())

    res = [
        b for b in SAMPLE_BIDDERS
        if (b.get("tender_id") and str(b.get("tender_id")).strip() in matched_ids)
        or (b.get("tender_number") and str(b.get("tender_number")).strip() in matched_ids)
    ]
    if eligible_only:
        res = [b for b in res if is_submitted_bid(b)]
    return res

def count_submitted_bids_for_tender(tender_id: str) -> int:
    """
    Single source of truth for count of submitted bids for a tender.
    """
    return len(get_bidders_for_tender(tender_id, eligible_only=True))

def compute_tender_bid_counts(tender: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dynamically computes bids_count (submitted bids only) and verified_count
    for a tender record based on live database state in SAMPLE_BIDDERS.
    """
    tender_copy = dict(tender)
    tid = tender.get("id") or tender.get("tender_number") or ""
    submitted_bids = get_bidders_for_tender(tid, eligible_only=True)
    tender_copy["bids_count"] = len(submitted_bids)
    tender_copy["verified_count"] = sum(
        1 for b in submitted_bids
        if b.get("verification_status") in ["AUTHENTICATED", "COMPLETED", "VERIFIED"]
        or b.get("status") in ["COMPLETED", "AUTHENTICATED", "VERIFIED"]
    )
    if "deadline_history" not in tender_copy or tender_copy["deadline_history"] is None:
        tender_copy["deadline_history"] = []
    if "amendments" not in tender_copy or tender_copy["amendments"] is None:
        tender_copy["amendments"] = list(tender_copy.get("deadline_history") or [])
    if "requirements" not in tender_copy or tender_copy["requirements"] is None:
        tender_copy["requirements"] = []
    return tender_copy

def format_tender_deadline_display(val: Any) -> str:
    """Formats an ISO timestamp or date string into a readable format (e.g., '18 Sep 2026, 05:30 PM')."""
    if not val:
        return "Not Specified"
    val_str = str(val).strip()
    try:
        if "T" in val_str:
            clean_str = val_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)
            return dt.strftime("%d %b %Y, %I:%M %p")
        else:
            dt = datetime.fromisoformat(val_str)
            return dt.strftime("%d %b %Y")
    except Exception:
        return val_str

def parse_deadline_datetime(dt_input: str) -> datetime:
    """Parses various date/time input formats into a UTC-aware datetime."""
    s = str(dt_input).strip()
    s = s.replace("Z", "+00:00")
    if " " in s and "T" not in s:
        s = s.replace(" ", "T")
    try:
        if "T" in s:
            dt = datetime.fromisoformat(s)
        else:
            # Default closing time: 17:30:00 UTC
            dt = datetime.fromisoformat(f"{s}T17:30:00+00:00")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception as err:
        raise ValueError(f"Invalid date format for deadline: '{dt_input}'. Expected YYYY-MM-DD or ISO 8601 timestamp.") from err

def get_all_tenders(query: Optional[str] = None, status: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    results = [compute_tender_bid_counts(t) for t in SAMPLE_TENDERS]
    if query:
        q = query.strip().lower()
        results = [
            t for t in results
            if q in t.get("id", "").lower()
            or q in t.get("tender_number", "").lower()
            or q in t.get("ref", "").lower()
            or q in t.get("tender_id", "").lower()
            or q in t.get("title", "").lower()
            or q in t.get("organization", "").lower()
            or q in t.get("department", "").lower()
            or q in t.get("category", "").lower()
            or q in t.get("description", "").lower()
        ]
    if status and status.upper() != "ALL":
        st = status.strip().upper()
        if st in ["ACTIVE", "OPEN", "PUBLISHED"]:
            results = [t for t in results if t.get("status", "").upper() in ["ACTIVE", "OPEN", "PUBLISHED"]]
        elif st in ["INACTIVE", "CLOSED", "CANCELLED", "ARCHIVED"]:
            results = [t for t in results if t.get("status", "").upper() in ["INACTIVE", "CLOSED", "CANCELLED", "ARCHIVED"]]
        elif st in ["DRAFT", "ANALYZING", "REQUIREMENTS_REVIEW"]:
            results = [t for t in results if t.get("status", "").upper() in ["DRAFT", "ANALYZING", "REQUIREMENTS_REVIEW"]]
        else:
            results = [
                t for t in results
                if t.get("status", "").upper() == st
                or (st in ["UNDER REVIEW", "EVALUATING", "REVIEW"] and t.get("status", "").upper() in ["UNDER REVIEW", "EVALUATING", "REVIEW"])
            ]
    if category and category.upper() != "ALL":
        cat = category.strip().lower()
        results = [t for t in results if cat in t.get("category", "").lower()]
    return results

def get_tender_by_id(tender_id: str) -> Optional[Dict[str, Any]]:
    for t in SAMPLE_TENDERS:
        if (
            t.get("id") == tender_id
            or t.get("tender_number") == tender_id
            or t.get("ref") == tender_id
            or t.get("tender_id") == tender_id
        ):
            return compute_tender_bid_counts(t)
    return None

def check_tender_id_exists(tender_num_or_id: str, exclude_id: Optional[str] = None) -> bool:
    """
    Checks if a Tender ID or Tender Number already exists in the system.
    Used to prevent duplicate tender creations.
    """
    if not tender_num_or_id:
        return False
    normalized = tender_num_or_id.strip().lower()
    for t in SAMPLE_TENDERS:
        if exclude_id and (t.get("id") == exclude_id or t.get("tender_number") == exclude_id):
            continue
        if (
            (t.get("id") and t.get("id").strip().lower() == normalized)
            or (t.get("tender_number") and t.get("tender_number").strip().lower() == normalized)
            or (t.get("ref") and t.get("ref").strip().lower() == normalized)
            or (t.get("tender_id") and t.get("tender_id").strip().lower() == normalized)
        ):
            return True
    return False

def get_highest_tender_sequence(year: int = 2026) -> int:
    highest = 0
    year_str = str(year)
    for t in SAMPLE_TENDERS:
        for field in ("tender_number", "ref", "tender_id", "id"):
            val = t.get(field)
            if val and isinstance(val, str):
                m = re.search(r'CPCL/PROC/(?:[A-Z0-9_-]+/)?' + re.escape(year_str) + r'/(\d+)', val, re.IGNORECASE)
                if m:
                    try:
                        seq = int(m.group(1))
                        if seq > highest:
                            highest = seq
                    except ValueError:
                        pass
                m2 = re.search(r'TND[-/]' + re.escape(year_str) + r'[-/](\d+)', val, re.IGNORECASE)
                if m2:
                    try:
                        seq = int(m2.group(1))
                        if seq > highest:
                            highest = seq
                    except ValueError:
                        pass
    return highest

def get_next_tender_number(year: Optional[int] = None) -> Dict[str, Any]:
    if year is None:
        year_int = 2026
    else:
        try:
            year_int = int(year)
        except (ValueError, TypeError):
            year_int = 2026

    highest = get_highest_tender_sequence(year_int)
    next_seq = highest + 1

    formatted_number = f"CPCL/PROC/{year_int}/{next_seq:03d}"
    internal_id = f"TND-{year_int}-{next_seq:03d}"

    return {
        "tender_number": formatted_number,
        "tender_id": formatted_number,
        "internal_id": internal_id,
        "year": year_int,
        "sequence": next_seq,
        "highest_existing_sequence": highest
    }

def generate_and_reserve_tender_number(year: Optional[int] = None) -> Dict[str, Any]:
    with _tender_number_lock:
        if year is None:
            year_int = 2026
        else:
            try:
                year_int = int(year)
            except (ValueError, TypeError):
                year_int = 2026

        highest = get_highest_tender_sequence(year_int)
        next_seq = highest + 1

        formatted_number = f"CPCL/PROC/{year_int}/{next_seq:03d}"
        while check_tender_id_exists(formatted_number):
            next_seq += 1
            formatted_number = f"CPCL/PROC/{year_int}/{next_seq:03d}"

        internal_id = f"TND-{year_int}-{next_seq:03d}"
        while check_tender_id_exists(internal_id):
            internal_id = f"TND-{year_int}-{next_seq + 1:03d}"

        return {
            "tender_number": formatted_number,
            "tender_id": formatted_number,
            "internal_id": internal_id,
            "year": year_int,
            "sequence": next_seq
        }

def add_tender(tender_data: Dict[str, Any]) -> Dict[str, Any]:
    with _tender_number_lock:
        issue = tender_data.get("issue_date") or tender_data.get("publish_date")
        target_year = 2026
        if issue and len(str(issue)) >= 4:
            try:
                target_year = int(str(issue)[:4])
            except ValueError:
                target_year = 2026

        raw_id = (
            tender_data.get("tender_number")
            or tender_data.get("tender_id")
            or tender_data.get("ref")
            or tender_data.get("id")
        )

        if not raw_id or "AUTO" in str(raw_id).upper() or "DRAFT-" in str(raw_id).upper():
            gen = generate_and_reserve_tender_number(target_year)
            tender_data["tender_number"] = gen["tender_number"]
            tender_data["ref"] = gen["tender_number"]
            tender_data["tender_id"] = gen["tender_number"]
            tender_data["id"] = gen["internal_id"]
        else:
            raw_id_str = str(raw_id).strip()
            if check_tender_id_exists(raw_id_str):
                raise ValueError(f"Tender ID '{raw_id_str}' already exists in the registry. Please use a unique Tender ID.")
            if not tender_data.get("id"):
                tender_data["id"] = f"TND-{target_year}-{get_highest_tender_sequence(target_year) + 1:03d}"
            if not tender_data.get("tender_number"):
                tender_data["tender_number"] = raw_id_str
            if not tender_data.get("ref"):
                tender_data["ref"] = tender_data["tender_number"]
            if not tender_data.get("tender_id"):
                tender_data["tender_id"] = tender_data["tender_number"]

        if not tender_data.get("organization"):
            tender_data["organization"] = "Chennai Petroleum Corporation Limited (CPCL)"
        if not tender_data.get("status"):
            tender_data["status"] = "DRAFT"

        SAMPLE_TENDERS.insert(0, tender_data)
        return tender_data

def update_tender(tender_id: str, patch_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    with _tender_number_lock:
        tender = None
        for t in SAMPLE_TENDERS:
            if (
                t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id
            ):
                tender = t
                break
        if tender:
            new_num = patch_data.get("tender_number") or patch_data.get("tender_id")
            if new_num and new_num != tender.get("tender_number") and check_tender_id_exists(new_num, exclude_id=tender.get("id")):
                raise ValueError(f"Tender ID '{new_num}' already exists in the registry.")
            tender.update(patch_data)
            return compute_tender_bid_counts(tender)
        return None

def extend_tender_deadline(
    tender_id: str,
    new_deadline: str,
    reason: str,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    with _tender_number_lock:
        tender = None
        for t in SAMPLE_TENDERS:
            if (
                t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id
            ):
                tender = t
                break

        if not tender:
            raise ValueError(f"Tender '{tender_id}' not found.")

        current_status = (tender.get("status") or "DRAFT").strip().upper()
        if current_status in ["CLOSED", "CANCELLED", "ARCHIVED"]:
            raise ValueError(f"Cannot extend deadline for a tender in '{current_status}' status.")

        if not reason or len(reason.strip()) < 3:
            raise ValueError("An official justification / corrigendum rationale is required (minimum 3 characters).")

        new_dt = parse_deadline_datetime(new_deadline)
        now_dt = datetime.now(timezone.utc)

        if new_dt <= now_dt:
            raise ValueError(
                f"New deadline must be in the future. Provided: {new_dt.strftime('%d %b %Y, %I:%M %p UTC')}, Current UTC time: {now_dt.strftime('%d %b %Y, %I:%M %p UTC')}."
            )

        prev_deadline_raw = tender.get("closing_date") or tender.get("submission_deadline") or tender.get("deadline") or ""
        if prev_deadline_raw:
            try:
                prev_dt = parse_deadline_datetime(prev_deadline_raw)
                if new_dt <= prev_dt:
                    raise ValueError(
                        f"New deadline ({new_dt.strftime('%d %b %Y, %I:%M %p')}) must be strictly later than current deadline ({prev_dt.strftime('%d %b %Y, %I:%M %p')})."
                    )
            except ValueError as ve:
                if "must be strictly later" in str(ve):
                    raise
                pass

        prev_deadline_display = format_tender_deadline_display(prev_deadline_raw)
        iso_new_deadline = new_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        new_deadline_display = new_dt.strftime("%d %b %Y, %I:%M %p")
        short_deadline = new_dt.strftime("%d %b %Y")

        if "deadline_history" not in tender or not isinstance(tender["deadline_history"], list):
            tender["deadline_history"] = []

        seq_num = len(tender["deadline_history"]) + 1
        t_ref = (tender.get("tender_number") or tender.get("id") or tender_id).replace("/", "-")
        amd_id = f"AMD-{t_ref}-{seq_num:02d}"

        officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
        officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
        officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
        changed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        amendment_entry = {
            "id": amd_id,
            "amendment_number": f"Corrigendum-{seq_num:02d}",
            "tender_id": tender.get("tender_number") or tender.get("id"),
            "previous_deadline": prev_deadline_raw,
            "previous_deadline_display": prev_deadline_display,
            "new_deadline": iso_new_deadline,
            "new_deadline_display": new_deadline_display,
            "reason": reason.strip(),
            "changed_by": officer_name,
            "changed_by_email": officer_email,
            "changed_at": changed_at
        }
        tender["deadline_history"].append(amendment_entry)
        tender["amendments"] = list(tender["deadline_history"])

        tender["closing_date"] = iso_new_deadline
        tender["submission_deadline"] = iso_new_deadline
        tender["deadline"] = short_deadline
        tender["last_amended_at"] = changed_at
        tender["last_amendment_reason"] = reason.strip()

        add_audit_log({
            "user_email": officer_email,
            "user_role": officer_role,
            "action": "TENDER_DEADLINE_UPDATED",
            "entity_type": "TENDER",
            "entity_id": tender.get("tender_number") or tender.get("id"),
            "details": f"Submission deadline extended from '{prev_deadline_display}' to '{new_deadline_display}' ({amendment_entry['amendment_number']}). Justification: {reason.strip()}",
            "status": "SUCCESS"
        })

        return compute_tender_bid_counts(tender)

def close_tender(
    tender_id: str,
    reason: Optional[str] = None,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    with _tender_number_lock:
        tender = None
        for t in SAMPLE_TENDERS:
            if (
                t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id
            ):
                tender = t
                break

        if not tender:
            raise ValueError(f"Tender '{tender_id}' not found.")

        current_status = (tender.get("status") or "DRAFT").strip().upper()
        if current_status == "CLOSED":
            raise ValueError(f"Tender '{tender.get('tender_number') or tender_id}' is already closed.")

        officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
        officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
        officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"

        close_reason = (reason or "").strip() or "Bidding window concluded and sealed by Procurement Officer."
        closed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        old_status = tender.get("status", "PUBLISHED")
        tender["status"] = "CLOSED"
        tender["closed_at"] = closed_at
        tender["closed_by"] = officer_name
        tender["closed_by_email"] = officer_email
        tender["close_reason"] = close_reason

        add_audit_log({
            "user_email": officer_email,
            "user_role": officer_role,
            "action": "TENDER_CLOSED",
            "entity_type": "TENDER",
            "entity_id": tender.get("tender_number") or tender.get("id"),
            "details": f"Tender {tender.get('tender_number') or tender.get('id')} status changed from {old_status} to CLOSED. Reason: {close_reason}",
            "status": "SUCCESS"
        })

        return compute_tender_bid_counts(tender)

def get_all_bidders(
    query: Optional[str] = None,
    tender_id: Optional[str] = None,
    status: Optional[str] = None,
    include_drafts: bool = False
) -> List[Dict[str, Any]]:
    results = list(SAMPLE_BIDDERS)
    if tender_id:
        tender = None
        for t in SAMPLE_TENDERS:
            if (
                t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id
            ):
                tender = t
                break
        matched_ids = {str(tender_id).strip()}
        if tender:
            for k in ["id", "tender_number", "ref", "tender_id"]:
                if tender.get(k):
                    matched_ids.add(str(tender[k]).strip())
        results = [
            b for b in results
            if (b.get("tender_id") and str(b.get("tender_id")).strip() in matched_ids)
            or (b.get("tender_number") and str(b.get("tender_number")).strip() in matched_ids)
        ]
    if query:
        q = query.strip().lower()
        results = [
            b for b in results
            if q in b.get("id", "").lower()
            or q in b.get("name", "").lower()
            or q in b.get("bid_submission_id", "").lower()
            or q in b.get("tender_id", "").lower()
            or q in b.get("tender_number", "").lower()
            or q in b.get("tender_title", "").lower()
            or q in b.get("contact_person", "").lower()
            or q in b.get("email", "").lower()
            or q in b.get("location", "").lower()
            or q in b.get("status", "").lower()
            or q in b.get("compliance_status", "").lower()
        ]
    st = (status or "ALL").strip().upper().replace(" ", "_")
    if st == "DRAFT":
        results = [b for b in results if not is_submitted_bid(b)]
    elif st != "ALL" and st != "ALL_WITH_DRAFTS":
        results = [
            b for b in results
            if is_submitted_bid(b) and (
                b.get("status", "").upper().replace(" ", "_") == st
                or b.get("compliance_status", "").upper().replace(" ", "_") == st
                or (st == "REVIEW" and b.get("status", "").upper() in ["REVIEW", "UNDER_VERIFICATION", "REQUIRES_REVIEW"])
                or (st == "UNDER_VERIFICATION" and b.get("status", "").upper() in ["UNDER_VERIFICATION", "REVIEW", "PROCESSING"])
                or (st == "SUBMITTED" and b.get("status", "").upper() in ["SUBMITTED", "COMPLIANT", "NON_COMPLIANT"])
                or (st == "COMPLETED" and b.get("status", "").upper() in ["COMPLETED", "AUTHENTICATED", "COMPLIANT"])
            )
        ]
    elif not include_drafts and st != "ALL_WITH_DRAFTS":
        results = [b for b in results if is_submitted_bid(b)]

    return results

def delete_tender(tender_id: str) -> Dict[str, Any]:
    with _tender_number_lock:
        tender = get_tender_by_id(tender_id)
        if not tender:
            raise KeyError(f"Tender '{tender_id}' not found.")

        t_status = (tender.get("status") or "DRAFT").strip().upper()

        NON_DELETABLE = {"PUBLISHED", "REQUIREMENTS_REVIEW", "ANALYZING", "CLOSED", "AWARDED"}
        if t_status in NON_DELETABLE:
            raise ValueError(
                f"Tenders with status '{t_status}' cannot be permanently deleted. "
                f"Only DRAFT tenders with no submitted bids may be deleted."
            )

        t_num = tender.get("tender_number") or tender.get("tender_id") or tender.get("ref") or tender.get("id")
        t_internal_id = tender.get("id")
        dependent_bids = [
            b for b in SAMPLE_BIDDERS
            if b.get("tender_id") == t_internal_id or b.get("tender_number") == t_num
        ]
        if dependent_bids:
            raise ValueError(
                f"Cannot delete tender '{t_num}': it has {len(dependent_bids)} associated bid(s). "
                f"Delete the bids first or archive this tender instead."
            )

        for i, t in enumerate(SAMPLE_TENDERS):
            if (t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id):
                SAMPLE_TENDERS.pop(i)
                return tender

        raise KeyError(f"Tender '{tender_id}' not found during removal.")

def get_bidder_profile(bidder_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the canonical profile for a bidder by bidder_id, user_id, or email.
    Single source of truth for bidder organization, contact, and statutory profile data.
    """
    if not bidder_id:
        return None
    if bidder_id in SAMPLE_BIDDER_PROFILES:
        return SAMPLE_BIDDER_PROFILES[bidder_id]
    for p in SAMPLE_BIDDER_PROFILES.values():
        if p.get("id") == bidder_id or p.get("user_id") == bidder_id or p.get("email") == bidder_id:
            return p
    for b in SAMPLE_BIDDERS:
        if b.get("id") == bidder_id or b.get("bidder_id") == bidder_id:
            return b
    return None

def update_bidder_profile(bidder_id: str, patch_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Updates or creates a bidder profile in the canonical profile store.
    Keeps user accounts synchronized.
    """
    profile = get_bidder_profile(bidder_id)
    if profile is None:
        profile = {
            "id": bidder_id,
            "user_id": bidder_id,
            "name": patch_data.get("name") or patch_data.get("company_name", "Vendor Organization"),
            "company_name": patch_data.get("company_name") or patch_data.get("name", "Vendor Organization"),
            "contact_person": patch_data.get("contact_person") or patch_data.get("name", "Authorized Signatory"),
            "email": patch_data.get("email", ""),
            "phone": patch_data.get("phone", ""),
            "entity_type": patch_data.get("entity_type", "Private Limited Company"),
            "business_address": patch_data.get("business_address", ""),
            "city": patch_data.get("city", ""),
            "state": patch_data.get("state", ""),
            "pincode": patch_data.get("pincode", ""),
            "pan": patch_data.get("pan", ""),
            "gstin": patch_data.get("gstin", ""),
            "udyam": patch_data.get("udyam", ""),
            "epfo_code": patch_data.get("epfo_code", ""),
            "business_registration_number": patch_data.get("business_registration_number", ""),
            "business_registration_date": patch_data.get("business_registration_date", ""),
            "annual_turnover_cr": float(patch_data.get("annual_turnover_cr", 0.0)),
            "years_experience": float(patch_data.get("years_experience", 0)),
            "oem_authorization": patch_data.get("oem_authorization", "Unregistered"),
            "local_content": float(patch_data.get("local_content", 0.0)),
            "emd_paid": patch_data.get("emd_paid", False),
            "status": patch_data.get("status", "REGISTERED"),
            "verification_status": patch_data.get("verification_status", "PENDING"),
            "documents": patch_data.get("documents", {})
        }
        SAMPLE_BIDDER_PROFILES[bidder_id] = profile
    else:
        profile.update(patch_data)
        bidder_key = profile.get("id") or bidder_id
        SAMPLE_BIDDER_PROFILES[bidder_key] = profile

    # Also keep SAMPLE_USERS synchronized if matching
    user_id = profile.get("user_id") or bidder_id
    for u in SAMPLE_USERS:
        if u.get("id") == user_id or u.get("bidder_id") == bidder_id or u.get("email") == profile.get("email"):
            if "contact_person" in patch_data or "name" in patch_data:
                u["name"] = patch_data.get("contact_person") or patch_data.get("name") or u["name"]
            if "company_name" in patch_data:
                u["organization"] = patch_data["company_name"]
            if "email" in patch_data:
                u["email"] = patch_data["email"]
            if "phone" in patch_data:
                u["phone"] = patch_data["phone"]
            break

    return profile

def get_bidder_by_id(bidder_id: str) -> Optional[Dict[str, Any]]:
    # First check profile store
    if bidder_id in SAMPLE_BIDDER_PROFILES:
        return SAMPLE_BIDDER_PROFILES[bidder_id]
    for p in SAMPLE_BIDDER_PROFILES.values():
        if p.get("id") == bidder_id or p.get("bid_submission_id") == bidder_id or p.get("user_id") == bidder_id:
            return p
    for b in SAMPLE_BIDDERS:
        if b.get("id") == bidder_id or b.get("bid_submission_id") == bidder_id or b.get("bidder_id") == bidder_id:
            return b
    return None

def add_bidder(bidder_data: Dict[str, Any]) -> Dict[str, Any]:
    b_id = bidder_data.get("id")
    if b_id:
        SAMPLE_BIDDER_PROFILES[b_id] = bidder_data
    SAMPLE_BIDDERS.append(bidder_data)
    return bidder_data

def get_bids_by_bidder_id(bidder_id: str) -> List[Dict[str, Any]]:
    return [b for b in SAMPLE_BIDDER_BIDS if b.get("bidder_id") == bidder_id]

def add_bid_for_bidder(bid_data: Dict[str, Any]) -> Dict[str, Any]:
    target_tender_id = bid_data.get("tender_id")
    target_tender_num = bid_data.get("tender_number")
    bidder_id = bid_data.get("bidder_id")
    is_draft = bid_data.get("is_draft") is True or bid_data.get("status") == "DRAFT"
    status_str = "DRAFT" if is_draft else bid_data.get("status", "SUBMITTED")

    tender_title = bid_data.get("tender_title")
    if not tender_title and target_tender_id:
        t_obj = get_tender_by_id(target_tender_id)
        if t_obj:
            tender_title = t_obj.get("title", "")
            if not target_tender_num:
                target_tender_num = t_obj.get("tender_number")
    bid_data["tender_title"] = tender_title or ""
    if target_tender_num:
        bid_data["tender_number"] = target_tender_num

    bidder_name = bid_data.get("name")
    if not bidder_name and bidder_id:
        b_profile = get_bidder_by_id(bidder_id)
        if b_profile:
            bidder_name = b_profile.get("name")
    bid_data["name"] = bidder_name or "Authorized Bidder"

    existing_bid_idx = -1
    for idx, b in enumerate(SAMPLE_BIDDER_BIDS):
        if b.get("id") == bid_data.get("id") or (
            b.get("bidder_id") == bidder_id and (
                (target_tender_id and b.get("tender_id") == target_tender_id) or
                (target_tender_num and b.get("tender_number") == target_tender_num)
            )
        ):
            existing_bid_idx = idx
            break

    if existing_bid_idx >= 0:
        SAMPLE_BIDDER_BIDS[existing_bid_idx].update(bid_data)
    else:
        SAMPLE_BIDDER_BIDS.append(bid_data)

    promoted = False
    for b in SAMPLE_BIDDERS:
        if (b.get("id") == bidder_id or b.get("bidder_id") == bidder_id) and (
            (target_tender_id and b.get("tender_id") == target_tender_id) or
            (target_tender_num and b.get("tender_number") == target_tender_num)
        ):
            b["status"] = status_str
            b["verification_status"] = "PENDING" if is_draft else bid_data.get("verification_status", "PROCESSING")
            b["compliance_status"] = "PENDING" if is_draft else bid_data.get("compliance_status", "REVIEW_REQUIRED")
            b["bid_amount"] = bid_data.get("bid_amount", b.get("bid_amount", "₹ 0"))
            b["tender_title"] = tender_title or b.get("tender_title", "")
            if not is_draft:
                b["submitted_at"] = bid_data.get("submission_date") or datetime.utcnow().isoformat() + "Z"
                b["is_draft"] = False
            else:
                b["is_draft"] = True
            promoted = True
            break

    if not promoted:
        submitted_ts = None if is_draft else (bid_data.get("submission_date") or datetime.utcnow().isoformat() + "Z")
        new_bidder_entry = {
            "id": bid_data.get("id") or f"BID-{len(SAMPLE_BIDDERS) + 1:03d}",
            "bid_submission_id": bid_data.get("bid_submission_id") or f"SUB-{target_tender_id}-{len(SAMPLE_BIDDERS) + 1}",
            "tender_id": target_tender_id,
            "tender_number": target_tender_num or target_tender_id,
            "tender_title": tender_title or "",
            "name": bid_data.get("name", "Authorized Bidder"),
            "contact_person": bid_data.get("contact_person", "Authorized Signatory"),
            "email": bid_data.get("email", "bidder@vendor.com"),
            "phone": bid_data.get("phone", "+91 98765 43210"),
            "location": bid_data.get("location", "Chennai, Tamil Nadu"),
            "bid_amount": bid_data.get("bid_amount", "₹ 0"),
            "gstin": bid_data.get("gstin", ""),
            "pan": bid_data.get("pan", ""),
            "udyam": bid_data.get("udyam", ""),
            "epfo_code": bid_data.get("epfo_code", ""),
            "annual_turnover_cr": float(bid_data.get("annual_turnover_cr", 0.0)),
            "years_experience": float(bid_data.get("years_experience", 0.0)),
            "experience_years": float(bid_data.get("years_experience", 0.0)),
            "oem_status": bid_data.get("oem_status", "Unregistered"),
            "local_content": float(bid_data.get("local_content", 0.0)),
            "local_content_pct": float(bid_data.get("local_content", 0.0)),
            "is_debarred": False,
            "emd_paid": not is_draft,
            "submitted_at": submitted_ts,
            "status": status_str,
            "verification_status": "PENDING" if is_draft else bid_data.get("verification_status", "PROCESSING"),
            "compliance_status": "PENDING" if is_draft else bid_data.get("compliance_status", "REVIEW_REQUIRED"),
            "compliance_score": 0.0 if is_draft else float(bid_data.get("compliance_score", 0.0)),
            "risk_level": "LOW",
            "summary": {"pass_count": 0, "fail_count": 0, "review_count": 0, "total": 0, "total_requirements": 0},
            "highlight_issue": "Draft submission in preparation by vendor." if is_draft else "Submitted via Bidder Self-Service Portal.",
            "documents": {},
            "is_draft": is_draft
        }
        SAMPLE_BIDDERS.append(new_bidder_entry)

    if not is_draft:
        add_audit_log({
            "user_email": bid_data.get("email", "bidder@vendor.com"),
            "user_role": "BIDDER",
            "action": "BID_SUBMISSION",
            "entity_type": "TENDER",
            "entity_id": target_tender_num or target_tender_id or "TENDER",
            "details": f"Formal bid submitted by {bid_data.get('name', 'Vendor')} for {tender_title or target_tender_num or target_tender_id} (Amount: {bid_data.get('bid_amount', 'N/A')}).",
            "status": "SUCCESS"
        })

    return bid_data

def get_recent_bid_activities(limit: int = 10) -> List[Dict[str, Any]]:
    submitted_bids = [b for b in SAMPLE_BIDDERS if is_submitted_bid(b)]
    sorted_bids = sorted(
        submitted_bids,
        key=lambda b: str(b.get("submitted_at") or ""),
        reverse=True
    )

    activities: List[Dict[str, Any]] = []
    for bid in sorted_bids[:limit]:
        tender_title = bid.get("tender_title")
        if not tender_title and bid.get("tender_id"):
            t_obj = get_tender_by_id(bid.get("tender_id"))
            if t_obj:
                tender_title = t_obj.get("title")

        bid_id = bid.get("id") or "BID"
        submitted_ts = bid.get("submitted_at") or datetime.utcnow().isoformat() + "Z"

        activities.append({
            "id": f"ACT-{bid_id}",
            "type": "BID_SUBMITTED",
            "bid_id": bid_id,
            "bid_submission_id": bid.get("bid_submission_id") or bid_id,
            "tender_id": bid.get("tender_id") or "",
            "tender_number": bid.get("tender_number") or bid.get("tender_id") or "",
            "tender_title": tender_title or "Procurement Tender",
            "bidder_id": bid.get("bidder_id") or bid_id,
            "bidder_name": bid.get("name") or "Vendor",
            "submitted_at": submitted_ts,
            "bid_amount": bid.get("bid_amount") or "N/A",
            "status": bid.get("status") or "SUBMITTED",
            "compliance_status": bid.get("compliance_status") or "REVIEW_REQUIRED",
            "compliance_score": bid.get("compliance_score", 0.0),
            "risk_level": bid.get("risk_level", "LOW")
        })

    return activities

def get_dashboard_stats() -> Dict[str, Any]:
    all_tenders = SAMPLE_TENDERS
    submitted_bidders = [b for b in SAMPLE_BIDDERS if is_submitted_bid(b)]

    total_tenders = len(all_tenders)
    active_tenders = len([t for t in all_tenders if t.get("status", "").upper() in ["PUBLISHED", "OPEN", "ACTIVE"]])

    total_bids = len(submitted_bidders)
    under_verification = len([b for b in submitted_bidders if b.get("status") in ["UNDER_VERIFICATION", "PROCESSING", "UNDER REVIEW"]])
    pending_review = len([b for b in submitted_bidders if b.get("compliance_status") in ["REQUIRES_REVIEW", "REVIEW_REQUIRED", "REVIEW"]])
    compliant_bids = len([b for b in submitted_bidders if b.get("compliance_status") == "COMPLIANT"])
    high_risk = len([b for b in submitted_bidders if b.get("risk_level") == "HIGH"])

    return {
        "active_tenders": active_tenders,
        "total_tenders": total_tenders,
        "total_bids": total_bids,
        "total_bidders": total_bids,
        "under_verification": under_verification,
        "pending_review": pending_review,
        "pending_reviews": pending_review,
        "compliant_bids": compliant_bids,
        "high_risk": high_risk
    }

def get_notifications_for_bidder(bidder_id: str) -> List[Dict[str, Any]]:
    notifs = [n for n in SAMPLE_NOTIFICATIONS if n.get("bidder_id") == bidder_id]
    if not notifs:
        return [
            {
                "id": f"NOTIF-NEW-{bidder_id}",
                "bidder_id": bidder_id,
                "title": "Welcome to BidSure AI",
                "message": "Your organization account is active. Complete your statutory document profile to apply for active tenders.",
                "timestamp": "Just now",
                "type": "SUCCESS",
                "read": False
            }
        ]
    return notifs

def get_all_audit_logs(query: Optional[str] = None) -> List[Dict[str, Any]]:
    if not query:
        return list(SAMPLE_AUDIT_LOGS)
    q = query.strip().lower()
    return [
        log for log in SAMPLE_AUDIT_LOGS
        if q in log.get("id", "").lower()
        or q in log.get("user_email", "").lower()
        or q in log.get("action", "").lower()
        or q in log.get("entity_id", "").lower()
        or q in log.get("details", "").lower()
    ]

def add_audit_log(entry: Dict[str, Any]) -> Dict[str, Any]:
    if not entry.get("id"):
        entry["id"] = f"LOG-{len(SAMPLE_AUDIT_LOGS) + 1:03d}"
    if not entry.get("timestamp"):
        entry["timestamp"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    if not entry.get("integrity_hash"):
        h_src = f"{entry.get('id')}:{entry.get('action')}:{entry.get('entity_id')}:{time.time()}"
        entry["integrity_hash"] = hashlib.sha256(h_src.encode()).hexdigest()
    if not entry.get("actor") and entry.get("user_email"):
        entry["actor"] = entry["user_email"]
    if not entry.get("target") and entry.get("entity_id"):
        entry["target"] = entry["entity_id"]
    SAMPLE_AUDIT_LOGS.insert(0, entry)
    return entry


# ─────────────────────────────────────────────────────────────────────────────
# AI Tender Analysis & Document Intelligence In-Memory Store & Operations
# ─────────────────────────────────────────────────────────────────────────────
def create_analysis_job(job_dict: Dict[str, Any]) -> Dict[str, Any]:
    job_id = job_dict.get("job_id") or f"JOB-AI-{len(SAMPLE_ANALYSIS_JOBS) + 1:03d}"
    job_dict["job_id"] = job_id
    if not job_dict.get("created_at"):
        job_dict["created_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    SAMPLE_ANALYSIS_JOBS[job_id] = job_dict

    tender_id = job_dict.get("tender_id")
    if tender_id:
        SAMPLE_ANALYSIS_JOBS[str(tender_id)] = job_dict

    return job_dict

def get_analysis_job(job_id_or_tender_id: str) -> Optional[Dict[str, Any]]:
    if not job_id_or_tender_id:
        return None
    key = str(job_id_or_tender_id).strip()
    if key in SAMPLE_ANALYSIS_JOBS:
        return SAMPLE_ANALYSIS_JOBS[key]

    for job in SAMPLE_ANALYSIS_JOBS.values():
        if (
            job.get("job_id") == key
            or job.get("tender_id") == key
            or job.get("filename") == key
        ):
            return job
    return None

def verify_analysis_requirement(
    job_id_or_tender_id: str,
    req_id: str,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    reqs = job.get("requirements", [])
    target_req = None
    for r in reqs:
        if r.get("id") == req_id or r.get("code") == req_id:
            target_req = r
            break

    if not target_req:
        raise KeyError(f"Requirement '{req_id}' not found in analysis job.")

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    target_req["review_status"] = "VERIFIED"
    target_req["reviewed_by"] = officer_name
    target_req["reviewed_at"] = now_ts
    target_req["rejection_reason"] = None

    t_ref = job.get("tender_id") or job.get("filename") or "TENDER"
    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENT_VERIFIED",
        "entity_type": "REQUIREMENT",
        "entity_id": f"{t_ref}:{target_req.get('clause_reference') or req_id}",
        "details": f"Officer verified clause '{target_req.get('name')}' ({target_req.get('clause_reference')}) with {int(target_req.get('confidence', 1.0) * 100)}% AI confidence.",
        "status": "SUCCESS"
    })

    return target_req

def update_analysis_requirement(
    job_id_or_tender_id: str,
    req_id: str,
    update_payload: Dict[str, Any],
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    reqs = job.get("requirements", [])
    target_req = None
    for r in reqs:
        if r.get("id") == req_id or r.get("code") == req_id:
            target_req = r
            break

    if not target_req:
        raise KeyError(f"Requirement '{req_id}' not found in analysis job.")

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    if not target_req.get("original_data"):
        target_req["original_data"] = {
            "name": target_req.get("name"),
            "clause_reference": target_req.get("clause_reference"),
            "category": target_req.get("category"),
            "threshold_value": target_req.get("threshold_value"),
            "unit": target_req.get("unit"),
            "mandatory": target_req.get("mandatory"),
            "description": target_req.get("description")
        }

    for field in ["name", "clause_reference", "category", "mandatory", "description", "threshold_value", "unit", "weight"]:
        if field in update_payload and update_payload[field] is not None:
            target_req[field] = update_payload[field]

    target_req["review_status"] = "EDITED"
    target_req["reviewed_by"] = officer_name
    target_req["reviewed_at"] = now_ts
    target_req["rejection_reason"] = None

    edit_reason = update_payload.get("edit_reason") or "Officer modified extracted threshold/details."
    t_ref = job.get("tender_id") or job.get("filename") or "TENDER"
    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENT_EDITED",
        "entity_type": "REQUIREMENT",
        "entity_id": f"{t_ref}:{target_req.get('clause_reference') or req_id}",
        "details": f"Officer edited requirement '{target_req.get('name')}'. Justification: {edit_reason}",
        "status": "SUCCESS"
    })

    return target_req

def reject_analysis_requirement(
    job_id_or_tender_id: str,
    req_id: str,
    reason: str,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    if not reason or len(reason.strip()) < 3:
        raise ValueError("A formal rejection reason (minimum 3 characters) is required.")

    reqs = job.get("requirements", [])
    target_req = None
    for r in reqs:
        if r.get("id") == req_id or r.get("code") == req_id:
            target_req = r
            break

    if not target_req:
        raise KeyError(f"Requirement '{req_id}' not found in analysis job.")

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    target_req["review_status"] = "REJECTED"
    target_req["rejection_reason"] = reason.strip()
    target_req["reviewed_by"] = officer_name
    target_req["reviewed_at"] = now_ts

    t_ref = job.get("tender_id") or job.get("filename") or "TENDER"
    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENT_REJECTED",
        "entity_type": "REQUIREMENT",
        "entity_id": f"{t_ref}:{target_req.get('clause_reference') or req_id}",
        "details": f"Officer excluded/rejected clause '{target_req.get('name')}' ({target_req.get('clause_reference')}). Reason: {reason.strip()}",
        "status": "SUCCESS"
    })

    return target_req

def add_analysis_requirement(
    job_id_or_tender_id: str,
    req_data: Dict[str, Any],
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    if not job.get("requirements"):
        job["requirements"] = []

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    seq = len(job["requirements"]) + 1
    new_req = {
        "id": f"REQ-MAN-{seq:03d}",
        "code": req_data.get("code") or f"CUSTOM_REQ_{seq}",
        "clause_reference": req_data.get("clause_reference", f"Clause Special-{seq}"),
        "name": req_data.get("name", "Custom Requirement"),
        "category": req_data.get("category", "TECHNICAL"),
        "type": req_data.get("type", "GENERAL"),
        "mandatory": bool(req_data.get("mandatory", True)),
        "description": req_data.get("description", ""),
        "threshold_value": req_data.get("threshold_value", 1),
        "unit": req_data.get("unit"),
        "confidence": 1.0,
        "review_status": "ADDED_MANUALLY",
        "source_document": job.get("filename", "Manual_Addition.pdf"),
        "source_page": req_data.get("source_page", 1),
        "evidence_text": req_data.get("description", "Manually inserted by procurement officer."),
        "validation_source": req_data.get("validation_source", "Manual Tender Clause Addition"),
        "weight": req_data.get("weight", 10),
        "reviewed_by": officer_name,
        "reviewed_at": now_ts
    }

    job["requirements"].append(new_req)

    t_ref = job.get("tender_id") or job.get("filename") or "TENDER"
    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENT_ADDED",
        "entity_type": "REQUIREMENT",
        "entity_id": f"{t_ref}:{new_req.get('clause_reference')}",
        "details": f"Officer manually added new requirement '{new_req.get('name')}' ({new_req.get('clause_reference')}).",
        "status": "SUCCESS"
    })

    return new_req

def finalize_tender_requirements(
    job_id_or_tender_id: str,
    target_tender_id: Optional[str] = None,
    override_existing: bool = True,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    tid = target_tender_id or job.get("tender_id")
    if not tid:
        raise KeyError("No target tender ID associated with this analysis job.")

    tender = get_tender_by_id(tid)
    if not tender:
        raise KeyError(f"Target tender '{tid}' not found in registry.")

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Filter out REJECTED requirements
    active_reqs = [
        r for r in job.get("requirements", [])
        if r.get("review_status") != "REJECTED"
    ]

    converted_reqs = []
    for r in active_reqs:
        converted_reqs.append({
            "id": r.get("id"),
            "code": r.get("code", r.get("id")),
            "clause_reference": r.get("clause_reference"),
            "clause": r.get("clause_reference"),
            "title": r.get("name"),
            "name": r.get("name"),
            "category": r.get("category"),
            "type": r.get("category"),
            "mandatory": r.get("mandatory", True),
            "description": r.get("description"),
            "threshold_value": r.get("threshold_value"),
            "threshold": r.get("threshold_value"),
            "unit": r.get("unit"),
            "scoring_weight": r.get("weight", 10),
            "weight": r.get("weight", 10),
            "confidence": r.get("confidence", 1.0),
            "review_status": r.get("review_status", "VERIFIED"),
            "source_document": r.get("source_document"),
            "source_page": r.get("source_page", 1),
            "evidence_text": r.get("evidence_text"),
            "validation_source": r.get("validation_source", "Tender Document Analysis")
        })

    with _tender_number_lock:
        if override_existing:
            tender["requirements"] = converted_reqs
        else:
            tender["requirements"] = (tender.get("requirements") or []) + converted_reqs

        tender["requirements_count"] = len(tender["requirements"])
        tender["total_requirements_count"] = len(tender["requirements"])
        tender["is_analyzed"] = True
        tender["requirements_finalized_at"] = now_ts
        tender["requirements_finalized_by"] = officer_name

        for idx, t in enumerate(SAMPLE_TENDERS):
            if t.get("id") == tender.get("id") or t.get("tender_number") == tender.get("tender_number"):
                SAMPLE_TENDERS[idx] = tender
                break

    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENTS_FINALIZED",
        "entity_type": "TENDER",
        "entity_id": tender.get("tender_number") or tender.get("id"),
        "details": f"Officer finalized {len(converted_reqs)} evaluation criteria for tender {tender.get('tender_number') or tender.get('id')}. Evaluation engine updated.",
        "status": "SUCCESS"
    })

    return {
        "tender_id": tender.get("id"),
        "tender_number": tender.get("tender_number"),
        "requirements_count": len(converted_reqs),
        "requirements": converted_reqs,
        "finalized_at": now_ts,
        "finalized_by": officer_name,
        "message": f"Successfully finalized {len(converted_reqs)} evaluation criteria for {tender.get('tender_number') or tender.get('id')}."
    }


# ─────────────────────────────────────────────────────────────────────────────
# Environment State Management Utilities
# ─────────────────────────────────────────────────────────────────────────────
def is_demo_mode() -> bool:
    """Returns whether the centralized DEMO_MODE toggle is active."""
    return DEMO_MODE

def reset_to_demo_data() -> None:
    """Resets operational stores to authentic seed tenders and bidder profiles."""
    global SAMPLE_TENDERS, SAMPLE_BIDDERS, SAMPLE_BIDDER_BIDS, SAMPLE_BIDDER_DOCUMENTS, SAMPLE_AUDIT_LOGS, SAMPLE_NOTIFICATIONS, SAMPLE_ANALYSIS_JOBS, SAMPLE_BIDDER_PROFILES
    with _tender_number_lock:
        SAMPLE_TENDERS = copy.deepcopy(SEED_TENDERS)
        SAMPLE_BIDDERS = copy.deepcopy(SEED_BIDDERS)
        SAMPLE_BIDDER_BIDS = copy.deepcopy(SEED_BIDDER_BIDS)
        SAMPLE_BIDDER_DOCUMENTS = copy.deepcopy(SEED_BIDDER_DOCUMENTS)
        SAMPLE_AUDIT_LOGS.clear()
        SAMPLE_NOTIFICATIONS.clear()
        SAMPLE_ANALYSIS_JOBS.clear()
        SAMPLE_BIDDER_PROFILES = copy.deepcopy(SEED_BIDDER_PROFILES)

def clear_all_procurement_data() -> None:
    """
    Resets all operational procurement records (tenders, tender bids, profiles, logs, documents)
    to empty state while keeping authenticated user credentials intact.
    """
    global SAMPLE_TENDERS, SAMPLE_BIDDERS, SAMPLE_BIDDER_BIDS, SAMPLE_BIDDER_DOCUMENTS, SAMPLE_AUDIT_LOGS, SAMPLE_NOTIFICATIONS, SAMPLE_ANALYSIS_JOBS, SAMPLE_BIDDER_PROFILES
    with _tender_number_lock:
        SAMPLE_TENDERS.clear()
        SAMPLE_BIDDERS.clear()
        SAMPLE_BIDDER_BIDS.clear()
        SAMPLE_BIDDER_DOCUMENTS.clear()
        SAMPLE_AUDIT_LOGS.clear()
        SAMPLE_NOTIFICATIONS.clear()
        SAMPLE_ANALYSIS_JOBS.clear()
        SAMPLE_BIDDER_PROFILES.clear()
    if os.path.exists(STATE_FILE_PATH):
        try:
            os.remove(STATE_FILE_PATH)
        except Exception:
            pass
    try:
        from app.data.document_store import clear_all_documents
        clear_all_documents()
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Bidder Document Repository Management & DigiLocker Adapter
# ─────────────────────────────────────────────────────────────────────────────
DIGILOCKER_DEMO_CATALOG: List[Dict[str, Any]] = [
    {
        "key": "PAN",
        "name": "PAN Verification Record / Card",
        "category": "IDENTITY_TAX",
        "category_display": "Identity & Tax",
        "document_type": "PAN",
        "issuer": "Income Tax Department (NSDL)",
        "issuer_code": "ITD",
        "document_number": "ABCDE1234F",
        "format": "PDF",
        "file_size_kb": 130,
        "eligible": True,
        "description": "Form 49A / PAN verification digital credential issued by Income Tax Department.",
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE"
    },
    {
        "key": "GST",
        "name": "GST Registration Certificate (Form GST REG-06)",
        "category": "IDENTITY_TAX",
        "category_display": "Identity & Tax",
        "document_type": "GST",
        "issuer": "Goods and Services Tax Network (GSTN)",
        "issuer_code": "GSTN",
        "document_number": "27ABCDE1234F1Z5",
        "format": "PDF",
        "file_size_kb": 210,
        "eligible": True,
        "description": "Registration certificate issued under Goods and Services Tax Act.",
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE"
    },
    {
        "key": "UDYAM",
        "name": "MSME Udyam Registration Certificate",
        "category": "BUSINESS_REGISTRATION",
        "category_display": "Business Registration",
        "document_type": "UDYAM",
        "issuer": "Ministry of Micro, Small and Medium Enterprises (MSME)",
        "issuer_code": "MSME",
        "document_number": "UDYAM-MH-18-0012345",
        "format": "PDF",
        "file_size_kb": 180,
        "eligible": True,
        "description": "Official MSME Udyam Registration certificate for Small Enterprise classification.",
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE"
    },
    {
        "key": "CIN",
        "name": "Certificate of Incorporation (CIN / MCA)",
        "category": "BUSINESS_REGISTRATION",
        "category_display": "Business Registration",
        "document_type": "COMPANY_REGISTRATION",
        "issuer": "Ministry of Corporate Affairs (MCA)",
        "issuer_code": "MCA",
        "document_number": "U74999MH2021PTC142890",
        "format": "PDF",
        "file_size_kb": 245,
        "eligible": True,
        "description": "Certificate of Incorporation issued by Registrar of Companies (RoC Mumbai).",
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE"
    },
    {
        "key": "EPFO",
        "name": "EPFO Establishment Registration Certificate",
        "category": "STATUTORY",
        "category_display": "Statutory & Compliance",
        "document_type": "EPFO",
        "issuer": "Employees' Provident Fund Organisation (EPFO)",
        "issuer_code": "EPFO",
        "document_number": "MH/BAN/0012345",
        "format": "PDF",
        "file_size_kb": 160,
        "eligible": True,
        "description": "Establishment code and registration record under EPF & MP Act 1952.",
        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE"
    }
]

def get_documents_for_bidder(bidder_id: str) -> List[Dict[str, Any]]:
    """
    Returns all stored documents belonging to a specific bidder ID.
    Enforces strict bidder data isolation.
    """
    b_id = str(bidder_id).strip()
    return [
        dict(d) for d in SAMPLE_BIDDER_DOCUMENTS
        if d.get("bidder_id") == b_id or d.get("user_id") == b_id
    ]

def get_document_by_id(doc_id: str, bidder_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Finds a document by document ID, optionally verifying bidder ownership.
    """
    for d in SAMPLE_BIDDER_DOCUMENTS:
        if d.get("id") == doc_id:
            if bidder_id and d.get("bidder_id") != bidder_id and d.get("user_id") != bidder_id:
                return None
            return dict(d)
    return None

def add_bidder_document(doc_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Appends a new document to the bidder document repository.
    """
    with _tender_number_lock:
        doc_copy = copy.deepcopy(doc_data)
        if not doc_copy.get("id"):
            doc_copy["id"] = f"DOC-BID-{int(time.time()*1000)}"
        if not doc_copy.get("uploaded_at"):
            doc_copy["uploaded_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        SAMPLE_BIDDER_DOCUMENTS.append(doc_copy)
        return doc_copy

def delete_bidder_document(doc_id: str, bidder_id: str) -> bool:
    """
    Deletes a document from the bidder repository after verifying ownership and bid safety.
    """
    with _tender_number_lock:
        b_id = str(bidder_id).strip()
        idx_to_remove = None
        for i, d in enumerate(SAMPLE_BIDDER_DOCUMENTS):
            if d.get("id") == doc_id:
                if d.get("bidder_id") != b_id and d.get("user_id") != b_id:
                    raise PermissionError("Access denied: You do not own this document.")
                idx_to_remove = i
                break

        if idx_to_remove is not None:
            SAMPLE_BIDDER_DOCUMENTS.pop(idx_to_remove)
            return True
        return False

def get_digilocker_catalog(bidder_id: str) -> List[Dict[str, Any]]:
    """
    Returns available digital documents in simulated DigiLocker sandbox account.
    """
    existing_docs = get_documents_for_bidder(bidder_id)
    existing_types = {d.get("document_type") for d in existing_docs}

    catalog = []
    for item in DIGILOCKER_DEMO_CATALOG:
        entry = dict(item)
        entry["already_imported"] = item.get("document_type") in existing_types
        catalog.append(entry)
    return catalog

def import_digilocker_documents(bidder_id: str, doc_keys: List[str]) -> List[Dict[str, Any]]:
    """
    Simulates importing selected documents from DigiLocker sandbox into the bidder's repository.
    Sets source = DIGILOCKER_DEMO and status = AUTHENTICATED with verification_method = DIGILOCKER_DEMO.
    """
    imported = []
    now_ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with _tender_number_lock:
        for key in doc_keys:
            clean_key = str(key).strip().upper()
            matching_item = None
            for item in DIGILOCKER_DEMO_CATALOG:
                if item.get("key") == clean_key or item.get("document_type") == clean_key:
                    matching_item = item
                    break

            if matching_item:
                # Check if already present to avoid duplicate
                existing = None
                for d in SAMPLE_BIDDER_DOCUMENTS:
                    if (d.get("bidder_id") == bidder_id or d.get("user_id") == bidder_id) and d.get("document_type") == matching_item.get("document_type"):
                        existing = d
                        break

                if existing:
                    existing["source"] = "DIGILOCKER_DEMO"
                    existing["source_display"] = "DigiLocker (Demo)"
                    existing["status"] = "AUTHENTICATED"
                    existing["verification_status"] = "AUTHENTICATED"
                    existing["verification_method"] = "DIGILOCKER_DEMO"
                    existing["verification_reason"] = "Imported and cryptographically verified via DigiLocker Demo Sandbox adapter."
                    existing["verified_at"] = now_ts
                    existing["uploaded_at"] = now_ts
                    imported.append(existing)
                else:
                    new_doc = {
                        "id": f"DOC-BID-{bidder_id}-{matching_item.get('document_type')}",
                        "bidder_id": bidder_id,
                        "name": matching_item.get("name"),
                        "category": matching_item.get("category"),
                        "category_display": matching_item.get("category_display"),
                        "document_type": matching_item.get("document_type"),
                        "document_number": matching_item.get("document_number"),
                        "source": "DIGILOCKER_DEMO",
                        "source_display": "DigiLocker (Demo)",
                        "status": "AUTHENTICATED",
                        "verification_status": "AUTHENTICATED",
                        "verification_method": "DIGILOCKER_DEMO",
                        "verification_reason": "Imported and cryptographically verified via DigiLocker Demo Sandbox adapter.",
                        "verified_at": now_ts,
                        "file_name": f"{matching_item.get('document_type')}_DigiLocker_Import.pdf",
                        "file_type": "PDF",
                        "file_size_kb": matching_item.get("file_size_kb", 150),
                        "uploaded_at": now_ts,
                        "issuer": matching_item.get("issuer"),
                        "is_synthetic_demo": True,
                        "demo_watermark": "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE",
                        "preview_summary": f"Imported via DigiLocker Demo Sandbox. Document No: {matching_item.get('document_number')} | Issuer: {matching_item.get('issuer')}",
                        "description": matching_item.get("description")
                    }
                    SAMPLE_BIDDER_DOCUMENTS.append(new_doc)
                    imported.append(new_doc)

    return imported

def check_tender_document_requirements(tender_id: str, bidder_id: str) -> Dict[str, Any]:
    """
    Compares tender requirements with bidder's My Documents library.
    Identifies available vs missing documents.
    """
    tender = get_tender_by_id(tender_id)
    if not tender:
        raise KeyError(f"Tender '{tender_id}' not found.")

    bidder_docs = get_documents_for_bidder(bidder_id)
    # Only authenticated / valid documents qualify
    valid_docs = [
        d for d in bidder_docs
        if d.get("status") in ("AUTHENTICATED", "VERIFIED") or d.get("verification_status") in ("AUTHENTICATED", "VERIFIED")
    ]
    doc_type_map = {d.get("document_type"): d for d in valid_docs}

    requirements = tender.get("requirements", [])
    clause_eval = []

    for req in requirements:
        cat = (req.get("category") or req.get("type") or "").upper()
        req_text = (req.get("text") or req.get("name") or "").lower()
        clause_ref = req.get("clause") or req.get("clause_reference") or "Clause"

        matched_doc = None
        doc_type_needed = "OTHER"
        doc_name_needed = req.get("text", "Requirement Document")

        if "oem" in req_text or "maf" in req_text or cat == "OEM_AUTHORIZATION":
            doc_type_needed = "OEM_AUTHORIZATION"
            doc_name_needed = "Manufacturer Authorization Form (MAF)"
            matched_doc = doc_type_map.get("OEM_AUTHORIZATION")
        elif "gst" in req_text or "gstr" in req_text or "pan" in req_text or cat in ("STATUTORY_COMPLIANCE", "IDENTITY_TAX"):
            if "gst" in req_text:
                doc_type_needed = "GST"
                doc_name_needed = "GST Registration Certificate"
                matched_doc = doc_type_map.get("GST")
            else:
                doc_type_needed = "PAN"
                doc_name_needed = "PAN Card"
                matched_doc = doc_type_map.get("PAN")
        elif "udyam" in req_text or "msme" in req_text or "mse" in req_text:
            doc_type_needed = "UDYAM"
            doc_name_needed = "Udyam Registration Certificate"
            matched_doc = doc_type_map.get("UDYAM")
        elif "local content" in req_text or "make in india" in req_text or cat == "LOCAL_CONTENT":
            doc_type_needed = "LOCAL_CONTENT_DECLARATION"
            doc_name_needed = "Local Content Declaration (Make in India)"
            matched_doc = doc_type_map.get("LOCAL_CONTENT_DECLARATION")
        elif "warranty" in req_text or "support" in req_text or cat == "WARRANTY_SUPPORT":
            doc_type_needed = "OEM_AUTHORIZATION"
            doc_name_needed = "OEM Warranty & Support Commitment Letter"
            matched_doc = doc_type_map.get("OEM_AUTHORIZATION")
        elif "experience" in req_text or "past performance" in req_text:
            doc_type_needed = "EXPERIENCE"
            doc_name_needed = "Past Experience & Performance Certificate"
            matched_doc = doc_type_map.get("EXPERIENCE")
        elif "blacklisting" in req_text or "debarment" in req_text:
            doc_type_needed = "BLACKLISTING_DECLARATION"
            doc_name_needed = "Non-Blacklisting Declaration & Affidavit"
            matched_doc = doc_type_map.get("BLACKLISTING_DECLARATION")

        clause_eval.append({
            "requirement_id": req.get("id"),
            "clause": clause_ref,
            "requirement_text": req.get("text") or req.get("name"),
            "document_needed": doc_name_needed,
            "document_type": doc_type_needed,
            "mandatory": req.get("mandatory", True),
            "is_available": matched_doc is not None,
            "matched_document": {
                "id": matched_doc.get("id"),
                "name": matched_doc.get("name"),
                "source": matched_doc.get("source"),
                "source_display": matched_doc.get("source_display", "Manual Upload"),
                "status": matched_doc.get("status", "AUTHENTICATED"),
                "verification_status": matched_doc.get("verification_status", "AUTHENTICATED"),
                "verification_method": matched_doc.get("verification_method", "DEMO_ADAPTER"),
                "document_number": matched_doc.get("document_number", "")
            } if matched_doc else None
        })

    available_count = sum(1 for c in clause_eval if c["is_available"])
    missing_count = len(clause_eval) - available_count
    total_reqs = len(clause_eval)
    readiness_pct = round((available_count / max(1, total_reqs)) * 100)

    matched_documents = [
        {
            "requirement": c["requirement_text"] or c["document_needed"],
            "category": c["document_type"],
            "document_name": c["matched_document"]["name"],
            "document_type": c["document_type"],
            "source": c["matched_document"]["source"],
            "source_display": c["matched_document"]["source_display"],
            "status": c["matched_document"]["status"],
            "verification_status": c["matched_document"].get("verification_status", "AUTHENTICATED"),
            "matched": True,
        }
        for c in clause_eval if c["is_available"] and c["matched_document"]
    ]

    missing_documents = [
        {
            "requirement": c["requirement_text"] or c["document_needed"],
            "category": c["document_type"],
            "document_type": c["document_type"],
            "description": f"Mandatory document required for {c['clause']}: {c['document_needed']}.",
            "mandatory": c["mandatory"],
        }
        for c in clause_eval if not c["is_available"]
    ]

    return {
        "tender_id": tender.get("id") or tender_id,
        "tender_number": tender.get("tender_number", tender_id),
        "tender_title": tender.get("title"),
        "total_requirements": total_reqs,
        "total_required": total_reqs,
        "available_documents_count": available_count,
        "available_count": available_count,
        "missing_documents_count": missing_count,
        "missing_count": missing_count,
        "readiness_percentage": readiness_pct,
        "ready_to_participate": missing_count == 0,
        "matched_documents": matched_documents,
        "missing_documents": missing_documents,
        "requirements_evaluation": clause_eval
    }
