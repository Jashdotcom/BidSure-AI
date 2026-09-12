"""
BidSure AI Extraction & Document Understanding Service
Extracts structured clauses, requirements, and candidate entities from tender PDFs and bidder documents.
"""
from typing import Dict, Any, List, Optional
import os

class AIService:
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "mock")

    async def extract_tender_requirements(self, tender_text: str) -> List[Dict[str, Any]]:
        """
        Parses raw tender RFP / NIT text and extracts structured compliance requirements.
        """
        # Default structured requirements returned for standard CPCL refinery tenders
        return [
            {
                "id": "REQ-001",
                "clause": "Clause 4.1.1",
                "category": "FINANCIAL",
                "title": "Average Annual Financial Turnover",
                "description": "Bidder must have minimum average annual financial turnover of ₹3.00 Crore during last 3 financial years (FY 2021-22, 2022-23, 2023-24).",
                "threshold": 3.0,
                "unit": "Crore INR",
                "mandatory": True
            },
            {
                "id": "REQ-002",
                "clause": "Clause 4.2.3",
                "category": "TECHNICAL",
                "title": "Past Technical Experience in PSU / Hydrocarbon Sector",
                "description": "Bidder must have completed at least 3 similar supply contracts for Safety & Personal Protective Equipment in CPCL / IOCL / BPCL / HPCL / ONGC in the last 5 years.",
                "threshold": 3,
                "unit": "Contracts",
                "mandatory": True
            },
            {
                "id": "REQ-003",
                "clause": "Clause 5.1.0",
                "category": "OEM_AUTHORIZATION",
                "title": "Direct OEM Authorization Certificate (MAF)",
                "description": "Original Equipment Manufacturer (OEM) authorization letter specifically for this CPCL Tender if the bidder is not an Original Manufacturer.",
                "threshold": 1,
                "unit": "Authorization Letter",
                "mandatory": True
            },
            {
                "id": "REQ-004",
                "clause": "Clause 6.3.2",
                "category": "STATUTORY",
                "title": "Make In India (MII) Local Content Declaration",
                "description": "Minimum 50% Local Content requirement for Class-I Local Supplier status under DPIIT Public Procurement Order.",
                "threshold": 50.0,
                "unit": "Percentage",
                "mandatory": True
            },
            {
                "id": "REQ-005",
                "clause": "Clause 2.4.0",
                "category": "STATUTORY",
                "title": "GSTIN Registration and Monthly Compliance",
                "description": "Valid Goods and Services Tax Identification Number (GSTIN) with active registration status.",
                "threshold": 1,
                "unit": "Registration",
                "mandatory": True
            },
            {
                "id": "REQ-006",
                "clause": "Clause 7.1.1",
                "category": "VIGILANCE",
                "title": "Debarment & Vigilance Integrity Clearance",
                "description": "Bidder must not be under any active debarment or blacklisting by CVC, CPCL, GeM or any Indian PSU.",
                "threshold": 0,
                "unit": "Debarments",
                "mandatory": True
            }
        ]

    async def extract_bidder_metadata(self, document_text: str) -> Dict[str, Any]:
        """
        Extracts financial turnover, past experience, statutory IDs, and MII declarations from bidder documents.
        """
        return {
            "extracted_turnover_cr": 4.5,
            "extracted_pan": "AABCA1234F",
            "extracted_gstin": "33AABCA1234F1Z5",
            "extracted_udyam": "UDYAM-TN-02-0012345",
            "extracted_oem_tier": "DIRECT_OEM",
            "extracted_mii_content": 65.0
        }
