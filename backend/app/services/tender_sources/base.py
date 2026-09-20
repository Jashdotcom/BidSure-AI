"""
Base Tender Source Adapter
Defines standard interface for ingesting tenders from external sources (CPPP, eProcurement, Manual Upload).
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseTenderSourceAdapter(ABC):
    def __init__(self, is_mock: bool = True):
        self.is_mock = is_mock

    @abstractmethod
    async def fetch_tender(self, source_url_or_ref: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Fetch tender metadata and document details from source.
        Returns normalized tender dictionary.
        """
        pass
