"""
Debarment / Blacklisting Verification Adapter
Integrates with Central Vigilance Commission (CVC), GeM Incident Management,
CPWD, and MoPNG Debarred Vendor Registry.
"""
from typing import Dict, Any, Optional
from .base_adapter import BaseGovernmentAdapter

class BlacklistingAdapter(BaseGovernmentAdapter):
    # Simulated blacklist database for testing
    BLACKLISTED_ENTITIES = [
        "FRAUDULENT SAFETY SUPPLIERS LTD",
        "BLACK_LISTED_CORP_PVT_LTD",
        "DEBARRED_VENDOR_INC"
    ]

    async def verify(self, entity_name_or_pan: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        key = entity_name_or_pan.strip().upper() if entity_name_or_pan else ""

        is_debarred = any(bad in key for bad in self.BLACKLISTED_ENTITIES)

        if is_debarred:
            return {
                "source": "Central Debarred Vendor Database (CVC/GeM/CPCL)",
                "is_mock": self.is_mock,
                "status": "DEBARRED",
                "entity": key,
                "debarment_reason": "Debarred for default in previous PSU procurement order.",
                "debarment_period": "2024-01-01 to 2027-01-01",
                "message": "WARNING: Entity is currently debarred/blacklisted from participating in CPCL/PSU tenders."
            }

        return {
            "source": "Central Debarred Vendor Database (CVC/GeM/CPCL)",
            "is_mock": self.is_mock,
            "status": "CLEAR",
            "entity": key,
            "searched_databases": ["CVC", "GeM Incident Management", "CPCL Banned Vendor List", "CPWD Negative List"],
            "debarred": False,
            "message": "No active debarment or blacklisting records found across PSU databases."
        }
