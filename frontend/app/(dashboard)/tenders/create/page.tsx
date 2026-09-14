"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Button } from "@/components/ui";
import {
  FileTextIcon,
  UploadCloudIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  SparklesIcon,
  RefreshCwIcon,
  TrashIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { Tender } from "@/lib/types";

const TENDER_CATEGORIES = [
  "Goods",
  "Services",
  "Works",
  "Consultancy",
  "Industrial PPE",
  "Piping & Instrumentation",
  "Mechanical & Static",
  "Electrical Systems",
  "Fire & Safety Systems",
  "Cryogenic & Gas Systems",
  "Instrumentation & Automation",
  "Other",
];

const EVALUATION_METHODS = [
  "L1 / Lowest Price (Least Cost Selection)",
  "QCBS (Quality & Cost Based Selection)",
  "Quality Based Selection (QBS)",
  "Custom / Tender Defined",
];

export default function CreateTenderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || searchParams.get("draft");

  // Auto-generated Tender ID (read-only)
  const [generatedTenderNumber, setGeneratedTenderNumber] = useState<string>("");
  const [isLoadingNumber, setIsLoadingNumber] = useState<boolean>(true);
  const [numberLoadError, setNumberLoadError] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState(
    "Chennai Petroleum Corporation Limited (CPCL)"
  );
  const [department, setDepartment] = useState(
    "Materials & Procurement Division"
  );
  const [category, setCategory] = useState("Industrial PPE");
  const [description, setDescription] = useState("");

  // Timeline State
  const today = new Date().toISOString().split("T")[0];
  const [issueDate, setIssueDate] = useState(today);
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [bidOpeningDate, setBidOpeningDate] = useState("");

  // Procurement & Evaluation
  const [estimatedValue, setEstimatedValue] = useState("");
  const [evaluationMethod, setEvaluationMethod] = useState(
    "L1 / Lowest Price (Least Cost Selection)"
  );
  const [emdAmount, setEmdAmount] = useState("");
  const [performanceSecurity, setPerformanceSecurity] = useState("3% to 5%");

  // Document Upload State
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    lastModified: number;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation & UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load preview Tender Number from backend on page open (non-consuming)
  const loadNextTenderNumber = useCallback(async () => {
    setIsLoadingNumber(true);
    setNumberLoadError(false);
    try {
      const procYear = new Date().getFullYear();
      const res = await apiRequest<{
        tender_number: string;
        year: number;
        sequence: number;
      }>(`/tenders/next-number?year=${procYear}`);
      if (res?.tender_number) {
        setGeneratedTenderNumber(res.tender_number);
      } else {
        setNumberLoadError(true);
      }
    } catch {
      setNumberLoadError(true);
    } finally {
      setIsLoadingNumber(false);
    }
  }, []);

  // Prepopulate if editing an existing draft, or load preview number for new tender
  useEffect(() => {
    if (editId) {
      (async () => {
        try {
          const res = await apiRequest<Tender>(`/tenders/${encodeURIComponent(editId)}`);
          if (res) {
            // Use the already-assigned tender number of the draft
            const assignedNum = res.tender_number || res.ref || res.tender_id || res.id;
            setGeneratedTenderNumber(assignedNum || "");
            setIsLoadingNumber(false);
            setTitle(res.title || "");
            setOrganization(res.organization || "Chennai Petroleum Corporation Limited (CPCL)");
            setDepartment(res.department || "Materials & Procurement Division");
            setCategory(res.category || "Goods");
            setDescription(res.description || "");
            if (res.publish_date) setIssueDate(res.publish_date.split("T")[0]);
            if (res.closing_date) {
              setSubmissionDeadline(res.closing_date.split("T")[0]);
            } else if (res.deadline) {
              setSubmissionDeadline(res.deadline);
            }
            if (res.estimated_value) setEstimatedValue(String(res.estimated_value));
            if (res.emd_amount) setEmdAmount(String(res.emd_amount));
            if (res.file_name) {
              setUploadedFile({
                name: res.file_name,
                size: (res.file_size_kb || 3400) * 1024,
                lastModified: Date.now(),
              });
            }
          }
        } catch {
          loadNextTenderNumber();
        }
      })();
    } else {
      loadNextTenderNumber();
    }
  }, [editId, loadNextTenderNumber]);

  // Track dirty state for unsaved changes modal
  useEffect(() => {
    if (title || description || submissionDeadline || estimatedValue || emdAmount || uploadedFile) {
      setIsDirty(true);
    }
  }, [title, description, submissionDeadline, estimatedValue, emdAmount, uploadedFile]);

  // ─── File Handling ─────────────────────────────────────────────────────────

  function validateAndSetFile(file: File) {
    setFileError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Invalid file type. Only statutory PDF documents (.pdf) are permitted.");
      return;
    }
    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFileError("File exceeds the maximum permitted size of 25 MB.");
      return;
    }
    setUploadedFile({ name: file.name, size: file.size, lastModified: file.lastModified });
    setErrors((prev) => { const c = { ...prev }; delete c.file; return c; });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }

  function handleRemoveFile() {
    setUploadedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Currency Display ───────────────────────────────────────────────────────

  function formatCurrencyDisplay(val: string) {
    const num = parseFloat(val.replace(/[^\d.]/g, ""));
    if (isNaN(num) || num <= 0) return null;
    if (num >= 10_000_000) return `₹ ${(num / 10_000_000).toFixed(2)} Cr`;
    if (num >= 100_000) return `₹ ${(num / 100_000).toFixed(2)} Lakh`;
    return `₹ ${num.toLocaleString("en-IN")}`;
  }

  // ─── Publish Validation ─────────────────────────────────────────────────────

  function validateForPublish(): boolean {
    const newErrors: Record<string, string> = {};

    if (!generatedTenderNumber || numberLoadError) {
      newErrors.tenderNumber =
        "Unable to generate Tender ID. Please refresh and try again.";
    }

    if (!title.trim()) {
      newErrors.title = "Tender Title is required.";
    } else if (title.trim().length < 5) {
      newErrors.title = "Tender Title must be at least 5 characters long.";
    }

    if (!organization.trim()) {
      newErrors.organization = "Procuring Organization is required.";
    }

    if (!category.trim()) {
      newErrors.category = "Tender Category is required.";
    }

    if (!description.trim()) {
      newErrors.description = "Tender Description is required.";
    } else if (description.trim().length < 10) {
      newErrors.description =
        "Description must provide adequate procurement scope details (at least 10 characters).";
    }

    if (!issueDate) {
      newErrors.issueDate = "Issue Date is required.";
    }

    if (!submissionDeadline) {
      newErrors.submissionDeadline = "Submission Deadline is required.";
    } else if (issueDate && submissionDeadline < issueDate) {
      newErrors.submissionDeadline =
        "Submission Deadline cannot be earlier than Issue Date.";
    }

    if (bidOpeningDate && submissionDeadline && bidOpeningDate < submissionDeadline) {
      newErrors.bidOpeningDate =
        "Bid Opening Date must be on or after Submission Deadline.";
    }

    if (!evaluationMethod) {
      newErrors.evaluationMethod = "Evaluation Method is required.";
    }

    if (!uploadedFile) {
      newErrors.file =
        "Tender Document (RFP / NIT PDF) is mandatory for publishing a tender.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Build Payload ──────────────────────────────────────────────────────────
  // Note: tender_number is intentionally omitted — the backend generates and
  // assigns it atomically in add_tender().

  function buildPayload(targetStatus: "DRAFT" | "PUBLISHED") {
    return {
      title: title.trim() || "Untitled Procurement Tender Draft",
      organization: organization.trim() || "Chennai Petroleum Corporation Limited (CPCL)",
      department: department.trim() || "Materials & Procurement Division",
      category: category || "Goods",
      description: description.trim() || "Draft procurement notice.",
      status: targetStatus,
      issue_date: issueDate || today,
      publish_date: `${issueDate || today}T09:00:00Z`,
      submission_deadline: submissionDeadline || "2026-11-30",
      closing_date: submissionDeadline ? `${submissionDeadline}T17:30:00Z` : "2026-11-30T17:30:00Z",
      deadline: submissionDeadline || "30 Nov 2026",
      bid_opening_date: bidOpeningDate ? `${bidOpeningDate}T10:00:00Z` : undefined,
      estimated_value: parseFloat(estimatedValue) || 0,
      emd_amount: parseFloat(emdAmount) || 0,
      evaluation_method: evaluationMethod,
      performance_security: performanceSecurity,
      file_name: uploadedFile ? uploadedFile.name : undefined,
      file_size_kb: uploadedFile ? Math.round(uploadedFile.size / 1024) : undefined,
    };
  }

  // ─── Save Draft ─────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (isSubmitting || isDrafting) return;
    setServerError(null);
    setSuccessMessage(null);
    setIsDrafting(true);
    try {
      const res = await apiRequest<{ message: string; tender: Tender }>("/tenders", {
        method: "POST",
        body: buildPayload("DRAFT"),
      });
      // Update displayed tender number with what was actually assigned
      if (res?.tender?.tender_number) {
        setGeneratedTenderNumber(res.tender.tender_number);
      }
      setSuccessMessage(`✓ Tender saved as draft. Assigned ID: ${res?.tender?.tender_number || generatedTenderNumber}`);
      setTimeout(() => router.push("/tenders"), 1000);
    } catch (err: any) {
      setServerError(err?.message || "Failed to save draft tender. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  }

  // ─── Publish Tender ─────────────────────────────────────────────────────────

  async function handlePublishTender(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validateForPublish()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; tender: Tender }>("/tenders", {
        method: "POST",
        body: buildPayload("PUBLISHED"),
      });
      if (res?.tender?.tender_number) {
        setGeneratedTenderNumber(res.tender.tender_number);
      }
      setSuccessMessage(
        `✓ Tender ${res?.tender?.tender_number || generatedTenderNumber} published successfully to the public procurement registry.`
      );
      setTimeout(() => router.push("/tenders"), 1200);
    } catch (err: any) {
      setServerError(err?.message || "Failed to publish tender. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelClick() {
    if (isDirty) setShowCancelModal(true);
    else router.push("/tenders");
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/tenders" className="hover:text-slate-800 transition-colors">Tenders</Link>
            <span>/</span>
            <span className="text-blue-700 font-bold">{editId ? "Edit Draft" : "Create Tender"}</span>
          </nav>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileTextIcon className="size-6 text-blue-700" />
            {editId ? "Edit Draft Tender" : "Create Procurement Tender"}
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Draft a new procurement tender notice or publish directly with verified RFP clauses and statutory documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button type="button" variant="outline" size="sm"
            onClick={handleCancelClick} disabled={isSubmitting || isDrafting}
            className="text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Cancel
          </Button>
          <Button type="button" variant="outline" size="sm"
            onClick={handleSaveDraft} loading={isDrafting} disabled={isSubmitting || isDrafting || numberLoadError}
            className="text-xs font-semibold text-slate-800 border-slate-300 bg-white hover:bg-slate-50 shadow-xs">
            Save Draft
          </Button>
          <Button type="button" onClick={handlePublishTender} loading={isSubmitting}
            disabled={isSubmitting || isDrafting || numberLoadError}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5" size="sm">
            <SparklesIcon className="size-3.5 text-amber-300" />
            Publish Tender
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm flex items-center gap-3">
          <CheckCircleIcon className="size-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-900">{successMessage}</p>
            <p className="text-[11px] text-emerald-700">Redirecting to Tenders overview...</p>
          </div>
        </div>
      )}

      {/* Server Error */}
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm flex items-start gap-3">
          <XCircleIcon className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-900">Tender Submission Error</p>
            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{serverError}</p>
          </div>
          <button type="button" onClick={() => setServerError(null)} className="text-red-400 hover:text-red-700 font-bold text-sm">✕</button>
        </div>
      )}

      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm flex items-start gap-3">
          <AlertTriangleIcon className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-900">Please correct the highlighted fields:</p>
            <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-xs text-amber-800">
              {Object.entries(errors).map(([k, msg]) => <li key={k}>{msg}</li>)}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handlePublishTender} className="space-y-6">
        {/* ================================================================== */}
        {/* SECTION A — BASIC INFORMATION                                       */}
        {/* ================================================================== */}
        <Card className="p-6 border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-800">A</span>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Basic Tender Information</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Auto-assigned registry ID, procurement title, procuring entity, and scope category.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* AUTO-GENERATED Tender ID (read-only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Tender ID / Number</label>
                {isLoadingNumber ? (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <RefreshCwIcon className="size-3 animate-spin text-blue-500" />
                    Generating...
                  </span>
                ) : numberLoadError ? (
                  <button type="button" onClick={loadNextTenderNumber}
                    className="text-[10px] text-red-600 hover:text-red-800 font-bold flex items-center gap-1">
                    <RefreshCwIcon className="size-3" /> Retry
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircleIcon className="size-3 text-emerald-600" />
                    Auto-assigned
                  </span>
                )}
              </div>
              <div className={`w-full font-mono rounded-lg border px-3.5 py-2 text-xs flex items-center gap-2 ${
                numberLoadError
                  ? "border-red-200 bg-red-50/30 text-red-500"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}>
                {isLoadingNumber ? (
                  <span className="text-slate-400 animate-pulse">Generating ID...</span>
                ) : numberLoadError ? (
                  <span className="text-red-500">ID generation failed</span>
                ) : (
                  <span className="font-bold tracking-wide text-slate-900">{generatedTenderNumber}</span>
                )}
              </div>
              {errors.tenderNumber ? (
                <p className="text-[11px] text-red-600 font-medium">{errors.tenderNumber}</p>
              ) : (
                <p className="text-[10px] text-slate-400">
                  Automatically generated by BidSure AI. Permanently assigned on Save or Publish.
                </p>
              )}
            </div>

            {/* Tender Category * */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Tender Category <span className="text-red-600 font-bold">*</span>
              </label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 bg-white ${
                  errors.category ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
                }`}>
                {TENDER_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {errors.category && <p className="text-[11px] text-red-600 font-medium">{errors.category}</p>}
            </div>

            {/* Tender Title * (full span) */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                Tender Title / Name of Work <span className="text-red-600 font-bold">*</span>
              </label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Procurement of Certified Industrial Safety Helmets & High-Impact Visors"
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.title ? "border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/30" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
                }`} />
              {errors.title && <p className="text-[11px] text-red-600 font-medium">{errors.title}</p>}
            </div>

            {/* Organization * */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Procuring Entity / Organization <span className="text-red-600 font-bold">*</span>
              </label>
              <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)}
                placeholder="Chennai Petroleum Corporation Limited (CPCL)"
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.organization ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
                }`} />
              {errors.organization && <p className="text-[11px] text-red-600 font-medium">{errors.organization}</p>}
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Procuring Department / Division</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Materials & Procurement Division, Manali Refinery"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>

            {/* Description * (full span) */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Tender Description & Scope of Supply <span className="text-red-600 font-bold">*</span>
                </label>
                <span className="text-[10px] text-slate-400">{description.length} chars</span>
              </div>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a comprehensive summary of procurement requirements, delivery timelines, technical specifications, and key statutory criteria..."
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.description ? "border-red-300 focus:ring-red-100 bg-red-50/30" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
                }`} />
              {errors.description && <p className="text-[11px] text-red-600 font-medium">{errors.description}</p>}
            </div>
          </div>
        </Card>

        {/* ================================================================== */}
        {/* SECTION B — TENDER TIMELINE                                         */}
        {/* ================================================================== */}
        <Card className="p-6 border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-800">B</span>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Tender Timeline & Key Milestones</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Notice issue date, mandatory submission deadline, and technical opening schedule.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Issue / Publish Date <span className="text-red-600 font-bold">*</span>
              </label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.issueDate ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
                }`} />
              {errors.issueDate ? <p className="text-[11px] text-red-600 font-medium">{errors.issueDate}</p>
                : <p className="text-[10px] text-slate-400">Date tender is issued to public.</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Submission Deadline <span className="text-red-600 font-bold">*</span>
              </label>
              <input type="date" value={submissionDeadline} onChange={(e) => setSubmissionDeadline(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.submissionDeadline ? "border-red-300 focus:ring-red-100 bg-red-50/30" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
                }`} />
              {errors.submissionDeadline ? <p className="text-[11px] text-red-600 font-medium">{errors.submissionDeadline}</p>
                : <p className="text-[10px] text-slate-400">Final date for bid submissions.</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Bid Opening Date <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <input type="date" value={bidOpeningDate} onChange={(e) => setBidOpeningDate(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.bidOpeningDate ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
                }`} />
              {errors.bidOpeningDate && <p className="text-[11px] text-red-600 font-medium">{errors.bidOpeningDate}</p>}
            </div>
          </div>
        </Card>

        {/* ================================================================== */}
        {/* SECTION C — PROCUREMENT / EVALUATION                                */}
        {/* ================================================================== */}
        <Card className="p-6 border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-800">C</span>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Procurement & Evaluation Configuration</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Commercial estimates, EMD security deposit, and evaluation methodology.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Estimated Tender Value (INR)</label>
                {estimatedValue && formatCurrencyDisplay(estimatedValue) && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {formatCurrencyDisplay(estimatedValue)}
                  </span>
                )}
              </div>
              <input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="e.g. 45000000 (for ₹ 4.50 Cr)"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              <p className="text-[10px] text-slate-400">Estimated procurement contract ceiling value in Indian Rupees.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Evaluation Method <span className="text-red-600 font-bold">*</span>
              </label>
              <select value={evaluationMethod} onChange={(e) => setEvaluationMethod(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 bg-white ${
                  errors.evaluationMethod ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"
                }`}>
                {EVALUATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errors.evaluationMethod && <p className="text-[11px] text-red-600 font-medium">{errors.evaluationMethod}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Earnest Money Deposit / EMD (INR)</label>
                {emdAmount && formatCurrencyDisplay(emdAmount) && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {formatCurrencyDisplay(emdAmount)}
                  </span>
                )}
              </div>
              <input type="number" value={emdAmount} onChange={(e) => setEmdAmount(e.target.value)}
                placeholder="e.g. 900000 (for ₹ 9.00 L)"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              <p className="text-[10px] text-slate-400">MSME Udyam vendors receive statutory exemption.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Performance Security / PBG</label>
              <input type="text" value={performanceSecurity} onChange={(e) => setPerformanceSecurity(e.target.value)}
                placeholder="e.g. 3% to 5% of Contract Value"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </Card>

        {/* ================================================================== */}
        {/* SECTION D — TENDER DOCUMENT (RFP PDF)                               */}
        {/* ================================================================== */}
        <Card className="p-6 border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-800">D</span>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Tender Document & RFP Specification</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Upload statutory RFP / NIT document (.pdf). Required for publishing. Enables AI clause extraction.
            </p>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,application/pdf" className="hidden" />

          {!uploadedFile ? (
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50/40 ${
                errors.file ? "border-red-300 bg-red-50/20" : "border-slate-300 bg-slate-50/60"
              }`}>
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 shadow-xs mb-3">
                <UploadCloudIcon className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Upload RFP / Tender Document <span className="text-red-600 font-bold">*</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Drag and drop your official Tender PDF here, or click to browse.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                <span className="rounded bg-slate-200/80 px-2 py-0.5 text-slate-700 font-semibold">PDF ONLY</span>
                <span>·</span>
                <span>Max 25 MB</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">PDF</div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">{uploadedFile.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {(uploadedFile.size / 1024).toFixed(1)} KB · Attached and ready for AI clause scrutiny
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  <CheckCircleIcon className="size-3 text-emerald-600" />Attached
                </span>
                <button type="button" onClick={handleRemoveFile}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Remove file">
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </div>
          )}

          {fileError && (
            <p className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
              <XCircleIcon className="size-3.5" />{fileError}
            </p>
          )}
          {errors.file && !fileError && (
            <p className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
              <AlertTriangleIcon className="size-3.5" />{errors.file}
            </p>
          )}
        </Card>

        {/* Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-700">Fields marked with *</span> are required to publish. Drafts can be saved with partial information.
            {generatedTenderNumber && !isLoadingNumber && (
              <span className="ml-2 font-bold text-blue-700">Assigned ID: {generatedTenderNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="md" onClick={handleCancelClick}
              disabled={isSubmitting || isDrafting} className="text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
            <Button type="button" variant="outline" size="md" onClick={handleSaveDraft}
              loading={isDrafting} disabled={isSubmitting || isDrafting || numberLoadError}
              className="text-xs font-semibold text-slate-800 border-slate-300 bg-white hover:bg-slate-50 shadow-xs">
              Save Draft
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting || isDrafting || numberLoadError}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5" size="md">
              <SparklesIcon className="size-3.5 text-amber-300" />
              Publish Tender
            </Button>
          </div>
        </div>
      </form>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
                <AlertTriangleIcon className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Discard Unsaved Tender Changes?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You have unsaved changes in this tender form. If you leave now, these changes will not be saved.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)} className="text-xs font-semibold">
                Continue Editing
              </Button>
              <Button variant="danger" size="sm"
                onClick={() => { setShowCancelModal(false); router.push("/tenders"); }}
                className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs">
                Discard & Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
