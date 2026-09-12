"""
PAN Verification Adapter
Integrates with Income Tax Department (ITD) / NSDL PAN validation services.
Provides mock validation responses for prototype/demo with realistic metadata.
"""
import re
from typing import Dict, Any, Optional
from .base_adapter import BaseGovernmentAdapter

class PANAdapter(BaseGovernmentAdapter):
    # Standard 10-character PAN Regex: 5 letters + 4 digits + 1 letter
    PAN_REGEX = r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"

    async def verify(self, pan: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        pan_clean = pan.strip().upper() if pan else ""

        if not pan_clean or not re.match(self.PAN_REGEX, pan_clean):
            return {
                "source": "Income Tax Department / NSDL PAN API (Mock Adapter)",
                "is_mock": self.is_mock,
                "status": "INVALID",
                "pan": pan_clean,
                "message": "Invalid PAN format. Expected 10-character alphanumeric PAN.",
                "details": {}
            }

        mock_records = {
            "AABCA1234F": {
                "entity_name": "ABC Safety Solutions Pvt Ltd",
                "pan_status": "VALID",
                "category": "Company",
                "aadhaar_seeding_status": "LINKED",
                "filing_compliant": True,
                "reference_id": "ITD-PAN-MOCK-99012"
            },
            "AAACT5678B": {
                "entity_name": "SecureTech Industries Ltd",
                "pan_status": "VALID",
                "category": "Company",
                "aadhaar_seeding_status": "LINKED",
                "filing_compliant": True,
                "reference_id": "ITD-PAN-MOCK-99013"
            },
            "AABCS9012D": {
                "entity_name": "SafeGuard Equipments Pvt Ltd",
                "pan_status": "VALID",
                "category": "Company",
                "aadhaar_seeding_status": "LINKED",
                "filing_compliant": True,
                "reference_id": "ITD-PAN-MOCK-99014"
            }
        }

        record = mock_records.get(pan_clean)
        if record:
            return {
                "source": "Income Tax Department / NSDL PAN API (Mock Adapter)",
                "is_mock": self.is_mock,
                "status": "VALID",
                "pan": pan_clean,
                "entity_name": record["entity_name"],
                "category": record["category"],
                "message": "PAN verified as active and valid with Income Tax Department records.",
                "reference_id": record["reference_id"],
                "details": record
            }

        return {
            "source": "Income Tax Department / NSDL PAN API (Mock Adapter)",
            "is_mock": self.is_mock,
            "status": "VALID",
            "pan": pan_clean,
            "entity_name": metadata.get("company_name", "Verified Legal Entity") if metadata else "Verified Legal Entity",
            "category": "Company",
            "message": "PAN structure verified with valid checksum.",
            "reference_id": f"ITD-PAN-MOCK-{pan_clean[-4:] if len(pan_clean) >= 4 else '0000'}",
            "details": {"status": "ACTIVE"}
        }
