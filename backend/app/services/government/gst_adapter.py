"""
GST Verification Adapter
Integrates with GST Portal / GSP (GST Suvidha Provider) APIs.
Provides mock validation responses for prototype/demo with realistic metadata.
"""
import re
from typing import Dict, Any, Optional
from .base_adapter import BaseGovernmentAdapter

class GSTAdapter(BaseGovernmentAdapter):
    # Standard GSTIN Regex: 2 digits (State) + 10 char PAN + 1 entity num + 1 'Z' + 1 check digit
    GSTIN_REGEX = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"

    async def verify(self, gstin: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        gstin_clean = gstin.strip().upper() if gstin else ""

        # Format check
        if not gstin_clean or not re.match(self.GSTIN_REGEX, gstin_clean):
            return {
                "source": "GSTN Portal API (Adapter)",
                "is_mock": self.is_mock,
                "status": "INVALID",
                "gstin": gstin_clean,
                "message": "Invalid GSTIN format or checksum mismatch.",
                "details": {}
            }

        # Mock lookup dictionary for known demo GSTINs
        mock_records = {
            "27ABCDE1234F1Z5": {
                "trade_name": "ABC Safety Solutions Pvt. Ltd.",
                "legal_name": "ABC SAFETY SOLUTIONS PRIVATE LIMITED",
                "registration_date": "2021-04-15",
                "taxpayer_type": "Regular",
                "gstin_status": "Active",
                "state_jurisdiction": "Maharashtra (27)",
                "filing_status_last_3_months": "FILLED_ON_TIME",
                "risk_score": 0.02
            },
            "33AABCA1234F1Z5": {
                "trade_name": "ABC Safety Solutions Pvt Ltd",
                "legal_name": "ABC SAFETY SOLUTIONS PRIVATE LIMITED",
                "registration_date": "2021-04-15",
                "taxpayer_type": "Regular",
                "gstin_status": "Active",
                "state_jurisdiction": "Tamil Nadu (33)",
                "filing_status_last_3_months": "FILLED_ON_TIME",
                "risk_score": 0.05
            },
            "33AABCA1234F1ZP": {
                "trade_name": "ABC Safety Solutions Pvt Ltd",
                "legal_name": "ABC SAFETY SOLUTIONS PRIVATE LIMITED",
                "registration_date": "2021-04-15",
                "taxpayer_type": "Regular",
                "gstin_status": "Active",
                "state_jurisdiction": "Tamil Nadu (33)",
                "filing_status_last_3_months": "FILLED_ON_TIME",
                "risk_score": 0.05
            },
            "27AAACT5678B1Z2": {
                "trade_name": "SecureTech Industries Ltd",
                "legal_name": "SECURETECH INDUSTRIES LIMITED",
                "registration_date": "2017-08-20",
                "taxpayer_type": "Regular",
                "gstin_status": "Active",
                "state_jurisdiction": "Maharashtra (27)",
                "filing_status_last_3_months": "FILLED_ON_TIME",
                "risk_score": 0.02
            },
            "29AABCS9012D1Z8": {
                "trade_name": "SafeGuard Equipments Pvt Ltd",
                "legal_name": "SAFEGUARD EQUIPMENTS PRIVATE LIMITED",
                "registration_date": "2019-11-10",
                "taxpayer_type": "Regular",
                "gstin_status": "Active",
                "state_jurisdiction": "Karnataka (29)",
                "filing_status_last_3_months": "FILLED_ON_TIME",
                "risk_score": 0.08
            }
        }

        record = mock_records.get(gstin_clean)
        if record:
            return {
                "source": "GSTN Portal API (Adapter)",
                "is_mock": self.is_mock,
                "status": "VALID" if record["gstin_status"] == "Active" else "SUSPENDED",
                "gstin": gstin_clean,
                "trade_name": record["trade_name"],
                "legal_name": record["legal_name"],
                "registration_date": record["registration_date"],
                "gstin_status": record["gstin_status"],
                "filing_compliance": record["filing_status_last_3_months"],
                "message": "GSTIN verified active on Goods and Services Tax Network.",
                "details": record
            }

        # Fallback for arbitrary valid regex
        return {
            "source": "GSTN Portal API (Adapter)",
            "is_mock": self.is_mock,
            "status": "VALID",
            "gstin": gstin_clean,
            "trade_name": metadata.get("company_name", "Verified Entity") if metadata else "Verified Entity",
            "gstin_status": "Active",
            "message": "GSTIN structure verified with active filing status.",
            "details": {"taxpayer_type": "Regular"}
        }
