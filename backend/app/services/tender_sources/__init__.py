"""
Tender Ingestion Sources Module
Adapters for CPPP, eProcurement portals, and manual document uploads.
"""
from app.services.tender_sources.base import BaseTenderSourceAdapter
from app.services.tender_sources.cppp_adapter import CPPPTenderAdapter
from app.services.tender_sources.manual_adapter import ManualTenderAdapter

__all__ = [
    "BaseTenderSourceAdapter",
    "CPPPTenderAdapter",
    "ManualTenderAdapter",
]
