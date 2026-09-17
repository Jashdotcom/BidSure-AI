"""
Composite Mock Verification Service
Orchestrates all specialized government and regulatory adapters for comprehensive validation.
"""
from typing import Dict, Any, Optional
from .gst_adapter import GSTAdapter
from .pan_adapter import PANAdapter
from .udyam_adapter import UdyamAdapter
from .epfo_adapter import EPFOAdapter
from .blacklisting_adapter import BlacklistingAdapter
from .oem_adapter import OEMAdapter
from .local_content_adapter import LocalContentAdapter

class MockGovernmentVerificationService:
    def __init__(self, is_mock: bool = True):
        self.gst = GSTAdapter(is_mock=is_mock)
        self.pan = PANAdapter(is_mock=is_mock)
        self.udyam = UdyamAdapter(is_mock=is_mock)
        self.epfo = EPFOAdapter(is_mock=is_mock)
        self.blacklisting = BlacklistingAdapter(is_mock=is_mock)
        self.oem = OEMAdapter(is_mock=is_mock)
        self.local_content = LocalContentAdapter(is_mock=is_mock)

    async def verify_all_for_bidder(self, bidder_data: Dict[str, Any]) -> Dict[str, Any]:
        """Runs parallel/composite verification for all declared credentials in a bidder's bid submission."""
        bidder_id = bidder_data.get("id", "")
        company_name = bidder_data.get("name", "")
        metadata = {"bidder_id": bidder_id, "company_name": company_name}

        results = {}

        # 1. GST Verification
        gstin = bidder_data.get("gstin")
        if gstin:
            results["gstin"] = await self.gst.verify(gstin, metadata)

        # 2. PAN Verification
        pan = bidder_data.get("pan")
        if pan:
            results["pan"] = await self.pan.verify(pan, metadata)

        # 3. MSME Udyam Verification
        udyam = bidder_data.get("udyam") or bidder_data.get("udyam_number")
        if udyam:
            results["udyam"] = await self.udyam.verify(udyam, metadata)

        # 4. EPFO / ESIC Statutory Verification
        epfo = bidder_data.get("epfo_code")
        if epfo:
            results["epfo"] = await self.epfo.verify(epfo, metadata)

        # 5. Debarment / Blacklisting Check
        results["debarment"] = await self.blacklisting.verify(company_name, metadata)

        # 6. OEM Authorization
        oem_claim = bidder_data.get("oem_authorization") or bidder_data.get("oem_status")
        if oem_claim:
            results["oem"] = await self.oem.verify(oem_claim, metadata)

        # 7. Make In India / Local Content
        local_content = bidder_data.get("local_content") if bidder_data.get("local_content") is not None else bidder_data.get("local_content_pct")
        if local_content is not None:
            results["local_content"] = await self.local_content.verify(local_content, metadata)

        return results
