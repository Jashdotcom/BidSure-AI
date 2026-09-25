"""
AI Provider Abstraction Layer for BidSure AI.
Provides a pluggable interface for LLM-backed tender requirement extraction.
"""
import os
import logging
from app.config import load_project_env, settings
from app.services.ai_providers.base import AIProvider
from app.services.ai_providers.mock_provider import MockAIProvider
from app.services.ai_providers.ollama_provider import OllamaAIProvider

logger = logging.getLogger("bidsure.ai.providers")

__all__ = ["AIProvider", "MockAIProvider", "OllamaAIProvider", "get_ai_provider"]

def get_ai_provider() -> AIProvider:
    """
    Factory function to instantiate the configured AI provider.
    Enforces AI_PROVIDER=ollama vs mock.
    """
    load_project_env()
    provider_name = os.getenv("AI_PROVIDER", "ollama").strip().lower()

    if provider_name == "ollama":
        base_url = os.getenv("AI_BASE_URL", "http://localhost:11434")
        model = os.getenv("AI_MODEL", "qwen3:8b")
        timeout = int(os.getenv("AI_TIMEOUT", "120"))
        return OllamaAIProvider(base_url=base_url, model=model, timeout=timeout)
    elif provider_name == "mock":
        return MockAIProvider()
    else:
        logger.warning(
            "Unknown AI_PROVIDER '%s' configured. Defaulting to OllamaAIProvider.",
            provider_name
        )
        return OllamaAIProvider(
            base_url=os.getenv("AI_BASE_URL", "http://localhost:11434"),
            model=os.getenv("AI_MODEL", "qwen3:8b")
        )
