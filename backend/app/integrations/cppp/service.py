"""
CPPP Integration Service
Business logic layer orchestrating CPPP public tender discovery, field extraction,
non-destructive deduplication, corrigenda and deadline tracking, document ingestion,
data provenance tagging, and audit trail logging.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from .exceptions import (
    CPPPError,
    CPPPNotFoundError,
    CPPPCaptchaBlockedError,
)
from .schemas import (
    CPPPTenderDetail,
    CPPPTenderSummary,
    CPPPSyncResult,
)
from .client import CPPPClient
from .parser import CPPPParser, extract_tender_id_from_url
from app.data import sample_data
from app.data import document_store


class CPPPIntegrationService:
    """
    Service for importing, syncing, and managing authentic public tenders from CPPP.
    """

    def __init__(self, client: Optional[CPPPClient] = None, parser: Optional[CPPPParser] = None):
        self.client = client or CPPPClient()
        self.parser = parser or CPPPParser()

    def fetch_tender_detail(self, url_or_id: str) -> CPPPTenderDetail:
        """
        Fetches and parses tender details from an official CPPP URL or Tender ID.
        """
        official_url = self.client.build_official_detail_url(url_or_id)
        html_content = self.client.fetch_html(official_url)
        detail = self.parser.parse_tender_details(html_content, official_url)
        return detail

    def browse_public_tenders(self, query: Optional[str] = None, page: int = 1) -> List[CPPPTenderSummary]:
        """
        Retrieves active public tender listings from CPPP.
        """
        html_content = self.client.search_public_listings(query=query)
        summaries = self.parser.parse_tender_listings(html_content)

        if query:
            q_clean = query.strip().lower()
            summaries = [
                s for s in summaries
                if q_clean in s.source_tender_id.lower()
                or q_clean in s.title.lower()
                or q_clean in s.organization.lower()
            ]

        return summaries

    def import_tender(
        self,
        url_or_id: str,
        officer_user: Optional[Dict[str, Any]] = None,
        download_documents: bool = True,
        import_method: str = "LIVE_SOURCE_FETCH",
    ) -> Dict[str, Any]:
        """
        Imports or synchronizes a CPPP tender into BidSure AI.
        Guarantees:
        - Primary key deduplication by official Tender ID.
        - Non-destructive updates: preserves existing officer scrutiny, custom rules, AI jobs, and bids.
        - Corrigenda tracking: logs deadline amendments and modifications.
        - Document ingestion: stores authentic PDFs in document_store with SHA-256 deduplication.
        - Data provenance: records source portal, URL, import method, and timestamps.
        - Audit trail logging.
        """
        # 1. Fetch live data from official source
        detail = self.fetch_tender_detail(url_or_id)
        now_ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
        officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
        officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"

        # 2. Check for existing record
        target_tender_id = detail.tender_id
        existing_tender = None
        for t in sample_data.SAMPLE_TENDERS:
            if (
                t.get("id") == target_tender_id
                or t.get("tender_number") == target_tender_id
                or t.get("tender_id") == target_tender_id
                or t.get("ref") == target_tender_id
                or t.get("source_tender_id") == target_tender_id
            ):
                existing_tender = t
                break

        # 3. Handle existing tender update (Non-destructive sync)
        if existing_tender:
            changes = []

            # Check for deadline changes / corrigenda
            prev_closing = existing_tender.get("closing_date")
            new_closing = detail.closing_date

            if new_closing and prev_closing and new_closing != prev_closing:
                # Corrigendum detected
                if "deadline_history" not in existing_tender or existing_tender["deadline_history"] is None:
                    existing_tender["deadline_history"] = []

                seq = len(existing_tender["deadline_history"]) + 1
                corrigendum_entry = {
                    "id": f"AMD-{existing_tender.get('id')}-{seq:03d}",
                    "amendment_number": f"Corrigendum-{seq:02d}",
                    "tender_id": existing_tender.get("id"),
                    "previous_deadline": prev_closing,
                    "previous_deadline_display": sample_data.format_tender_deadline_display(prev_closing),
                    "new_deadline": new_closing,
                    "new_deadline_display": sample_data.format_tender_deadline_display(new_closing),
                    "reason": "Official CPPP Corrigendum / Tender Schedule Revision",
                    "changed_by": f"CPPP Sync ({officer_name})",
                    "changed_by_email": officer_email,
                    "changed_at": now_ts,
                    "source": "CPPP_SYNC"
                }
                existing_tender["deadline_history"].append(corrigendum_entry)
                existing_tender["amendments"] = list(existing_tender["deadline_history"])
                existing_tender["closing_date"] = new_closing
                existing_tender["submission_deadline"] = new_closing
                existing_tender["deadline"] = new_closing
                existing_tender["last_amended_at"] = now_ts
                changes.append(f"Closing date updated from '{prev_closing}' to '{new_closing}' via CPPP Corrigendum")

            # Update metadata fields if provided by source
            if detail.title and detail.title != existing_tender.get("title"):
                existing_tender["title"] = detail.title
                changes.append("Title updated")

            if detail.organization and detail.organization != existing_tender.get("organization"):
                existing_tender["organization"] = detail.organization
                changes.append("Organization updated")

            if detail.department and detail.department != existing_tender.get("department"):
                existing_tender["department"] = detail.department
                changes.append("Department updated")

            if detail.estimated_value is not None and detail.estimated_value != existing_tender.get("estimated_value"):
                existing_tender["estimated_value"] = detail.estimated_value
                changes.append("Estimated value updated")

            if detail.emd_amount is not None and detail.emd_amount != existing_tender.get("emd_amount"):
                existing_tender["emd_amount"] = detail.emd_amount
                changes.append("EMD amount updated")

            if detail.tender_fee is not None and detail.tender_fee != existing_tender.get("tender_fee"):
                existing_tender["tender_fee"] = detail.tender_fee
                changes.append("Tender fee updated")

            # Update sync provenance metadata
            existing_tender["last_synced_at"] = now_ts
            existing_tender["is_live_synced"] = True
            existing_tender["source_last_checked"] = detail.source_last_checked
            existing_tender["source_url"] = detail.official_detail_url

            # Download document if not present
            doc_downloaded = False
            if download_documents and detail.document_links and not existing_tender.get("documents"):
                try:
                    primary_link = detail.document_links[0]
                    file_bytes, filename, ctype = self.client.download_document(primary_link.url)
                    doc_rec = document_store.save_document(
                        file_bytes=file_bytes,
                        filename=filename,
                        tender_id=target_tender_id,
                        uploaded_by=officer_email,
                        source="CPPP_IMPORT",
                        metadata={
                            "title": detail.title,
                            "organization": detail.organization,
                            "official_url": primary_link.url,
                            "tender_id": target_tender_id,
                        }
                    )
                    existing_tender["documents"] = [doc_rec]
                    existing_tender["file_name"] = doc_rec["filename"]
                    existing_tender["document_hash_sha256"] = doc_rec["document_hash_sha256"]
                    existing_tender["document_ingestion_status"] = "INGESTED"
                    existing_tender["document_count"] = 1
                    doc_downloaded = True
                    changes.append(f"Official document '{filename}' downloaded and linked.")
                except Exception as e:
                    existing_tender["document_ingestion_status"] = "MANUAL_UPLOAD_REQUIRED"
                    existing_tender["document_ingestion_note"] = f"Document download note: {str(e)}"

            sample_data.add_audit_log({
                "user_email": officer_email,
                "user_role": officer_role,
                "action": "TENDER_SYNCED_FROM_CPPP",
                "entity_type": "TENDER",
                "entity_id": target_tender_id,
                "details": f"Tender {target_tender_id} synchronized with CPPP. Changes: {', '.join(changes) if changes else 'No changes (in sync)'}.",
                "status": "SUCCESS"
            })

            res = sample_data.compute_tender_bid_counts(existing_tender)
            res["is_new"] = False
            res["is_updated"] = True
            res["changes"] = changes
            res["document_downloaded"] = doc_downloaded
            return res

        # 4. Handle new tender creation
        tender_record = {
            "id": target_tender_id,
            "tender_number": target_tender_id,
            "tender_id": target_tender_id,
            "ref": detail.tender_reference_number or target_tender_id,
            "title": detail.title,
            "organization": detail.organization,
            "department": detail.department,
            "category": detail.tender_category or detail.product_category or "Goods",
            "tender_type": detail.tender_type or "Open Tender",
            "contract_type": detail.contract_type,
            "location": detail.location,
            "publish_date": detail.publication_date or now_ts,
            "issue_date": detail.publication_date or now_ts,
            "document_download_start": detail.document_download_start_date,
            "document_download_end": detail.document_download_end_date,
            "bid_submission_start": detail.bid_submission_start_date,
            "closing_date": detail.closing_date,
            "submission_deadline": detail.closing_date,
            "deadline": detail.closing_date,
            "bid_opening_date": detail.bid_opening_date,
            "estimated_value": detail.estimated_value,
            "emd_amount": detail.emd_amount,
            "tender_fee": detail.tender_fee,
            "status": "PUBLISHED",
            "source": "CPPP",
            "source_portal": detail.source_portal,
            "source_url": detail.official_detail_url,
            "official_source_url": detail.official_detail_url,
            "source_tender_id": detail.tender_id,
            "external_tender_id": detail.tender_id,
            "external_reference_number": detail.tender_reference_number or target_tender_id,
            "import_method": import_method,
            "imported_at": now_ts,
            "last_synced_at": now_ts,
            "source_last_checked": detail.source_last_checked,
            "is_live_synced": True,
            "is_real_public_tender": True,
            "document_ingestion_status": "PENDING",
            "documents": [],
            "requirements": [],
            "deadline_history": [],
            "amendments": [],
            "bids_count": 0,
            "verified_count": 0,
            "description": f"{detail.title} — Official public procurement tender issued by {detail.organization} on Central Public Procurement Portal.",
            "raw_source_fields": detail.raw_fields,
        }

        # Handle document download
        doc_downloaded = False
        if download_documents and detail.document_links:
            try:
                primary_link = detail.document_links[0]
                file_bytes, filename, ctype = self.client.download_document(primary_link.url)
                doc_rec = document_store.save_document(
                    file_bytes=file_bytes,
                    filename=filename,
                    tender_id=target_tender_id,
                    uploaded_by=officer_email,
                    source="CPPP_IMPORT",
                    metadata={
                        "title": detail.title,
                        "organization": detail.organization,
                        "official_url": primary_link.url,
                        "tender_id": target_tender_id,
                    }
                )
                tender_record["documents"] = [doc_rec]
                tender_record["file_name"] = doc_rec["filename"]
                tender_record["document_hash_sha256"] = doc_rec["document_hash_sha256"]
                tender_record["document_ingestion_status"] = "INGESTED"
                tender_record["document_count"] = 1
                doc_downloaded = True
            except Exception as e:
                tender_record["document_ingestion_status"] = "MANUAL_UPLOAD_REQUIRED"
                tender_record["document_ingestion_note"] = f"Automatic download failed ({str(e)}). Please upload official PDF manually."
        else:
            tender_record["document_ingestion_status"] = "MANUAL_UPLOAD_REQUIRED"
            tender_record["document_ingestion_note"] = "No direct document download link found on portal page. Upload PDF manually."

        # Insert directly into SAMPLE_TENDERS with lock
        with sample_data._tender_number_lock:
            sample_data.SAMPLE_TENDERS.insert(0, tender_record)

        sample_data.add_audit_log({
            "user_email": officer_email,
            "user_role": officer_role,
            "action": "TENDER_IMPORTED_FROM_CPPP",
            "entity_type": "TENDER",
            "entity_id": target_tender_id,
            "details": f"Authentic public tender '{detail.title}' ({target_tender_id}) imported from CPPP. Official URL: {detail.official_detail_url}",
            "status": "SUCCESS"
        })

        res = sample_data.compute_tender_bid_counts(tender_record)
        res["is_new"] = True
        res["is_updated"] = False
        res["document_downloaded"] = doc_downloaded
        return res

    def sync_tender(self, tender_id: str, officer_user: Optional[Dict[str, Any]] = None) -> CPPPSyncResult:
        """
        Refreshes a CPPP-imported tender with live data from the official portal.
        """
        tender = sample_data.get_tender_by_id(tender_id)
        if not tender:
            raise CPPPNotFoundError(f"Tender '{tender_id}' not found in BidSure AI database.")

        source_url = tender.get("source_url") or tender.get("official_source_url")
        source_id = tender.get("source_tender_id") or tender.get("tender_id") or tender.get("id")
        target_query = source_url or source_id

        res = self.import_tender(
            url_or_id=target_query,
            officer_user=officer_user,
            download_documents=True,
            import_method="LIVE_SYNC"
        )

        changes = res.get("changes", [])
        return CPPPSyncResult(
            tender_id=tender_id,
            updated=res.get("is_updated", False),
            changes=changes,
            last_synced_at=res.get("last_synced_at") or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            message=f"Successfully synced with CPPP. {len(changes)} field(s) updated." if changes else "Tender is already in sync with CPPP.",
            document_status=res.get("document_ingestion_status")
        )
