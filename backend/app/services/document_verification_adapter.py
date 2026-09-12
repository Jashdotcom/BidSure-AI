"""
Document Verification Adapter
Cross-references extracted document contents against government verification registries.
"""
from typing import Dict, Any, Optional

class DocumentVerificationAdapter:
    def __init__(self):
        pass

    async def cross_verify(self, doc_extracted_data: Dict[str, Any], gov_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cross checks numbers extracted from documents against government registry records.
        """
        discrepancies = []

        extracted_pan = doc_extracted_data.get("extracted_pan")
        gov_pan = gov_data.get("pan", {}).get("pan")
        if extracted_pan and gov_pan and extracted_pan != gov_pan:
            discrepancies.append(f"PAN mismatch: Document states {extracted_pan}, but registry returned {gov_pan}")

        return {
            "cross_verification_passed": len(discrepancies) == 0,
            "discrepancies": discrepancies,
            "match_confidence": 0.98 if len(discrepancies) == 0 else 0.45
        }
