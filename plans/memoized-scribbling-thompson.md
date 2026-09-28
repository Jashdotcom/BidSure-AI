# Plan: Import 10 Verified CPPP Tenders into BidSure AI

## Context
The user requested the ingestion of 10 official CPPP tender records into the BidSure AI system. These tenders must be registered using the existing tender models, database, and repository stores.

## Implementation Steps

1. **Update `REAL_CPPP_REGISTRY`**:
   - Locate `backend/app/services/tender_sources/cppp_adapter.py`.
   - Update `REAL_CPPP_REGISTRY` to include all 10 verified tender records from the shortlist, ensuring metadata integrity and correct SHA-256 document hashes.

2. **Enhance `document_store.py`**:
   - Update `validate_pdf_bytes` (or add a new validation) to permit `.xls`, `.rar`, and other relevant document extensions.
   - Implement `ensure_seed_documents` logic to support the registration of these 10 official documents.

3. **Synchronize System Data (`sample_data.py`)**:
   - Register the imported tenders within the system's operational store (`SAMPLE_TENDERS`).
   - Log audit events for each successful import using `add_audit_log` from `app.data.sample_data`.

4. **Verify Implementation**:
   - Restart the backend to initialize the data.
   - Use the `/tenders` API to confirm the 10 tenders are listed.
   - Verify document accessibility and AI pipeline integration by initiating an analysis job on one imported document via the `/tenders/analyze-document` endpoint.
   - Verify frontend display in the Tenders list.

## Verification
- Run existing backend tests (`backend/tests/test_cppp_import.py`) to confirm no regression.
- Execute a sample import and analysis flow to ensure end-to-end functionality.
- Report results in the specified final report format.

## Files to Modify
- `backend/app/services/tender_sources/cppp_adapter.py`
- `backend/app/data/document_store.py`
- `backend/app/data/sample_data.py`
