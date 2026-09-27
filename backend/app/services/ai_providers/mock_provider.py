"""
Mock AI Provider — deterministic requirement extraction for testing and demo mode.
Returns structured candidates using the same regex/scoring logic that was previously
inline in AIService._extract_from_document_pages().
"""
from typing import Dict, Any, List, Optional
from app.services.ai_providers.base import AIProvider


class MockAIProvider(AIProvider):
    """
    Deterministic (non-LLM) provider.
    Used when AI_PROVIDER=mock or DEMO_MODE=true.
    Extraction is handled by AIService's existing regex/scoring pipeline —
    this provider simply signals that no LLM is in use.
    """

    async def health_check(self) -> Dict[str, Any]:
        return {
            "status": "connected",
            "provider": "mock",
            "model": None,
            "message": "Mock provider active (deterministic extraction)."
        }

    async def extract_requirements(
        self,
        pages: List[Dict[str, Any]],
        filename: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        # Mock provider delegates extraction back to AIService's deterministic pipeline.
        # It returns an empty list here; AIService detects this and uses its regex pipeline.
        return []

    def provider_name(self) -> str:
        return "mock"

    def model_name(self) -> Optional[str]:
        return None

    async def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
    ) -> str:
        latest_msg = messages[-1]["content"].lower() if messages else ""
        if "missing" in latest_msg or "document" in latest_msg:
            return "Based on your document library and profile, your statutory documents (PAN, GSTIN) and Udyam/EPFO are uploaded and verified. For active tenders, the system checks against your My Documents repository."
        elif "pre-check" in latest_msg or "ready" in latest_msg:
            return "You can run a preliminary pre-check for any published tender from the Available Tenders page. The pre-check evaluates your profile and documents against actual tender requirements without submitting a bid."
        elif "status" in latest_msg or "bid" in latest_msg:
            return "You can view your submitted bids and review status under the My Bids section. Each submission tracks progression through submission, officer review, compliance status, and final commercial evaluation."
        elif "apply" in latest_msg:
            return "To apply for a tender, navigate to Available Tenders, click 'Apply' on the desired tender, verify your draft application, and submit."
        else:
            return "Hello! I am your BidSure AI Assistant. I can help you with tender requirements, pre-check readiness, document verification, and bid status based on your account data."
