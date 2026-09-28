# Plan: Multi-Document PDF Upload and Metadata Aggregation in Officer Portal

## Context
The user requested multi-document PDF upload support in the Officer Portal's "Import Tender Notice" modal. Currently, only a single PDF can be uploaded. Real government tenders comprise multiple documents (Tender Notice, NIT, Technical Specs, GCC, Integrity Pact, BOQ, Corrigenda). We need to support selecting multiple PDFs, uploading them under one tender, aggregating metadata across documents, storing document records with SHA-256 integrity hashes, handling duplicate files and existing tenders, and making all documents available to AI Tender Analyze.

## Implementation Steps

1. **Backend API & Adapter (`backend/app/api/tenders.py`, `backend/app/services/tender_sources/manual_adapter.py`)**:
   - Update `import_manual_tender` endpoint to accept `files: List[UploadFile] = File(...)`.
   - Update `ManualTenderAdapter.fetch_tender` to handle multiple files/metadata, extracting text and metadata from each document via `OCRService`.
   - Aggregate metadata intelligently: select the clearest Tender ID, title, organization, category, and estimated value across all documents without overwriting valid data with empty/low-confidence values. Detect conflicting metadata.
   - Save every valid document using `save_document` with SHA-256 hash and associate them with the created tender record.
   - Handle duplicate file detection (SHA-256) and existing Tender ID checks with options to attach new documents to existing tenders.

2. **Frontend UI (`frontend/app/(dashboard)/tenders/page.tsx`)**:
   - Update file input in the Manual PDF Upload tab with the `multiple` attribute.
   - Maintain `manualFiles` state as an array of `File` objects.
   - Add drag-and-drop support for multiple files, file listing with sizes, individual file removal (`x`), "Clear All" button, and total document count indicator.
   - Update `handleImportTender` to append all selected files to `FormData` under `"files"`.
   - Handle server responses for metadata review fallback, duplicate files, and existing tender attachments.

3. **AI Tender Analyze & Document Store Integration**:
   - Ensure all associated documents are stored in `documents_index.json` and accessible by `tender_id`.
   - Ensure AI Tender Analyze loads all associated documents for requirement extraction and clause scrutiny.

4. **Verification**:
   - Test multi-file selection (5 PDFs simultaneously).
   - Verify single tender creation with all 5 documents linked.
   - Verify metadata extraction across multiple documents.
   - Verify duplicate file detection and existing tender handling.
   - Run backend tests and verify persistence.

## Critical Files
- `backend/app/api/tenders.py`
- `backend/app/services/tender_sources/manual_adapter.py`
- `frontend/app/(dashboard)/tenders/page.tsx`
- `backend/app/data/document_store.py`

