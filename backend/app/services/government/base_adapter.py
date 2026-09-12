"""
Base Government Verification Adapter
Defines standard interface for integration with authorized government verification APIs
(GST, MSME Udyam, Central Debarment / GeM, EPFO/ESIC).
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseGovernmentAdapter(ABC):
    def __init__(self, is_mock: bool = True):
        self.is_mock = is_mock

    @abstractmethod
    async def verify(self, identifier: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Verify identifier against the government system.
        Returns normalized status: VALID, INVALID, PENDING, or ERROR.
        """
        pass
