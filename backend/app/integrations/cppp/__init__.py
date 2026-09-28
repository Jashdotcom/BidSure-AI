"""
BidSure AI - Central Public Procurement Portal (CPPP) Integration Package
Modular source connector for authentic public tender discovery, metadata extraction,
corrigenda tracking, and PDF document ingestion.
"""

from .exceptions import (
    CPPPError,
    CPPPConnectionError,
    CPPPTimeoutError,
    CPPPAccessBlockedError,
    CPPPCaptchaBlockedError,
    CPPPNotFoundError,
    CPPPParseError,
    CPPPInvalidURLError,
    CPPPSSRFBlockedError,
    CPPPDocumentDownloadError,
)
from .schemas import (
    CPPPDocumentLink,
    CPPPCorrigendum,
    CPPPTenderSummary,
    CPPPTenderDetail,
    CPPPImportRequest,
    CPPPSearchRequest,
    CPPPSyncResult,
)
from .client import CPPPClient
from .parser import CPPPParser, extract_tender_id_from_url
from .service import CPPPIntegrationService

__all__ = [
    "CPPPError",
    "CPPPConnectionError",
    "CPPPTimeoutError",
    "CPPPAccessBlockedError",
    "CPPPCaptchaBlockedError",
    "CPPPNotFoundError",
    "CPPPParseError",
    "CPPPInvalidURLError",
    "CPPPSSRFBlockedError",
    "CPPPDocumentDownloadError",
    "CPPPDocumentLink",
    "CPPPCorrigendum",
    "CPPPTenderSummary",
    "CPPPTenderDetail",
    "CPPPImportRequest",
    "CPPPSearchRequest",
    "CPPPSyncResult",
    "CPPPClient",
    "CPPPParser",
    "extract_tender_id_from_url",
    "CPPPIntegrationService",
]
