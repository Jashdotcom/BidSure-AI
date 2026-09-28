"""
CPPP Integration Exceptions
Custom exception hierarchy for Central Public Procurement Portal (CPPP)
connector and eProcurement source adapters.
"""

from typing import Optional, Dict, Any


class CPPPError(Exception):
    """Base exception for all CPPP integration errors."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class CPPPConnectionError(CPPPError):
    """Raised when network connectivity to CPPP / eProcurement portal fails or times out."""
    pass


class CPPPTimeoutError(CPPPConnectionError):
    """Raised when a request to CPPP exceeds the configured timeout."""
    pass


class CPPPAccessBlockedError(CPPPError):
    """
    Raised when CPPP blocks automated access due to CAPTCHA, bot detection,
    or session-level human verification requirements.
    Per security & compliance rules: NEVER attempt to bypass or solve CAPTCHAs.
    """
    pass


class CPPPCaptchaBlockedError(CPPPAccessBlockedError):
    """Specific error when a CAPTCHA challenge is detected on a CPPP page."""
    pass


class CPPPNotFoundError(CPPPError):
    """Raised when a specified tender ID or URL does not exist on CPPP."""
    pass


class CPPPParseError(CPPPError):
    """Raised when CPPP HTML response format is unrecognized or malformed."""
    pass


class CPPPInvalidURLError(CPPPError):
    """Raised when a provided URL is malformed or invalid."""
    pass


class CPPPSSRFBlockedError(CPPPError):
    """Raised when a URL is blocked by SSRF protections (non-allowlisted domain or private IP)."""
    pass


class CPPPDocumentDownloadError(CPPPError):
    """Raised when downloading an official tender document from CPPP fails."""
    pass
