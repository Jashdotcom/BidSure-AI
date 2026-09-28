"""
CPPP HTML Parser Engine
Extracts structured procurement metadata, critical dates, EMD/fee amounts,
and official document URLs from Central Public Procurement Portal (CPPP)
and eProcurement (GePNIC) HTML pages.
"""

import re
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from bs4 import BeautifulSoup

from .exceptions import CPPPParseError, CPPPCaptchaBlockedError
from .schemas import (
    CPPPTenderDetail,
    CPPPTenderSummary,
    CPPPDocumentLink,
    CPPPCorrigendum,
)


CAPTCHA_INDICATORS = [
    "enter the captcha",
    "enter captcha",
    "security code",
    "verification code",
    "captcha.jsp",
    "sessiontimeout.jsp",
    "access denied",
    "request blocked by security",
    "bot detection",
    "human verification",
    "cf-challenge",
    "cloudflare-ray",
]


def detect_access_blocked(html_content: str) -> bool:
    """
    Detects if the response HTML is a CAPTCHA challenge, session blocker,
    or security access denied page.
    """
    if not html_content or len(html_content.strip()) < 50:
        return False
    lower_html = html_content.lower()
    for ind in CAPTCHA_INDICATORS:
        if ind in lower_html:
            # Verify it's actually an active challenge form / error rather than just the word
            if "name=\"captcha\"" in lower_html or "id=\"captcha\"" in lower_html or "enter captcha" in lower_html or "security code" in lower_html or "cf-challenge" in lower_html:
                return True
            if "access denied" in lower_html or "request blocked" in lower_html:
                return True
    return False


def normalize_text(text: Optional[str]) -> str:
    """Cleans whitespace, newlines, non-breaking spaces from extracted HTML text."""
    if not text:
        return ""
    cleaned = text.replace("\xa0", " ").replace("&nbsp;", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def parse_indian_date(date_str: Optional[str]) -> Optional[str]:
    """
    Normalizes Indian government date formats to ISO-8601 strings.
    Handles formats like:
    - 15-Sep-2026 09:00 AM
    - 15-Oct-2026 06:00 PM
    - 15/10/2026 06:00 PM
    - 2026-10-15 18:00:00
    - 15-10-2026
    """
    if not date_str:
        return None
    raw = normalize_text(date_str)
    if not raw or raw.upper() in ("NA", "N/A", "N.A.", "NONE", "NIL", "-"):
        return None

    # Strip timezone or trailing notes if any
    raw = re.sub(r"\s*\([^\)]*\)", "", raw).strip()

    formats = [
        "%d-%b-%Y %I:%M %p",
        "%d-%b-%Y %H:%M",
        "%d-%B-%Y %I:%M %p",
        "%d/%m/%Y %I:%M %p",
        "%d/%m/%Y %H:%M",
        "%d-%m-%Y %I:%M %p",
        "%d-%m-%Y %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d-%b-%Y",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            continue

    # Return original cleaned string if parsing failed
    return raw


def parse_currency_amount(amount_str: Optional[str]) -> Optional[float]:
    """
    Parses currency strings (INR/₹) into float values.
    Returns None if absent or exempted. Never invents amounts.
    """
    if not amount_str:
        return None
    raw = normalize_text(amount_str)
    if not raw or raw.upper() in ("NA", "N/A", "N.A.", "NONE", "NIL", "EXEMPTED", "0", "0.0", "0.00", "-"):
        if raw.upper() in ("0", "0.0", "0.00"):
            return 0.0
        return None

    # Check for Lakhs / Crores textual values (e.g. 1.5 Cr, 25 Lakh)
    lakh_match = re.search(r"([\d\.]+)\s*(?:Lakh|Lakhs|L)", raw, re.IGNORECASE)
    if lakh_match:
        try:
            return float(lakh_match.group(1)) * 100_000.0
        except ValueError:
            pass

    cr_match = re.search(r"([\d\.]+)\s*(?:Crore|Crores|Cr)", raw, re.IGNORECASE)
    if cr_match:
        try:
            return float(cr_match.group(1)) * 10_000_000.0
        except ValueError:
            pass

    # Clean non-digit characters except period
    cleaned = re.sub(r"[^\d\.]", "", raw)
    if not cleaned:
        return None
    try:
        val = float(cleaned)
        return val
    except ValueError:
        return None


def extract_tender_id_from_url(url_or_id: str) -> str:
    """
    Extracts a clean Tender ID from a CPPP URL or validates a plain tender ID string.
    """
    raw = str(url_or_id).strip()
    # Check if query parameter tenderId=... exists
    parsed = urllib.parse.urlparse(raw)
    qs = urllib.parse.parse_qs(parsed.query)
    if "tenderId" in qs and qs["tenderId"]:
        return qs["tenderId"][0].strip()
    if "tender_id" in qs and qs["tender_id"]:
        return qs["tender_id"][0].strip()

    # Match common CPPP Tender ID patterns in URL path or string
    # e.g., 2026_IITG_925833_1 or 2026_CPCL_789123_1
    match = re.search(r"(\d{4}_[A-Za-z0-9]+_\d+(?:_\d+)?)", raw)
    if match:
        return match.group(1)

    # Return bare string with url prefixes stripped
    cleaned = re.sub(r"^https?://[^/]+/", "", raw).strip("/")
    return cleaned if cleaned else raw


class CPPPParser:
    """
    Parses HTML pages from Central Public Procurement Portal (eprocure.gov.in)
    and eProcurement GePNIC instances.
    """

    @staticmethod
    def parse_tender_details(html_content: str, official_url: str) -> CPPPTenderDetail:
        """
        Parses a tender details page HTML into a CPPPTenderDetail object.
        Raises CPPPCaptchaBlockedError if CAPTCHA is detected.
        Raises CPPPParseError if required structural elements cannot be found.
        """
        if detect_access_blocked(html_content):
            raise CPPPCaptchaBlockedError(
                "CPPP access was blocked by human verification (CAPTCHA). "
                "Per security & compliance rules, automated CAPTCHA solving is prohibited. "
                "Please download the tender document from CPPP and use Manual PDF Import.",
                details={"official_url": official_url}
            )

        if not html_content or len(html_content.strip()) < 100:
            raise CPPPParseError("Received empty or truncated HTML response from CPPP portal.")

        soup = BeautifulSoup(html_content, "html.parser")
        now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        # Map all table cells into key-value pairs
        raw_kv: Dict[str, str] = {}
        tables = soup.find_all("table")

        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cols = row.find_all(["td", "th"])
                # Key-value pairs often alternate: [Label, Value, Label, Value]
                i = 0
                while i < len(cols) - 1:
                    lbl = normalize_text(cols[i].get_text())
                    # Clean trailing colon
                    lbl_clean = re.sub(r"[:\s]+$", "", lbl).strip()
                    val = normalize_text(cols[i + 1].get_text())
                    if lbl_clean and val and len(lbl_clean) < 80:
                        raw_kv[lbl_clean] = val
                    i += 2

        # Extract Document Links
        doc_links: List[CPPPDocumentLink] = []
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"].strip()
            link_text = normalize_text(a_tag.get_text())
            if not href or href.startswith("javascript:"):
                continue

            # Check if this link points to a tender document (PDF, zip, doc)
            is_doc = (
                href.lower().endswith(".pdf")
                or "page=FrontEndTenderDetails" in href
                or "download" in href.lower()
                or "tendernotice" in href.lower()
                or "nit" in link_text.lower()
                or "rfp" in link_text.lower()
                or "tender document" in link_text.lower()
                or "boq" in link_text.lower()
            )

            if is_doc:
                # Resolve relative URL
                full_url = urllib.parse.urljoin(official_url, href)
                # Derive clean filename
                fn = href.split("/")[-1].split("?")[0]
                if not fn or not fn.endswith(".pdf"):
                    fn = f"{link_text or 'tender_document'}.pdf"
                    fn = re.sub(r"[^\w\.-]", "_", fn)

                doc_links.append(
                    CPPPDocumentLink(
                        filename=fn,
                        url=full_url,
                        file_type="pdf",
                        description=link_text or "Official Tender Document"
                    )
                )

        # Extract Corrigenda
        corrigenda: List[CPPPCorrigendum] = []
        for table in tables:
            t_text = table.get_text().lower()
            if "corrigendum" in t_text or "amendment" in t_text:
                rows = table.find_all("tr")
                for r in rows:
                    cells = r.find_all("td")
                    if len(cells) >= 3:
                        c_title = normalize_text(cells[0].get_text())
                        c_type = normalize_text(cells[1].get_text())
                        c_date = normalize_text(cells[2].get_text())
                        if c_title and "title" not in c_title.lower():
                            corrigenda.append(
                                CPPPCorrigendum(
                                    corrigendum_id=c_title,
                                    title=c_type,
                                    published_date=parse_indian_date(c_date),
                                    details=f"Type: {c_type}"
                                )
                            )

        # Helper to find value from raw_kv matching multiple potential label variations
        def get_field(*candidate_keys: str) -> Optional[str]:
            for ck in candidate_keys:
                for k, v in raw_kv.items():
                    if ck.lower() == k.lower() or ck.lower() in k.lower():
                        return v
            return None

        # Extract Primary Fields
        tender_id = (
            get_field("Tender ID", "Tender Id", "TenderID")
            or extract_tender_id_from_url(official_url)
        )

        title = (
            get_field("Title", "Work Description", "Name of Work", "Tender Title")
            or raw_kv.get("Tender Description")
        )

        if not title:
            # Fallback: check h1/h2 or page title
            h1 = soup.find(["h1", "h2", "h3"])
            if h1:
                title = normalize_text(h1.get_text())
            else:
                title = f"CPPP Tender {tender_id}"

        org = (
            get_field("Organisation Chain", "Organization", "Organisation Name", "Authority", "Client")
            or "Central Public Procurement Portal"
        )

        dept = get_field("Department", "Division", "Sub Division")
        ref_num = get_field("Tender Reference Number", "Tender Ref No", "Reference Number", "Tender Ref")
        t_category = get_field("Tender Category", "Category")
        p_category = get_field("Product Category", "Product Sub Category")
        t_type = get_field("Tender Type")
        c_type = get_field("Contract Type")
        location = get_field("Location", "Work Location", "Pincode")

        # Critical Dates
        pub_date = parse_indian_date(get_field("Published Date", "Publish Date", "e-Published Date"))
        doc_start = parse_indian_date(get_field("Document Download / Sale Start Date", "Document Download Start Date", "Sale Start Date"))
        doc_end = parse_indian_date(get_field("Document Download / Sale End Date", "Document Download End Date", "Sale End Date"))
        sub_start = parse_indian_date(get_field("Bid Submission Start Date", "Submission Start Date"))
        sub_end = parse_indian_date(get_field("Bid Submission End Date", "Bid Closing Date", "Submission End Date", "Closing Date and Time", "Due Date"))
        open_date = parse_indian_date(get_field("Bid Opening Date", "Technical Bid Opening Date", "Opening Date"))

        # Financial values
        est_val = parse_currency_amount(get_field("Tender Value in ₹", "Tender Value in INR", "Tender Value", "Estimated Cost"))
        emd_val = parse_currency_amount(get_field("EMD Amount in ₹", "EMD Amount in INR", "EMD Amount", "EMD Fee"))
        fee_val = parse_currency_amount(get_field("Tender Fee in ₹", "Tender Fee in INR", "Tender Fee"))

        return CPPPTenderDetail(
            tender_id=tender_id,
            title=title,
            organization=org,
            department=dept,
            tender_reference_number=ref_num,
            tender_category=t_category,
            product_category=p_category,
            tender_type=t_type,
            contract_type=c_type,
            location=location,
            publication_date=pub_date,
            document_download_start_date=doc_start,
            document_download_end_date=doc_end,
            bid_submission_start_date=sub_start,
            closing_date=sub_end,
            bid_opening_date=open_date,
            estimated_value=est_val,
            emd_amount=emd_val,
            tender_fee=fee_val,
            official_detail_url=official_url,
            document_links=doc_links,
            corrigenda=corrigenda,
            source_portal="Central Public Procurement Portal (eprocure.gov.in)",
            source_last_checked=now_ts,
            import_timestamp=now_ts,
            raw_fields=raw_kv,
        )

    @staticmethod
    def parse_tender_listings(html_content: str, base_url: str = "https://eprocure.gov.in") -> List[CPPPTenderSummary]:
        """
        Parses active tender listing tables from CPPP.
        """
        if detect_access_blocked(html_content):
            raise CPPPCaptchaBlockedError(
                "CPPP listing page blocked by human verification. "
                "Please import specific tenders directly using their official URL or Tender ID."
            )

        if not html_content or len(html_content.strip()) < 100:
            return []

        soup = BeautifulSoup(html_content, "html.parser")
        results: List[CPPPTenderSummary] = []

        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cols = row.find_all(["td", "th"])
                if len(cols) < 4:
                    continue

                row_text = row.get_text()
                # Skip header rows
                if "tender id" in row_text.lower() and "organisation" in row_text.lower():
                    continue

                # Look for detail links in row
                links = row.find_all("a", href=True)
                if not links:
                    continue

                detail_link = None
                for a in links:
                    href = a["href"]
                    if "tender" in href.lower() or "detail" in href.lower() or "page=FrontEndTenderDetails" in href:
                        detail_link = urllib.parse.urljoin(base_url, href)
                        break

                if not detail_link:
                    detail_link = urllib.parse.urljoin(base_url, links[0]["href"])

                # Extract ID and Title
                t_id = extract_tender_id_from_url(detail_link)
                col_texts = [normalize_text(c.get_text()) for c in cols]

                # Find Tender ID in texts if not in URL
                for ct in col_texts:
                    m = re.search(r"(\d{4}_[A-Za-z0-9]+_\d+(?:_\d+)?)", ct)
                    if m:
                        t_id = m.group(1)
                        break

                if not t_id or len(t_id) < 5:
                    continue

                # Title is typically in second column or link text
                title = normalize_text(links[0].get_text())
                if len(title) < 5 and len(col_texts) > 1:
                    title = col_texts[1]

                org = col_texts[2] if len(col_texts) > 2 else "Government of India"
                closing_date = col_texts[-1] if col_texts else None

                results.append(
                    CPPPTenderSummary(
                        source_tender_id=t_id,
                        title=title or f"Tender {t_id}",
                        organization=org,
                        closing_date=parse_indian_date(closing_date),
                        detail_url=detail_link,
                        source_portal="Central Public Procurement Portal (eprocure.gov.in)"
                    )
                )

        return results
