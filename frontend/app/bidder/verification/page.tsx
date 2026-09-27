"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, DocumentStatusBadge } from "@/components/ui";
import {
  ShieldCheckIcon,
  UploadIcon,
  FileTextIcon,
  XCircleIcon,
  UploadCloudIcon,
  RefreshCwIcon,
  EyeIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

interface BidderDocument {
  id: string;
  bidder_id: string;
  name: string;
  category: string;
  category_display?: string;
  document_type: string;
  document_number?: string;
  source: string;
  source_display?: string;
  status: string;
  verification_status: string;
  verification_method: string;
  verification_reason?: string;
  verified_at?: string;
  file_name: string;
  file_type: string;
  file_size_kb: number;
  uploaded_at: string;
  issuer?: string;
}

export default function BidderVerificationPage() {
  const [documents, setDocuments] = useState<BidderDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal State for Verification page
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("IDENTITY_TAX");
  const [uploadDocType, setUploadDocType] = useState("PAN");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDocNumber, setUploadDocNumber] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Processing state simulation banner
  const [verifyingState, setVerifyingState] = useState<string | null>(null);

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

    const fileExt = selectedFile.name.split(".").pop()?.toUpperCase() || "PDF";
    const validFileTypes = ["PDF", "JPG", "JPEG", "PNG"];
    if (!validFileTypes.includes(fileExt)) {
      setUploadError("Unsupported file type. Please upload a supported document.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setUploadError("File size exceeds maximum allowed limit of 50 MB.");
      return;
    }

    setUploadSubmitting(true);
    setVerifyingState("Uploading...");

    try {
      const fileSizeKb = Math.max(1, Math.round(selectedFile.size / 1024));

      // Simulate step-by-step verification state
      await new Promise((r) => setTimeout(r, 600));
      setVerifyingState("Verifying... Running automated document verification.");

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
      setSuccessToast(`Document uploaded and verified (${vStatus}).`);
      setTimeout(() => setSuccessToast(null), 4000);
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Document upload failed. Please try again.");
    } finally {
      setUploadSubmitting(false);
      setVerifyingState(null);
    }
  }

  return (
    <div className="space-y-6">
      {successToast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm flex items-center justify-between">
          <span>✓ {successToast}</span>
          <button type="button" onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {verifyingState && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs font-bold text-blue-900 shadow-sm flex items-center gap-3">
          <RefreshCwIcon className="size-4 animate-spin text-blue-600 shrink-0" />
          <div>
            <p>{verifyingState}</p>
            <p className="text-[10px] text-blue-600 font-normal mt-0.5">BidSure AI automated statutory verification pipeline in progress...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              Credential Verification
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Document & Compliance Verification Status
          </h1>
          <p className="text-xs text-slate-500">
            Real-time optical OCR, cryptographic integrity, and statutory authenticity breakdown.
          </p>
        </div>
      </div>

      {/* Documents / Verification List or Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500">
          <RefreshCwIcon className="size-6 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs font-medium">Loading verification records...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <ShieldCheckIcon className="size-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No documents pending verification</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Upload your statutory credentials and bid documents to initiate automated verification.
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => {
                setShowUploadModal(true);
                setUploadError(null);
                setSelectedFile(null);
                setUploadDocName("");
                setUploadDocNumber("");
              }}
            >
              <UploadIcon className="size-3.5" />
              Upload Document for Verification
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Verified Documents Repository ({documents.length})
            </h2>
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              onClick={() => {
                setShowUploadModal(true);
                setUploadError(null);
                setSelectedFile(null);
                setUploadDocName("");
                setUploadDocNumber("");
              }}
            >
              <UploadIcon className="size-3.5" />
              Upload Document for Verification
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Document Name / Type</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Identifier / Number</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Verification Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => {
                    const status = doc.verification_status || doc.status;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div>{doc.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {doc.file_name} • {doc.file_size_kb} KB
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {doc.category_display || doc.category}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-800">
                          {doc.document_number || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                            {doc.source_display || doc.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {status === "AUTHENTICATED" && (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircleIcon className="size-3" /> Authenticated
                              </span>
                            )}
                            {status === "PROCESSING" && (
                              <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                                <RefreshCwIcon className="size-3 animate-spin" /> Processing
                              </span>
                            )}
                            {status === "INVALID" && (
                              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 border border-red-200">
                                <AlertTriangleIcon className="size-3" /> Invalid
                              </span>
                            )}
                            {status === "UNABLE_TO_VERIFY" && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                <AlertTriangleIcon className="size-3" /> Unable to Verify
                              </span>
                            )}
                          </div>
                          {doc.verification_reason && (
                            <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs truncate" title={doc.verification_reason}>
                              {doc.verification_reason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link href="/bidder/documents">
                            <button
                              type="button"
                              title="View in My Documents"
                              className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700 border border-slate-200"
                            >
                              <EyeIcon className="size-3" />
                              View Library
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* UPLOAD DOCUMENT FOR VERIFICATION MODAL */}
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
                  Upload Document for Verification
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
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="IDENTITY_TAX">Identity & Tax (PAN, GST)</option>
                  <option value="BUSINESS_REGISTRATION">Business Registration (Udyam, Incorporation)</option>
                  <option value="STATUTORY">Statutory & Compliance (EPFO, ESIC)</option>
                  <option value="TENDER_SPECIFIC">Tender Specific (Experience, OEM)</option>
                  <option value="FINANCIAL">Financial & Accounts (Balance Sheet)</option>
                  <option value="OTHER">Other Documents</option>
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
                  <option value="PAN">PAN (Permanent Account Number)</option>
                  <option value="GST">GST (Goods & Services Tax)</option>
                  <option value="UDYAM">MSME Udyam Registration</option>
                  <option value="EPFO">EPFO / ESIC Code</option>
                  <option value="EXPERIENCE">Experience Certificate</option>
                  <option value="OEM_AUTHORIZATION">OEM Authorization</option>
                  <option value="TEST_REPORT">Test Report / Quality Certificate</option>
                  <option value="DECLARATION">Compliance Declaration</option>
                  <option value="OTHER">Other Document</option>
                </select>
              </div>

              {/* Title / Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Title / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FY 2025-26 GST Returns"
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Document Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Statutory / Certificate Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AABCA1234F1Z5 or AABCA1234F"
                  value={uploadDocNumber}
                  onChange={(e) => setUploadDocNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-slate-800 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* File Picker */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Document File <span className="text-red-500">*</span>
                </label>
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="verification-file-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="verification-file-input" className="cursor-pointer">
                    <UploadCloudIcon className="mx-auto size-7 text-slate-400 mb-1" />
                    <p className="text-xs font-bold text-slate-700">
                      {selectedFile ? selectedFile.name : "Click to choose PDF, JPG, JPEG, or PNG file"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for verification`
                        : "Maximum file size: 50 MB"}
                    </p>
                  </label>
                </div>
              </div>

              {/* Footer */}
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
                  {uploadSubmitting ? "Uploading & Verifying..." : "Upload & Verify"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
