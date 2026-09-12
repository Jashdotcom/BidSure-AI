"""
OEM Authorization Verification Adapter
Integrates with OEM Verification / Direct Authorization Registry.
Provides mock validation responses for prototype/demo with realistic metadata.
"""
from typing import Dict, Any, Optional
from .base_adapter import BaseGovernmentAdapter

class OEMAdapter(BaseGovernmentAdapter):
    async def verify(self, oem_claim: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        claim = oem_claim.strip() if oem_claim else ""
        metadata = metadata or {}

        # Direct OEM or Original Manufacturer is considered Direct Tier 1
        if "direct" in claim.lower() or "original manufacturer" in claim.lower() or "tier 1" in claim.lower():
            return {
                "source": "OEM Verification Registry (Mock Adapter)",
                "is_mock": self.is_mock,
                "status": "VALID",
                "oem_tier": "DIRECT_OEM",
                "valid_until": "2027-12-31",
                "message": "Authorized directly by Principal OEM with active technical support warranty.",
                "reference_id": f"OEM-AUTH-MOCK-{metadata.get('bidder_id', '9901')}",
                "details": {
                    "oem_name": "Karam Safety Instruments & Honeywell Protective Lifeline",
                    "authorization_type": "Direct Tier 1 Channel Partner",
                    "territory": "India - Pan India PSU Supply"
                }
            }

        if "distributor" in claim.lower() or "dealer" in claim.lower() or "reseller" in claim.lower():
            return {
                "source": "OEM Verification Registry (Mock Adapter)",
                "is_mock": self.is_mock,
                "status": "REVIEW_REQUIRED",
                "oem_tier": "SECONDARY_DISTRIBUTOR",
                "message": "Secondary tier distributor letter submitted. Tender requires Direct OEM Authorization.",
                "reference_id": f"OEM-AUTH-MOCK-{metadata.get('bidder_id', '9902')}",
                "details": {
                    "oem_name": "Regional Distributor Network",
                    "authorization_type": "Secondary Retailer / Dealer",
                    "requires_officer_review": True
                }
            }

        return {
            "source": "OEM Verification Registry (Mock Adapter)",
            "is_mock": self.is_mock,
            "status": "INVALID",
            "oem_tier": "UNVERIFIED",
            "message": "No valid OEM authorization certificate found in submission.",
            "reference_id": "OEM-AUTH-MOCK-ERR",
            "details": {}
        }
