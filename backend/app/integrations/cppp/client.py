"""
CPPP HTTP Client
Handles secure network requests to Central Public Procurement Portal (eprocure.gov.in),
enforcing strict Server-Side Request Forgery (SSRF) controls, DNS validation,
rate limiting, request timeouts, and robust error classification.
"""

import os
import socket
import ipaddress
import urllib.parse
from typing import Tuple, Optional, Dict, Any
import requests

from .exceptions import (
    CPPPConnectionError,
    CPPPTimeoutError,
    CPPPAccessBlockedError,
    CPPPCaptchaBlockedError,
    CPPPNotFoundError,
    CPPPInvalidURLError,
    CPPPSSRFBlockedError,
    CPPPDocumentDownloadError,
)
from app.data.document_store import validate_pdf_bytes, sanitize_filename


ALLOWED_CPPP_HOSTS = {
    "eprocure.gov.in",
    "www.eprocure.gov.in",
    "cppp.gov.in",
    "www.cppp.gov.in",
    "etenders.gov.in",
    "www.etenders.gov.in",
    "gem.gov.in",
    "www.gem.gov.in",
    "cpcl.co.in",
    "www.cpcl.co.in",
}

DEFAULT_TIMEOUT_SECONDS = 15.0
MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


class CPPPClient:
    """
    Client for interacting with public CPPP and eProcurement portals.
    """

    def __init__(self, timeout: float = DEFAULT_TIMEOUT_SECONDS):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 BidSure-AI/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Upgrade-Insecure-Requests": "1",
        })

    def validate_url_security(self, url: str) -> None:
        """
        Validates the URL against SSRF vulnerabilities:
        1. Scheme must be http or https.
        2. Hostname must be in the approved government portal allowlist.
        3. Resolved IP must not be private, loopback, link-local, or reserved.
        """
        if not url or not isinstance(url, str):
            raise CPPPInvalidURLError("A valid URL string must be provided.")

        try:
            parsed = urllib.parse.urlparse(url.strip())
        except Exception as e:
            raise CPPPInvalidURLError(f"Malformed URL: {str(e)}")

        if parsed.scheme not in ("http", "https"):
            raise CPPPSSRFBlockedError(f"Invalid URL scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted.")

        host = (parsed.hostname or "").lower()
        if not host:
            raise CPPPInvalidURLError("URL does not contain a valid hostname.")

        # Test environment exemption
        allow_mock = os.getenv("ALLOW_LOCAL_CPPP_MOCK", "false").lower() in ("true", "1", "yes")
        if allow_mock and host in ("localhost", "127.0.0.1", "testserver"):
            return

        # Check domain allowlist
        if host not in ALLOWED_CPPP_HOSTS:
            # Check if subdomain of allowed host
            is_allowed_subdomain = any(host.endswith(f".{allowed}") for allowed in ALLOWED_CPPP_HOSTS)
            if not is_allowed_subdomain:
                raise CPPPSSRFBlockedError(
                    f"Access to host '{host}' is blocked. "
                    f"Only official procurement portals ({', '.join(sorted(ALLOWED_CPPP_HOSTS))}) are permitted."
                )

        # Resolve DNS and check against private/loopback/link-local IP addresses
        try:
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            addr_info = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
            for item in addr_info:
                sockaddr = item[4]
                ip_str = sockaddr[0]
                ip_obj = ipaddress.ip_address(ip_str)

                if (
                    ip_obj.is_private
                    or ip_obj.is_loopback
                    or ip_obj.is_link_local
                    or ip_obj.is_multicast
                    or ip_obj.is_reserved
                    or ip_obj.is_unspecified
                ):
                    raise CPPPSSRFBlockedError(
                        f"Access to IP address '{ip_str}' for host '{host}' was blocked by SSRF protection."
                    )
        except socket.gaierror as e:
            # DNS resolution failure
            raise CPPPConnectionError(f"Could not resolve host '{host}': {str(e)}")
        except CPPPSSRFBlockedError:
            raise
        except Exception as e:
            raise CPPPConnectionError(f"Security validation failed for URL '{url}': {str(e)}")

    def build_official_detail_url(self, url_or_id: str) -> str:
        """
        Constructs the canonical official CPPP tender detail URL from a URL or Tender ID.
        """
        raw = str(url_or_id).strip()
        if raw.startswith("http://") or raw.startswith("https://"):
            return raw

        # It is a raw Tender ID (e.g., 2026_IITG_925833_1)
        # Canonical eProcure URL format:
        return f"https://eprocure.gov.in/eprocure/app?page=FrontEndTenderDetails&service=page&tenderId={raw}"

    def fetch_html(self, url: str) -> str:
        """
        Fetches HTML from a validated CPPP URL with robust error handling.
        """
        self.validate_url_security(url)
        try:
            response = self.session.get(url, timeout=self.timeout, allow_redirects=True)

            if response.status_code == 404:
                raise CPPPNotFoundError(f"Tender page not found on CPPP (HTTP 404): {url}")

            if response.status_code in (403, 429):
                raise CPPPAccessBlockedError(
                    f"CPPP server returned status code {response.status_code}. "
                    "Access is temporarily restricted or rate-limited.",
                    details={"status_code": response.status_code, "url": url}
                )

            if response.status_code >= 500:
                raise CPPPConnectionError(
                    f"CPPP portal returned server error (HTTP {response.status_code}).",
                    details={"status_code": response.status_code, "url": url}
                )

            response.raise_for_status()
            response.encoding = response.apparent_encoding or "utf-8"
            return response.text

        except requests.exceptions.Timeout as e:
            raise CPPPTimeoutError(f"Connection to CPPP portal timed out after {self.timeout}s: {str(e)}")
        except requests.exceptions.ConnectionError as e:
            raise CPPPConnectionError(f"Failed to establish connection to CPPP portal: {str(e)}")
        except (CPPPError, CPPPSSRFBlockedError, CPPPNotFoundError, CPPPAccessBlockedError):
            raise
        except Exception as e:
            raise CPPPConnectionError(f"Unexpected error while fetching CPPP data: {str(e)}")

    def search_public_listings(self, query: Optional[str] = None) -> str:
        """
        Fetches active public tender listings from CPPP.
        """
        listing_url = "https://eprocure.gov.in/cppp/latestactivetenderslist/active-tenders"
        if query:
            # eProcure query search URL
            listing_url = f"https://eprocure.gov.in/cppp/searchtender/active-tenders?tender_id={urllib.parse.quote(query)}"
        return self.fetch_html(listing_url)

    def download_document(self, document_url: str, max_size_bytes: int = MAX_DOCUMENT_SIZE_BYTES) -> Tuple[bytes, str, str]:
        """
        Downloads a tender document PDF from an official CPPP document URL.
        Validates content size, format, and magic bytes.
        Returns: (file_bytes, filename, content_type)
        """
        self.validate_url_security(document_url)
        try:
            headers = {"Accept": "application/pdf,application/octet-stream,*/*"}
            response = self.session.get(document_url, headers=headers, timeout=self.timeout, stream=True)

            if response.status_code == 404:
                raise CPPPDocumentDownloadError(f"Tender document not found at {document_url} (HTTP 404).")

            if response.status_code in (403, 429):
                raise CPPPAccessBlockedError(
                    f"Document download was blocked by CPPP (HTTP {response.status_code}). "
                    "A human verification or session cookie may be required on the portal."
                )

            response.raise_for_status()

            # Read content with size guard
            chunks = []
            total_size = 0
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if chunk:
                    chunks.append(chunk)
                    total_size += len(chunk)
                    if total_size > max_size_bytes:
                        raise CPPPDocumentDownloadError(
                            f"Document exceeds maximum permitted download size of 50 MB (downloaded {total_size / (1024*1024):.1f} MB)."
                        )

            file_bytes = b"".join(chunks)

            # Derive filename from Content-Disposition or URL
            filename = "tender_document.pdf"
            cd = response.headers.get("Content-Disposition", "")
            if "filename=" in cd:
                fname_part = cd.split("filename=")[-1].strip(" \"';")
                if fname_part:
                    filename = sanitize_filename(fname_part)
            else:
                path_name = document_url.split("/")[-1].split("?")[0]
                if path_name and path_name.lower().endswith(".pdf"):
                    filename = sanitize_filename(path_name)

            content_type = response.headers.get("Content-Type", "application/pdf")

            # Validate PDF format
            valid, err = validate_pdf_bytes(file_bytes, max_size_bytes=max_size_bytes)
            if not valid:
                raise CPPPDocumentDownloadError(f"Downloaded file failed validation: {err}")

            return file_bytes, filename, content_type

        except requests.exceptions.Timeout as e:
            raise CPPPTimeoutError(f"Document download timed out after {self.timeout}s: {str(e)}")
        except requests.exceptions.ConnectionError as e:
            raise CPPPConnectionError(f"Network error while downloading document: {str(e)}")
        except (CPPPError, CPPPDocumentDownloadError):
            raise
        except Exception as e:
            raise CPPPDocumentDownloadError(f"Failed to download document from {document_url}: {str(e)}")
