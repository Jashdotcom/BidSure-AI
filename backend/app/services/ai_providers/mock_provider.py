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
