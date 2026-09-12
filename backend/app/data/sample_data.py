"""
BidSure AI Sample & In-Memory Data Store
Provides realistic mock tenders, bidders, and compliance records for CPCL evaluation workflows.
"""
from typing import Dict, List, Any, Optional

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

SAMPLE_TENDERS: List[Dict[str, Any]] = [
    {
        "id": "TND-2024-001",
        "tender_number": "CPCL/PROC/SAFETY/2024/09",
        "title": "Supply and Maintenance of High-Grade Industrial Safety & Fire Protection Equipment",
        "department": "Fire & Safety Department, Manali Refinery",
        "status": "EVALUATING",
        "estimated_value": 45000000.0,  # ₹4.50 Cr
        "emd_amount": 900000.0,         # ₹9.00 Lakhs
        "publish_date": "2024-07-01T09:00:00Z",
        "closing_date": "2024-08-30T17:30:00Z",
        "category": "Goods & Safety Systems",
        "description": "Annual contract for supply of certified flame-resistant coveralls, SCBA breathing apparatus, chemical safety helmets, and fall protection harnesses.",
        "requirements": [
            {
                "id": "REQ-001",
                "clause": "Clause 4.1.1",
                "category": "FINANCIAL",
                "title": "Average Annual Financial Turnover",
                "description": "Bidder must have minimum average annual financial turnover of ₹3.00 Crore during last 3 financial years.",
                "threshold": 3.0,
                "unit": "Crore INR",
                "mandatory": True
            },
            {
                "id": "REQ-002",
                "clause": "Clause 4.2.3",
                "category": "TECHNICAL",
                "title": "Past Experience in PSU / Hydrocarbon Sector",
                "description": "Bidder must have completed at least 3 similar contracts in CPCL, IOCL, BPCL, ONGC in last 5 years.",
                "threshold": 3,
                "unit": "Contracts",
                "mandatory": True
            },
            {
                "id": "REQ-003",
                "clause": "Clause 5.1.0",
                "category": "OEM_AUTHORIZATION",
                "title": "Direct OEM Authorization Certificate",
                "description": "Direct OEM Authorization letter specifically for this CPCL Tender.",
                "threshold": 1,
                "unit": "Authorization Letter",
                "mandatory": True
            },
            {
                "id": "REQ-004",
                "clause": "Clause 6.3.2",
                "category": "STATUTORY",
                "title": "Make In India (MII) Local Content Declaration",
                "description": "Minimum 50% Local Content requirement for Class-I Local Supplier status.",
                "threshold": 50.0,
                "unit": "Percentage",
                "mandatory": True
            },
            {
                "id": "REQ-005",
                "clause": "Clause 2.4.0",
                "category": "STATUTORY",
                "title": "GSTIN Registration & Compliance",
                "description": "Valid Goods and Services Tax Identification Number (GSTIN).",
                "threshold": 1,
                "unit": "Registration",
                "mandatory": True
            },
            {
                "id": "REQ-006",
                "clause": "Clause 7.1.1",
                "category": "VIGILANCE",
                "title": "Debarment & Vigilance Integrity Clearance",
                "description": "Bidder must not be under any active debarment or blacklisting by CVC, CPCL, GeM.",
                "threshold": 0,
                "unit": "Debarments",
                "mandatory": True
            }
        ]
    },
    {
        "id": "TND-2024-002",
        "tender_number": "CPCL/PROC/MECH/2024/14",
        "title": "Supply of High-Pressure Seamless Alloy Pipes & Flanges for Crude Distillation Unit",
        "department": "Mechanical Engineering Division",
        "status": "ACTIVE",
        "estimated_value": 82000000.0,  # ₹8.20 Cr
        "emd_amount": 1640000.0,
        "publish_date": "2024-07-15T10:00:00Z",
        "closing_date": "2024-09-15T15:00:00Z",
        "category": "Mechanical & Piping",
        "description": "Supply of ASTM A335 Grade P91 seamless pipes and associated fitting accessories with EN 10204 3.2 inspection certificates.",
        "requirements": [
            {
                "id": "REQ-MECH-01",
                "clause": "Clause 3.1.2",
                "category": "FINANCIAL",
                "title": "Minimum Annual Turnover",
                "description": "Bidder must have average annual turnover >= ₹5.00 Crore in the last 3 financial years.",
                "threshold": 5.0,
                "unit": "Crore INR",
                "mandatory": True
            },
            {
                "id": "REQ-MECH-02",
                "clause": "Clause 4.0.1",
                "category": "STATUTORY",
                "title": "ISO 9001:2015 Quality Certification",
                "description": "Valid ISO 9001:2015 certification for manufacturing / stockist operations.",
                "threshold": 1,
                "unit": "Certificate",
                "mandatory": True
            },
            {
                "id": "REQ-MECH-03",
                "clause": "Clause 5.2.1",
                "category": "TECHNICAL",
                "title": "IBR (Indian Boiler Regulations) Well-Known Stockist Approval",
                "description": "Valid IBR Form II certificate approved by Chief Inspector of Boilers.",
                "threshold": 1,
                "unit": "Certificate",
                "mandatory": True
            },
            {
                "id": "REQ-MECH-04",
                "clause": "Clause 6.1.0",
                "category": "STATUTORY",
                "title": "Make in India (MII) Local Content >= 50%",
                "description": "Minimum 50% domestic value addition certificate.",
                "threshold": 50.0,
                "unit": "Percentage",
                "mandatory": True
            }
        ]
    },
    {
        "id": "TND-2024-003",
        "tender_number": "CPCL/PROC/INST/2024/22",
        "title": "Annual Maintenance & Upgradation Contract for Process Automation DCS & Field Transmitters",
        "department": "Instrumentation & Control Division",
        "status": "ACTIVE",
        "estimated_value": 24000000.0,  # ₹2.40 Cr
        "emd_amount": 480000.0,
        "publish_date": "2024-08-01T10:00:00Z",
        "closing_date": "2024-10-15T17:00:00Z",
        "category": "Automation & Instrumentation",
        "description": "Comprehensive maintenance and OEM calibrated spares replacement for Honeywell Experion DCS and Emerson Rosemount pressure/flow transmitters at Manali Refinery.",
        "requirements": [
            {
                "id": "REQ-INST-01",
                "clause": "Clause 2.1.0",
                "category": "FINANCIAL",
                "title": "Annual Turnover",
                "description": "Minimum average turnover of ₹1.50 Crore during past 3 years.",
                "threshold": 1.5,
                "unit": "Crore INR",
                "mandatory": True
            },
            {
                "id": "REQ-INST-02",
                "clause": "Clause 3.4.2",
                "category": "OEM_AUTHORIZATION",
                "title": "Authorized DCS System Integrator Certificate",
                "description": "Direct System Integrator authorization from Honeywell / Emerson.",
                "threshold": 1,
                "unit": "Authorization",
                "mandatory": True
            },
            {
                "id": "REQ-INST-03",
                "clause": "Clause 4.1.1",
                "category": "TECHNICAL",
                "title": "Hydrocarbon Refinery Automation Experience",
                "description": "At least 2 completed AMC contracts in PSU petroleum refineries.",
                "threshold": 2,
                "unit": "Contracts",
                "mandatory": True
            }
        ]
    }
]

# Separate Multi-Bid Storage for Bidders
SAMPLE_BIDDER_BIDS: List[Dict[str, Any]] = [
    {
        "id": "BID-DOC-001",
        "bidder_id": "BID-001",
        "tender_id": "TND-2024-001",
        "tender_number": "CPCL/PROC/SAFETY/2024/09",
        "tender_title": "Supply and Maintenance of High-Grade Industrial Safety & Fire Protection Equipment",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "bid_amount": "₹ 4,42,00,000",
        "submission_date": "2024-08-20T14:30:00Z",
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
        "tender_id": "TND-2024-002",
        "tender_number": "CPCL/PROC/MECH/2024/14",
        "tender_title": "Supply of High-Pressure Seamless Alloy Pipes & Flanges for Crude Distillation Unit",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "bid_amount": "₹ 8,10,00,000",
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
        "tender_id": "TND-2024-003",
        "tender_number": "CPCL/PROC/INST/2024/22",
        "tender_title": "Annual Maintenance & Upgradation Contract for Process Automation DCS & Field Transmitters",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "bid_amount": "₹ 2,15,00,000",
        "submission_date": "2024-09-02T11:20:00Z",
        "status": "UNDER_VERIFICATION",
        "verification_status": "PROCESSING",
        "compliance_status": "REVIEW_REQUIRED",
        "compliance_score": 80.0,
        "passed_rules": 2,
        "total_rules": 3,
        "is_draft": False
    }
]

SAMPLE_BIDDERS: List[Dict[str, Any]] = [
    {
        "id": "BID-001",
        "tender_id": "TND-2024-001",
        "name": "ABC Safety Solutions Pvt Ltd",
        "email": "abc@abcsafety.com",
        "phone": "+91 98765 43210",
        "gstin": "33AABCA1234F1Z5",
        "pan": "AABCA1234F",
        "udyam": "UDYAM-TN-02-0012345",
        "epfo_code": "TN/MAS/0099881",
        "annual_turnover_cr": 4.5,
        "years_experience": 5,
        "oem_authorization": "Direct OEM Tier 1 Authorization - Karam / Honeywell",
        "local_content": 65.0,
        "emd_paid": False,  # Exempted under MSME Udyam
        "submission_date": "2024-08-20T14:30:00Z",
        "status": "COMPLIANT",
        "score": 100.0,
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
        "tender_id": "TND-2024-001",
        "name": "SecureTech Industries Ltd",
        "email": "contact@securetechind.com",
        "phone": "+91 98220 11223",
        "gstin": "27AAACT5678B1Z2",
        "pan": "AAACT5678B",
        "udyam": "UDYAM-MH-18-0098765",
        "epfo_code": "MH/BAN/0011223",
        "annual_turnover_cr": 2.2,  # Below ₹3.0 Cr requirement
        "years_experience": 2,      # Below 3 contracts
        "oem_authorization": "Direct OEM Tier 1 Authorization",
        "local_content": 52.0,
        "emd_paid": False,
        "submission_date": "2024-08-22T11:15:00Z",
        "status": "NON_COMPLIANT",
        "score": 66.7,
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
        "tender_id": "TND-2024-001",
        "name": "SafeGuard Equipments Pvt Ltd",
        "email": "tenders@safeguardequip.com",
        "phone": "+91 94440 55667",
        "gstin": "29AABCS9012D1Z8",
        "pan": "AABCS9012D",
        "udyam": "UDYAM-KR-03-0045678",
        "epfo_code": "KN/BNG/0067890",
        "annual_turnover_cr": 3.8,
        "years_experience": 4,
        "oem_authorization": "Secondary Distributor Authorization Letter", # Requires Review
        "local_content": 35.0,  # Class-II (Requires Review)
        "emd_paid": False,
        "submission_date": "2024-08-24T16:45:00Z",
        "status": "REQUIRES_REVIEW",
        "score": 83.3,
        "documents": {
            "audited_balance_sheet": "SafeGuard_Audited_Accounts_2024.pdf",
            "experience_cert": "Past_Contracts_BPCL_HPCL.pdf",
            "oem_cert": "Secondary_Distributor_Letter.pdf",
            "local_content_cert": "MII_Self_Declaration.pdf",
            "udyam_cert": "Udyam_KR.pdf"
        }
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

def get_all_tenders() -> List[Dict[str, Any]]:
    return SAMPLE_TENDERS

def get_tender_by_id(tender_id: str) -> Optional[Dict[str, Any]]:
    for t in SAMPLE_TENDERS:
        if t["id"] == tender_id:
            return t
    return None

def get_all_bidders() -> List[Dict[str, Any]]:
    return SAMPLE_BIDDERS

def get_bidders_for_tender(tender_id: str) -> List[Dict[str, Any]]:
    return [b for b in SAMPLE_BIDDERS if b.get("tender_id") == tender_id]

def get_bidder_by_id(bidder_id: str) -> Optional[Dict[str, Any]]:
    for b in SAMPLE_BIDDERS:
        if b["id"] == bidder_id:
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

SAMPLE_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "id": "NOTIF-001",
        "bidder_id": "BID-001",
        "title": "Technical Evaluation Passed",
        "message": "Your bid for Tender CPCL/PROC/SAFETY/2024/09 has passed technical & statutory pre-qualification with 100% compliance.",
        "timestamp": "2024-08-26T14:30:00Z",
        "type": "SUCCESS",
        "read": False
    },
    {
        "id": "NOTIF-002",
        "bidder_id": "BID-001",
        "title": "MSME Udyam Exemption Verified",
        "message": "EMD Exemption of ₹9,00,000 granted under MSME Udyam Policy (Certificate: UDYAM-TN-02-0012345).",
        "timestamp": "2024-08-21T10:00:00Z",
        "type": "INFO",
        "read": True
    },
    {
        "id": "NOTIF-003",
        "bidder_id": "BID-001",
        "title": "Tender Deadline Approaching",
        "message": "Tender CPCL/PROC/MECH/2024/14 (Alloy Pipes & Flanges) closes on 30-Sep-2024. Your draft submission is pending final review.",
        "timestamp": "2024-09-01T09:00:00Z",
        "type": "WARNING",
        "read": False
    },
    {
        "id": "NOTIF-004",
        "bidder_id": "BID-001",
        "title": "Document Verification In Progress",
        "message": "Automated verification initiated for Process Automation AMC submission (TND-2024-003).",
        "timestamp": "2024-09-02T11:25:00Z",
        "type": "INFO",
        "read": False
    }
]

def get_notifications_for_bidder(bidder_id: str) -> List[Dict[str, Any]]:
    notifs = [n for n in SAMPLE_NOTIFICATIONS if n.get("bidder_id") == bidder_id]
    if not notifs:
        # Provide welcoming notification for new registered bidder
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

