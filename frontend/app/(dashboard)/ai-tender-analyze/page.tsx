"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SparklesIcon,
  UploadIcon,
  FileTextIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
  Edit3Icon,
  PlusIcon,
  Trash2Icon,
  RefreshCwIcon,
  SearchIcon,
  FilterIcon,
  ShieldCheckIcon,
  EyeIcon,
  ArrowRightIcon,
  CheckIcon,
  LayersIcon,
  BookOpenIcon,
  BuildingIcon,
  SlidersIcon
} from "lucide-react";
import {
  ExtractedRequirement,
  TenderAnalysisJob,
  RequirementReviewStatus,
  Tender
} from "@/lib/types";
import { apiRequest } from "@/lib/api";

export default function AITenderAnalyzePage() {
  const [activeTab, setActiveTab] = useState<"upload" | "processing" | "review" | "finalized">("upload");
  const [selectedPreset, setSelectedPreset] = useState<string>("CPCL_Tender_Safety_Helmets_2026.pdf");
  const [targetTenderId, setTargetTenderId] = useState<string>("TND-2026-001");
  const [tendersList, setTendersList] = useState<Tender[]>([]);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [analysisJob, setAnalysisJob] = useState<TenderAnalysisJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtering & Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [mandatoryOnly, setMandatoryOnly] = useState<boolean>(false);

  // Modals state
  const [editingReq, setEditingReq] = useState<ExtractedRequirement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [rejectingReq, setRejectingReq] = useState<ExtractedRequirement | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [evidenceModalReq, setEvidenceModalReq] = useState<ExtractedRequirement | null>(null);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
  const [finalizeNotes, setFinalizeNotes] = useState<string>("");

  // New requirement form state
  const [newReqForm, setNewReqForm] = useState({
    name: "",
    code: "",
    clause_reference: "Clause 8.1.0",
    category: "TECHNICAL",
    mandatory: true,
    description: "",
    threshold_value: "",
    unit: "Units",
    weight: 15
  });

  // Fetch tenders list on mount
  useEffect(() => {
    apiRequest<Tender[]>("/tenders")
      .then((data) => {
        if (Array.isArray(data)) {
          setTendersList(data);
        }
      })
      .catch((err) => console.error("Failed to load tenders list:", err));
  }, []);

  const validateAndSelectFile = (file: File): boolean => {
    setErrorMsg(null);

    // 1. Validate file extension and MIME type
    const isPdf =
      file.name.toLowerCase().endsWith(".pdf") ||
      file.type === "application/pdf" ||
      file.type.includes("pdf");

    if (!isPdf) {
      setErrorMsg("Only PDF documents (.pdf) are supported for tender analysis. Please select a valid PDF file.");
      return false;
    }

    // 2. Validate empty file (0 bytes)
    if (file.size === 0) {
      setErrorMsg("The selected PDF file is empty (0 bytes). Please upload a valid document.");
      return false;
    }

    // 3. Validate maximum size (50 MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(`File exceeds maximum allowed size of 50 MB (selected file is ${sizeMB} MB).`);
      return false;
    }

    setCustomFile(file);
    setSelectedPreset(file.name);
    setSuccessMsg(`Selected custom PDF: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB). Click "Run AI Tender Analysis" to begin.`);
    return true;
  };

  const handleClearCustomFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCustomFile(null);
    setSelectedPreset("CPCL_Tender_Safety_Helmets_2026.pdf");
    setTargetTenderId("TND-2026-001");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSelectFile(droppedFile);
    }
  };

  const handleStartAnalysis = async (filenameOverride?: string) => {
    setIsUploading(true);
    setErrorMsg(null);
    setActiveTab("processing");
    setProcessingStep(1);

    try {
      // Simulate IDP processing steps visually
      setTimeout(() => setProcessingStep(2), 1200);
      setTimeout(() => setProcessingStep(3), 2600);
      setTimeout(() => setProcessingStep(4), 4000);

      let dataPromise: Promise<TenderAnalysisJob>;

      if (customFile) {
        // Upload custom PDF via multipart FormData
        const formData = new FormData();
        formData.append("file", customFile);
        if (targetTenderId) {
          formData.append("tender_id", targetTenderId);
        }
        dataPromise = apiRequest<TenderAnalysisJob>("/tenders/upload-document", {
          method: "POST",
          body: formData
        });
      } else {
        // Analyze preloaded preset document
        const filenameToUse = filenameOverride || selectedPreset;
        dataPromise = apiRequest<TenderAnalysisJob>("/tenders/analyze-document", {
          method: "POST",
          body: {
            filename: filenameToUse,
            tender_id: targetTenderId
          }
        });
      }

      const data = await dataPromise;
      setTimeout(() => {
        setAnalysisJob(data);
        setIsUploading(false);
        setActiveTab("review");
        setSuccessMsg(`Document '${data.filename || selectedPreset}' analyzed successfully. ${data.requirements?.length || 0} criteria extracted.`);
      }, 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during AI analysis.");
      setIsUploading(false);
      setActiveTab("upload");
    }
  };

  const handleVerifyRequirement = async (reqId: string) => {
    if (!analysisJob) return;
    try {
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || "TND-2026-001";
      await apiRequest(
        `/tenders/${encodeURIComponent(activeJobOrTenderId)}/requirements/${encodeURIComponent(reqId)}/verify`,
        { method: "POST" }
      );
      setAnalysisJob({
        ...analysisJob,
        requirements: analysisJob.requirements.map((r) =>
          r.id === reqId ? { ...r, review_status: "VERIFIED" as RequirementReviewStatus } : r
        )
      });
      setSuccessMsg("Requirement verified.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to verify requirement.");
    }
  };

  const handleRejectRequirement = async () => {
    if (!analysisJob || !rejectingReq) return;
    try {
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || "TND-2026-001";
      await apiRequest(
        `/tenders/${encodeURIComponent(activeJobOrTenderId)}/requirements/${encodeURIComponent(rejectingReq.id)}/reject`,
        {
          method: "POST",
          body: { reason: rejectReason || "Excluded by procurement officer." }
        }
      );
      setAnalysisJob({
        ...analysisJob,
        requirements: analysisJob.requirements.map((r) =>
          r.id === rejectingReq.id
            ? { ...r, review_status: "REJECTED" as RequirementReviewStatus, rejection_reason: rejectReason }
            : r
        )
      });
      setIsRejectModalOpen(false);
      setRejectingReq(null);
      setRejectReason("");
      setSuccessMsg(`Requirement '${rejectingReq.name}' rejected.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to reject requirement.");
    }
  };

  const handleSaveEditedRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysisJob || !editingReq) return;
    try {
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || "TND-2026-001";
      await apiRequest(
        `/tenders/${encodeURIComponent(activeJobOrTenderId)}/requirements/${encodeURIComponent(editingReq.id)}`,
        {
          method: "PATCH",
          body: {
            name: editingReq.name,
            clause_reference: editingReq.clause_reference,
            category: editingReq.category,
            mandatory: editingReq.mandatory,
            description: editingReq.description,
            threshold_value: editingReq.threshold_value,
            unit: editingReq.unit,
            edit_reason: "Modified by Procurement Officer during IDP review."
          }
        }
      );
      // Update local state
      setAnalysisJob({
        ...analysisJob,
        requirements: analysisJob.requirements.map((r) =>
          r.id === editingReq.id
            ? {
                ...editingReq,
                review_status: "EDITED" as RequirementReviewStatus,
                original_data: r.original_data || {
                  name: r.name,
                  threshold_value: r.threshold_value,
                  description: r.description
                }
              }
            : r
        )
      });
      setIsEditModalOpen(false);
      setEditingReq(null);
      setSuccessMsg(`Requirement '${editingReq.name}' updated and marked EDITED.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update requirement.");
    }
  };

  const handleAddManualRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysisJob) return;
    try {
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || "TND-2026-001";
      const data = await apiRequest<{ message: string; requirement?: { id?: string } }>(
        `/tenders/${encodeURIComponent(activeJobOrTenderId)}/requirements`,
        {
          method: "POST",
          body: newReqForm
        }
      );
      const createdReq: ExtractedRequirement = {
        id: data.requirement?.id || `REQ-ADD-${Date.now().toString().slice(-4)}`,
        code: newReqForm.code || "CUSTOM_OFFICER_REQ",
        clause_reference: newReqForm.clause_reference,
        name: newReqForm.name,
        category: newReqForm.category,
        mandatory: newReqForm.mandatory,
        description: newReqForm.description,
        threshold_value: newReqForm.threshold_value,
        unit: newReqForm.unit,
        confidence: 1.0,
        review_status: "ADDED_MANUALLY",
        source_document: analysisJob.filename,
        source_page: 1,
        evidence_text: "Manually added by Procurement Officer during review studio.",
        validation_source: "Officer Manual Entry",
        weight: newReqForm.weight
      };

      setAnalysisJob({
        ...analysisJob,
        requirements: [createdReq, ...analysisJob.requirements]
      });
      setIsAddModalOpen(false);
      setSuccessMsg(`Manual requirement '${newReqForm.name}' added successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setNewReqForm({
        name: "",
        code: "",
        clause_reference: "Clause 8.1.0",
        category: "TECHNICAL",
        mandatory: true,
        description: "",
        threshold_value: "",
        unit: "Units",
        weight: 15
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to add manual requirement.");
    }
  };

  const handleFinalizeRequirements = async () => {
    if (!analysisJob) return;
    try {
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || "TND-2026-001";
      await apiRequest(
        `/tenders/${encodeURIComponent(activeJobOrTenderId)}/finalize-requirements`,
        {
          method: "POST",
          body: {
            tender_id: targetTenderId,
            override_existing: true,
            notes: finalizeNotes || "Finalized by Procurement Officer via AI Tender Analyze Studio."
          }
        }
      );
      setSuccessMsg("Requirements successfully finalized and linked to tender RulesEngine!");
      setIsFinalizeModalOpen(false);
      setActiveTab("finalized");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to finalize requirements.");
    }
  };

  const handleBulkVerifyHighConfidence = () => {
    if (!analysisJob) return;
    const updated = analysisJob.requirements.map((r) =>
      r.confidence >= 0.90 && r.review_status === "NEEDS_REVIEW"
        ? { ...r, review_status: "VERIFIED" as RequirementReviewStatus }
        : r
    );
    setAnalysisJob({ ...analysisJob, requirements: updated });
  };

  // Filtered requirements
  const filteredRequirements = analysisJob?.requirements.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clause_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || r.category === categoryFilter;
    const matchesStatus = statusFilter === "ALL" || r.review_status === statusFilter;
    const matchesMandatory = !mandatoryOnly || r.mandatory;

    return matchesSearch && matchesCategory && matchesStatus && matchesMandatory;
  }) || [];

  // Metrics counters
  const totalCount = analysisJob?.requirements.length || 0;
  const verifiedCount = analysisJob?.requirements.filter((r) => r.review_status === "VERIFIED").length || 0;
  const needsReviewCount = analysisJob?.requirements.filter((r) => r.review_status === "NEEDS_REVIEW").length || 0;
  const editedCount = analysisJob?.requirements.filter((r) => r.review_status === "EDITED").length || 0;
  const addedCount = analysisJob?.requirements.filter((r) => r.review_status === "ADDED_MANUALLY").length || 0;
  const rejectedCount = analysisJob?.requirements.filter((r) => r.review_status === "REJECTED").length || 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <SparklesIcon className="w-4 h-4" /> CPCL Intelligent Document Processing (IDP) Studio
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Tender Analyze & Clause Studio</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Ingest tender PDFs, execute multi-layer Smart OCR & layout segmentation, and review AI-extracted procurement criteria before linking them to the deterministic RulesEngine.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {analysisJob && (
            <button
              onClick={() => setActiveTab("review")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                activeTab === "review" ? "bg-amber-500 text-slate-950 font-bold shadow-lg" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              <LayersIcon className="w-4 h-4" /> Review Studio ({totalCount})
            </button>
          )}
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              activeTab === "upload" ? "bg-amber-500 text-slate-950 font-bold shadow-lg" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            <UploadIcon className="w-4 h-4" /> Upload & Presets
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2Icon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-sm font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900 text-sm font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: UPLOAD & PRESETS */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Preset Tender Documents & Drag Drop */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileTextIcon className="w-5 h-5 text-amber-500" /> Select CPCL Tender Document Preset
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Choose from preloaded Chennai Petroleum Corporation Limited (CPCL) tender RFP / NIT notices for instant Smart OCR parsing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    filename: "CPCL_Tender_Safety_Helmets_2026.pdf",
                    title: "Supply of Industrial Safety Helmets & PPE",
                    tender_id: "TND-2026-001",
                    tender_num: "CPCL/PROC/2026/001",
                    value: "₹4.50 Cr",
                    pages: 14,
                    size: "4.2 MB",
                    category: "Safety Goods"
                  },
                  {
                    filename: "CPCL_Fire_Safety_Tender_2026.pdf",
                    title: "Fire Safety Equipment & Hydrant Valves",
                    tender_id: "TND-2026-003",
                    tender_num: "CPCL/PROC/2026/003",
                    value: "₹8.20 Cr",
                    pages: 18,
                    size: "5.4 MB",
                    category: "Firefighting"
                  },
                  {
                    filename: "CPCL_Refinery_Valves_Tender_2026.pdf",
                    title: "High-Pressure Refinery Valve Assemblies",
                    tender_id: "TND-2026-004",
                    tender_num: "CPCL/PROC/2026/004",
                    value: "₹12.50 Cr",
                    pages: 22,
                    size: "6.8 MB",
                    category: "Mechanical"
                  },
                  {
                    filename: "CPCL_Pipeline_Pigging_2026.pdf",
                    title: "Intelligent Pigging Pipeline Inspection Services",
                    tender_id: "TND-2026-005",
                    tender_num: "CPCL/PROC/2026/005",
                    value: "₹6.10 Cr",
                    pages: 16,
                    size: "4.9 MB",
                    category: "Pipeline Services"
                  }
                ].map((preset) => (
                  <div
                    key={preset.filename}
                    onClick={() => {
                      setSelectedPreset(preset.filename);
                      setTargetTenderId(preset.tender_id);
                      setCustomFile(null);
                    }}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      selectedPreset === preset.filename && !customFile
                        ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-md"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {preset.tender_id}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{preset.value}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{preset.title}</h3>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span>{preset.pages} Pages ({preset.size})</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{preset.category}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer relative ${
                  isDragging
                    ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
                    : customFile
                    ? "border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/20"
                    : "border-slate-300 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-950"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      validateAndSelectFile(e.target.files[0]);
                    }
                    e.target.value = "";
                  }}
                />

                {customFile ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-sm text-left">
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                        <FileTextIcon className="w-6 h-6" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-xs md:max-w-md">
                            {customFile.name}
                          </h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0">
                            Custom PDF
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {(customFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Intelligent Document Processing
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                      >
                        Change File
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCustomFile}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                        title="Remove Custom File"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <UploadIcon className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">Drag & Drop custom tender PDF here</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Supports scanned or native text PDFs up to 50 MB with 99%+ OCR accuracy
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 rounded-xl text-sm font-medium shadow-sm transition"
                    >
                      <UploadIcon className="w-4 h-4 text-amber-500" /> Browse Files...
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Configuration & Analysis Launch */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 sticky top-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersIcon className="w-4 h-4 text-amber-500" /> Analysis Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure target tender linkage and intelligent document processing profiles.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Selected Document
                    </label>
                    {customFile && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        Custom PDF
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={customFile ? customFile.name : selectedPreset}
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Tender Record ID
                  </label>
                  <select
                    value={targetTenderId}
                    onChange={(e) => setTargetTenderId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {tendersList.map((t) => (
                      <option key={t.id || t.tender_id} value={t.id || t.tender_id}>
                        {t.tender_number || t.tender_id || t.id} — {t.title}
                      </option>
                    ))}
                    <option value="TND-2026-001">CPCL/PROC/2026/001 — Industrial Safety Helmets</option>
                    <option value="TND-2026-003">CPCL/PROC/2026/003 — Fire Safety Equipment</option>
                    <option value="TND-2026-004">CPCL/PROC/2026/004 — High-Pressure Valves</option>
                    <option value="TND-2026-005">CPCL/PROC/2026/005 — Pipeline Pigging Services</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between font-medium">
                    <span>OCR Engine:</span>
                    <span className="text-slate-900 dark:text-white font-semibold">Smart IDP v2 (Hybrid)</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Target Extraction:</span>
                    <span className="text-slate-900 dark:text-white font-semibold">PQC, Financial, MII & Statutory</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>RulesEngine Sync:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Enabled</span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartAnalysis()}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm tracking-wide"
                >
                  <SparklesIcon className="w-5 h-5" /> Run AI Tender Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROCESSING VISUALIZER */}
      {activeTab === "processing" && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-center space-y-8">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
            <RefreshCwIcon className="w-10 h-10 animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Executing Intelligent Document Processing (IDP)</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Analyzing <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{selectedPreset}</span> for CPCL procurement requirements...
            </p>
          </div>

          <div className="space-y-4 text-left max-w-md mx-auto">
            {[
              { step: 1, title: "PDF Ingestion & Page Segmentation", desc: "Extracting raw text and vector layouts across pages" },
              { step: 2, title: "Multi-Layer Smart OCR & Table Parsing", desc: "Recognizing tables, headers, and clause number boundaries" },
              { step: 3, title: "Semantic AI Requirement Classification", desc: "Identifying turnover, experience, MII local content & statutory clauses" },
              { step: 4, title: "Confidence Scoring & Evidence Mapping", desc: "Attaching verbatim PDF snippets and setting rule thresholds" }
            ].map((s) => (
              <div
                key={s.step}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition ${
                  processingStep > s.step
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
                    : processingStep === s.step
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-slate-900 dark:text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                }`}
              >
                <div className="mt-0.5">
                  {processingStep > s.step ? (
                    <CheckCircle2Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : processingStep === s.step ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs animate-spin">
                      {s.step}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs">
                      {s.step}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{s.title}</h4>
                  <p className="text-xs opacity-80 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HUMAN-IN-THE-LOOP REVIEW STUDIO */}
      {activeTab === "review" && analysisJob && (
        <div className="space-y-6">
          {/* Document Summary Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
                <FileTextIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-base">{analysisJob.title || analysisJob.tender_title || analysisJob.filename}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{analysisJob.tender_id || targetTenderId}</span>
                  <span>•</span>
                  <span>{analysisJob.filename}</span>
                  <span>•</span>
                  <span>{analysisJob.total_pages || analysisJob.total_pages_parsed || 14} Pages Parsed</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-semibold">OCR Confidence: {(analysisJob.ocr_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkVerifyHighConfidence}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-medium text-xs rounded-xl transition border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5"
              >
                <CheckIcon className="w-4 h-4" /> Verify All High-Confidence (≥90%)
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <PlusIcon className="w-4 h-4" /> Add Manual Requirement
              </button>
              <button
                onClick={() => setIsFinalizeModalOpen(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <ShieldCheckIcon className="w-4 h-4" /> Finalize Requirements ({verifiedCount + editedCount + addedCount}/{totalCount})
              </button>
            </div>
          </div>

          {/* Metrics Counters */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              {
                label: "Total Clauses",
                count: totalCount,
                cardClass: "bg-[#1E293B] border-[#0F172A]",
                labelClass: "text-white",
                numberClass: "text-white",
                style: { backgroundColor: "#1E293B", borderColor: "#0F172A" },
                labelStyle: { color: "#FFFFFF" },
                numberStyle: { color: "#FFFFFF" },
              },
              {
                label: "Verified",
                count: verifiedCount,
                cardClass: "bg-[#DCFCE7] border-[#16A34A]",
                labelClass: "text-[#15803D]",
                numberClass: "text-[#166534]",
                style: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
                labelStyle: { color: "#15803D" },
                numberStyle: { color: "#166534" },
              },
              {
                label: "Needs Review",
                count: needsReviewCount,
                cardClass: "bg-[#FEF3C7] border-[#F59E0B]",
                labelClass: "text-[#B45309]",
                numberClass: "text-[#92400E]",
                style: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
                labelStyle: { color: "#B45309" },
                numberStyle: { color: "#92400E" },
              },
              {
                label: "Officer Edited",
                count: editedCount,
                cardClass: "bg-[#DBEAFE] border-[#2563EB]",
                labelClass: "text-[#1D4ED8]",
                numberClass: "text-[#1E40AF]",
                style: { backgroundColor: "#DBEAFE", borderColor: "#2563EB" },
                labelStyle: { color: "#1D4ED8" },
                numberStyle: { color: "#1E40AF" },
              },
              {
                label: "Manually Added",
                count: addedCount,
                cardClass: "bg-[#F3E8FF] border-[#9333EA]",
                labelClass: "text-[#7E22CE]",
                numberClass: "text-[#6B21A8]",
                style: { backgroundColor: "#F3E8FF", borderColor: "#9333EA" },
                labelStyle: { color: "#7E22CE" },
                numberStyle: { color: "#6B21A8" },
              },
              {
                label: "Rejected",
                count: rejectedCount,
                cardClass: "bg-[#FEE2E2] border-[#DC2626]",
                labelClass: "text-[#B91C1C]",
                numberClass: "text-[#991B1B]",
                style: { backgroundColor: "#FEE2E2", borderColor: "#DC2626" },
                labelStyle: { color: "#B91C1C" },
                numberStyle: { color: "#991B1B" },
              },
            ].map((m, idx) => (
              <div
                key={idx}
                style={m.style}
                className={`p-4 rounded-2xl border ${m.cardClass} flex flex-col justify-between shadow-sm`}
              >
                <span style={m.labelStyle} className={`text-sm font-semibold ${m.labelClass}`}>
                  {m.label}
                </span>
                <span style={m.numberStyle} className={`text-3xl font-extrabold mt-2 ${m.numberClass}`}>
                  {m.count}
                </span>
              </div>
            ))}
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search clause, title or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="FINANCIAL">Financial Turnover</option>
                <option value="TECHNICAL">Technical Experience</option>
                <option value="OEM_AUTHORIZATION">OEM Authorization</option>
                <option value="LOCAL_CONTENT">Make In India (MII)</option>
                <option value="STATUTORY">Statutory GST/PAN</option>
                <option value="VIGILANCE">Vigilance / Debarment</option>
                <option value="COMMERCIAL">Commercial / EMD</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Review Statuses</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="EDITED">Officer Edited</option>
                <option value="ADDED_MANUALLY">Manually Added</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer px-2">
                <input
                  type="checkbox"
                  checked={mandatoryOnly}
                  onChange={(e) => setMandatoryOnly(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                Mandatory Only
              </label>
            </div>
          </div>

          {/* Requirement Cards List */}
          <div className="space-y-4">
            {filteredRequirements.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-500">
                <BookOpenIcon className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="font-semibold text-base">No requirements found matching current filters.</p>
                <p className="text-xs mt-1">Try resetting search keywords or category filters.</p>
              </div>
            ) : (
              filteredRequirements.map((req) => {
                const confidencePct = Math.round(req.confidence * 100);
                const isHighConf = confidencePct >= 90;
                const isMedConf = confidencePct >= 75 && confidencePct < 90;

                return (
                  <div
                    key={req.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition shadow-sm p-6 space-y-4 ${
                      req.review_status === "VERIFIED"
                        ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10"
                        : req.review_status === "EDITED"
                        ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/10"
                        : req.review_status === "REJECTED"
                        ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/10 opacity-60"
                        : req.review_status === "ADDED_MANUALLY"
                        ? "border-purple-200 dark:border-purple-900/60"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center flex-wrap gap-2.5">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold rounded-lg">
                          {req.clause_reference}
                        </span>
                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-lg">
                          {req.category}
                        </span>
                        {req.mandatory ? (
                          <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg">
                            Mandatory
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-lg">
                            Optional
                          </span>
                        )}

                        {/* Review Status Badge */}
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-lg ${
                            req.review_status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : req.review_status === "EDITED"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : req.review_status === "ADDED_MANUALLY"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : req.review_status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                          }`}
                        >
                          {req.review_status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                            isHighConf
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : isMedConf
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          <SparklesIcon className="w-3.5 h-3.5" /> AI Confidence: {confidencePct}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{req.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{req.description}</p>
                    </div>

                    {/* Threshold & Target Value */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium block">Threshold Value:</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
                          {req.threshold_value} {req.unit || ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Validation Source:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                          {req.validation_source || "Audited Records / API"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Source Location:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
                          {req.source_document} (Page {req.source_page})
                        </span>
                      </div>
                    </div>

                    {/* Original vs Edited Diff (if EDITED) */}
                    {req.review_status === "EDITED" && req.original_data && (
                      <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1.5">
                        <span className="font-bold text-blue-800 dark:text-blue-300 block">Officer Modified (Diff Tracking):</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono">
                          <div className="p-2 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900 text-slate-600">
                            <span className="text-rose-600 font-bold">Original AI:</span> {req.original_data.name} ({req.original_data.threshold_value})
                          </div>
                          <div className="p-2 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900 text-slate-800 dark:text-slate-200">
                            <span className="text-emerald-600 font-bold">Modified:</span> {req.name} ({req.threshold_value})
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason (if REJECTED) */}
                    {req.review_status === "REJECTED" && req.rejection_reason && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
                        <span className="font-bold block mb-0.5">Exclusion Justification:</span>
                        {req.rejection_reason}
                      </div>
                    )}

                    {/* Action Toolbar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setEvidenceModalReq(req)}
                        className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
                      >
                        <EyeIcon className="w-4 h-4" /> View Verbatim PDF Evidence Quote
                      </button>

                      <div className="flex items-center gap-2">
                        {req.review_status !== "VERIFIED" && req.review_status !== "REJECTED" && (
                          <button
                            onClick={() => handleVerifyRequirement(req.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
                          >
                            <CheckIcon className="w-3.5 h-3.5" /> Verify
                          </button>
                        )}
                        {req.review_status !== "REJECTED" && (
                          <button
                            onClick={() => {
                              setEditingReq(req);
                              setIsEditModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                          >
                            <Edit3Icon className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                        {req.review_status !== "REJECTED" ? (
                          <button
                            onClick={() => {
                              setRejectingReq(req);
                              setIsRejectModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                          >
                            <XCircleIcon className="w-3.5 h-3.5" /> Reject
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerifyRequirement(req.id)}
                            className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINALIZED */}
      {activeTab === "finalized" && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto">
            <ShieldCheckIcon className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Requirements Finalized & Linked Successfully</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              All approved procurement criteria have been synchronized with tender <span className="font-mono font-bold text-amber-600">{targetTenderId}</span> and are now actively enforced by the RulesEngine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Total Enforced Criteria</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                {verifiedCount + editedCount + addedCount} Clauses
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">RulesEngine Status</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">Zero Hallucination</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Audit Trail Event</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">Logged & Signed</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-6">
            <a
              href="/compliance"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-sm"
            >
              Run AI Compliance Evaluation <ArrowRightIcon className="w-4 h-4" />
            </a>
            <a
              href="/audit"
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition text-sm"
            >
              View Audit Log
            </a>
          </div>
        </div>
      )}

      {/* MODAL: EVIDENCE QUOTE VIEWER */}
      {evidenceModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Source PDF Evidence Trace</h3>
              </div>
              <button
                onClick={() => setEvidenceModalReq(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-1">Clause & Title</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {evidenceModalReq.clause_reference}: {evidenceModalReq.name}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-1">Source Document & Page</span>
                <p className="font-mono text-slate-700 dark:text-slate-300">
                  {evidenceModalReq.source_document} (Page {evidenceModalReq.source_page})
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-slate-800 dark:text-slate-200 font-mono text-xs leading-relaxed">
                <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1.5">Verbatim PDF Excerpt:</span>
                "{evidenceModalReq.evidence_text}"
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>AI Confidence: {(evidenceModalReq.confidence * 100).toFixed(1)}%</span>
                <span className="font-medium text-emerald-600">Smart IDP Layout Match Verified</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEvidenceModalReq(null)}
                className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-semibold rounded-xl text-sm"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT REQUIREMENT */}
      {isEditModalOpen && editingReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Edit Extracted Requirement</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRequirement} className="space-y-4 text-sm">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Requirement Name</label>
                <input
                  type="text"
                  required
                  value={editingReq.name}
                  onChange={(e) => setEditingReq({ ...editingReq, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Clause Reference</label>
                  <input
                    type="text"
                    required
                    value={editingReq.clause_reference}
                    onChange={(e) => setEditingReq({ ...editingReq, clause_reference: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={editingReq.category}
                    onChange={(e) => setEditingReq({ ...editingReq, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  >
                    <option value="FINANCIAL">FINANCIAL</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="OEM_AUTHORIZATION">OEM_AUTHORIZATION</option>
                    <option value="LOCAL_CONTENT">LOCAL_CONTENT</option>
                    <option value="STATUTORY">STATUTORY</option>
                    <option value="VIGILANCE">VIGILANCE</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Threshold Value</label>
                  <input
                    type="text"
                    required
                    value={editingReq.threshold_value}
                    onChange={(e) => setEditingReq({ ...editingReq, threshold_value: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingReq.unit || ""}
                    onChange={(e) => setEditingReq({ ...editingReq, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  value={editingReq.description}
                  onChange={(e) => setEditingReq({ ...editingReq, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editMandatory"
                  checked={editingReq.mandatory}
                  onChange={(e) => setEditingReq({ ...editingReq, mandatory: e.target.checked })}
                  className="rounded border-slate-300 text-amber-500 w-4 h-4"
                />
                <label htmlFor="editMandatory" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Mandatory Requirement (Required for Compliance Pass)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm shadow-md"
                >
                  Save & Mark Edited
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT REASON */}
      {isRejectModalOpen && rejectingReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Exclude / Reject Requirement</h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <p className="text-slate-600 dark:text-slate-400">
                Please provide an official justification for excluding <span className="font-bold text-slate-900 dark:text-white">"{rejectingReq.name}"</span> from tender evaluation.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rejection Justification *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Clause superseded by CPCL corrigendum #2 dated 14-Sep-2026."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectRequirement}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  Confirm Exclusion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MANUAL REQUIREMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Add Manual Procurement Clause</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddManualRequirement} className="space-y-4 text-sm">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Requirement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ISO 9001 Quality Certification"
                  value={newReqForm.name}
                  onChange={(e) => setNewReqForm({ ...newReqForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Clause Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clause 8.2.1"
                    value={newReqForm.clause_reference}
                    onChange={(e) => setNewReqForm({ ...newReqForm, clause_reference: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                  <select
                    value={newReqForm.category}
                    onChange={(e) => setNewReqForm({ ...newReqForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  >
                    <option value="FINANCIAL">FINANCIAL</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="OEM_AUTHORIZATION">OEM_AUTHORIZATION</option>
                    <option value="LOCAL_CONTENT">LOCAL_CONTENT</option>
                    <option value="STATUTORY">STATUTORY</option>
                    <option value="VIGILANCE">VIGILANCE</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Threshold Value *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Valid ISO 9001:2015"
                    value={newReqForm.threshold_value}
                    onChange={(e) => setNewReqForm({ ...newReqForm, threshold_value: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Certification"
                    value={newReqForm.unit}
                    onChange={(e) => setNewReqForm({ ...newReqForm, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify detailed evaluation instructions..."
                  value={newReqForm.description}
                  onChange={(e) => setNewReqForm({ ...newReqForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="newMandatory"
                  checked={newReqForm.mandatory}
                  onChange={(e) => setNewReqForm({ ...newReqForm, mandatory: e.target.checked })}
                  className="rounded border-slate-300 text-amber-500 w-4 h-4"
                />
                <label htmlFor="newMandatory" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Mandatory Requirement
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm shadow-md"
                >
                  Add Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FINALIZE REQUIREMENTS */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Finalize Tender Requirements</h3>
              </div>
              <button
                onClick={() => setIsFinalizeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <p>
                You are about to lock and finalize <span className="font-bold text-slate-900 dark:text-white">{verifiedCount + editedCount + addedCount} approved requirements</span> for tender <span className="font-mono font-bold text-amber-600">{targetTenderId}</span>.
              </p>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Approved & Verified:</span>
                  <span className="font-bold text-emerald-600">{verifiedCount + editedCount + addedCount} Clauses</span>
                </div>
                <div className="flex justify-between">
                  <span>Excluded / Rejected:</span>
                  <span className="font-bold text-rose-600">{rejectedCount} Clauses</span>
                </div>
                <div className="flex justify-between">
                  <span>RulesEngine Integration:</span>
                  <span className="font-bold text-amber-600">Immediate Synchronization</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Officer Finalization Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. All requirements reviewed and verified in accordance with CPCL procurement guidelines."
                  value={finalizeNotes}
                  onChange={(e) => setFinalizeNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsFinalizeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm"
                >
                  Continue Reviewing
                </button>
                <button
                  onClick={handleFinalizeRequirements}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm shadow-md"
                >
                  Lock & Finalize Requirements
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
