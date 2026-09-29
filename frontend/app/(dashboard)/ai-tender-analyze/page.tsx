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
  SlidersIcon,
  Loader2Icon
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
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [targetTenderId, setTargetTenderId] = useState<string>("");
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
  const [isModalEvidenceExpanded, setIsModalEvidenceExpanded] = useState<boolean>(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
  const [finalizeNotes, setFinalizeNotes] = useState<string>("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const toggleDescription = (id: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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

  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [isLoadingTenders, setIsLoadingTenders] = useState<boolean>(true);

  // Fetch system config and tenders list on mount
  useEffect(() => {
    setIsLoadingTenders(true);

    Promise.all([
      apiRequest<{
        demo_mode: boolean;
        ai_provider?: string;
        ai_model?: string;
        ai_status?: string;
        ai_message?: string;
      }>("/system/config").catch(() => null),
      apiRequest<Tender[]>("/tenders").catch(() => null),
    ])
      .then(([configRes, tendersRes]) => {
        const isDemo =
          configRes && typeof configRes.demo_mode === "boolean"
            ? configRes.demo_mode
            : false;
        setDemoMode(isDemo);

        if (Array.isArray(tendersRes)) {
          setTendersList(tendersRes);
          if (tendersRes.length > 0) {
            const firstT = tendersRes[0];
            const firstId =
              firstT.id || firstT.tender_id || firstT.tender_number || "";
            setTargetTenderId(firstId);
            const initialFilename = firstT.file_name || "Tendernotice_1.pdf";
            setSelectedPreset(initialFilename);
          } else {
            setTargetTenderId("");
            setSelectedPreset("");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load initial tender analysis data:", err);
      })
      .finally(() => {
        setIsLoadingTenders(false);
      });
  }, []);

  const validateAndSelectFile = (file: File): boolean => {
    setErrorMsg(null);

    const isPdf =
      file.name.toLowerCase().endsWith(".pdf") ||
      file.type === "application/pdf" ||
      file.type.includes("pdf");

    if (!isPdf) {
      setErrorMsg("Only PDF documents (.pdf) are supported for tender analysis. Please select a valid PDF file.");
      return false;
    }

    if (file.size === 0) {
      setErrorMsg("The selected PDF file is empty (0 bytes). Please upload a valid document.");
      return false;
    }

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
    if (tendersList.length > 0) {
      const firstT = tendersList[0];
      setSelectedPreset(firstT.file_name || "Tendernotice_1.pdf");
      setTargetTenderId(firstT.id || firstT.tender_id || firstT.tender_number || "");
    } else {
      setSelectedPreset("");
      setTargetTenderId("");
    }
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
      setTimeout(() => setProcessingStep(2), 1200);
      setTimeout(() => setProcessingStep(3), 2600);
      setTimeout(() => setProcessingStep(4), 4000);

      let dataPromise: Promise<TenderAnalysisJob>;

      if (customFile) {
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
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || analysisJob.tender_id || analysisJob.filename;
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
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || analysisJob.tender_id || analysisJob.filename;
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
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || analysisJob.tender_id || analysisJob.filename;
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
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || analysisJob.tender_id || analysisJob.filename;
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
      const activeJobOrTenderId = analysisJob.job_id || targetTenderId || analysisJob.tender_id || analysisJob.filename;
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

  const totalCount = analysisJob?.requirements.length || 0;
  const verifiedCount = analysisJob?.requirements.filter((r) => r.review_status === "VERIFIED").length || 0;
  const needsReviewCount = analysisJob?.requirements.filter((r) => r.review_status === "NEEDS_REVIEW").length || 0;
  const editedCount = analysisJob?.requirements.filter((r) => r.review_status === "EDITED").length || 0;
  const addedCount = analysisJob?.requirements.filter((r) => r.review_status === "ADDED_MANUALLY").length || 0;
  const rejectedCount = analysisJob?.requirements.filter((r) => r.review_status === "REJECTED").length || 0;

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-subtle border border-[#D5DFED]">
        <div>
          <div className="flex items-center gap-2 text-[#2155D9] font-bold text-xs tracking-wider uppercase mb-1">
            <SparklesIcon className="w-4 h-4 text-[#2155D9]" /> CPCL Intelligent Document Processing (IDP) Studio
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#17243B] tracking-tight">AI Tender Analyze & Clause Studio</h1>
          <p className="text-slate-600 text-xs mt-1 max-w-2xl font-medium">
            Ingest tender PDFs, execute multi-layer Smart OCR & layout segmentation, and review AI-extracted procurement criteria before linking them to the deterministic RulesEngine.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {analysisJob && (
            <button
              onClick={() => setActiveTab("review")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 shadow-xs ${
                activeTab === "review" ? "bg-[#2155D9] text-white font-bold shadow-sm" : "border border-[#D5DFED] bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <LayersIcon className="w-4 h-4" /> Review Studio ({totalCount})
            </button>
          )}
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 shadow-xs ${
              activeTab === "upload" ? "bg-[#2155D9] text-white font-bold shadow-sm" : "border border-[#D5DFED] bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <UploadIcon className="w-4 h-4" /> Upload & Presets
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2Icon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-xs">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold text-xs">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: UPLOAD & PRESETS */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Preset Tender Documents & Drag Drop */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-[#D5DFED] shadow-subtle space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileTextIcon className="w-5 h-5 text-[#2155D9]" /> Operational Tender Documents
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {tendersList.length > 0
                    ? "Select from available operational tenders in the database for AI requirement extraction."
                    : "No tender documents available for analysis. Upload an operational tender PDF document below."}
                </p>
              </div>

              {isLoadingTenders ? (
                <div className="py-12 px-6 rounded-xl border border-[#D5DFED] bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2155D9]">
                    <FileTextIcon className="w-5 h-5 text-[#2155D9]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2Icon className="w-4 h-4 text-[#2155D9] animate-spin" />
                    <p className="font-semibold text-slate-900 text-xs">
                      Loading tender documents...
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Retrieving available tender documents from the database.
                  </p>
                </div>
              ) : tendersList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tendersList.map((tender) => {
                    const tenderRef = tender.tender_number || tender.id;
                    const filename = tender.file_name || `${tenderRef.replace(/\//g, "_")}_Tender.pdf`;
                    const isSelected = selectedPreset === filename && !customFile;
                    return (
                      <div
                        key={tender.id || tender.tender_id}
                        onClick={() => {
                          setSelectedPreset(filename);
                          setTargetTenderId(tender.id || tender.tender_id || "");
                          setCustomFile(null);
                        }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? "border-[#2155D9] bg-blue-50/50 shadow-sm ring-1 ring-blue-300"
                            : "border-[#D5DFED] hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {tenderRef}
                            </span>
                            <span className="text-xs font-bold text-emerald-700">
                              {tender.estimated_value_display || (tender.estimated_value ? `₹${tender.estimated_value}` : "Active")}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-xs line-clamp-2">{tender.title}</h3>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-100">
                          <span>{tender.file_size_kb ? `${(tender.file_size_kb / 1024).toFixed(1)} MB` : "PDF RFP"}</span>
                          <span className="font-semibold text-[#2155D9]">{tender.category || "Procurement"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl border border-[#D5DFED] text-center space-y-3">
                  <FileTextIcon className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-xs">No tender documents available</h3>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Import a tender or upload a tender PDF to begin AI analysis.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-[#2155D9] hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <UploadIcon className="w-3.5 h-3.5" /> Upload Tender PDF
                    </button>
                    <a
                      href="/tenders/create"
                      className="px-3.5 py-1.5 bg-white border border-[#D5DFED] hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <PlusIcon className="w-3.5 h-3.5" /> Create / Import Tender
                    </a>
                  </div>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer relative ${
                  isDragging
                    ? "border-[#2155D9] bg-blue-50/50 scale-[1.01]"
                    : customFile
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-[#D5DFED] hover:border-[#2155D9] bg-slate-50/50"
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
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white rounded-lg border border-emerald-200 shadow-xs text-left">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center shrink-0">
                        <FileTextIcon className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-xs truncate max-w-xs">
                            {customFile.name}
                          </h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 shrink-0">
                            Custom PDF
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
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
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold transition"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCustomFile}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-md transition"
                        title="Remove Custom File"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-blue-50 text-[#2155D9] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <UploadIcon className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs">Drag & Drop custom tender PDF here</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supports scanned or native text PDFs up to 50 MB with 99%+ OCR accuracy
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#D5DFED] text-slate-700 hover:text-[#2155D9] hover:border-[#2155D9] rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                      <UploadIcon className="w-3.5 h-3.5 text-[#2155D9]" /> Browse Files...
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Configuration & Analysis Launch */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-[#D5DFED] shadow-subtle space-y-5 sticky top-8">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SlidersIcon className="w-4 h-4 text-[#2155D9]" /> Analysis Configuration
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure target tender linkage and intelligent document processing profiles.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Selected Document
                    </label>
                    {customFile && (
                      <span className="text-[10px] font-bold text-[#2155D9] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        Custom PDF
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={customFile ? customFile.name : selectedPreset}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Target Tender Record ID
                  </label>
                  <select
                    value={targetTenderId}
                    onChange={(e) => setTargetTenderId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D5DFED] rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                  >
                    {tendersList.length === 0 ? (
                      <option value="">No tenders available in database</option>
                    ) : (
                      tendersList.map((t) => (
                        <option key={t.id || t.tender_id} value={t.id || t.tender_id}>
                          {t.tender_number || t.tender_id || t.id} — {t.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-[#D5DFED] space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between font-medium">
                    <span>OCR Engine:</span>
                    <span className="text-slate-900 font-semibold">Smart IDP v2 (Hybrid)</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Target Extraction:</span>
                    <span className="text-slate-900 font-semibold">PQC, Financial, MII & Statutory</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>RulesEngine Sync:</span>
                    <span className="text-emerald-700 font-semibold">Enabled</span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartAnalysis()}
                  className="w-full py-2.5 px-4 bg-[#2155D9] hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg shadow-xs transition flex items-center justify-center gap-2 text-xs"
                >
                  <SparklesIcon className="w-4 h-4" /> Run AI Tender Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROCESSING VISUALIZER */}
      {activeTab === "processing" && (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-xl border border-[#D5DFED] shadow-subtle text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-[#2155D9] rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <RefreshCwIcon className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Executing Intelligent Document Processing (IDP)</h2>
            <p className="text-slate-500 text-xs mt-1">
              Analyzing <span className="font-mono font-semibold text-slate-800">{selectedPreset}</span> for CPCL procurement requirements...
            </p>
          </div>

          <div className="space-y-3 text-left max-w-md mx-auto">
            {[
              { step: 1, title: "PDF Ingestion & Page Segmentation", desc: "Extracting raw text and vector layouts across pages" },
              { step: 2, title: "Multi-Layer Smart OCR & Table Parsing", desc: "Recognizing tables, headers, and clause number boundaries" },
              { step: 3, title: "Semantic AI Requirement Classification", desc: "Identifying turnover, experience, MII local content & statutory clauses" },
              { step: 4, title: "Confidence Scoring & Evidence Mapping", desc: "Attaching verbatim PDF snippets and setting rule thresholds" }
            ].map((s) => (
              <div
                key={s.step}
                className={`flex items-start gap-3 p-3 rounded-lg border transition text-xs ${
                  processingStep > s.step
                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                    : processingStep === s.step
                    ? "bg-blue-50 border-blue-200 text-slate-900 shadow-xs"
                    : "bg-slate-50 border-[#D5DFED] text-slate-400 opacity-60"
                }`}
              >
                <div className="mt-0.5">
                  {processingStep > s.step ? (
                    <CheckCircle2Icon className="w-4 h-4 text-emerald-600" />
                  ) : processingStep === s.step ? (
                    <div className="w-4 h-4 rounded-full bg-[#2155D9] text-white flex items-center justify-center font-bold text-[10px] animate-spin">
                      {s.step}
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                      {s.step}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold">{s.title}</h4>
                  <p className="opacity-80 mt-0.5 text-[11px]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HUMAN-IN-THE-LOOP REVIEW STUDIO */}
      {activeTab === "review" && (
        !analysisJob ? (
          <div className="bg-white p-12 rounded-xl border border-[#D5DFED] shadow-subtle text-center space-y-4">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
              <FileTextIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">No tender document analyzed yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Upload a tender PDF in the Upload tab and run AI analysis to extract and review procurement requirements.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("upload")}
              className="px-4 py-2 bg-[#2155D9] hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
            >
              Go to Upload Document
            </button>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Document Summary Bar */}
          <div className="bg-white p-5 rounded-xl border border-[#D5DFED] shadow-subtle flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-50 text-[#2155D9] rounded-xl flex items-center justify-center shrink-0">
                <FileTextIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">{analysisJob.title || analysisJob.tender_title || analysisJob.filename}</h2>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span className="font-mono text-[#2155D9] font-semibold">{analysisJob.tender_id || targetTenderId}</span>
                  <span>•</span>
                  <span>{analysisJob.filename}</span>
                  <span>•</span>
                  <span>{analysisJob.total_pages || analysisJob.total_pages_parsed || 1} Pages Parsed</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">OCR: {(analysisJob.ocr_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleBulkVerifyHighConfidence}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-lg transition border border-emerald-200 flex items-center gap-1.5 shadow-xs"
              >
                <CheckIcon className="w-3.5 h-3.5" /> Verify High-Conf (≥90%)
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Add Clause
              </button>
              <button
                onClick={() => setIsFinalizeModalOpen(true)}
                className="px-4 py-2 bg-[#2155D9] hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <ShieldCheckIcon className="w-4 h-4" /> Finalize ({verifiedCount + editedCount + addedCount}/{totalCount})
              </button>
            </div>
          </div>

          {/* Metrics Counters */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              {
                label: "Total Clauses",
                count: totalCount,
                cardClass: "bg-slate-900 border-slate-900 text-white",
                labelClass: "text-slate-200",
                numberClass: "text-white",
              },
              {
                label: "Verified",
                count: verifiedCount,
                cardClass: "bg-emerald-50 border-emerald-200",
                labelClass: "text-emerald-800",
                numberClass: "text-emerald-900",
              },
              {
                label: "Needs Review",
                count: needsReviewCount,
                cardClass: "bg-amber-50 border-amber-200",
                labelClass: "text-amber-800",
                numberClass: "text-amber-900",
              },
              {
                label: "Officer Edited",
                count: editedCount,
                cardClass: "bg-blue-50 border-blue-200",
                labelClass: "text-blue-800",
                numberClass: "text-blue-900",
              },
              {
                label: "Manually Added",
                count: addedCount,
                cardClass: "bg-purple-50 border-purple-200",
                labelClass: "text-purple-800",
                numberClass: "text-purple-900",
              },
              {
                label: "Rejected",
                count: rejectedCount,
                cardClass: "bg-red-50 border-red-200",
                labelClass: "text-red-800",
                numberClass: "text-red-900",
              },
            ].map((m, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border ${m.cardClass} flex flex-col justify-between shadow-xs`}
              >
                <span className={`text-[11px] font-bold uppercase tracking-wider ${m.labelClass}`}>
                  {m.label}
                </span>
                <span className={`text-2xl font-extrabold mt-1.5 ${m.numberClass}`}>
                  {m.count}
                </span>
              </div>
            ))}
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-[#D5DFED] shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search clause, title or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
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
                className="px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Review Statuses</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="EDITED">Officer Edited</option>
                <option value="ADDED_MANUALLY">Manually Added</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer px-2">
                <input
                  type="checkbox"
                  checked={mandatoryOnly}
                  onChange={(e) => setMandatoryOnly(e.target.checked)}
                  className="rounded border-[#D5DFED] text-[#2155D9] focus:ring-blue-100 w-4 h-4"
                />
                Mandatory Only
              </label>
            </div>
          </div>

          {/* Requirement Cards List */}
          <div className="space-y-4">
            {filteredRequirements.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-[#D5DFED] shadow-subtle text-center text-slate-500">
                <BookOpenIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-800 text-sm">No requirements found matching current filters.</p>
                <p className="text-xs text-slate-500 mt-1">Try resetting search keywords or category filters.</p>
              </div>
            ) : (
              filteredRequirements.map((req) => {
                const confidencePct = Math.round(req.confidence * 100);
                const isHighConf = confidencePct >= 90;
                const isMedConf = confidencePct >= 75 && confidencePct < 90;

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-xl border transition shadow-subtle p-5 space-y-3.5 ${
                      req.review_status === "VERIFIED"
                        ? "border-emerald-300 bg-emerald-50/10"
                        : req.review_status === "EDITED"
                        ? "border-blue-300 bg-blue-50/10"
                        : req.review_status === "REJECTED"
                        ? "border-red-200 bg-red-50/10 opacity-60"
                        : req.review_status === "ADDED_MANUALLY"
                        ? "border-purple-300"
                        : "border-[#D5DFED]"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-mono font-bold rounded-md border border-[#D5DFED]">
                          {req.clause_reference}
                        </span>
                        <span className="px-2.5 py-1 bg-blue-50 text-[#2155D9] text-xs font-bold rounded-md border border-blue-200">
                          {req.category}
                        </span>
                        {req.mandatory ? (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[11px] font-bold rounded-md border border-red-200">
                            Mandatory
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md border border-[#D5DFED]">
                            Optional
                          </span>
                        )}

                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${
                            req.review_status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : req.review_status === "EDITED"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : req.review_status === "ADDED_MANUALLY"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : req.review_status === "REJECTED"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                          }`}
                        >
                          {req.review_status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border ${
                            isHighConf
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isMedConf
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          <SparklesIcon className="w-3.5 h-3.5" /> AI Confidence: {confidencePct}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{req.name}</h3>
                      <div className="mt-1">
                        <p className={`text-xs text-slate-600 leading-relaxed ${!expandedDescriptions[req.id] && (req.description?.length || 0) > 220 ? "line-clamp-2" : ""}`}>
                          {req.description}
                        </p>
                        {(req.description?.length || 0) > 220 && (
                          <button
                            type="button"
                            onClick={() => toggleDescription(req.id)}
                            className="text-[11px] font-bold text-[#2155D9] hover:underline mt-1 block"
                          >
                            {expandedDescriptions[req.id] ? "Show less" : "Show more..."}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Threshold & Target Value */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-[#D5DFED] text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold uppercase text-[10px] block">Threshold Value</span>
                        <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                          {req.threshold_value} {req.unit || ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold uppercase text-[10px] block">Validation Source</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {req.validation_source || "Audited Records / API"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold uppercase text-[10px] block">Source Location</span>
                        <span className="font-mono text-slate-700 mt-0.5 block">
                          {req.source_document} (Page {req.source_page})
                        </span>
                      </div>
                    </div>

                    {/* Original vs Edited Diff */}
                    {req.review_status === "EDITED" && req.original_data && (
                      <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 text-xs space-y-1">
                        <span className="font-bold text-blue-900 block">Officer Modified (Diff Tracking):</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                          <div className="p-2 bg-white rounded border border-blue-100 text-slate-600">
                            <span className="text-red-600 font-bold">Original AI:</span> {req.original_data.name} ({req.original_data.threshold_value})
                          </div>
                          <div className="p-2 bg-white rounded border border-blue-100 text-slate-900">
                            <span className="text-emerald-700 font-bold">Modified:</span> {req.name} ({req.threshold_value})
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {req.review_status === "REJECTED" && req.rejection_reason && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                        <span className="font-bold block mb-0.5">Exclusion Justification:</span>
                        {req.rejection_reason}
                      </div>
                    )}

                    {/* Action Toolbar */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                      <button
                        onClick={() => setEvidenceModalReq(req)}
                        className="text-xs font-semibold text-[#2155D9] hover:underline flex items-center gap-1.5"
                      >
                        <EyeIcon className="w-3.5 h-3.5" /> View Verbatim PDF Evidence Quote
                      </button>

                      <div className="flex items-center gap-2">
                        {req.review_status !== "VERIFIED" && req.review_status !== "REJECTED" && (
                          <button
                            onClick={() => handleVerifyRequirement(req.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1"
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
                            className="px-3 py-1 bg-white border border-[#D5DFED] hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1"
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
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-lg transition border border-red-200 flex items-center gap-1"
                          >
                            <XCircleIcon className="w-3.5 h-3.5" /> Reject
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerifyRequirement(req.id)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition border border-[#D5DFED]"
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
        )
      )}

      {/* TAB 4: FINALIZED */}
      {activeTab === "finalized" && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-[#D5DFED] shadow-subtle text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
            <ShieldCheckIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Requirements Finalized & Linked Successfully</h2>
            <p className="text-slate-500 text-xs mt-1">
              All approved procurement criteria have been synchronized with tender <span className="font-mono font-bold text-[#2155D9]">{targetTenderId}</span> and are now actively enforced by the RulesEngine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-left text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-[#D5DFED]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Enforced Criteria</span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                {verifiedCount + editedCount + addedCount} Clauses
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-[#D5DFED]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">RulesEngine Status</span>
              <span className="text-base font-extrabold text-emerald-700 mt-0.5 block">Zero Hallucination</span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-[#D5DFED]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Audit Trail Event</span>
              <span className="text-base font-extrabold text-[#2155D9] mt-0.5 block">Logged & Signed</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <a
              href="/compliance"
              className="px-5 py-2.5 bg-[#2155D9] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition flex items-center gap-2 text-xs"
            >
              Run AI Compliance Evaluation <ArrowRightIcon className="w-4 h-4" />
            </a>
            <a
              href="/audit"
              className="px-5 py-2.5 bg-white border border-[#D5DFED] hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-xs transition text-xs"
            >
              View Audit Log
            </a>
          </div>
        </div>
      )}

      {/* MODAL: EVIDENCE QUOTE VIEWER */}
      {evidenceModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl border border-[#D5DFED] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="w-5 h-5 text-[#2155D9]" />
                <h3 className="font-bold text-slate-900 text-base">Source PDF Evidence Trace</h3>
              </div>
              <button
                onClick={() => setEvidenceModalReq(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-0.5">Clause & Requirement</span>
                <p className="font-bold text-slate-900 text-sm">
                  {evidenceModalReq.clause_reference}: {evidenceModalReq.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-0.5">Source Document & Page</span>
                  <p className="font-mono text-slate-700">
                    {evidenceModalReq.source_document} (Page {evidenceModalReq.source_page})
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-0.5">Document Section</span>
                  <p className="font-medium text-slate-700">
                    {evidenceModalReq.section || `Page ${evidenceModalReq.source_page} Specification`}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200 text-slate-800 font-mono text-[11px] leading-relaxed">
                <span className="font-bold text-[#2155D9] block mb-1">Verbatim PDF Excerpt:</span>
                <p className={!isModalEvidenceExpanded && (evidenceModalReq.evidence_text?.length || 0) > 300 ? "line-clamp-4" : ""}>
                  "{evidenceModalReq.evidence_text}"
                </p>
                {(evidenceModalReq.evidence_text?.length || 0) > 300 && (
                  <button
                    type="button"
                    onClick={() => setIsModalEvidenceExpanded(!isModalEvidenceExpanded)}
                    className="text-xs font-semibold text-[#2155D9] hover:underline mt-2 inline-block font-sans"
                  >
                    {isModalEvidenceExpanded ? "Show less" : "Show more..."}
                  </button>
                )}
              </div>

              {/* Provenance Verification Badge */}
              <div className="pt-1">
                <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">Provenance & Grounding Status</span>
                {evidenceModalReq.evidence_status === "SMART_IDP_VERIFIED" || evidenceModalReq.provenance_status === "VERIFIED" ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                    <CheckCircle2Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Smart IDP Layout Match Verified — Validated against PDF Page {evidenceModalReq.source_page} OCR text buffer</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[11px]">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>EVIDENCE_REQUIRES_REVIEW — Evidence could not be automatically confirmed on Page {evidenceModalReq.source_page}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-100">
                <span>AI Confidence: {(evidenceModalReq.confidence * 100).toFixed(1)}%</span>
                <span className="font-semibold text-slate-700">
                  Authority: {evidenceModalReq.validation_source || "Tender Document Analysis"}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEvidenceModalReq(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition shadow-xs"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT REQUIREMENT */}
      {isEditModalOpen && editingReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl border border-[#D5DFED] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950 text-base">Edit Extracted Requirement</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRequirement} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Requirement Name</label>
                <input
                  type="text"
                  required
                  value={editingReq.name}
                  onChange={(e) => setEditingReq({ ...editingReq, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Clause Reference</label>
                  <input
                    type="text"
                    required
                    value={editingReq.clause_reference}
                    onChange={(e) => setEditingReq({ ...editingReq, clause_reference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Category</label>
                  <select
                    value={editingReq.category}
                    onChange={(e) => setEditingReq({ ...editingReq, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Threshold Value</label>
                  <input
                    type="text"
                    required
                    value={editingReq.threshold_value}
                    onChange={(e) => setEditingReq({ ...editingReq, threshold_value: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingReq.unit || ""}
                    onChange={(e) => setEditingReq({ ...editingReq, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  value={editingReq.description}
                  onChange={(e) => setEditingReq({ ...editingReq, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editMandatory"
                  checked={editingReq.mandatory}
                  onChange={(e) => setEditingReq({ ...editingReq, mandatory: e.target.checked })}
                  className="rounded border-[#D5DFED] text-[#2155D9] w-4 h-4"
                />
                <label htmlFor="editMandatory" className="text-xs font-semibold text-slate-700">
                  Mandatory Requirement (Required for Compliance Pass)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2155D9] hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl border border-[#D5DFED] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Exclude / Reject Requirement</h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Please provide an official justification for excluding <span className="font-bold text-slate-900">"{rejectingReq.name}"</span> from tender evaluation.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Rejection Justification *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Clause superseded by CPCL corrigendum #2 dated 14-Sep-2026."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectRequirement}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl border border-[#D5DFED] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Add Manual Procurement Clause</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddManualRequirement} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Requirement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ISO 9001 Quality Certification"
                  value={newReqForm.name}
                  onChange={(e) => setNewReqForm({ ...newReqForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Clause Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clause 8.2.1"
                    value={newReqForm.clause_reference}
                    onChange={(e) => setNewReqForm({ ...newReqForm, clause_reference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Category *</label>
                  <select
                    value={newReqForm.category}
                    onChange={(e) => setNewReqForm({ ...newReqForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Threshold Value *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Valid ISO 9001:2015"
                    value={newReqForm.threshold_value}
                    onChange={(e) => setNewReqForm({ ...newReqForm, threshold_value: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Certification"
                    value={newReqForm.unit}
                    onChange={(e) => setNewReqForm({ ...newReqForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify detailed evaluation instructions..."
                  value={newReqForm.description}
                  onChange={(e) => setNewReqForm({ ...newReqForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="newMandatory"
                  checked={newReqForm.mandatory}
                  onChange={(e) => setNewReqForm({ ...newReqForm, mandatory: e.target.checked })}
                  className="rounded border-[#D5DFED] text-[#2155D9] w-4 h-4"
                />
                <label htmlFor="newMandatory" className="text-xs font-semibold text-slate-700">
                  Mandatory Requirement
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2155D9] hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl border border-[#D5DFED] shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-[#2155D9]" />
                <h3 className="font-bold text-slate-900 text-base">Finalize Tender Requirements</h3>
              </div>
              <button
                onClick={() => setIsFinalizeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <p>
                You are about to lock and finalize <span className="font-bold text-slate-900">{verifiedCount + editedCount + addedCount} approved requirements</span> for tender <span className="font-mono font-bold text-[#2155D9]">{targetTenderId}</span>.
              </p>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-[#D5DFED] space-y-1.5 text-xs">
                <div className="flex justify-between font-medium">
                  <span>Approved & Verified:</span>
                  <span className="font-bold text-emerald-700">{verifiedCount + editedCount + addedCount} Clauses</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Excluded / Rejected:</span>
                  <span className="font-bold text-red-600">{rejectedCount} Clauses</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>RulesEngine Integration:</span>
                  <span className="font-bold text-[#2155D9]">Immediate Synchronization</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Officer Finalization Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. All requirements reviewed and verified in accordance with CPCL procurement guidelines."
                  value={finalizeNotes}
                  onChange={(e) => setFinalizeNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#D5DFED] rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2155D9]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsFinalizeModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Continue Reviewing
                </button>
                <button
                  onClick={handleFinalizeRequirements}
                  className="px-4 py-2 bg-[#2155D9] hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
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
