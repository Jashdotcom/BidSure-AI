"""
Base AI Provider Interface.
All AI providers (Mock, Ollama, etc.) implement this interface.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class AIProvider(ABC):
    """
    Abstract base class for AI providers used by BidSure AI.

    Responsibilities:
        - Connect to the underlying LLM/inference service.
        - Accept page-aware tender text and return structured requirement candidates.
        - Report health and model availability.

    The provider does NOT perform final grounding validation, evidence scoping,
    or numeric consistency checks — those remain in AIService's deterministic pipeline.
    """

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Returns provider health and connectivity status.

        Returns:
            {
                "status": "connected" | "unavailable" | "model_unavailable",
                "provider": "ollama" | "mock",
                "model": "<model name>" | None,
                "message": "<human-readable status>"
            }
        """
        ...

    @abstractmethod
    async def extract_requirements(
        self,
        pages: List[Dict[str, Any]],
        filename: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Given page-aware tender document text, return structured requirement candidates.

        Args:
            pages: List of {"page_number": int, "text": str, "ocr_confidence": float}
            filename: Source document filename for provenance.
            metadata: Optional hints (tender title, organization, etc.)

        Returns:
            List of requirement candidate dicts, each containing at minimum:
                - code: str (rule code like TURNOVER_MIN, STAT_GST_REG, etc.)
                - name: str
                - category: str
                - mandatory: bool
                - description: str
                - threshold_value: Any
                - unit: str | None
                - source_page: int (1-indexed)
                - evidence_text: str (verbatim excerpt from the source page text)
                - confidence: float (0.0 - 1.0)

        Raises:
            AIProviderUnavailableError: When the provider service is unreachable.
            AIModelUnavailableError: When the configured model is not available.
            AIExtractionError: When extraction fails (malformed output, timeout, etc.)
        """
        ...

    @abstractmethod
    def provider_name(self) -> str:
        """Returns the provider identifier string (e.g. 'ollama', 'mock')."""
        ...

    @abstractmethod
    def model_name(self) -> Optional[str]:
        """Returns the configured model name, or None if not applicable."""
        ...

    async def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate chat assistant response from conversation messages and system prompt.
        """
        raise NotImplementedError("Chat generation not implemented for this provider")


class AIProviderUnavailableError(Exception):
    """Raised when the AI provider service is unreachable."""
    def __init__(self, provider: str, message: str = ""):
        self.provider = provider
        self.message = message or f"AI provider '{provider}' is unavailable."
        super().__init__(self.message)


class AIModelUnavailableError(Exception):
    """Raised when the configured model is not available on the provider."""
    def __init__(self, provider: str, model: str, message: str = ""):
        self.provider = provider
        self.model = model
        self.message = message or f"Model '{model}' is not available on provider '{provider}'."
        super().__init__(self.message)


class AIExtractionError(Exception):
    """Raised when LLM extraction fails (bad JSON, timeout, validation failure)."""
    def __init__(self, provider: str, reason: str, details: str = ""):
        self.provider = provider
        self.reason = reason
        self.details = details
        self.message = f"AI extraction failed ({provider}): {reason}"
        super().__init__(self.message)


class AITimeoutError(Exception):
    """Raised when an AI request exceeds its allocated timeout."""
    def __init__(self, provider: str, message: str = ""):
        self.provider = provider
        self.message = message or f"AI provider '{provider}' request timed out."
        super().__init__(self.message)
