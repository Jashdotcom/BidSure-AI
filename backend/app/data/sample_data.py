"""
BidSure AI Sample & In-Memory Data Store
Provides realistic mock tenders, bidders, and compliance records for CPCL evaluation workflows.
"""
from typing import Dict, List, Any, Optional
import time
import hashlib
from datetime import datetime

SAMPLE_USERS: List[Dict[str, Any]] = [
    {
        "id": "usr_officer_001",
        "email": "officer@cpcl.gov.in",
        # PBKDF2 hash of "admin123"
        "password_hash": "pbkdf2:sha256:600000$saltsalt$f3b890864ebae47ad4b9fb7cd355ec6b043257cd67ecaa697669d67db8fdfe9f",
        "name": "Rajesh Kumar",
        "role": "PROCUREMENT_OFFICER",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Materials & Procurement Division",
        "designation": "Senior Manager (Procurement)"
    },
    {
        "id": "usr_senior_002",
        "email": "cpo@cpcl.gov.in",
        # PBKDF2 hash of "admin123"
        "password_hash": "pbkdf2:sha256:600000$saltsalt$f3b890864ebae47ad4b9fb7cd355ec6b043257cd67ecaa697669d67db8fdfe9f",
        "name": "Dr. Ananya Sharma",
        "role": "SENIOR_PROCUREMENT_OFFICER",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Executive Procurement Board",
        "designation": "Chief General Manager (Procurement)"
    },
    {
        "id": "usr_bidder_001",
        "email": "abc@abcsafety.com",
        # PBKDF2 hash of "bidder123"
        "password_hash": "pbkdf2:sha256:600000$saltsalt$045b85a363d3390c29cf4fba462e74213b2cbe0052adbbd6d31eb46342c8d2c4",
        "name": "Suresh Patel",
        "role": "BIDDER",
        "organization": "ABC Safety Solutions Pvt Ltd",
        "designation": "Managing Director",
        "bidder_id": "BID-001"
    }
]

# Centralized Database of 12 Authentic CPCL Procurement Tenders
SAMPLE_TENDERS: List[Dict[str, Any]] = [
    {
        "id": "TND-2026-001",
        "tender_number": "CPCL/PROC/2026/001",
        "ref": "CPCL/PROC/2026/001",
        "tender_id": "CPCL/PROC/2026/001",
        "title": "Industrial Safety Helmets & Impact Visors",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Fire & Safety Department, Manali Refinery",
        "status": "PUBLISHED",
        "estimated_value": 45000000.0,
        "estimated_value_display": "₹ 4,50,00,000",
        "emd_amount": 900000.0,
        "emd_amount_display": "₹ 9,00,000",
        "publish_date": "2026-07-01T09:00:00Z",
        "closing_date": "2026-09-18T17:30:00Z",
        "deadline": "18 Sep 2026",
        "category": "Industrial PPE",
        "bids_count": 3,
        "verified_count": 2,
        "description": "Annual procurement contract for supply and certification of industrial safety helmets, chemical impact visors, flame-resistant coveralls, and respiratory protection apparatus.",
        "requirements": [
            {
                "id": "REQ-001",
                "code": "TURNOVER",
                "clause": "Clause 4.1.1",
                "clause_reference": "Section II, Clause 3.1",
                "category": "FINANCIAL",
                "title": "Average Annual Financial Turnover",
                "description": "Bidder must have minimum average annual financial turnover of ₹3.00 Crore during last 3 financial years.",
                "threshold": 3.0,
                "threshold_value": ">= ₹3.00 Cr",
                "unit": "Crore INR",
                "mandatory": True
            },
            {
                "id": "REQ-002",
                "code": "EXPERIENCE",
                "clause": "Clause 4.2.3",
                "clause_reference": "Section III, Clause 4.2",
                "category": "TECHNICAL",
                "title": "Past Experience in PSU / Hydrocarbon Sector",
                "description": "Bidder must have completed at least 3 similar contracts in CPCL, IOCL, BPCL, ONGC in last 5 years.",
                "threshold": 3,
                "threshold_value": ">= 3 Years / Orders",
                "unit": "Contracts",
                "mandatory": True
            },
            {
                "id": "REQ-003",
                "code": "OEM",
                "clause": "Clause 5.1.0",
                "clause_reference": "Section III, Clause 4.5",
                "category": "OEM_AUTHORIZATION",
                "title": "Direct OEM Authorization Certificate",
                "description": "Direct OEM Authorization letter specifically for this CPCL Tender.",
                "threshold": 1,
                "threshold_value": "Direct OEM Authorized",
                "unit": "Authorization Letter",
                "mandatory": True
            },
            {
                "id": "REQ-004",
                "code": "MII",
                "clause": "Clause 6.3.2",
                "clause_reference": "Section IV, Clause 5.1",
                "category": "STATUTORY",
                "title": "Make In India (MII) Local Content Declaration",
                "description": "Minimum 50% Local Content requirement for Class-I Local Supplier status.",
                "threshold": 50.0,
                "threshold_value": ">= 50% (Class-I)",
                "unit": "Percentage",
                "mandatory": True
            },
            {
                "id": "REQ-005",
                "code": "GSTIN",
                "clause": "Clause 2.4.0",
                "clause_reference": "Section II, Clause 2.1",
                "category": "STATUTORY",
                "title": "GSTIN Registration & Compliance",
                "description": "Valid Goods and Services Tax Identification Number (GSTIN) with regular return filings.",
                "threshold": 1,
                "threshold_value": "Active GSTIN",
                "unit": "Registration",
                "mandatory": True
            },
            {
                "id": "REQ-006",
                "code": "DEBARMENT",
                "clause": "Clause 7.1.1",
                "clause_reference": "Section I, Clause 1.4",
                "category": "VIGILANCE",
                "title": "Debarment & Vigilance Integrity Clearance",
                "description": "Bidder must not be under any active debarment or blacklisting by CVC, CPCL, GeM.",
                "threshold": 0,
                "threshold_value": "Clear / No Debarment",
                "unit": "Debarments",
                "mandatory": True
            }
        ]
    },
    {
        "id": "TND-2026-002",
        "tender_number": "CPCL/PROC/2026/002",
        "ref": "CPCL/PROC/2026/002",
        "tender_id": "CPCL/PROC/2026/002",
        "title": "Industrial Protective Equipment & Harness Kits",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Safety & Fall Protection Wing",
        "status": "PUBLISHED",
        "estimated_value": 32000000.0,
        "estimated_value_display": "₹ 3,20,00,000",
        "emd_amount": 640000.0,
        "emd_amount_display": "₹ 6,40,000",
        "publish_date": "2026-07-10T10:00:00Z",
        "closing_date": "2026-09-22T17:00:00Z",
        "deadline": "22 Sep 2026",
        "category": "Safety & Fall Protection",
        "bids_count": 5,
        "verified_count": 3,
        "description": "Procurement of EN-certified full-body harnesses, shock-absorbing lanyards, and rescue winch kits for elevated refinery structures.",
        "requirements": []
    },
    {
        "id": "TND-2026-003",
        "tender_number": "CPCL/PROC/2026/003",
        "ref": "CPCL/PROC/2026/003",
        "tender_id": "CPCL/PROC/2026/003",
        "title": "Fire Safety Equipment & Hydrant Valves",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Fire & Safety Department",
        "status": "REQUIREMENTS_REVIEW",
        "estimated_value": 58000000.0,
        "estimated_value_display": "₹ 5,80,00,000",
        "emd_amount": 1160000.0,
        "emd_amount_display": "₹ 11,60,000",
        "publish_date": "2026-07-15T09:00:00Z",
        "closing_date": "2026-09-25T15:00:00Z",
        "deadline": "25 Sep 2026",
        "category": "Fire & Safety Systems",
        "bids_count": 2,
        "verified_count": 1,
        "description": "Supply of UL/FM certified fire hydrant landing valves, high-pressure foam monitors, and breathing apparatus cylinders.",
        "requirements": []
    },
    {
        "id": "TND-2026-004",
        "tender_number": "CPCL/PROC/2026/004",
        "ref": "CPCL/PROC/2026/004",
        "tender_id": "CPCL/PROC/2026/004",
        "title": "High-Pressure Refinery Valve Assemblies",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Mechanical Engineering Division",
        "status": "PUBLISHED",
        "estimated_value": 82000000.0,
        "estimated_value_display": "₹ 8,20,00,000",
        "emd_amount": 1640000.0,
        "emd_amount_display": "₹ 16,40,000",
        "publish_date": "2026-07-20T10:00:00Z",
        "closing_date": "2026-10-02T15:00:00Z",
        "deadline": "02 Oct 2026",
        "category": "Piping & Instrumentation",
        "bids_count": 4,
        "verified_count": 4,
        "description": "Supply of ASTM A335 Grade P91 seamless valves, alloy piping assemblies, and IBR certified flanged connections for Crude Distillation Unit.",
        "requirements": []
    },
    {
        "id": "TND-2026-005",
        "tender_number": "CPCL/PROC/2026/005",
        "ref": "CPCL/PROC/2026/005",
        "tender_id": "CPCL/PROC/2026/005",
        "title": "Hazardous Gas Detection Sensors (Fixed & Portable)",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Environmental & Safety Monitoring Wing",
        "status": "PUBLISHED",
        "estimated_value": 24000000.0,
        "estimated_value_display": "₹ 2,40,00,000",
        "emd_amount": 480000.0,
        "emd_amount_display": "₹ 4,80,000",
        "publish_date": "2026-08-01T10:00:00Z",
        "closing_date": "2026-10-12T17:00:00Z",
        "deadline": "12 Oct 2026",
        "category": "Environmental Monitoring",
        "bids_count": 0,
        "verified_count": 0,
        "description": "Turnkey supply, calibration, and wireless integration of multi-gas detectors (H2S, LEL, CO, O2) across refinery processing blocks.",
        "requirements": []
    },
    {
        "id": "TND-2026-006",
        "tender_number": "CPCL/PROC/2026/006",
        "ref": "CPCL/PROC/2026/006",
        "tender_id": "CPCL/PROC/2026/006",
        "title": "Crude Distillation Unit Heat Exchanger Tubes",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Heat Transfer & Thermal Operations",
        "status": "ANALYZING",
        "estimated_value": 65000000.0,
        "estimated_value_display": "₹ 6,50,00,000",
        "emd_amount": 1300000.0,
        "emd_amount_display": "₹ 13,00,000",
        "publish_date": "2026-08-05T09:00:00Z",
        "closing_date": "2026-10-18T15:00:00Z",
        "deadline": "18 Oct 2026",
        "category": "Thermal Equipment",
        "bids_count": 3,
        "verified_count": 2,
        "description": "Supply and hydrostatic testing of titanium and duplex stainless steel seamless heat exchanger tube bundles for CDU pre-heat train.",
        "requirements": []
    },
    {
        "id": "TND-2026-007",
        "tender_number": "CPCL/PROC/2026/007",
        "ref": "CPCL/PROC/2026/007",
        "tender_id": "CPCL/PROC/2026/007",
        "title": "Centrifugal Process Pumps & Mechanical Seals",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Rotating Machinery Division",
        "status": "PUBLISHED",
        "estimated_value": 48000000.0,
        "estimated_value_display": "₹ 4,80,00,000",
        "emd_amount": 960000.0,
        "emd_amount_display": "₹ 9,60,000",
        "publish_date": "2026-08-10T11:00:00Z",
        "closing_date": "2026-10-25T17:00:00Z",
        "deadline": "25 Oct 2026",
        "category": "Rotating Machinery",
        "bids_count": 4,
        "verified_count": 3,
        "description": "Procurement of API 610 compliant centrifugal hydrocarbon transfer pumps with dual pressurized dry gas cartridge seals.",
        "requirements": []
    },
    {
        "id": "TND-2026-008",
        "tender_number": "CPCL/PROC/2026/008",
        "ref": "CPCL/PROC/2026/008",
        "tender_id": "CPCL/PROC/2026/008",
        "title": "Refinery Effluent Treatment Plant Sludge Dewatering",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Environmental Management & ETP",
        "status": "REQUIREMENTS_REVIEW",
        "estimated_value": 36000000.0,
        "estimated_value_display": "₹ 3,60,00,000",
        "emd_amount": 720000.0,
        "emd_amount_display": "₹ 7,20,000",
        "publish_date": "2026-08-12T10:00:00Z",
        "closing_date": "2026-10-30T16:00:00Z",
        "deadline": "30 Oct 2026",
        "category": "Water & Effluent Treatment",
        "bids_count": 2,
        "verified_count": 2,
        "description": "Comprehensive service contract for continuous mechanical sludge dewatering, decanter centrifuge operations, and bio-sludge handling.",
        "requirements": []
    },
    {
        "id": "TND-2026-009",
        "tender_number": "CPCL/PROC/2026/009",
        "ref": "CPCL/PROC/2026/009",
        "tender_id": "CPCL/PROC/2026/009",
        "title": "Flame-Retardant Control & Power Cabling Systems",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Electrical Engineering Department",
        "status": "DRAFT",
        "estimated_value": 21000000.0,
        "estimated_value_display": "₹ 2,10,00,000",
        "emd_amount": 420000.0,
        "emd_amount_display": "₹ 4,20,000",
        "publish_date": "2026-08-15T09:00:00Z",
        "closing_date": "2026-11-05T17:00:00Z",
        "deadline": "05 Nov 2026",
        "category": "Electrical Systems",
        "bids_count": 0,
        "verified_count": 0,
        "description": "Supply of FRLS (Flame Retardant Low Smoke) XLPE insulated armored copper cables for refinery substation modernization.",
        "requirements": []
    },
    {
        "id": "TND-2026-010",
        "tender_number": "CPCL/PROC/2026/010",
        "ref": "CPCL/PROC/2026/010",
        "tender_id": "CPCL/PROC/2026/010",
        "title": "Nitrogen Generation & Cryogenic Storage Package",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Utilities & Offsites Division",
        "status": "PUBLISHED",
        "estimated_value": 79000000.0,
        "estimated_value_display": "₹ 7,90,00,000",
        "emd_amount": 1580000.0,
        "emd_amount_display": "₹ 15,80,000",
        "publish_date": "2026-08-18T10:00:00Z",
        "closing_date": "2026-11-15T15:00:00Z",
        "deadline": "15 Nov 2026",
        "category": "Cryogenic & Gas Systems",
        "bids_count": 1,
        "verified_count": 1,
        "description": "Design, engineering, supply, and commissioning of high-purity PSA nitrogen generation unit with vacuum-insulated liquid nitrogen buffer tank.",
        "requirements": []
    },
    {
        "id": "TND-2026-011",
        "tender_number": "CPCL/PROC/2026/011",
        "ref": "CPCL/PROC/2026/011",
        "tender_id": "CPCL/PROC/2026/011",
        "title": "SCADA & Distributed Control System (DCS) Upgradation",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Instrumentation & Control Engineering",
        "status": "CLOSED",
        "estimated_value": 124000000.0,
        "estimated_value_display": "₹ 12,40,00,000",
        "emd_amount": 2480000.0,
        "emd_amount_display": "₹ 24,80,000",
        "publish_date": "2026-06-01T09:00:00Z",
        "closing_date": "2026-08-15T17:00:00Z",
        "deadline": "15 Aug 2026",
        "category": "Instrumentation & Automation",
        "bids_count": 4,
        "verified_count": 4,
        "description": "Turnkey upgradation of Yokogawa/Honeywell DCS control consoles, safety instrumented system (SIS), and cybersecurity perimeter.",
        "requirements": []
    },
    {
        "id": "TND-2024-001",
        "tender_number": "CPCL/PROC/SAFETY/2024/09",
        "ref": "CPCL/PROC/SAFETY/2024/09",
        "tender_id": "CPCL/PROC/SAFETY/2024/09",
        "title": "Supply and Maintenance of High-Grade Industrial Safety & Fire Protection Equipment",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Fire & Safety Department, Manali Refinery",
        "status": "CLOSED",
        "estimated_value": 45000000.0,
        "estimated_value_display": "₹ 4,50,00,000",
        "emd_amount": 900000.0,
        "emd_amount_display": "₹ 9,00,000",
        "publish_date": "2024-07-01T09:00:00Z",
        "closing_date": "2024-08-30T17:30:00Z",
        "deadline": "30 Aug 2024",
        "category": "Goods & Safety Systems",
        "bids_count": 3,
        "verified_count": 3,
        "description": "Annual contract for supply of certified flame-resistant coveralls, SCBA breathing apparatus, chemical safety helmets, and fall protection harnesses.",
        "requirements": []
    }
]

SAMPLE_BIDDERS: List[Dict[str, Any]] = [
    {
        "id": "BID-001",
        "bid_submission_id": "BID/2024/0912-A",
        "tender_id": "TND-2026-001",
        "tender_number": "CPCL/PROC/2026/001",
        "tender_title": "Industrial Safety Helmets & Impact Visors",
        "name": "ABC Safety Solutions Pvt Ltd",
        "contact_person": "Suresh Patel (Managing Director)",
        "email": "abc@abcsafety.com",
        "phone": "+91 98765 43210",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 4,42,00,000",
        "gstin": "33AABCA1234F1Z5",
        "pan": "AABCA1234F",
        "udyam": "UDYAM-TN-02-0012345",
        "epfo_code": "TN/MAS/0099881",
        "annual_turnover_cr": 4.5,
        "years_experience": 5.0,
        "experience_years": 5.0,
        "oem_status": "Direct OEM Tier 1 Authorization - Karam / Honeywell",
        "local_content": 65.0,
        "local_content_pct": 65.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-08-20T14:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 100.0,
        "risk_level": "LOW",
        "summary": {
            "pass_count": 6,
            "fail_count": 0,
            "review_count": 0,
            "total": 6,
            "total_requirements": 6
        },
        "highlight_issue": "Fully compliant across all mandatory statutory, financial, and technical criteria.",
        "documents": {
            "audited_balance_sheet": "ABC_Audited_Balance_Sheet_2023_24.pdf",
            "experience_cert": "ABC_Past_Supply_Orders_CPCL_IOCL.pdf",
            "oem_cert": "Honeywell_Direct_OEM_MAF_2024.pdf",
            "local_content_cert": "Statutory_Auditor_MII_Certificate.pdf",
            "udyam_cert": "MSME_Udyam_Registration_TN02.pdf"
        }
    },
    {
        "id": "BID-002",
        "bid_submission_id": "BID/2024/0914-B",
        "tender_id": "TND-2026-001",
        "tender_number": "CPCL/PROC/2026/001",
        "tender_title": "Industrial Safety Helmets & Impact Visors",
        "name": "SecureTech Industries Ltd",
        "contact_person": "Rajiv Sharma (VP Business Dev)",
        "email": "contact@securetechind.com",
        "phone": "+91 98220 11223",
        "location": "Mumbai, Maharashtra",
        "bid_amount": "₹ 4,68,00,000",
        "gstin": "27AAACT5678B1Z2",
        "pan": "AAACT5678B",
        "udyam": "UDYAM-MH-18-0098765",
        "epfo_code": "MH/BAN/0011223",
        "annual_turnover_cr": 2.2,
        "years_experience": 2.0,
        "experience_years": 2.0,
        "oem_status": "Direct OEM Tier 1 Authorization",
        "local_content": 52.0,
        "local_content_pct": 52.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-08-22T11:15:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "NON_COMPLIANT",
        "compliance_score": 66.7,
        "risk_level": "HIGH",
        "summary": {
            "pass_count": 4,
            "fail_count": 2,
            "review_count": 0,
            "total": 6,
            "total_requirements": 6
        },
        "highlight_issue": "Mandatory turnover (₹2.2 Cr < ₹3.0 Cr) and experience requirements failed.",
        "documents": {
            "audited_balance_sheet": "SecureTech_Financials_FY24.pdf",
            "experience_cert": "Work_Order_Private_2023.pdf",
            "oem_cert": "OEM_Auth_Letter.pdf",
            "local_content_cert": "MII_Auditor_Cert.pdf",
            "udyam_cert": "Udyam_MH.pdf"
        }
    },
    {
        "id": "BID-003",
        "bid_submission_id": "BID/2024/0915-C",
        "tender_id": "TND-2026-001",
        "tender_number": "CPCL/PROC/2026/001",
        "tender_title": "Industrial Safety Helmets & Impact Visors",
        "name": "SafeGuard Equipments Pvt Ltd",
        "contact_person": "Kiran Rao (Partner)",
        "email": "tenders@safeguardequip.com",
        "phone": "+91 94440 55667",
        "location": "Bengaluru, Karnataka",
        "bid_amount": "₹ 4,29,00,000",
        "gstin": "29AABCS9012D1Z8",
        "pan": "AABCS9012D",
        "udyam": "UDYAM-KR-03-0045678",
        "epfo_code": "KN/BNG/0067890",
        "annual_turnover_cr": 3.8,
        "years_experience": 4.0,
        "experience_years": 4.0,
        "oem_status": "Secondary Distributor Letter",
        "local_content": 35.0,
        "local_content_pct": 35.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-08-24T16:45:00Z",
        "status": "UNDER_VERIFICATION",
        "verification_status": "PROCESSING",
        "compliance_status": "REQUIRES_REVIEW",
        "compliance_score": 83.3,
        "risk_level": "MEDIUM",
        "summary": {
            "pass_count": 4,
            "fail_count": 0,
            "review_count": 2,
            "total": 6,
            "total_requirements": 6
        },
        "highlight_issue": "Secondary OEM letter submitted & Class-II local content (35%). Requires officer review.",
        "documents": {
            "audited_balance_sheet": "SafeGuard_Audited_Accounts_2024.pdf",
            "experience_cert": "Past_Contracts_BPCL_HPCL.pdf",
            "oem_cert": "Secondary_Distributor_Letter.pdf",
            "local_content_cert": "MII_Self_Declaration.pdf",
            "udyam_cert": "Udyam_KR.pdf"
        }
    },
    {
        "id": "BID-004",
        "bid_submission_id": "BID/2026/0401-A",
        "tender_id": "TND-2026-004",
        "tender_number": "CPCL/PROC/2026/004",
        "tender_title": "High-Pressure Refinery Valve Assemblies",
        "name": "Chennai Valves & Fittings Corp",
        "contact_person": "M. Venkatesh (Managing Director)",
        "email": "sales@chennaivalves.com",
        "phone": "+91 94441 22334",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 7,95,00,000",
        "gstin": "33AACCV5544E1Z1",
        "pan": "AACCV5544E",
        "udyam": "UDYAM-TN-02-0088776",
        "epfo_code": "TN/MAS/0044556",
        "annual_turnover_cr": 8.5,
        "years_experience": 6.0,
        "experience_years": 6.0,
        "oem_status": "Direct OEM Manufacturer",
        "local_content": 70.0,
        "local_content_pct": 70.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-08-26T10:15:00Z",
        "status": "REVIEW",
        "verification_status": "PROCESSING",
        "compliance_status": "REVIEW",
        "compliance_score": 90.0,
        "risk_level": "MEDIUM",
        "summary": {
            "pass_count": 5,
            "fail_count": 0,
            "review_count": 1,
            "total": 6,
            "total_requirements": 6
        },
        "highlight_issue": "Turnover satisfies numerical threshold. CA certificate UDIN validation pending response.",
        "documents": {
            "audited_balance_sheet": "Chennai_Valves_Audited_FY24.pdf"
        }
    },
    {
        "id": "BID-005",
        "bid_submission_id": "BID/2026/0402-B",
        "tender_id": "TND-2026-004",
        "tender_number": "CPCL/PROC/2026/004",
        "tender_title": "High-Pressure Refinery Valve Assemblies",
        "name": "Apex Piping & Engineering Ltd",
        "contact_person": "Anil Kulkarni (Director)",
        "email": "info@apexpiping.com",
        "phone": "+91 98230 99887",
        "location": "Pune, Maharashtra",
        "bid_amount": "₹ 8,15,00,000",
        "gstin": "27AAACA9988C1Z4",
        "pan": "AAACA9988C",
        "udyam": "UDYAM-MH-18-0044332",
        "epfo_code": "MH/PUN/0099112",
        "annual_turnover_cr": 9.2,
        "years_experience": 8.0,
        "experience_years": 8.0,
        "oem_status": "Direct OEM Manufacturer",
        "local_content": 60.0,
        "local_content_pct": 60.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-08-28T14:00:00Z",
        "status": "COMPLETED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 95.0,
        "risk_level": "LOW",
        "summary": {
            "pass_count": 6,
            "fail_count": 0,
            "review_count": 0,
            "total": 6,
            "total_requirements": 6
        },
        "highlight_issue": "Complete IBR approval and ASTM A335 inspection credentials verified.",
        "documents": {
            "audited_balance_sheet": "Apex_Piping_Audited_FY24.pdf"
        }
    },
    {
        "id": "BID-006",
        "bid_submission_id": "BID/2026/0105-D",
        "tender_id": "TND-2026-001",
        "tender_number": "CPCL/PROC/2026/001",
        "tender_title": "Industrial Safety Helmets & Impact Visors",
        "name": "Southern Safety Gears",
        "contact_person": "K. Selvam (Partner)",
        "email": "selvam@southernsafety.in",
        "phone": "+91 94432 77665",
        "location": "Coimbatore, Tamil Nadu",
        "bid_amount": "₹ 4,35,00,000",
        "gstin": "33AAESS1122G1Z9",
        "pan": "AAESS1122G",
        "udyam": "UDYAM-TN-03-0055443",
        "epfo_code": "TN/CBE/0033221",
        "annual_turnover_cr": 3.1,
        "years_experience": 3.0,
        "experience_years": 3.0,
        "oem_status": "Authorized Channel Partner",
        "local_content": 55.0,
        "local_content_pct": 55.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-09-01T09:30:00Z",
        "status": "DRAFT",
        "verification_status": "PENDING",
        "compliance_status": "PENDING",
        "compliance_score": 0.0,
        "risk_level": "LOW",
        "summary": {
            "pass_count": 0,
            "fail_count": 0,
            "review_count": 0,
            "total": 6,
            "total_requirements": 6
        },
        "highlight_issue": "Draft submission in preparation by vendor.",
        "documents": {}
    }
]

SAMPLE_BIDDER_BIDS: List[Dict[str, Any]] = [
    {
        "id": "BID-DOC-001",
        "bidder_id": "BID-001",
        "tender_id": "TND-2026-001",
        "tender_number": "CPCL/PROC/2026/001",
        "tender_title": "Industrial Safety Helmets & Impact Visors",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "bid_amount": "₹ 4,42,00,000",
        "submission_date": "2026-08-20T14:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 100.0,
        "passed_rules": 6,
        "total_rules": 6,
        "is_draft": False
    },
    {
        "id": "BID-DOC-002",
        "bidder_id": "BID-001",
        "tender_id": "TND-2026-002",
        "tender_number": "CPCL/PROC/2026/002",
        "tender_title": "Industrial Protective Equipment & Harness Kits",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "bid_amount": "₹ 3,10,00,000",
        "submission_date": None,
        "status": "DRAFT",
        "verification_status": "PENDING",
        "compliance_status": "PENDING",
        "compliance_score": 0.0,
        "passed_rules": 0,
        "total_rules": 4,
        "is_draft": True
    },
    {
        "id": "BID-DOC-003",
        "bidder_id": "BID-001",
        "tender_id": "TND-2026-004",
        "tender_number": "CPCL/PROC/2026/004",
        "tender_title": "High-Pressure Refinery Valve Assemblies",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "bid_amount": "₹ 7,85,00,000",
        "submission_date": "2026-09-02T11:20:00Z",
        "status": "UNDER_VERIFICATION",
        "verification_status": "PROCESSING",
        "compliance_status": "REVIEW_REQUIRED",
        "compliance_score": 80.0,
        "passed_rules": 2,
        "total_rules": 3,
        "is_draft": False
    }
]

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

def get_all_tenders(query: Optional[str] = None, status: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    results = list(SAMPLE_TENDERS)
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
        results = [
            t for t in results
            if t.get("status", "").upper() == st
            or (st in ["OPEN", "ACTIVE", "PUBLISHED"] and t.get("status", "").upper() in ["OPEN", "ACTIVE", "PUBLISHED"])
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
            return t
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

def add_tender(tender_data: Dict[str, Any]) -> Dict[str, Any]:
    # Check if duplicate ID exists
    t_id = tender_data.get("tender_number") or tender_data.get("id") or tender_data.get("tender_id") or tender_data.get("ref")
    if t_id and check_tender_id_exists(t_id):
        raise ValueError(f"Tender ID '{t_id}' already exists in the registry. Please use a unique Tender ID.")

    # Assign internal ID if missing
    if not tender_data.get("id"):
        tender_data["id"] = f"TND-2026-00{len(SAMPLE_TENDERS) + 1}"
    if not tender_data.get("tender_number") and tender_data.get("ref"):
        tender_data["tender_number"] = tender_data["ref"]
    elif not tender_data.get("ref") and tender_data.get("tender_number"):
        tender_data["ref"] = tender_data["tender_number"]
    if not tender_data.get("tender_id"):
        tender_data["tender_id"] = tender_data.get("tender_number") or tender_data.get("id")
    if not tender_data.get("organization"):
        tender_data["organization"] = "Chennai Petroleum Corporation Limited (CPCL)"
    if not tender_data.get("status"):
        tender_data["status"] = "DRAFT"
    SAMPLE_TENDERS.insert(0, tender_data)
    return tender_data

def update_tender(tender_id: str, patch_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    tender = get_tender_by_id(tender_id)
    if tender:
        # Check duplicate if tender_number is being changed
        new_num = patch_data.get("tender_number") or patch_data.get("tender_id")
        if new_num and new_num != tender.get("tender_number") and check_tender_id_exists(new_num, exclude_id=tender.get("id")):
            raise ValueError(f"Tender ID '{new_num}' already exists in the registry.")
        tender.update(patch_data)
        return tender
    return None

def get_all_bidders(query: Optional[str] = None, tender_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    results = list(SAMPLE_BIDDERS)
    if tender_id:
        results = [b for b in results if b.get("tender_id") == tender_id or b.get("tender_number") == tender_id]
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
    if status and status.upper() != "ALL":
        st = status.strip().upper().replace(" ", "_")
        results = [
            b for b in results
            if b.get("status", "").upper().replace(" ", "_") == st
            or b.get("compliance_status", "").upper().replace(" ", "_") == st
            or (st == "REVIEW" and b.get("status", "").upper() in ["REVIEW", "UNDER_VERIFICATION", "REQUIRES_REVIEW"])
            or (st == "UNDER_VERIFICATION" and b.get("status", "").upper() in ["UNDER_VERIFICATION", "REVIEW", "PROCESSING"])
            or (st == "SUBMITTED" and b.get("status", "").upper() in ["SUBMITTED", "COMPLIANT", "NON_COMPLIANT"])
            or (st == "COMPLETED" and b.get("status", "").upper() in ["COMPLETED", "AUTHENTICATED", "COMPLIANT"])
        ]
    return results

def get_bidders_for_tender(tender_id: str) -> List[Dict[str, Any]]:
    return [
        b for b in SAMPLE_BIDDERS
        if b.get("tender_id") == tender_id or b.get("tender_number") == tender_id
    ]

def get_bidder_by_id(bidder_id: str) -> Optional[Dict[str, Any]]:
    for b in SAMPLE_BIDDERS:
        if b.get("id") == bidder_id or b.get("bid_submission_id") == bidder_id:
            return b
    return None

def add_bidder(bidder_data: Dict[str, Any]) -> Dict[str, Any]:
    SAMPLE_BIDDERS.append(bidder_data)
    return bidder_data

def get_bids_by_bidder_id(bidder_id: str) -> List[Dict[str, Any]]:
    return [b for b in SAMPLE_BIDDER_BIDS if b.get("bidder_id") == bidder_id]

def add_bid_for_bidder(bid_data: Dict[str, Any]) -> Dict[str, Any]:
    SAMPLE_BIDDER_BIDS.append(bid_data)
    return bid_data

def get_dashboard_stats() -> Dict[str, Any]:
    all_tenders = SAMPLE_TENDERS
    all_bidders = SAMPLE_BIDDERS

    total_tenders = len(all_tenders)
    # Active/Total procurement tenders in system
    active_tenders = len([t for t in all_tenders if t.get("status", "").upper() not in ["ARCHIVED", "CANCELLED"]])

    # Bids calculation across tenders
    total_bids = len(all_bidders)
    under_verification = len([b for b in all_bidders if b.get("status") in ["UNDER_VERIFICATION", "PROCESSING", "UNDER REVIEW"]])
    pending_review = len([b for b in all_bidders if b.get("compliance_status") in ["REQUIRES_REVIEW", "REVIEW_REQUIRED", "REVIEW"]])
    compliant_bids = len([b for b in all_bidders if b.get("compliance_status") == "COMPLIANT"])
    high_risk = len([b for b in all_bidders if b.get("risk_level") == "HIGH"])

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

SAMPLE_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "id": "NOTIF-001",
        "bidder_id": "BID-001",
        "title": "Technical Evaluation Passed",
        "message": "Your bid for Tender CPCL/PROC/2026/001 has passed technical & statutory pre-qualification with 100% compliance.",
        "timestamp": "2026-08-26T14:30:00Z",
        "type": "SUCCESS",
        "read": False
    },
    {
        "id": "NOTIF-002",
        "bidder_id": "BID-001",
        "title": "MSME Udyam Exemption Verified",
        "message": "EMD Exemption of ₹9,00,000 granted under MSME Udyam Policy (Certificate: UDYAM-TN-02-0012345).",
        "timestamp": "2026-08-21T10:00:00Z",
        "type": "INFO",
        "read": True
    },
    {
        "id": "NOTIF-003",
        "bidder_id": "BID-001",
        "title": "Tender Deadline Approaching",
        "message": "Tender CPCL/PROC/2026/004 (High-Pressure Valves) closes on 02-Oct-2026. Your submission is under review.",
        "timestamp": "2026-09-01T09:00:00Z",
        "type": "WARNING",
        "read": False
    }
]

def get_notifications_for_bidder(bidder_id: str) -> List[Dict[str, Any]]:
    notifs = [n for n in SAMPLE_NOTIFICATIONS if n.get("bidder_id") == bidder_id]
    if not notifs:
        return [
            {
                "id": f"NOTIF-NEW-{bidder_id}",
                "bidder_id": bidder_id,
                "title": "Welcome to BidSure AI",
                "message": "Your organization account is active. Complete your statutory document profile to apply for active CPCL tenders.",
                "timestamp": "Just now",
                "type": "SUCCESS",
                "read": False
            }
        ]
    return notifs

# Immutable Audit Trail Data Store
SAMPLE_AUDIT_LOGS: List[Dict[str, Any]] = [
    {
        "id": "LOG-001",
        "timestamp": "2026-09-14T10:15:22Z",
        "user_email": "officer@cpcl.gov.in",
        "user_role": "PROCUREMENT_OFFICER",
        "action": "EVALUATE_COMPLIANCE",
        "entity_type": "BIDDER",
        "entity_id": "BID-001",
        "details": "Deterministic rules evaluation executed for ABC Safety Solutions Pvt Ltd (Score: 100%).",
        "status": "SUCCESS",
        "actor": "officer@cpcl.gov.in",
        "target": "BID-001",
        "integrity_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
        "id": "LOG-002",
        "timestamp": "2026-09-14T09:40:05Z",
        "user_email": "cpo@cpcl.gov.in",
        "user_role": "SENIOR_PROCUREMENT_OFFICER",
        "action": "OVERRIDE_VERDICT",
        "entity_type": "BIDDER",
        "entity_id": "BID-003",
        "details": "Senior Officer recorded commentary for SafeGuard Equipments regarding secondary OEM authorization.",
        "status": "WARNING",
        "actor": "cpo@cpcl.gov.in",
        "target": "BID-003",
        "integrity_hash": "a45c789123fe45b89a012cd34ef567890abcdef1234567890abcdef12345678"
    },
    {
        "id": "LOG-003",
        "timestamp": "2026-09-14T09:12:40Z",
        "user_email": "officer@cpcl.gov.in",
        "user_role": "PROCUREMENT_OFFICER",
        "action": "EXTERNAL_API_VERIFY",
        "entity_type": "GOV_PORTAL",
        "entity_id": "GSTN-33AABCA1234F1Z5",
        "details": "Automated GSTN active registration and return filing verification status returned SUCCESS.",
        "status": "SUCCESS",
        "actor": "officer@cpcl.gov.in",
        "target": "GSTN-33AABCA1234F1Z5",
        "integrity_hash": "d41d8cd98f00b204e9800998ecf8427e0123456789abcdef0123456789abcdef"
    },
    {
        "id": "LOG-004",
        "timestamp": "2026-09-14T08:30:12Z",
        "user_email": "abc@abcsafety.com",
        "user_role": "BIDDER",
        "action": "BID_SUBMISSION",
        "entity_type": "TENDER",
        "entity_id": "CPCL/PROC/2026/001",
        "details": "Bid package and 6 supporting PDF documents uploaded with SHA-256 integrity hash.",
        "status": "SUCCESS",
        "actor": "abc@abcsafety.com",
        "target": "CPCL/PROC/2026/001",
        "integrity_hash": "f62b8a0e1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8"
    }
]

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
