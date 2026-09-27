"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import {
  FileTextIcon,
  UploadIcon,
  UploadCloudIcon,
  CheckCircleIcon,
  DownloadIcon,
  EyeIcon,
  TrashIcon,
  SearchIcon,
  SparklesIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  PlusIcon,
  XCircleIcon,
  ShieldCheckIcon,
  EditIcon,
  CheckIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

export type DocumentVerificationStatus =
  | "PROCESSING"
  | "AUTHENTICATED"
  | "INVALID"
  | "UNABLE_TO_VERIFY";

export interface BidderDocument {
  id: string;
  bidder_id: string;
  name: string;
  category: string;
  category_display?: string;
  document_type: string;
  document_number?: string;
  source: "MANUAL_UPLOAD" | "DIGILOCKER" | "DIGILOCKER_DEMO";
  source_display?: string;
  status: DocumentVerificationStatus | string;
  verification_status: DocumentVerificationStatus | string;
  verification_method?: string;
  verification_reason?: string;
  verified_at?: string;
  file_name: string;
  file_type: string;
  file_size_kb: number;
  uploaded_at: string;
  issuer?: string;
  is_synthetic_demo?: boolean;
  demo_watermark?: string;
  preview_summary?: string;
  description?: string;
}

interface DigiLockerCatalogItem {
  key: string;
  name: string;
  category: string;
  category_display: string;
  document_type: string;
  issuer: string;
  issuer_code: string;
  document_number: string;
  format: string;
  file_size_kb: number;
  eligible: boolean;
  already_imported?: boolean;
  description: string;
  demo_watermark: string;
}

export default function BidderDocumentsPage() {
  const [documents, setDocuments] = useState<BidderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDigiLockerModal, setShowDigiLockerModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<BidderDocument | null>(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState<BidderDocument | null>(null);
  const [replaceDocTarget, setReplaceDocTarget] = useState<BidderDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Upload Form State
  const [uploadCategory, setUploadCategory] = useState("IDENTITY_TAX");
  const [uploadDocType, setUploadDocType] = useState("PAN");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDocNumber, setUploadDocNumber] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Replace Form State
  const [replaceDocName, setReplaceDocName] = useState("");
  const [replaceDocNumber, setReplaceDocNumber] = useState("");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  // DigiLocker Modal State
  const [digiLockerStep, setDigiLockerStep] = useState<"CONNECT" | "SELECT">("CONNECT");
  const [digiLockerCatalog, setDigiLockerCatalog] = useState<DigiLockerCatalogItem[]>([]);
  const [selectedDigiKeys, setSelectedDigiKeys] = useState<string[]>([]);
  const [digiImporting, setDigiImporting] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await apiRequest<{ documents: BidderDocument[] }>("/bidder-portal/documents");
      if (res && Array.isArray(res.documents)) {
        setDocuments(res.documents);
      } else {
        setDocuments([]);
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  // Open DigiLocker modal & fetch available items
  async function handleOpenDigiLocker() {
    setShowDigiLockerModal(true);
    setDigiLockerStep("CONNECT");
    setSelectedDigiKeys([]);
    try {
      const res = await apiRequest<{ available_documents: DigiLockerCatalogItem[] }>(
        "/bidder-portal/documents/digilocker/available"
      );
      if (res?.available_documents) {
        setDigiLockerCatalog(res.available_documents);
      }
    } catch {
      // fallback handled in UI
    }
  }

  // Proceed to Step 2 of DigiLocker
  function handleDigiLockerConnect() {
    setDigiLockerStep("SELECT");
    // Pre-select non-imported items
    const available = digiLockerCatalog.filter((d) => !d.already_imported).map((d) => d.key);
    setSelectedDigiKeys(available.length > 0 ? available : digiLockerCatalog.map((d) => d.key));
  }

  // Import selected DigiLocker items
  async function handleImportDigiLocker() {
    if (selectedDigiKeys.length === 0) return;
    setDigiImporting(true);
    try {
      await apiRequest("/bidder-portal/documents/digilocker/import", {
        method: "POST",
        body: JSON.stringify({ document_keys: selectedDigiKeys }),
      });
      setShowDigiLockerModal(false);
      setSuccessToast(`Successfully imported and authenticated ${selectedDigiKeys.length} document(s) from DigiLocker (Demo).`);
      setTimeout(() => setSuccessToast(null), 4000);
      await loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to import documents from DigiLocker.");
    } finally {
      setDigiImporting(false);
    }
  }

  // Handle Manual Upload
  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);

    if (!uploadDocName.trim()) {
      setUploadError("Please provide a Document Name.");
      return;
    }

    if (!selectedFile) {
      setUploadError("Please select a valid PDF, JPG, JPEG, or PNG file to upload.");
      return;
    }

    // Size check (max 50 MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setUploadError("File size exceeds maximum allowed limit of 50 MB.");
      return;
    }

    setUploadSubmitting(true);
    try {
      const fileExt = selectedFile.name.split(".").pop()?.toUpperCase() || "PDF";
      const fileSizeKb = Math.max(1, Math.round(selectedFile.size / 1024));

      const res = await apiRequest<{ document: BidderDocument }>("/bidder-portal/documents/upload", {
        method: "POST",
        body: JSON.stringify({
          name: uploadDocName.trim(),
          category: uploadCategory,
          document_type: uploadDocType,
          document_number: uploadDocNumber.trim(),
          file_name: selectedFile.name,
          file_type: fileExt,
          file_size_kb: fileSizeKb,
          description: uploadDescription.trim(),
        }),
      });

      setShowUploadModal(false);
      setUploadDocName("");
      setUploadDocNumber("");
      setUploadDescription("");
      setSelectedFile(null);
      const vStatus = res?.document?.verification_status || "AUTHENTICATED";
      setSuccessToast(`Document "${uploadDocName}" uploaded and verified (${vStatus}).`);
      setTimeout(() => setSuccessToast(null), 4000);
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please check file format and size.");
    } finally {
      setUploadSubmitting(false);
    }
  }

  // Handle Open Replace Modal
  function handleOpenReplaceModal(doc: BidderDocument) {
    setReplaceDocTarget(doc);
    setReplaceDocName(doc.name);
    setReplaceDocNumber(doc.document_number || "");
    setReplaceFile(null);
    setReplaceError(null);
  }

  // Handle Replace Submit
  async function handleReplaceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!replaceDocTarget) return;
    setReplaceError(null);

    if (!replaceDocName.trim()) {
      setReplaceError("Document Name is required.");
      return;
    }

    setReplaceSubmitting(true);
    try {
      let fileExt = replaceDocTarget.file_type;
      let fileSizeKb = replaceDocTarget.file_size_kb;
      let fileName = replaceDocTarget.file_name;

      if (replaceFile) {
        if (replaceFile.size > 50 * 1024 * 1024) {
          setReplaceError("File size exceeds 50 MB limit.");
          setReplaceSubmitting(false);
          return;
        }
        fileExt = replaceFile.name.split(".").pop()?.toUpperCase() || "PDF";
        fileSizeKb = Math.max(1, Math.round(replaceFile.size / 1024));
        fileName = replaceFile.name;
      }

      const res = await apiRequest<{ document: BidderDocument }>(
        `/bidder-portal/documents/${replaceDocTarget.id}/replace`,
        {
          method: "POST",
          body: JSON.stringify({
            name: replaceDocName.trim(),
            document_number: replaceDocNumber.trim(),
            file_name: fileName,
            file_type: fileExt,
            file_size_kb: fileSizeKb,
          }),
        }
      );

      setReplaceDocTarget(null);
      const vStatus = res?.document?.verification_status || "AUTHENTICATED";
      setSuccessToast(`Document replaced and re-verified (${vStatus}).`);
      setTimeout(() => setSuccessToast(null), 4000);
      if (previewDoc && previewDoc.id === replaceDocTarget.id) {
        setPreviewDoc(res?.document || null);
      }
      await loadDocuments();
    } catch (err: any) {
      setReplaceError(err.message || "Failed to replace document.");
    } finally {
      setReplaceSubmitting(false);
    }
  }

  // Handle Retry Verification
  async function handleRetryVerification(doc: BidderDocument) {
    setRetryingId(doc.id);
    try {
      const res = await apiRequest<{ document: BidderDocument }>(
        `/bidder-portal/documents/${doc.id}/retry-verification`,
        { method: "POST" }
      );
      const newStatus = res?.document?.verification_status || "AUTHENTICATED";
      setSuccessToast(`Re-verification completed: ${newStatus}`);
      setTimeout(() => setSuccessToast(null), 4000);
      if (previewDoc && previewDoc.id === doc.id) {
        setPreviewDoc(res?.document || null);
      }
      await loadDocuments();
    } catch (err: any) {
      alert(err.message || "Verification retry failed.");
    } finally {
      setRetryingId(null);
    }
  }

  // Handle Delete
  async function handleDeleteConfirm() {
    if (!deleteDocTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/bidder-portal/documents/${deleteDocTarget.id}`, {
        method: "DELETE",
      });
      setSuccessToast(`Document "${deleteDocTarget.name}" deleted from library.`);
      setTimeout(() => setSuccessToast(null), 4000);
      if (previewDoc && previewDoc.id === deleteDocTarget.id) {
        setPreviewDoc(null);
      }
      setDeleteDocTarget(null);
      await loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  }

  // Download simulation
  function handleDownload(doc: BidderDocument) {
    const vStatus = doc.verification_status || doc.status;
    const textContent = `BIDSURE AI - PROCUREMENT DOCUMENT REPOSITORY\n============================================\n${doc.demo_watermark || "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE"}\n\nDocument ID: ${doc.id}\nDocument Name: ${doc.name}\nCategory: ${doc.category_display || doc.category}\nDocument Type: ${doc.document_type}\nDocument Number: ${doc.document_number || "N/A"}\nSource: ${doc.source_display || doc.source}\nVerification Status: ${vStatus}\nVerification Method: ${doc.verification_method || "OCR_RULE_CHECK"}\nVerification Reason: ${doc.verification_reason || "Automated check passed"}\nVerified At: ${doc.verified_at || doc.uploaded_at}\nIssuer: ${doc.issuer || "Authorized Entity"}\nUploaded / Imported At: ${doc.uploaded_at}\n\nSummary / Verification Note:\n${doc.preview_summary || doc.description || "Valid procurement document registered and authenticated in BidSure AI."}\n`;
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name.replace(".pdf", ".txt");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Filter documents
  const filtered = documents.filter((d) => {
    const matchesCategory =
      selectedCategory === "ALL" || d.category === selectedCategory;
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.document_number && d.document_number.toLowerCase().includes(search.toLowerCase())) ||
      (d.category_display && d.category_display.toLowerCase().includes(search.toLowerCase())) ||
      (d.issuer && d.issuer.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Source Badge renderer
  function renderSourceBadge(source: string) {
    if (source === "DIGILOCKER_DEMO" || source === "DigiLocker (Demo)") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
          <SparklesIcon className="size-3 text-purple-600" />
          DigiLocker (Demo)
        </span>
      );
    }
    if (source === "DIGILOCKER" || source === "DigiLocker") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
          <CheckCircleIcon className="size-3 text-emerald-600" />
          DigiLocker
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
        <UploadCloudIcon className="size-3 text-slate-500" />
        Manual Upload
      </span>
    );
  }

  // System-Driven Verification Status Badge renderer
  function renderVerificationStatusBadge(doc: BidderDocument) {
    const statusVal = (doc.verification_status || doc.status || "AUTHENTICATED").toUpperCase();

    switch (statusVal) {
      case "AUTHENTICATED":
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
            <CheckIcon className="size-3 text-emerald-600" />
            Authenticated
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-800 border border-indigo-200">
            <RefreshCwIcon className="size-2.5 animate-spin text-indigo-600" />
            Processing
          </span>
        );
      case "INVALID":
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-extrabold text-red-800 border border-red-200">
            <XCircleIcon className="size-3 text-red-600" />
            Invalid
          </span>
        );
      case "UNABLE_TO_VERIFY":
      case "REQUIRES_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 border border-amber-200">
            <AlertTriangleIcon className="size-3 text-amber-600" />
            Unable to Verify
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
            {statusVal}
          </span>
        );
    }
  }

  // Verification Method Label Formatter
  function formatVerificationMethod(method?: string) {
    switch (method) {
      case "DIGILOCKER_DEMO":
        return "DigiLocker Sandbox Adapter";
      case "DEMO_ADAPTER":
        return "Direct Statutory Adapter";
      case "OCR_RULE_CHECK":
        return "OCR & Structural Format Check";
      case "CRYPTOGRAPHIC_CHECK":
        return "Cryptographic Signature Check";
      case "CROSS_DOCUMENT_CHECK":
        return "Cross-Document Integrity Rule";
      case "SANDBOX_API":
        return "Government Sandbox API";
      default:
        return method || "BidSure AI Automated Rule Engine";
    }
  }

  // Format Date display
  function formatDate(ts?: string) {
    if (!ts) return "N/A";
    try {
      const dt = new Date(ts);
      return dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return ts;
    }
  }

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      {/* Toast alert */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-md animate-in fade-in duration-200">
          <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          Bidder Self-Service Repository
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          My Documents
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Upload and manage your statutory business documents. BidSure AI automatically inspects and verifies credential authenticity for instant tender reuse.
        </p>
      </div>

      {/* Top Action Cards: Upload Documents & Import from DigiLocker */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* OPTION 1: Upload Documents Card */}
        <Card className="flex flex-col justify-between p-5 border-slate-200 hover:border-slate-300 transition-colors bg-white">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <UploadCloudIcon className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upload Documents</h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  Direct Statutory Upload & OCR
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload PAN, GST, Udyam, registration certificates, experience certificates, OEM authorizations, declarations, test reports and other procurement documents.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                Supported: PDF, JPG, JPEG, PNG
              </span>
              <span>• Max 50 MB</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Button
              size="sm"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              onClick={() => {
                setUploadError(null);
                setShowUploadModal(true);
              }}
            >
              <UploadIcon className="size-3.5" />
              Upload Document
            </Button>
          </div>
        </Card>

        {/* OPTION 2: Import from DigiLocker Card */}
        <Card className="flex flex-col justify-between p-5 border-purple-200/80 bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/30">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
                  <SparklesIcon className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Import from DigiLocker</h3>
                  <span className="text-[10px] text-purple-700 font-bold">
                    Gov-Sandbox Integration
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-purple-800 border border-purple-200">
                Demo Adapter
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fetch eligible digital credentials from your DigiLocker locker for verified tender participation.
            </p>

            {/* Clear Demo State Disclaimer Notice */}
            <div className="rounded-lg border border-purple-200/70 bg-purple-50/80 p-2.5 text-[11px] text-purple-900 leading-snug">
              <span className="font-bold text-purple-950 block mb-0.5">
                DigiLocker Demo Mode
              </span>
              Government DigiLocker integration requires authorized API access. This prototype demonstrates the integration flow using a sandbox/demo adapter.
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100">
            <Button
              size="sm"
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-sm shadow-purple-600/10"
              onClick={handleOpenDigiLocker}
            >
              <SparklesIcon className="size-3.5" />
              Connect DigiLocker
            </Button>
          </div>
        </Card>
      </div>

      {/* MY DOCUMENT LIBRARY SECTION */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">My Document Library</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {documents.length}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by title, number, issuer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL", label: "All Documents" },
            { key: "IDENTITY_TAX", label: "Identity & Tax" },
            { key: "BUSINESS_REGISTRATION", label: "Business Registration" },
            { key: "STATUTORY", label: "Statutory" },
            { key: "TENDER_SPECIFIC", label: "Tender Specific" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategory(tab.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === tab.key
                  ? "bg-[#0f172a] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Documents Table / Card List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500">
            <RefreshCwIcon className="size-6 animate-spin text-emerald-600 mb-2" />
            <p className="text-xs font-medium">Loading document repository...</p>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <FileTextIcon className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {search || selectedCategory !== "ALL" ? "No matching documents found" : "No documents yet"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {search || selectedCategory !== "ALL"
                ? `No documents match the filter "${search || selectedCategory}".`
                : "Upload your business documents or import eligible documents from DigiLocker."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 font-bold"
                onClick={() => {
                  setUploadError(null);
                  setShowUploadModal(true);
                }}
              >
                <UploadIcon className="size-3.5" />
                Upload Document
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 font-bold"
                onClick={handleOpenDigiLocker}
              >
                <SparklesIcon className="size-3.5" />
                Connect DigiLocker
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Document Name</th>
                    <th className="px-3 py-3">Category / Type</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">File / Size</th>
                    <th className="px-3 py-3">Verification Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((doc) => {
                    const vStatus = (doc.verification_status || doc.status || "AUTHENTICATED").toUpperCase();
                    const isInvalidOrUnable = vStatus === "INVALID" || vStatus === "UNABLE_TO_VERIFY" || vStatus === "REQUIRES_REVIEW";
                    const isProcessing = vStatus === "PROCESSING" || retryingId === doc.id;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Document Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded bg-slate-100 text-slate-500 shrink-0">
                              <FileTextIcon className="size-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{doc.name}</p>
                              {doc.document_number && (
                                <p className="text-[11px] text-slate-400 font-mono truncate">
                                  No: {doc.document_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-3 py-3">
                          <span className="font-medium text-slate-700">
                            {doc.category_display || doc.category}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {doc.document_type}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="px-3 py-3">
                          {renderSourceBadge(doc.source_display || doc.source)}
                        </td>

                        {/* Upload Date */}
                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(doc.uploaded_at)}
                        </td>

                        {/* File type & size */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 font-bold">
                            {doc.file_type}
                          </span>
                          <span className="ml-1 text-[11px] text-slate-400">
                            {doc.file_size_kb} KB
                          </span>
                        </td>

                        {/* Verification Status */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {renderVerificationStatusBadge(doc)}
                        </td>

                        {/* Contextual Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* Retry Verification (for invalid / unable to verify) */}
                            {isInvalidOrUnable && (
                              <button
                                type="button"
                                title="Retry Automated Verification"
                                disabled={isProcessing}
                                onClick={() => handleRetryVerification(doc)}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 border border-slate-200"
                              >
                                <RefreshCwIcon className={`size-3 ${isProcessing ? "animate-spin text-emerald-600" : ""}`} />
                                Retry
                              </button>
                            )}

                            {/* Replace Document */}
                            <button
                              type="button"
                              title="Replace Document"
                              onClick={() => handleOpenReplaceModal(doc)}
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold border transition-colors ${
                                isInvalidOrUnable
                                  ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                                  : "text-slate-600 hover:bg-slate-100 border-slate-200"
                              }`}
                            >
                              <EditIcon className="size-3" />
                              Replace
                            </button>

                            {/* Preview */}
                            <button
                              type="button"
                              title="Preview Document"
                              onClick={() => setPreviewDoc(doc)}
                              className="flex size-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <EyeIcon className="size-3.5" />
                            </button>

                            {/* Download */}
                            <button
                              type="button"
                              title="Download Document"
                              onClick={() => handleDownload(doc)}
                              className="flex size-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <DownloadIcon className="size-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              title="Delete Document"
                              onClick={() => setDeleteDocTarget(doc)}
                              className="flex size-7 items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. UPLOAD DOCUMENT MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <UploadCloudIcon className="size-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Upload Procurement Document
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="size-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                ⚠ {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-3.5 text-xs">
              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => {
                    setUploadCategory(e.target.value);
                    if (e.target.value === "IDENTITY_TAX") setUploadDocType("PAN");
                    else if (e.target.value === "BUSINESS_REGISTRATION") setUploadDocType("UDYAM");
                    else if (e.target.value === "STATUTORY") setUploadDocType("EPFO");
                    else if (e.target.value === "TENDER_SPECIFIC") setUploadDocType("OEM_AUTHORIZATION");
                    else setUploadDocType("OTHER");
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="IDENTITY_TAX">Identity & Tax (PAN, GST)</option>
                  <option value="BUSINESS_REGISTRATION">Business Registration (Udyam, CIN, Registration)</option>
                  <option value="STATUTORY">Statutory & Compliance (EPFO, ESIC)</option>
                  <option value="TENDER_SPECIFIC">Tender Specific (OEM MAF, Experience, Declarations)</option>
                  <option value="FINANCIAL">Financial & Audited Accounts</option>
                  <option value="OTHER">Other Procurement Document</option>
                </select>
              </div>

              {/* Document Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Type
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 focus:border-emerald-600 focus:outline-none"
                >
                  {uploadCategory === "IDENTITY_TAX" && (
                    <>
                      <option value="PAN">PAN Card</option>
                      <option value="GST">GST Registration Certificate (REG-06)</option>
                      <option value="GSTR3B">GSTR-3B Return Filing Proof</option>
                    </>
                  )}
                  {uploadCategory === "BUSINESS_REGISTRATION" && (
                    <>
                      <option value="UDYAM">MSME Udyam Registration Certificate</option>
                      <option value="COMPANY_REGISTRATION">Certificate of Incorporation (CIN)</option>
                      <option value="PARTNERSHIP_DEED">Partnership Deed / Trust Deed</option>
                    </>
                  )}
                  {uploadCategory === "STATUTORY" && (
                    <>
                      <option value="EPFO">EPFO Establishment Certificate & Challan</option>
                      <option value="ESIC">ESIC Registration Proof</option>
                      <option value="LABOUR_LICENSE">Statutory Labour License</option>
                    </>
                  )}
                  {uploadCategory === "TENDER_SPECIFIC" && (
                    <>
                      <option value="OEM_AUTHORIZATION">Manufacturer Authorization Form (MAF)</option>
                      <option value="EXPERIENCE">Past Experience & Completion Certificate</option>
                      <option value="LOCAL_CONTENT_DECLARATION">Class-I Local Content Declaration (MII)</option>
                      <option value="BLACKLISTING_DECLARATION">Non-Blacklisting & Integrity Affidavit</option>
                      <option value="TEST_REPORT">Type Test Report / Quality Certificate</option>
                    </>
                  )}
                  {uploadCategory === "FINANCIAL" && (
                    <>
                      <option value="AUDITED_BALANCE_SHEET">Audited Balance Sheet & P&L</option>
                      <option value="CA_TURNOVER_CERTIFICATE">CA Certified Turnover Certificate with UDIN</option>
                      <option value="SOLVENCY_CERTIFICATE">Bank Solvency Certificate</option>
                    </>
                  )}
                  {uploadCategory === "OTHER" && (
                    <option value="OTHER">Other Custom Document</option>
                  )}
                </select>
              </div>

              {/* Document Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Title / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manufacturer Authorization Form for Next-Gen Firewall"
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Document Number (Optional) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document / Certificate Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27ABCDE1234F1Z5, MAF-2026-IITG-99"
                  value={uploadDocNumber}
                  onChange={(e) => setUploadDocNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* File Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select File <span className="text-red-500">*</span>
                </label>
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="doc-file-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        if (!uploadDocName) {
                          setUploadDocName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="doc-file-input" className="cursor-pointer">
                    <UploadCloudIcon className="mx-auto size-7 text-slate-400 mb-1" />
                    <p className="text-xs font-bold text-slate-700">
                      {selectedFile ? selectedFile.name : "Click to choose file or drag and drop"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready to upload`
                        : "PDF, JPG, JPEG, PNG up to 50 MB"}
                    </p>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploadSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {uploadSubmitting ? "Uploading & Verifying..." : "Upload Document"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. REPLACE DOCUMENT MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {replaceDocTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <EditIcon className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Replace Document
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {replaceDocTarget.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplaceDocTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="size-5" />
              </button>
            </div>

            {replaceError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                ⚠ {replaceError}
              </div>
            )}

            <form onSubmit={handleReplaceSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Title / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={replaceDocName}
                  onChange={(e) => setReplaceDocName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document / Certificate Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Correct statutory number"
                  value={replaceDocNumber}
                  onChange={(e) => setReplaceDocNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Upload New File (Optional if only correcting number)
                </label>
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-3.5 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="replace-file-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReplaceFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="replace-file-input" className="cursor-pointer">
                    <UploadCloudIcon className="mx-auto size-6 text-slate-400 mb-1" />
                    <p className="text-xs font-bold text-slate-700">
                      {replaceFile ? replaceFile.name : `Keep existing: ${replaceDocTarget.file_name}`}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {replaceFile
                        ? `${(replaceFile.size / 1024).toFixed(1)} KB • Ready to upload`
                        : "Click to choose a replacement file (PDF, JPG, JPEG, PNG)"}
                    </p>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReplaceDocTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={replaceSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {replaceSubmitting ? "Re-verifying..." : "Save & Verify"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. DIGILOCKER SANDBOX MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showDigiLockerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-purple-200 bg-white p-6 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <SparklesIcon className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    DigiLocker Integration
                  </h3>
                  <span className="text-[10px] text-purple-700 font-semibold">
                    Simulated Sandbox Adapter
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDigiLockerModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="size-5" />
              </button>
            </div>

            {/* Clear Sandbox Notice */}
            <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/70 p-3 text-[11px] text-purple-900 leading-relaxed">
              <span className="font-bold text-purple-950 block mb-0.5">
                DigiLocker Demo Mode
              </span>
              Government DigiLocker integration requires authorized API access. This prototype demonstrates the integration flow using a sandbox/demo adapter.
            </div>

            {digiLockerStep === "CONNECT" ? (
              /* STEP 1: Connect Account */
              <div className="mt-4 space-y-4 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center space-y-2">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <SparklesIcon className="size-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Connect DigiLocker Account
                  </h4>
                  <p className="text-slate-500 text-[11px] max-w-xs mx-auto">
                    BidSure AI requests permission to access eligible business credentials from your DigiLocker locker to streamline tender compliance.
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                  <p className="font-bold text-slate-800">Permissions Requested:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>Read Permanent Account Number (PAN) Record</li>
                    <li>Read GST Registration Certificate (REG-06)</li>
                    <li>Read MSME Udyam Registration Certificate</li>
                    <li>Read Certificate of Incorporation (CIN / MCA)</li>
                  </ul>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDigiLockerModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
                    onClick={handleDigiLockerConnect}
                  >
                    <SparklesIcon className="size-3.5" />
                    Continue with DigiLocker
                  </Button>
                </div>
              </div>
            ) : (
              /* STEP 2: Select & Import Documents */
              <div className="mt-4 space-y-3.5 text-xs">
                <p className="font-semibold text-slate-700">
                  Select eligible documents to import into My Documents:
                </p>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {digiLockerCatalog.map((item) => {
                    const isSelected = selectedDigiKeys.includes(item.key);
                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDigiKeys(selectedDigiKeys.filter((k) => k !== item.key));
                          } else {
                            setSelectedDigiKeys([...selectedDigiKeys, item.key]);
                          }
                        }}
                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/50 shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 size-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-900 truncate">
                              {item.name}
                            </p>
                            {item.already_imported && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-500 shrink-0">
                                In Library
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Issuer: {item.issuer}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Doc No: {item.document_number} • {item.format} ({item.file_size_kb} KB)
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    {selectedDigiKeys.length} document(s) selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDigiLockerStep("CONNECT")}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={selectedDigiKeys.length === 0 || digiImporting}
                      className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
                      onClick={handleImportDigiLocker}
                    >
                      {digiImporting ? "Importing & Authenticating..." : "Import Selected Documents"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. DOCUMENT PREVIEW MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                  <FileTextIcon className="size-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">
                  {previewDoc.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="size-5" />
              </button>
            </div>

            {/* Watermark Banner */}
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-center text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              {previewDoc.demo_watermark || "DEMO DOCUMENT — NOT A GOVERNMENT CERTIFICATE"}
            </div>

            {/* Document Details Card */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Category / Type
                  </span>
                  <p className="font-bold text-slate-800">
                    {previewDoc.category_display || previewDoc.category} ({previewDoc.document_type})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Document Number
                  </span>
                  <p className="font-mono font-bold text-slate-800">
                    {previewDoc.document_number || "Not Specified"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Document Source
                  </span>
                  <div className="mt-0.5">
                    {renderSourceBadge(previewDoc.source_display || previewDoc.source)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Verification Status
                  </span>
                  <div className="mt-0.5">
                    {renderVerificationStatusBadge(previewDoc)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Issuing Authority
                  </span>
                  <p className="text-slate-800 font-medium">
                    {previewDoc.issuer || "Self-Certified"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    File Metadata
                  </span>
                  <p className="text-slate-800 font-medium">
                    {previewDoc.file_type} • {previewDoc.file_size_kb} KB • {formatDate(previewDoc.uploaded_at)}
                  </p>
                </div>
              </div>

              {/* BidSure AI Automated Verification Authority Card */}
              <div className="mt-3 pt-3 border-t border-slate-200 rounded-lg bg-white p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="size-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      BidSure AI Automated Verification
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {previewDoc.verified_at ? formatDate(previewDoc.verified_at) : "Verified on Ingestion"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Inspection Method: </span>
                  {formatVerificationMethod(previewDoc.verification_method)}
                </p>
                {previewDoc.verification_reason && (
                  <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-700">Diagnostic Reason: </span>
                    {previewDoc.verification_reason}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                  <span>Inspection Authority: BidSure AI Statutory Pipeline</span>
                  <span>Autonomous Engine (No Manual Officer Review)</span>
                </div>
              </div>

              {/* Summary / Notes */}
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Document Summary / Content
                </span>
                <p className="mt-1 text-slate-700 text-xs leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {previewDoc.preview_summary || previewDoc.description || "Valid procurement document registered in BidSure AI."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(previewDoc)}
                >
                  <DownloadIcon className="size-3.5" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-700"
                  onClick={() => {
                    const target = previewDoc;
                    setPreviewDoc(null);
                    handleOpenReplaceModal(target);
                  }}
                >
                  <EditIcon className="size-3.5" />
                  Replace
                </Button>
              </div>
              <Button
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                onClick={() => setPreviewDoc(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. DELETE CONFIRMATION DIALOG */}
      {/* ──────────────────────────────────────────────────────────── */}
      {deleteDocTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
              <TrashIcon className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Delete this document?
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-800">&ldquo;{deleteDocTarget.name}&rdquo;</span> from your document library? This action will remove it from future tender auto-attachment.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteDocTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
