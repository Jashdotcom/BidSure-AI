"""
BidSure AI Sample & In-Memory Data Store
Provides realistic mock tenders, bidders, and compliance records for CPCL evaluation workflows.
"""
from typing import Dict, List, Any, Optional
import os
import copy
import time
import hashlib
import threading
import re
from datetime import datetime, timezone
from app.config import load_project_env
load_project_env()

# Centralized Demo Mode Switch (default: false)
# When DEMO_MODE=false: live in-memory store starts empty for real procurement data.
# When DEMO_MODE=true: pre-populates with standard demo/seed dataset for development/testing.
DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "t", "yes")

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

# Seed Database of 12 Authentic CPCL Procurement Tenders (Used when DEMO_MODE=true)
DEMO_TENDERS: List[Dict[str, Any]] = [
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
                "title": "Past Experience in Fall Protection / Safety Gear",
                "description": "Bidder must have completed at least 3 similar supply contracts for fall arrest & harness systems in PSUs/Refineries in last 5 years.",
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
                "description": "Direct OEM Authorization letter or Principal Manufacturer certificate specifically for this CPCL Tender.",
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
        "id": "TND-2026-003",
        "tender_number": "CPCL/PROC/2026/003",
        "ref": "CPCL/PROC/2026/003",
        "tender_id": "CPCL/PROC/2026/003",
        "title": "Fire Safety Equipment & Hydrant Valves",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Fire & Safety Department",
        "status": "PUBLISHED",
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
        "requirements": [
            {
                "id": "REQ-001",
                "code": "TURNOVER",
                "clause": "Clause 4.1.1",
                "clause_reference": "Section II, Clause 3.1",
                "category": "FINANCIAL",
                "title": "Average Annual Financial Turnover",
                "description": "Bidder must have minimum average annual financial turnover of ₹5.00 Crore during last 3 financial years.",
                "threshold": 5.0,
                "threshold_value": ">= ₹5.00 Cr",
                "unit": "Crore INR",
                "mandatory": True
            },
            {
                "id": "REQ-002",
                "code": "EXPERIENCE",
                "clause": "Clause 4.2.3",
                "clause_reference": "Section III, Clause 4.2",
                "category": "TECHNICAL",
                "title": "Past Experience in Fire Safety Supply",
                "description": "Bidder must have completed at least 3 similar contracts in PSUs/Refineries in last 5 years.",
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
        "requirements": [
            {
                "id": "REQ-001",
                "code": "TURNOVER",
                "clause": "Clause 4.1.1",
                "clause_reference": "Section II, Clause 3.1",
                "category": "FINANCIAL",
                "title": "Average Annual Financial Turnover",
                "description": "Bidder must have minimum average annual financial turnover of ₹8.00 Crore during last 3 financial years.",
                "threshold": 8.0,
                "threshold_value": ">= ₹8.00 Cr",
                "unit": "Crore INR",
                "mandatory": True
            },
            {
                "id": "REQ-002",
                "code": "EXPERIENCE",
                "clause": "Clause 4.2.3",
                "clause_reference": "Section III, Clause 4.2",
                "category": "TECHNICAL",
                "title": "Past Experience in Refinery Valve Supply",
                "description": "Bidder must have completed at least 5 high-pressure valve supply contracts in PSU refineries in last 5 years.",
                "threshold": 5,
                "threshold_value": ">= 5 Years / Orders",
                "unit": "Contracts",
                "mandatory": True
            },
            {
                "id": "REQ-003",
                "code": "OEM",
                "clause": "Clause 5.1.0",
                "clause_reference": "Section III, Clause 4.5",
                "category": "OEM_AUTHORIZATION",
                "title": "Direct OEM Authorization & IBR Certification",
                "description": "Direct OEM Authorization letter and valid Indian Boiler Regulations (IBR) manufacturing license.",
                "threshold": 1,
                "threshold_value": "Direct OEM Authorized + IBR",
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
        "status": "PUBLISHED",
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
        "status": "PUBLISHED",
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
        "status": "PUBLISHED",
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
        "status": "PUBLISHED",
        "estimated_value": 124000000.0,
        "estimated_value_display": "₹ 12,40,00,000",
        "emd_amount": 2480000.0,
        "emd_amount_display": "₹ 24,80,000",
        "publish_date": "2026-08-19T09:00:00Z",
        "closing_date": "2026-11-18T17:00:00Z",
        "deadline": "18 Nov 2026",
        "category": "Instrumentation & Automation",
        "bids_count": 4,
        "verified_count": 4,
        "description": "Turnkey upgradation of Yokogawa/Honeywell DCS control consoles, safety instrumented system (SIS), and cybersecurity perimeter.",
        "requirements": []
    },
    {
        "id": "TND-2026-012",
        "tender_number": "CPCL/PROC/2026/012",
        "ref": "CPCL/PROC/2026/012",
        "tender_id": "CPCL/PROC/2026/012",
        "title": "High-Voltage Transformers & Switchgear Package",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Electrical Engineering Division",
        "status": "PUBLISHED",
        "estimated_value": 95000000.0,
        "estimated_value_display": "₹ 9,50,00,000",
        "emd_amount": 1900000.0,
        "emd_amount_display": "₹ 19,00,000",
        "publish_date": "2026-08-20T10:00:00Z",
        "closing_date": "2026-11-20T17:00:00Z",
        "deadline": "20 Nov 2026",
        "category": "Electrical & High-Voltage Equipment",
        "bids_count": 2,
        "verified_count": 2,
        "description": "Design, manufacture, testing, and commissioning of 33kV/11kV oil-immersed power transformers and GIS switchgear panels for refinery power distribution.",
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
        "requirements": [],
        "deadline_history": [
            {
                "id": "AMD-CPCL-PROC-SAFETY-2024-09-01",
                "amendment_number": "Corrigendum-01",
                "tender_id": "CPCL/PROC/SAFETY/2024/09",
                "previous_deadline": "2024-08-15T17:30:00Z",
                "previous_deadline_display": "15 Aug 2024, 05:30 PM",
                "new_deadline": "2024-08-30T17:30:00Z",
                "new_deadline_display": "30 Aug 2024, 05:30 PM",
                "reason": "Corrigendum-01: Technical query resolution window extended for prospective PPE vendors.",
                "changed_by": "Rajesh Kumar",
                "changed_by_email": "officer@cpcl.gov.in",
                "changed_at": "2024-08-10T11:00:00Z"
            }
        ],
        "amendments": [
            {
                "id": "AMD-CPCL-PROC-SAFETY-2024-09-01",
                "amendment_number": "Corrigendum-01",
                "tender_id": "CPCL/PROC/SAFETY/2024/09",
                "previous_deadline": "2024-08-15T17:30:00Z",
                "previous_deadline_display": "15 Aug 2024, 05:30 PM",
                "new_deadline": "2024-08-30T17:30:00Z",
                "new_deadline_display": "30 Aug 2024, 05:30 PM",
                "reason": "Corrigendum-01: Technical query resolution window extended for prospective PPE vendors.",
                "changed_by": "Rajesh Kumar",
                "changed_by_email": "officer@cpcl.gov.in",
                "changed_at": "2024-08-10T11:00:00Z"
            }
        ],
        "closed_at": "2024-08-30T17:30:00Z",
        "closed_by": "Rajesh Kumar",
        "close_reason": "Bidding window concluded and sealed for evaluation."
    },
    {
        "id": "TND-2026-013",
        "tender_number": "CPCL/PROC/2026/013",
        "ref": "CPCL/PROC/2026/013",
        "tender_id": "CPCL/PROC/2026/013",
        "title": "Annual Rate Contract for Refinery Thermal Insulation & Cladding Materials",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Mechanical & Civil Maintenance Division",
        "status": "DRAFT",
        "estimated_value": 38000000.0,
        "estimated_value_display": "₹ 3,80,00,000",
        "emd_amount": 760000.0,
        "emd_amount_display": "₹ 7,60,000",
        "publish_date": "2026-09-18T10:00:00Z",
        "closing_date": "2026-11-30T17:00:00Z",
        "deadline": "30 Nov 2026",
        "category": "Civil & Mechanical Works",
        "bids_count": 0,
        "verified_count": 0,
        "description": "Supply, installation, and inspection of pre-formed calcium silicate and rockwool thermal insulation slabs with aluminum cladding for refinery piping systems.",
        "requirements": [],
        "deadline_history": [],
        "amendments": []
    }
]

# Seed Database of 35 Participating Bidders (Used when DEMO_MODE=true)
DEMO_BIDDERS: List[Dict[str, Any]] = [
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
        "documents": {},
        "is_draft": True
    },

    # ─── TND-2026-002: Industrial Protective Equipment & Harness Kits (5 bids) ───
    {
        "id": "BID-007",
        "bid_submission_id": "BID/2026/0201-A",
        "tender_id": "TND-2026-002",
        "tender_number": "CPCL/PROC/2026/002",
        "tender_title": "Industrial Protective Equipment & Harness Kits",
        "name": "Altura Safety Systems Pvt Ltd",
        "contact_person": "Naresh Gupta (Director)",
        "email": "naresh@alturasafety.com",
        "phone": "+91 98112 34567",
        "location": "Noida, Uttar Pradesh",
        "bid_amount": "₹ 3,08,00,000",
        "gstin": "09AAAAG1234H1Z5",
        "pan": "AAAAG1234H",
        "udyam": "UDYAM-UP-09-0012340",
        "epfo_code": "UP/NOI/0087654",
        "annual_turnover_cr": 5.2,
        "years_experience": 6.0,
        "experience_years": 6.0,
        "oem_status": "Direct OEM Authorization - Capital Safety / 3M",
        "local_content": 62.0,
        "local_content_pct": 62.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-08-25T10:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 100.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Fully compliant. Direct OEM authorization from Capital Safety and 3M verified.",
        "documents": {
            "audited_balance_sheet": "Altura_Audited_FY24.pdf",
            "oem_cert": "3M_CapitalSafety_Auth_2024.pdf"
        }
    },
    {
        "id": "BID-008",
        "bid_submission_id": "BID/2026/0202-B",
        "tender_id": "TND-2026-002",
        "tender_number": "CPCL/PROC/2026/002",
        "tender_title": "Industrial Protective Equipment & Harness Kits",
        "name": "Protex Fall Protection Ltd",
        "contact_person": "Meena Krishnan (MD)",
        "email": "info@protexfp.com",
        "phone": "+91 99004 55678",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 2,98,00,000",
        "gstin": "33AAABP5678J1Z1",
        "pan": "AAABP5678J",
        "udyam": "UDYAM-TN-02-0077654",
        "epfo_code": "TN/MAS/0054321",
        "annual_turnover_cr": 4.1,
        "years_experience": 4.0,
        "experience_years": 4.0,
        "oem_status": "Direct OEM Tier 1 Authorization",
        "local_content": 58.0,
        "local_content_pct": 58.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-08-26T11:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 95.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "All criteria met. Verified 4 PSU harness supply orders.",
        "documents": {
            "audited_balance_sheet": "Protex_Financials_FY24.pdf",
            "experience_cert": "Protex_PSU_Orders.pdf"
        }
    },
    {
        "id": "BID-009",
        "bid_submission_id": "BID/2026/0203-C",
        "tender_id": "TND-2026-002",
        "tender_number": "CPCL/PROC/2026/002",
        "tender_title": "Industrial Protective Equipment & Harness Kits",
        "name": "Karam Industries Pvt Ltd",
        "contact_person": "Alok Srivastav (VP Sales)",
        "email": "alok.s@karamind.com",
        "phone": "+91 98113 44556",
        "location": "Faridabad, Haryana",
        "bid_amount": "₹ 3,25,00,000",
        "gstin": "06AAACK9876E1Z3",
        "pan": "AAACK9876E",
        "udyam": "UDYAM-HR-06-0023450",
        "epfo_code": "HR/FBD/0032456",
        "annual_turnover_cr": 12.5,
        "years_experience": 9.0,
        "experience_years": 9.0,
        "oem_status": "Direct OEM Manufacturer (Principal)",
        "local_content": 72.0,
        "local_content_pct": 72.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-08-27T09:45:00Z",
        "status": "UNDER_VERIFICATION",
        "verification_status": "PROCESSING",
        "compliance_status": "COMPLIANT",
        "compliance_score": 98.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Principal OEM manufacturer. DPIIT Class-I status, 72% local content.",
        "documents": {
            "audited_balance_sheet": "Karam_Audited_FY24.pdf",
            "local_content_cert": "Karam_MII_CertFY24.pdf"
        }
    },
    {
        "id": "BID-010",
        "bid_submission_id": "BID/2026/0204-D",
        "tender_id": "TND-2026-002",
        "tender_number": "CPCL/PROC/2026/002",
        "tender_title": "Industrial Protective Equipment & Harness Kits",
        "name": "SafeWork India Corp",
        "contact_person": "Ravi Nambiar (Director)",
        "email": "ravi@safeworkindia.com",
        "phone": "+91 94471 66234",
        "location": "Kochi, Kerala",
        "bid_amount": "₹ 3,42,00,000",
        "gstin": "32AAASW3456K1Z6",
        "pan": "AAASW3456K",
        "udyam": "UDYAM-KL-14-0045670",
        "epfo_code": "KL/EKM/0055432",
        "annual_turnover_cr": 3.6,
        "years_experience": 3.5,
        "experience_years": 3.5,
        "oem_status": "Secondary Distributor Letter",
        "local_content": 42.0,
        "local_content_pct": 42.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-08-28T16:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "REQUIRES_REVIEW",
        "compliance_score": 75.0,
        "risk_level": "MEDIUM",
        "summary": {"pass_count": 4, "fail_count": 0, "review_count": 2, "total": 6, "total_requirements": 6},
        "highlight_issue": "Secondary OEM letter and Class-II local content (42%). Requires officer review.",
        "documents": {
            "audited_balance_sheet": "SafeWork_Financials_FY24.pdf",
            "oem_cert": "Secondary_Distributor_Authorization.pdf"
        }
    },
    {
        "id": "BID-011",
        "bid_submission_id": "BID/2026/0205-E",
        "tender_id": "TND-2026-002",
        "tender_number": "CPCL/PROC/2026/002",
        "tender_title": "Industrial Protective Equipment & Harness Kits",
        "name": "Horizon PPE Solutions Pvt Ltd",
        "contact_person": "Preeti Malhotra (CEO)",
        "email": "preeti@horizonppe.in",
        "phone": "+91 97111 22334",
        "location": "Pune, Maharashtra",
        "bid_amount": "₹ 2,85,00,000",
        "gstin": "27AAAHP7890L1Z8",
        "pan": "AAAHP7890L",
        "udyam": "UDYAM-MH-18-0088765",
        "epfo_code": "MH/PUN/0076543",
        "annual_turnover_cr": 2.1,
        "years_experience": 2.0,
        "experience_years": 2.0,
        "oem_status": "Direct OEM Tier 2 Authorization",
        "local_content": 51.0,
        "local_content_pct": 51.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-09-01T14:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "NON_COMPLIANT",
        "compliance_score": 55.0,
        "risk_level": "HIGH",
        "summary": {"pass_count": 3, "fail_count": 2, "review_count": 1, "total": 6, "total_requirements": 6},
        "highlight_issue": "Annual turnover ₹2.1 Cr below ₹3.0 Cr threshold. Insufficient PSU experience (2 years < 3 years).",
        "documents": {
            "audited_balance_sheet": "Horizon_Financials_FY24.pdf"
        }
    },

    # ─── TND-2026-003: Fire Safety Equipment & Hydrant Valves (2 bids) ───
    {
        "id": "BID-012",
        "bid_submission_id": "BID/2026/0301-A",
        "tender_id": "TND-2026-003",
        "tender_number": "CPCL/PROC/2026/003",
        "tender_title": "Fire Safety Equipment & Hydrant Valves",
        "name": "FireGuard Systems Ltd",
        "contact_person": "Sanjay Mehta (MD)",
        "email": "sanjay@fireguardsys.com",
        "phone": "+91 98009 77665",
        "location": "Delhi NCR",
        "bid_amount": "₹ 5,60,00,000",
        "gstin": "07AAAFG9901M1Z2",
        "pan": "AAAFG9901M",
        "udyam": "UDYAM-DL-07-0034520",
        "epfo_code": "DL/DEL/0087651",
        "annual_turnover_cr": 9.8,
        "years_experience": 8.0,
        "experience_years": 8.0,
        "oem_status": "Direct OEM Authorization - Minimax / Tyco",
        "local_content": 60.0,
        "local_content_pct": 60.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-08-20T09:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 97.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "All criteria met. UL and FM certified fire systems supplier.",
        "documents": {
            "audited_balance_sheet": "FireGuard_FY24.pdf",
            "oem_cert": "Minimax_Tyco_OEM_Auth.pdf"
        }
    },
    {
        "id": "BID-013",
        "bid_submission_id": "BID/2026/0302-B",
        "tender_id": "TND-2026-003",
        "tender_number": "CPCL/PROC/2026/003",
        "tender_title": "Fire Safety Equipment & Hydrant Valves",
        "name": "National Fire Equipments Co",
        "contact_person": "G. Padmanabhan (Partner)",
        "email": "gp@nationalfire.in",
        "phone": "+91 99400 12345",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 5,95,00,000",
        "gstin": "33AAANF6789N1Z7",
        "pan": "AAANF6789N",
        "udyam": "UDYAM-TN-02-0067801",
        "epfo_code": "TN/MAS/0065432",
        "annual_turnover_cr": 6.3,
        "years_experience": 5.0,
        "experience_years": 5.0,
        "oem_status": "Direct OEM Tier 1 Authorization",
        "local_content": 55.0,
        "local_content_pct": 55.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-08-22T14:00:00Z",
        "status": "UNDER_VERIFICATION",
        "verification_status": "PROCESSING",
        "compliance_status": "REQUIRES_REVIEW",
        "compliance_score": 88.0,
        "risk_level": "MEDIUM",
        "summary": {"pass_count": 5, "fail_count": 0, "review_count": 1, "total": 6, "total_requirements": 6},
        "highlight_issue": "CA certificate UDIN validation pending. All other criteria met.",
        "documents": {
            "audited_balance_sheet": "NationalFire_FY24.pdf"
        }
    },

    # ─── TND-2026-004: High-Pressure Refinery Valve Assemblies (4 bids - 2 existing + 2 new) ───
    {
        "id": "BID-014",
        "bid_submission_id": "BID/2026/0403-C",
        "tender_id": "TND-2026-004",
        "tender_number": "CPCL/PROC/2026/004",
        "tender_title": "High-Pressure Refinery Valve Assemblies",
        "name": "Precision Valves & Fittings Ltd",
        "contact_person": "T. Krishnaswamy (Director)",
        "email": "info@precisionvalves.in",
        "phone": "+91 98440 23456",
        "location": "Coimbatore, Tamil Nadu",
        "bid_amount": "₹ 8,05,00,000",
        "gstin": "33AAAPV3456P1Z4",
        "pan": "AAAPV3456P",
        "udyam": "UDYAM-TN-03-0078901",
        "epfo_code": "TN/CBE/0045678",
        "annual_turnover_cr": 7.1,
        "years_experience": 7.0,
        "experience_years": 7.0,
        "oem_status": "Direct OEM Authorization - KSB / Flowserve",
        "local_content": 65.0,
        "local_content_pct": 65.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-08-29T11:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 92.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "All criteria verified. IBR-approved supplier for high-pressure applications.",
        "documents": {
            "audited_balance_sheet": "Precision_Audited_FY24.pdf",
            "oem_cert": "KSB_Flowserve_Auth.pdf"
        }
    },
    {
        "id": "BID-015",
        "bid_submission_id": "BID/2026/0404-D",
        "tender_id": "TND-2026-004",
        "tender_number": "CPCL/PROC/2026/004",
        "tender_title": "High-Pressure Refinery Valve Assemblies",
        "name": "Sathya Piping Industries",
        "contact_person": "M. Sathyanarayana (MD)",
        "email": "ms@sathyapiping.com",
        "phone": "+91 97001 34567",
        "location": "Visakhapatnam, Andhra Pradesh",
        "bid_amount": "₹ 7,70,00,000",
        "gstin": "37AAABS8765Q1Z2",
        "pan": "AAABS8765Q",
        "udyam": "UDYAM-AP-37-0056790",
        "epfo_code": "AP/VSP/0065421",
        "annual_turnover_cr": 5.5,
        "years_experience": 5.0,
        "experience_years": 5.0,
        "oem_status": "Direct OEM Tier 1 Authorization",
        "local_content": 58.0,
        "local_content_pct": 58.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-01T10:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 88.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Meets all statutory, financial, and technical requirements.",
        "documents": {
            "audited_balance_sheet": "Sathya_FY24.pdf"
        }
    },

    # ─── TND-2026-006: Crude Distillation Unit Heat Exchanger Tubes (3 bids) ───
    {
        "id": "BID-016",
        "bid_submission_id": "BID/2026/0601-A",
        "tender_id": "TND-2026-006",
        "tender_number": "CPCL/PROC/2026/006",
        "tender_title": "Crude Distillation Unit Heat Exchanger Tubes",
        "name": "Thermotech Tubes Pvt Ltd",
        "contact_person": "Subramaniam V (Director)",
        "email": "sv@thermotechtubes.in",
        "phone": "+91 98220 88776",
        "location": "Pune, Maharashtra",
        "bid_amount": "₹ 6,40,00,000",
        "gstin": "27AAATT2345T1Z6",
        "pan": "AAATT2345T",
        "udyam": "UDYAM-MH-18-0023456",
        "epfo_code": "MH/PUN/0032145",
        "annual_turnover_cr": 8.2,
        "years_experience": 7.0,
        "experience_years": 7.0,
        "oem_status": "Direct OEM Manufacturer (Heat Exchanger Specialist)",
        "local_content": 68.0,
        "local_content_pct": 68.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-02T09:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 96.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Hydrostatic testing credentials and TEMA certification verified.",
        "documents": {
            "audited_balance_sheet": "Thermotech_FY24.pdf",
            "oem_cert": "TEMA_Certification.pdf"
        }
    },
    {
        "id": "BID-017",
        "bid_submission_id": "BID/2026/0602-B",
        "tender_id": "TND-2026-006",
        "tender_number": "CPCL/PROC/2026/006",
        "tender_title": "Crude Distillation Unit Heat Exchanger Tubes",
        "name": "Stainless Steel Solutions Ltd",
        "contact_person": "Arun Kumar (Partner)",
        "email": "arun@sssteel.in",
        "phone": "+91 99100 22334",
        "location": "Mumbai, Maharashtra",
        "bid_amount": "₹ 6,80,00,000",
        "gstin": "27AAASSS7890U1Z4",
        "pan": "AAASSS7890U",
        "udyam": "UDYAM-MH-18-0056780",
        "epfo_code": "MH/BAN/0023456",
        "annual_turnover_cr": 11.4,
        "years_experience": 10.0,
        "experience_years": 10.0,
        "oem_status": "Direct OEM Manufacturer",
        "local_content": 74.0,
        "local_content_pct": 74.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-03T11:00:00Z",
        "status": "UNDER_VERIFICATION",
        "verification_status": "PROCESSING",
        "compliance_status": "COMPLIANT",
        "compliance_score": 99.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Premium supplier. All duplex SS and titanium tube specifications met.",
        "documents": {
            "audited_balance_sheet": "SSSteel_FY24.pdf"
        }
    },
    {
        "id": "BID-018",
        "bid_submission_id": "BID/2026/0603-C",
        "tender_id": "TND-2026-006",
        "tender_number": "CPCL/PROC/2026/006",
        "tender_title": "Crude Distillation Unit Heat Exchanger Tubes",
        "name": "Bharat Metallurgicals Pvt Ltd",
        "contact_person": "R. Krishnaswamy (MD)",
        "email": "rk@bharatmet.com",
        "phone": "+91 97440 33445",
        "location": "Jamnagar, Gujarat",
        "bid_amount": "₹ 6,20,00,000",
        "gstin": "24AAABM5678V1Z7",
        "pan": "AAABM5678V",
        "udyam": "UDYAM-GJ-24-0034520",
        "epfo_code": "GJ/JAM/0045671",
        "annual_turnover_cr": 6.1,
        "years_experience": 5.0,
        "experience_years": 5.0,
        "oem_status": "Secondary Distributor Authorization",
        "local_content": 40.0,
        "local_content_pct": 40.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-09-04T10:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "REQUIRES_REVIEW",
        "compliance_score": 78.0,
        "risk_level": "MEDIUM",
        "summary": {"pass_count": 4, "fail_count": 0, "review_count": 2, "total": 6, "total_requirements": 6},
        "highlight_issue": "Secondary OEM authorization and Class-II local content. Requires committee review.",
        "documents": {
            "audited_balance_sheet": "Bharat_Met_FY24.pdf"
        }
    },

    # ─── TND-2026-007: Centrifugal Process Pumps & Mechanical Seals (4 bids) ───
    {
        "id": "BID-019",
        "bid_submission_id": "BID/2026/0701-A",
        "tender_id": "TND-2026-007",
        "tender_number": "CPCL/PROC/2026/007",
        "tender_title": "Centrifugal Process Pumps & Mechanical Seals",
        "name": "Kirloskar Bros Ltd - CPCL Division",
        "contact_person": "S. Nair (Zonal Manager)",
        "email": "snair.cpcl@kirloskar.com",
        "phone": "+91 98001 23456",
        "location": "Pune, Maharashtra",
        "bid_amount": "₹ 2,75,00,000",
        "gstin": "27AAACK7890W1Z5",
        "pan": "AAACK7890W",
        "udyam": "UDYAM-MH-18-0001234",
        "epfo_code": "MH/PUN/0012345",
        "annual_turnover_cr": 250.0,
        "years_experience": 20.0,
        "experience_years": 20.0,
        "oem_status": "Direct OEM Principal Manufacturer",
        "local_content": 78.0,
        "local_content_pct": 78.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-01T09:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 100.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Premier pump manufacturer. All ATEX-certified specifications met.",
        "documents": {
            "audited_balance_sheet": "Kirloskar_FY24.pdf",
            "oem_cert": "KBL_OEM_Certification.pdf"
        }
    },
    {
        "id": "BID-020",
        "bid_submission_id": "BID/2026/0702-B",
        "tender_id": "TND-2026-007",
        "tender_number": "CPCL/PROC/2026/007",
        "tender_title": "Centrifugal Process Pumps & Mechanical Seals",
        "name": "Flowtech Pumps India Ltd",
        "contact_person": "Vivek Joshi (Director)",
        "email": "vivek@flowtechpumps.in",
        "phone": "+91 97002 23344",
        "location": "Ahmedabad, Gujarat",
        "bid_amount": "₹ 2,92,00,000",
        "gstin": "24AAAFP4567X1Z3",
        "pan": "AAAFP4567X",
        "udyam": "UDYAM-GJ-24-0045670",
        "epfo_code": "GJ/AHM/0056781",
        "annual_turnover_cr": 18.5,
        "years_experience": 12.0,
        "experience_years": 12.0,
        "oem_status": "Direct OEM Authorization - Grundfos / ITT",
        "local_content": 65.0,
        "local_content_pct": 65.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-02T10:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 94.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "ISO 9001 certified pump manufacturer. Meets all API 610 specifications.",
        "documents": {
            "audited_balance_sheet": "Flowtech_FY24.pdf"
        }
    },
    {
        "id": "BID-021",
        "bid_submission_id": "BID/2026/0703-C",
        "tender_id": "TND-2026-007",
        "tender_number": "CPCL/PROC/2026/007",
        "tender_title": "Centrifugal Process Pumps & Mechanical Seals",
        "name": "Hydro Dynamics Pvt Ltd",
        "contact_person": "Priya Subramaniam (CEO)",
        "email": "priya@hydrodynamics.in",
        "phone": "+91 96000 44556",
        "location": "Hyderabad, Telangana",
        "bid_amount": "₹ 3,10,00,000",
        "gstin": "36AAAHD2345Y1Z1",
        "pan": "AAAHD2345Y",
        "udyam": "UDYAM-TS-36-0056780",
        "epfo_code": "TS/HYD/0067891",
        "annual_turnover_cr": 7.3,
        "years_experience": 6.0,
        "experience_years": 6.0,
        "oem_status": "Secondary Distributor Authorization",
        "local_content": 45.0,
        "local_content_pct": 45.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-09-03T14:15:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "REQUIRES_REVIEW",
        "compliance_score": 80.0,
        "risk_level": "MEDIUM",
        "summary": {"pass_count": 4, "fail_count": 0, "review_count": 2, "total": 6, "total_requirements": 6},
        "highlight_issue": "Secondary OEM authorization and Class-II local content. EMD not confirmed.",
        "documents": {
            "audited_balance_sheet": "HydroDynamics_FY24.pdf"
        }
    },
    {
        "id": "BID-022",
        "bid_submission_id": "BID/2026/0704-D",
        "tender_id": "TND-2026-007",
        "tender_number": "CPCL/PROC/2026/007",
        "tender_title": "Centrifugal Process Pumps & Mechanical Seals",
        "name": "Southern Fluid Equipment Corp",
        "contact_person": "A. Rajasekhar (GM)",
        "email": "ar@southernfluid.com",
        "phone": "+91 99403 33221",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 2,65,00,000",
        "gstin": "33AAASF5678Z1Z2",
        "pan": "AAASF5678Z",
        "udyam": "UDYAM-TN-02-0078902",
        "epfo_code": "TN/MAS/0078903",
        "annual_turnover_cr": 4.8,
        "years_experience": 4.0,
        "experience_years": 4.0,
        "oem_status": "Direct OEM Tier 1 Authorization",
        "local_content": 57.0,
        "local_content_pct": 57.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-04T11:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 90.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "All criteria met. Competitive lowest L1 bid.",
        "documents": {
            "audited_balance_sheet": "SouthernFluid_FY24.pdf"
        }
    },

    # ─── TND-2026-008: Process Instrumentation & Control Systems (2 bids) ───
    {
        "id": "BID-023",
        "bid_submission_id": "BID/2026/0801-A",
        "tender_id": "TND-2026-008",
        "tender_number": "CPCL/PROC/2026/008",
        "tender_title": "Process Instrumentation & Control Systems",
        "name": "Control Systems India Ltd",
        "contact_person": "Dr. Ramesh Iyengar (CTO)",
        "email": "r.iyengar@controlsysindia.com",
        "phone": "+91 98120 11223",
        "location": "Bengaluru, Karnataka",
        "bid_amount": "₹ 12,50,00,000",
        "gstin": "29AAAAC1234A1Z4",
        "pan": "AAAAC1234A",
        "udyam": "UDYAM-KR-03-0089012",
        "epfo_code": "KN/BNG/0089012",
        "annual_turnover_cr": 45.0,
        "years_experience": 15.0,
        "experience_years": 15.0,
        "oem_status": "Direct OEM Authorization - Honeywell DCS / ABB",
        "local_content": 63.0,
        "local_content_pct": 63.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-05T09:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 98.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Leading DCS supplier. SIL-2 certified systems for hazardous area operations.",
        "documents": {
            "audited_balance_sheet": "CSIL_FY24.pdf",
            "oem_cert": "Honeywell_DCS_Auth.pdf"
        }
    },
    {
        "id": "BID-024",
        "bid_submission_id": "BID/2026/0802-B",
        "tender_id": "TND-2026-008",
        "tender_number": "CPCL/PROC/2026/008",
        "tender_title": "Process Instrumentation & Control Systems",
        "name": "InstroCon Systems Pvt Ltd",
        "contact_person": "Piyush Patel (MD)",
        "email": "piyush@instrocon.in",
        "phone": "+91 97000 88776",
        "location": "Gandhinagar, Gujarat",
        "bid_amount": "₹ 13,80,00,000",
        "gstin": "24AAAAI9012B1Z8",
        "pan": "AAAAI9012B",
        "udyam": "UDYAM-GJ-24-0012356",
        "epfo_code": "GJ/GAN/0023457",
        "annual_turnover_cr": 22.0,
        "years_experience": 10.0,
        "experience_years": 10.0,
        "oem_status": "Direct OEM Authorization - Yokogawa / Siemens",
        "local_content": 55.0,
        "local_content_pct": 55.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-05T11:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 93.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Yokogawa and Siemens certified integrator. Meets all CPCL SCADA requirements.",
        "documents": {
            "audited_balance_sheet": "InstroCon_FY24.pdf"
        }
    },

    # ─── TND-2026-011: Electrical Transformers & Switchgear (4 bids) ───
    {
        "id": "BID-025",
        "bid_submission_id": "BID/2026/1101-A",
        "tender_id": "TND-2026-011",
        "tender_number": "CPCL/PROC/2026/011",
        "tender_title": "Electrical Transformers & Switchgear",
        "name": "BHEL Power Systems Ltd",
        "contact_person": "K. Rajendra Prasad (DGM)",
        "email": "krp@bhel.in",
        "phone": "+91 98001 99887",
        "location": "Bhopal, Madhya Pradesh",
        "bid_amount": "₹ 18,50,00,000",
        "gstin": "23AAABB9012C1Z6",
        "pan": "AAABB9012C",
        "udyam": "UDYAM-MP-23-0001234",
        "epfo_code": "MP/BPL/0012345",
        "annual_turnover_cr": 980.0,
        "years_experience": 50.0,
        "experience_years": 50.0,
        "oem_status": "Direct OEM Principal Manufacturer",
        "local_content": 82.0,
        "local_content_pct": 82.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-02T09:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 100.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "PSU manufacturer with 50+ years experience. IS/IEC certified.",
        "documents": {
            "audited_balance_sheet": "BHEL_FY24_CPCL.pdf"
        }
    },
    {
        "id": "BID-026",
        "bid_submission_id": "BID/2026/1102-B",
        "tender_id": "TND-2026-011",
        "tender_number": "CPCL/PROC/2026/011",
        "tender_title": "Electrical Transformers & Switchgear",
        "name": "Voltamp Transformers Ltd",
        "contact_person": "Hemant Shah (MD)",
        "email": "hshah@voltamp.in",
        "phone": "+91 98006 77889",
        "location": "Makarpura, Gujarat",
        "bid_amount": "₹ 17,20,00,000",
        "gstin": "24AAABV6789D1Z3",
        "pan": "AAABV6789D",
        "udyam": "UDYAM-GJ-24-0078901",
        "epfo_code": "GJ/VDR/0089012",
        "annual_turnover_cr": 85.0,
        "years_experience": 40.0,
        "experience_years": 40.0,
        "oem_status": "Direct OEM Principal Manufacturer",
        "local_content": 79.0,
        "local_content_pct": 79.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-03T10:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 97.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Leading transformer manufacturer. All IS 2026 specifications verified.",
        "documents": {
            "audited_balance_sheet": "Voltamp_FY24.pdf"
        }
    },
    {
        "id": "BID-027",
        "bid_submission_id": "BID/2026/1103-C",
        "tender_id": "TND-2026-011",
        "tender_number": "CPCL/PROC/2026/011",
        "tender_title": "Electrical Transformers & Switchgear",
        "name": "Schneider Electric India Pvt Ltd",
        "contact_person": "Anand Kumar (Regional Sales Director)",
        "email": "anand.kumar@schneider-electric.com",
        "phone": "+91 98003 44556",
        "location": "Bengaluru, Karnataka",
        "bid_amount": "₹ 19,80,00,000",
        "gstin": "29AAABS7890E1Z7",
        "pan": "AAABS7890E",
        "udyam": "UDYAM-KR-03-0023456",
        "epfo_code": "KN/BNG/0056781",
        "annual_turnover_cr": 3200.0,
        "years_experience": 30.0,
        "experience_years": 30.0,
        "oem_status": "Direct OEM Principal Manufacturer",
        "local_content": 55.0,
        "local_content_pct": 55.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-04T09:00:00Z",
        "status": "UNDER_VERIFICATION",
        "verification_status": "PROCESSING",
        "compliance_status": "COMPLIANT",
        "compliance_score": 95.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "MNC with global reference. ATEX Zone 1/2 certified switchgear.",
        "documents": {
            "audited_balance_sheet": "Schneider_IN_FY24.pdf"
        }
    },
    {
        "id": "BID-028",
        "bid_submission_id": "BID/2026/1104-D",
        "tender_id": "TND-2026-011",
        "tender_number": "CPCL/PROC/2026/011",
        "tender_title": "Electrical Transformers & Switchgear",
        "name": "Star Power Equipment Ltd",
        "contact_person": "A. Balakrishnan (MD)",
        "email": "ab@starpowerequip.in",
        "phone": "+91 96004 55678",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 16,90,00,000",
        "gstin": "33AAAST3456F1Z9",
        "pan": "AAAST3456F",
        "udyam": "UDYAM-TN-02-0034567",
        "epfo_code": "TN/MAS/0034567",
        "annual_turnover_cr": 15.0,
        "years_experience": 12.0,
        "experience_years": 12.0,
        "oem_status": "Direct OEM Authorization - ABB / Siemens",
        "local_content": 62.0,
        "local_content_pct": 62.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-05T12:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 91.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "All mandatory criteria cleared. Competitive L2 bid.",
        "documents": {
            "audited_balance_sheet": "StarPower_FY24.pdf"
        }
    },
    {
        "id": "BID-029",
        "bid_submission_id": "BID/2026/1201-A",
        "tender_id": "TND-2026-012",
        "tender_number": "CPCL/PROC/2026/012",
        "tender_title": "High-Voltage Transformers & Switchgear Package",
        "name": "Bharat Heavy Power Transformers Ltd",
        "contact_person": "K. V. Ramamoorthy (VP Projects)",
        "email": "kv.ram@bhpt.co.in",
        "phone": "+91 94441 23456",
        "location": "Vadodara, Gujarat",
        "bid_amount": "₹ 9,15,00,000",
        "gstin": "24AAACB1234F1Z8",
        "pan": "AAACB1234F",
        "udyam": "UDYAM-GJ-01-0012345",
        "epfo_code": "GJ/BRD/0012345",
        "annual_turnover_cr": 145.0,
        "years_experience": 22.0,
        "experience_years": 22.0,
        "oem_status": "Original Equipment Manufacturer (Direct OEM)",
        "local_content": 82.0,
        "local_content_pct": 82.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-08T10:30:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 98.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Direct OEM manufacturer with CPCL & IOCL grid approvals.",
        "documents": {
            "audited_balance_sheet": "BHPT_BalanceSheet_FY24.pdf",
            "oem_cert": "BHPT_OEM_Registration.pdf"
        }
    },
    {
        "id": "BID-030",
        "bid_submission_id": "BID/2026/1202-B",
        "tender_id": "TND-2026-012",
        "tender_number": "CPCL/PROC/2026/012",
        "tender_title": "High-Voltage Transformers & Switchgear Package",
        "name": "VoltTech Switchgears India Pvt Ltd",
        "contact_person": "S. Sundararajan (Technical Director)",
        "email": "sundar@volttechindia.com",
        "phone": "+91 98401 87654",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 9,42,00,000",
        "gstin": "33AAACV9876E1Z5",
        "pan": "AAACV9876E",
        "udyam": "UDYAM-TN-02-0098765",
        "epfo_code": "TN/MAS/0098765",
        "annual_turnover_cr": 48.0,
        "years_experience": 14.0,
        "experience_years": 14.0,
        "oem_status": "Direct OEM Authorization - ABB GIS Switchgear",
        "local_content": 68.0,
        "local_content_pct": 68.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-09T14:15:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 94.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Complete GIS substation type-test reports provided.",
        "documents": {
            "audited_balance_sheet": "VoltTech_FY24.pdf"
        },
        "is_draft": False
    },

    # ─── TND-2026-010: Cryogenic Storage Tanks & Vaporizer Units (1 submitted bid) ───
    {
        "id": "BID-031",
        "bid_submission_id": "BID/2026/1001-A",
        "tender_id": "TND-2026-010",
        "tender_number": "CPCL/PROC/2026/010",
        "tender_title": "Cryogenic Storage Tanks & Vaporizer Units",
        "name": "CryoGas India Systems Ltd",
        "contact_person": "P. N. Raman (General Manager)",
        "email": "pn.raman@cryogasindia.com",
        "phone": "+91 98402 33445",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 12,40,00,000",
        "gstin": "33AAACC3456D1Z2",
        "pan": "AAACC3456D",
        "udyam": "UDYAM-TN-02-0056789",
        "epfo_code": "TN/MAS/0056789",
        "annual_turnover_cr": 35.0,
        "years_experience": 15.0,
        "experience_years": 15.0,
        "oem_status": "Direct OEM Manufacturer - ASME Section VIII Div 1",
        "local_content": 75.0,
        "local_content_pct": 75.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2026-09-07T11:00:00Z",
        "status": "SUBMITTED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 96.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "ASME cryogenic vessel manufacturing authorization with CCOE / PESO approval.",
        "documents": {
            "audited_balance_sheet": "CryoGas_FY24.pdf"
        },
        "is_draft": False
    },

    # ─── TND-2026-007: Centrifugal Process Pumps Draft Bid (Sample Vendor Draft) ───
    {
        "id": "BID-032",
        "bid_submission_id": "BID/2026/0705-E",
        "tender_id": "TND-2026-007",
        "tender_number": "CPCL/PROC/2026/007",
        "tender_title": "Centrifugal Process Pumps & Mechanical Seals",
        "name": "Delta Pumps India Ltd",
        "contact_person": "R. Anand (Business Development)",
        "email": "anand@deltapumps.in",
        "phone": "+91 98403 99887",
        "location": "Coimbatore, Tamil Nadu",
        "bid_amount": "₹ 3,25,00,000",
        "gstin": "33AAACD6789E1Z4",
        "pan": "AAACD6789E",
        "udyam": "UDYAM-TN-03-0067890",
        "epfo_code": "TN/CBE/0067890",
        "annual_turnover_cr": 8.0,
        "years_experience": 5.0,
        "experience_years": 5.0,
        "oem_status": "Authorized Distributor",
        "local_content": 50.0,
        "local_content_pct": 50.0,
        "is_debarred": False,
        "emd_paid": False,
        "submitted_at": "2026-09-05T12:00:00Z",
        "status": "DRAFT",
        "verification_status": "PENDING",
        "compliance_status": "PENDING",
        "compliance_score": 0.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 0, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Draft submission in preparation by vendor.",
        "documents": {},
        "is_draft": True
    },

    # ─── TND-2024-001: Past Closed Tender CPCL/PROC/SAFETY/2024/09 (3 completed bids) ───
    {
        "id": "BID-033",
        "bid_submission_id": "BID/2024/0901-A",
        "tender_id": "TND-2024-001",
        "tender_number": "CPCL/PROC/SAFETY/2024/09",
        "tender_title": "Annual Rate Contract for Refinery Personal Protective Equipment",
        "name": "Karam Safety Private Limited",
        "contact_person": "Ashok Kumar (Regional Head)",
        "email": "ashok@karam.in",
        "phone": "+91 98110 54321",
        "location": "Lucknow, Uttar Pradesh",
        "bid_amount": "₹ 1,85,00,000",
        "gstin": "09AAACK1234F1Z8",
        "pan": "AAACK1234F",
        "udyam": "UDYAM-UP-01-0098765",
        "epfo_code": "UP/LKO/0098765",
        "annual_turnover_cr": 120.0,
        "years_experience": 18.0,
        "experience_years": 18.0,
        "oem_status": "Direct OEM Manufacturer",
        "local_content": 85.0,
        "local_content_pct": 85.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2024-09-12T11:00:00Z",
        "status": "COMPLETED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 98.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Contract awarded in FY24 procurement cycle.",
        "documents": {},
        "is_draft": False
    },
    {
        "id": "BID-034",
        "bid_submission_id": "BID/2024/0902-B",
        "tender_id": "TND-2024-001",
        "tender_number": "CPCL/PROC/SAFETY/2024/09",
        "tender_title": "Annual Rate Contract for Refinery Personal Protective Equipment",
        "name": "Udyogi International Pvt Ltd",
        "contact_person": "R. K. Sengupta (Director)",
        "email": "rk.sengupta@udyogi.net",
        "phone": "+91 98300 12345",
        "location": "Kolkata, West Bengal",
        "bid_amount": "₹ 1,92,00,000",
        "gstin": "19AAACU5678G1Z3",
        "pan": "AAACU5678G",
        "udyam": "UDYAM-WB-10-0045678",
        "epfo_code": "WB/KOL/0045678",
        "annual_turnover_cr": 45.0,
        "years_experience": 12.0,
        "experience_years": 12.0,
        "oem_status": "Direct OEM Manufacturer",
        "local_content": 70.0,
        "local_content_pct": 70.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2024-09-13T14:30:00Z",
        "status": "COMPLETED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 92.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 6, "fail_count": 0, "review_count": 0, "total": 6, "total_requirements": 6},
        "highlight_issue": "Past evaluated L2 bid for FY24 cycle.",
        "documents": {},
        "is_draft": False
    },
    {
        "id": "BID-035",
        "bid_submission_id": "BID/2024/0903-C",
        "tender_id": "TND-2024-001",
        "tender_number": "CPCL/PROC/SAFETY/2024/09",
        "tender_title": "Annual Rate Contract for Refinery Personal Protective Equipment",
        "name": "SureSafe Industrial Solutions",
        "contact_person": "V. Murugesan (Partner)",
        "email": "sales@suresafe.in",
        "phone": "+91 94440 98765",
        "location": "Chennai, Tamil Nadu",
        "bid_amount": "₹ 2,05,00,000",
        "gstin": "33AAASS8901H1Z1",
        "pan": "AAASS8901H",
        "udyam": "UDYAM-TN-02-0078901",
        "epfo_code": "TN/MAS/0078901",
        "annual_turnover_cr": 15.0,
        "years_experience": 8.0,
        "experience_years": 8.0,
        "oem_status": "Authorized Channel Partner",
        "local_content": 60.0,
        "local_content_pct": 60.0,
        "is_debarred": False,
        "emd_paid": True,
        "submitted_at": "2024-09-14T16:00:00Z",
        "status": "COMPLETED",
        "verification_status": "AUTHENTICATED",
        "compliance_status": "COMPLIANT",
        "compliance_score": 88.0,
        "risk_level": "LOW",
        "summary": {"pass_count": 5, "fail_count": 0, "review_count": 1, "total": 6, "total_requirements": 6},
        "highlight_issue": "Past evaluated L3 bid for FY24 cycle.",
        "documents": {},
        "is_draft": False
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

# Live Mutable Operational Data Stores
# In standard operational mode (DEMO_MODE=false), stores initialize empty to host real database procurement data.
# In demo mode (DEMO_MODE=true), stores pre-populate with the seed datasets above.
SAMPLE_TENDERS: List[Dict[str, Any]] = copy.deepcopy(DEMO_TENDERS) if DEMO_MODE else []
SAMPLE_BIDDERS: List[Dict[str, Any]] = copy.deepcopy(DEMO_BIDDERS) if DEMO_MODE else []
SAMPLE_BIDDER_BIDS: List[Dict[str, Any]] = []

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
    Also ensures tender has requirements populated for evaluation.
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
    if not tender_copy.get("requirements") and is_demo_mode():
        tender_copy["requirements"] = [
            {
                "id": "REQ-001",
                "code": "TURNOVER",
                "clause": "Clause 3.1.2",
                "clause_reference": "Section III, Clause 3.1",
                "category": "FINANCIAL",
                "title": "Minimum Average Annual Financial Turnover",
                "description": "Average Annual Financial Turnover during the last 3 financial years ending 31st March.",
                "threshold": 3.0,
                "threshold_value": ">= ₹3.00 Cr",
                "unit": "Crore INR",
                "mandatory": True,
                "scoring_weight": 20.0
            },
            {
                "id": "REQ-002",
                "code": "EXPERIENCE",
                "clause": "Clause 4.2.3",
                "clause_reference": "Section III, Clause 4.2",
                "category": "TECHNICAL",
                "title": "Past Experience in PSU / Hydrocarbon Sector",
                "description": "Bidder must have completed similar supply contracts in CPCL, IOCL, BPCL, ONGC in last 5 years.",
                "threshold": 3,
                "threshold_value": ">= 3 Years / Orders",
                "unit": "Contracts",
                "mandatory": True,
                "scoring_weight": 20.0
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
                "mandatory": True,
                "scoring_weight": 15.0
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
                "mandatory": True,
                "scoring_weight": 15.0
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
                "mandatory": True,
                "scoring_weight": 15.0
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
                "mandatory": True,
                "scoring_weight": 15.0
            }
        ]
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

_tender_number_lock = threading.Lock()

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
    """
    Scans all tenders in the registry and returns the highest integer sequence for the specified year.
    Matches formats:
    - CPCL/PROC/2026/011 -> 11
    - CPCL/PROC/SAFETY/2024/09 -> 9
    - TND-2026-011 -> 11
    """
    highest = 0
    year_str = str(year)
    for t in SAMPLE_TENDERS:
        for field in ("tender_number", "ref", "tender_id", "id"):
            val = t.get(field)
            if val and isinstance(val, str):
                # Pattern: CPCL/PROC/.../2026/012 or CPCL/PROC/2026/012
                m = re.search(r'CPCL/PROC/(?:[A-Z0-9_-]+/)?' + re.escape(year_str) + r'/(\d+)', val, re.IGNORECASE)
                if m:
                    try:
                        seq = int(m.group(1))
                        if seq > highest:
                            highest = seq
                    except ValueError:
                        pass
                # Pattern: TND-2026-012 or TND-2026/012
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
    """
    Returns the next available sequential Tender ID and preview metadata without consuming or saving it.
    Format: CPCL/PROC/{YEAR}/{NUMBER:03d} (e.g. CPCL/PROC/2026/012)
    """
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
    """
    Thread-safe generator that atomically calculates and reserves the next unique sequential Tender ID.
    Guarantees that concurrent requests receive distinct incremented numbers without duplicate collision.
    """
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

        # If no custom valid tender_number provided or if auto/placeholder passed, generate sequential ID
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
            # Check duplicate if tender_number is being changed
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
    """
    Extends or updates the submission deadline of an active/published tender.
    Thread-safe, validates future timestamp, appends to deadline_history,
    and logs immutable TENDER_DEADLINE_UPDATED audit log.
    """
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
    """
    Closes an active tender and seals its bidding archive.
    Thread-safe, transitions status to CLOSED, records closed_at/closed_by,
    and logs immutable TENDER_CLOSED audit log.
    """
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
    """
    Lifecycle-aware tender deletion.
    - DRAFT with no dependent records: hard delete.
    - Any other status: raises ValueError with appropriate message.
    - If bids/compliance records reference the tender: raises ValueError.
    Returns the deleted tender record on success.
    """
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

        # Check for dependent bid records
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

        # Safe to permanently delete
        for i, t in enumerate(SAMPLE_TENDERS):
            if (t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id):
                SAMPLE_TENDERS.pop(i)
                return tender

        raise KeyError(f"Tender '{tender_id}' not found during removal.")

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
    target_tender_id = bid_data.get("tender_id")
    target_tender_num = bid_data.get("tender_number")
    bidder_id = bid_data.get("bidder_id")
    is_draft = bid_data.get("is_draft") is True or bid_data.get("status") == "DRAFT"
    status_str = "DRAFT" if is_draft else bid_data.get("status", "SUBMITTED")

    # Resolve tender title if missing
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

    # Resolve bidder profile details if available
    bidder_name = bid_data.get("name")
    if not bidder_name and bidder_id:
        b_profile = get_bidder_by_id(bidder_id)
        if b_profile:
            bidder_name = b_profile.get("name")
    bid_data["name"] = bidder_name or "Authorized Bidder"

    # Avoid duplicate entries in SAMPLE_BIDDER_BIDS
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

    # Synchronize with SAMPLE_BIDDERS so the officer portal updates in real time
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
            "gstin": bid_data.get("gstin", "33AABCA1234F1Z5"),
            "pan": bid_data.get("pan", "AABCA1234F"),
            "udyam": bid_data.get("udyam", "UDYAM-TN-02-0012345"),
            "epfo_code": bid_data.get("epfo_code", "TN/MAS/0012345"),
            "annual_turnover_cr": float(bid_data.get("annual_turnover_cr", 5.0)),
            "years_experience": float(bid_data.get("years_experience", 5.0)),
            "experience_years": float(bid_data.get("years_experience", 5.0)),
            "oem_status": bid_data.get("oem_status", "Direct OEM Authorization"),
            "local_content": float(bid_data.get("local_content", 65.0)),
            "local_content_pct": float(bid_data.get("local_content", 65.0)),
            "is_debarred": False,
            "emd_paid": not is_draft,
            "submitted_at": submitted_ts,
            "status": status_str,
            "verification_status": "PENDING" if is_draft else bid_data.get("verification_status", "PROCESSING"),
            "compliance_status": "PENDING" if is_draft else bid_data.get("compliance_status", "REVIEW_REQUIRED"),
            "compliance_score": 0.0 if is_draft else float(bid_data.get("compliance_score", 85.0)),
            "risk_level": "LOW",
            "summary": {"pass_count": 0 if is_draft else 5, "fail_count": 0, "review_count": 0 if is_draft else 1, "total": 6, "total_requirements": 6},
            "highlight_issue": "Draft submission in preparation by vendor." if is_draft else "Submitted via Bidder Self-Service Portal.",
            "documents": {},
            "is_draft": is_draft
        }
        SAMPLE_BIDDERS.append(new_bidder_entry)

    # If this was a formal submission, log an audit trail event
    if not is_draft:
        add_audit_log({
            "user_email": bid_data.get("email", "bidder@vendor.com"),
            "user_role": "BIDDER",
            "action": "BID_SUBMISSION",
            "entity_type": "TENDER",
            "entity_id": target_tender_num or target_tender_id or "CPCL-TENDER",
            "details": f"Formal bid submitted by {bid_data.get('name', 'Vendor')} for {tender_title or target_tender_num or target_tender_id} (Amount: {bid_data.get('bid_amount', 'N/A')}).",
            "status": "SUCCESS"
        })

    return bid_data

def get_recent_bid_activities(limit: int = 10) -> List[Dict[str, Any]]:
    """
    Returns the most recent formally submitted bids as structured activity items,
    ordered by submission timestamp (newest first).
    Excludes DRAFT, CANCELLED, and WITHDRAWN bids.
    """
    submitted_bids = [b for b in SAMPLE_BIDDERS if is_submitted_bid(b)]

    # Sort descending by submitted_at timestamp (newest first)
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
            "tender_title": tender_title or "Industrial Procurement Package",
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
    # Only submitted bids across the system are counted for officer dashboard stats
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

DEMO_NOTIFICATIONS: List[Dict[str, Any]] = [
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

SAMPLE_NOTIFICATIONS: List[Dict[str, Any]] = copy.deepcopy(DEMO_NOTIFICATIONS) if DEMO_MODE else []

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

# Seed Audit Logs (Used when DEMO_MODE=true)
DEMO_AUDIT_LOGS: List[Dict[str, Any]] = [
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

# Immutable Operational Audit Trail Data Store
SAMPLE_AUDIT_LOGS: List[Dict[str, Any]] = copy.deepcopy(DEMO_AUDIT_LOGS) if DEMO_MODE else []

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
SAMPLE_ANALYSIS_JOBS: Dict[str, Dict[str, Any]] = {}

def create_analysis_job(job_dict: Dict[str, Any]) -> Dict[str, Any]:
    job_id = job_dict.get("job_id") or f"JOB-AI-{len(SAMPLE_ANALYSIS_JOBS) + 1:03d}"
    job_dict["job_id"] = job_id
    if not job_dict.get("created_at"):
        job_dict["created_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    SAMPLE_ANALYSIS_JOBS[job_id] = job_dict

    # Also key by tender_id if present
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

    # Store original data if not already captured
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

    # Apply updates
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

    tid = target_tender_id or job.get("tender_id") or "TND-2026-001"
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

    # Convert to standard tender requirement format
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

        # Update in SAMPLE_TENDERS directly
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
# Environment State Management & Seeding Utilities
# ─────────────────────────────────────────────────────────────────────────────
def is_demo_mode() -> bool:
    """Returns whether the centralized DEMO_MODE toggle is active."""
    return DEMO_MODE


def reset_to_demo_data() -> None:
    """
    Populates operational stores with the authentic 12 CPCL demo tenders,
    35 demo bidders, and seed audit logs for testing or development.
    """
    global SAMPLE_TENDERS, SAMPLE_BIDDERS, SAMPLE_BIDDER_BIDS, SAMPLE_AUDIT_LOGS, SAMPLE_NOTIFICATIONS, SAMPLE_ANALYSIS_JOBS
    with _tender_number_lock:
        SAMPLE_TENDERS.clear()
        SAMPLE_TENDERS.extend(copy.deepcopy(DEMO_TENDERS))
        SAMPLE_BIDDERS.clear()
        SAMPLE_BIDDERS.extend(copy.deepcopy(DEMO_BIDDERS))
        SAMPLE_BIDDER_BIDS.clear()
        SAMPLE_AUDIT_LOGS.clear()
        SAMPLE_AUDIT_LOGS.extend(copy.deepcopy(DEMO_AUDIT_LOGS))
        SAMPLE_NOTIFICATIONS.clear()
        SAMPLE_NOTIFICATIONS.extend(copy.deepcopy(DEMO_NOTIFICATIONS))
        SAMPLE_ANALYSIS_JOBS.clear()


def clear_all_procurement_data() -> None:
    """
    Resets all operational procurement records (tenders, bidders, logs)
    to empty state while keeping authenticated officer credentials intact.
    """
    global SAMPLE_TENDERS, SAMPLE_BIDDERS, SAMPLE_BIDDER_BIDS, SAMPLE_AUDIT_LOGS, SAMPLE_NOTIFICATIONS, SAMPLE_ANALYSIS_JOBS
    with _tender_number_lock:
        SAMPLE_TENDERS.clear()
        SAMPLE_BIDDERS.clear()
        SAMPLE_BIDDER_BIDS.clear()
        SAMPLE_AUDIT_LOGS.clear()
        SAMPLE_NOTIFICATIONS.clear()
        SAMPLE_ANALYSIS_JOBS.clear()


