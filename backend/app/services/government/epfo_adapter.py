"""
EPFO / ESIC Statutory Compliance Adapter
Integrates with EPFO Unified Portal & ESIC Portal for vendor statutory compliance verification.
"""
from typing import Dict, Any, Optional
from .base_adapter import BaseGovernmentAdapter

class EPFOAdapter(BaseGovernmentAdapter):
    async def verify(self, code: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        clean_code = code.strip().upper() if code else ""
        metadata = metadata or {}
        company_name = str(metadata.get("company_name", ""))

        # SafeGuard has ambiguous / pending challans for review demonstration
        if "SAFEGUARD" in company_name.upper() or "KN/BNG/0067890" in clean_code or "REVIEW" in clean_code:
            return {
                "source": "EPFO / ESIC Unified Portal (Mock Adapter)",
                "is_mock": self.is_mock,
                "status": "REQUIRES_REVIEW",
                "establishment_code": clean_code or "KN/BNG/0067890",
                "epfo_status": "Active",
                "esic_status": "Active",
                "challan_status": "Pending electronic challan receipt (ECR) for previous quarter reconciliation",
                "message": "EPFO code registered, but last quarter ECR reconciliation is unverified. Officer review required."
            }

        # ABC Safety Solutions & SecureTech Industries are fully valid and active
        return {
            "source": "EPFO / ESIC Unified Portal (Mock Adapter)",
            "is_mock": self.is_mock,
            "status": "VALID",
            "establishment_code": clean_code or "TN/MAS/0099881",
            "epfo_status": "Active",
            "esic_status": "Active",
            "challan_status": "All quarterly ECR challans verified paid",
            "message": "Statutory registrations (EPFO/ESIC) verified with regular monthly contributions."
        }
