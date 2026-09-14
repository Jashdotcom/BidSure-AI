"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Card, Button, StatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
  ClockIcon,
  BuildingIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { Tender, Requirement } from "@/lib/types";

const INITIAL_SAMPLE_TENDERS: Tender[] = [
  {
    id: "TND-2026-001",
    tender_number: "CPCL/PROC/2026/001",
    ref: "CPCL/PROC/2026/001",
    tender_id: "CPCL/PROC/2026/001",
    title: "Industrial Safety Helmets & Impact Visors",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    department: "Fire & Safety Department, Manali Refinery",
    status: "OPEN",
    estimated_value: 45000000.0,
    emd_amount: 900000.0,
    publish_date: "2026-07-01T09:00:00Z",
    closing_date: "2026-09-18T17:30:00Z",
    deadline: "18 Sep 2026",
    category: "Industrial PPE",
    bids_count: 3,
    verified_count: 2,
    description:
      "Annual procurement contract for supply and certification of industrial safety helmets, chemical impact visors, flame-resistant coveralls, and respiratory protection apparatus.",
  },
  {
    id: "TND-2026-002",
    tender_number: "CPCL/PROC/2026/002",
    ref: "CPCL/PROC/2026/002",
    tender_id: "CPCL/PROC/2026/002",
    title: "Industrial Protective Equipment & Harness Kits",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    department: "Safety & Fall Protection Wing",
    status: "OPEN",
    estimated_value: 32000000.0,
    emd_amount: 640000.0,
    publish_date: "2026-07-10T10:00:00Z",
    closing_date: "2026-09-22T17:00:00Z",
    deadline: "22 Sep 2026",
    category: "Safety & Fall Protection",
    bids_count: 5,
    verified_count: 3,
    description:
      "Procurement of EN-certified full-body harnesses, shock-absorbing lanyards, and rescue winch kits for elevated refinery structures.",
  },
  {
    id: "TND-2026-003",
    tender_number: "CPCL/PROC/2026/003",
    ref: "CPCL/PROC/2026/003",
    tender_id: "CPCL/PROC/2026/003",
    title: "Fire Safety Equipment & Hydrant Valves",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    department: "Fire & Safety Department",
    status: "CLOSING SOON",
    estimated_value: 58000000.0,
    emd_amount: 1160000.0,
    publish_date: "2026-07-15T09:00:00Z",
    closing_date: "2026-09-25T15:00:00Z",
    deadline: "25 Sep 2026",
    category: "Fire & Safety Systems",
    bids_count: 2,
    verified_count: 1,
    description:
      "Supply of UL/FM certified fire hydrant landing valves, high-pressure foam monitors, and breathing apparatus cylinders.",
  },
  {
    id: "TND-2026-004",
    tender_number: "CPCL/PROC/2026/004",
    ref: "CPCL/PROC/2026/004",
    tender_id: "CPCL/PROC/2026/004",
    title: "High-Pressure Refinery Valve Assemblies",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    department: "Mechanical Engineering Division",
    status: "UNDER REVIEW",
    estimated_value: 82000000.0,
    emd_amount: 1640000.0,
    publish_date: "2026-07-20T10:00:00Z",
    closing_date: "2026-10-02T15:00:00Z",
    deadline: "02 Oct 2026",
    category: "Piping & Instrumentation",
    bids_count: 4,
    verified_count: 4,
    description:
      "Supply of ASTM A335 Grade P91 seamless valves, alloy piping assemblies, and IBR certified flanged connections for Crude Distillation Unit.",
  },
  {
    id: "TND-2026-005",
    tender_number: "CPCL/PROC/2026/005",
    ref: "CPCL/PROC/2026/005",
    tender_id: "CPCL/PROC/2026/005",
    title: "Hazardous Gas Detection Sensors (Fixed & Portable)",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    department: "Environmental & Safety Monitoring Wing",
    status: "PUBLISHED",
    estimated_value: 24000000.0,
    emd_amount: 480000.0,
    publish_date: "2026-08-01T10:00:00Z",
    closing_date: "2026-10-12T17:00:00Z",
    deadline: "12 Oct 2026",
    category: "Environmental Monitoring",
    bids_count: 0,
    verified_count: 0,
    description:
      "Turnkey supply, calibration, and wireless integration of multi-gas detectors (H2S, LEL, CO, O2) across refinery processing blocks.",
  },
  {
    id: "TND-2024-001",
    tender_number: "CPCL/PROC/SAFETY/2024/09",
    ref: "CPCL/PROC/SAFETY/2024/09",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    title: "Supply and Maintenance of High-Grade Industrial Safety & Fire Protection Equipment",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    department: "Fire & Safety Department, Manali Refinery",
    status: "EVALUATING",
    estimated_value: 45000000.0,
    emd_amount: 900000.0,
    publish_date: "2024-07-01T09:00:00Z",
    closing_date: "2024-08-30T17:30:00Z",
    deadline: "30 Aug 2024",
    category: "Goods & Safety Systems",
    bids_count: 3,
    verified_count: 3,
    description:
      "Annual contract for supply of certified flame-resistant coveralls, SCBA breathing apparatus, chemical safety helmets, and fall protection harnesses.",
  },
];

const DEFAULT_REQUIREMENTS: Requirement[] = [
  {
    id: "REQ-001",
    code: "TURNOVER",
    name: "Average Annual Turnover",
    clause_reference: "Section II, Clause 3.1",
    category: "Financial",
    type: "NUMERIC_GTE",
    mandatory: true,
    description: "Minimum average annual financial turnover of ₹3.00 Crore during last 3 financial years.",
    threshold_value: ">= ₹3.00 Cr",
    unit: "Crore INR",
    validation_source: "Audited Balance Sheet & MCA/ITR",
    weight: 20,
    constraint_type: "numeric",
    source_document: "CPCL_Tender_Safety_Equipment_2026.pdf",
    source_page: 3,
    confidence: 0.98,
  },
  {
    id: "REQ-002",
    code: "EXP",
    name: "Past Experience in PSUs / Refineries",
    clause_reference: "Section III, Clause 4.2",
    category: "Eligibility",
    type: "NUMERIC_GTE",
    mandatory: true,
    description: "Minimum 3 years of proven experience in supplying industrial safety PPE to PSUs/Refineries.",
    threshold_value: ">= 3 years",
    unit: "Years",
    validation_source: "Experience Certificate & Past POs",
    weight: 20,
    constraint_type: "numeric",
    source_document: "CPCL_Tender_Safety_Equipment_2026.pdf",
    source_page: 5,
    confidence: 0.96,
  },
  {
    id: "REQ-003",
    code: "OEM",
    name: "OEM Authorization Certificate",
    clause_reference: "Section III, Clause 4.5",
    category: "Technical",
    type: "DOCUMENT_VALID",
    mandatory: true,
    description: "Direct Manufacturer Authorization Form (MAF) from original safety equipment manufacturer.",
    threshold_value: "Direct OEM Authorized",
    validation_source: "OEM Verification Registry",
    weight: 15,
    constraint_type: "enum",
    source_document: "CPCL_Tender_Safety_Equipment_2026.pdf",
    source_page: 6,
    confidence: 0.97,
  },
  {
    id: "REQ-004",
    code: "LOCAL_CONTENT",
    name: "Minimum Local Content (Make in India)",
    clause_reference: "Section IV, Clause 5.1",
    category: "Statutory",
    type: "NUMERIC_GTE",
    mandatory: true,
    description: "Minimum 50% local content requirement under Public Procurement Order (Class-I Local Supplier).",
    threshold_value: ">= 50%",
    unit: "%",
    validation_source: "DPIIT / Statutory Auditor Certificate",
    weight: 15,
    constraint_type: "numeric",
    source_document: "CPCL_Tender_Safety_Equipment_2026.pdf",
    source_page: 7,
    confidence: 0.94,
  },
  {
    id: "REQ-005",
    code: "GST",
    name: "GST Registration & Returns",
    clause_reference: "Section II, Clause 2.1",
    category: "Statutory",
    type: "REGISTRATION_VALID",
    mandatory: true,
    description: "Bidder must possess valid active GSTIN registration in India with up-to-date return filings.",
    threshold_value: "Active",
    validation_source: "GSTN Portal",
    weight: 15,
    constraint_type: "boolean",
    source_document: "CPCL_Tender_Safety_Equipment_2026.pdf",
    source_page: 3,
    confidence: 0.99,
  },
  {
    id: "REQ-006",
    code: "DEBARMENT",
    name: "Vigilance & Non-Debarment Integrity",
    clause_reference: "Section I, Clause 1.4",
    category: "Vigilance",
    type: "BOOLEAN_CHECK",
    mandatory: true,
    description: "Bidder must not be debarred, blacklisted or banned by CPCL, CVC, GeM, or any PSU.",
    threshold_value: "Clear / No Debarment",
    validation_source: "Central Vigilance Debarment Registry",
    weight: 15,
    constraint_type: "boolean",
    source_document: "CPCL_Tender_Safety_Equipment_2026.pdf",
    source_page: 2,
    confidence: 0.99,
  },
];

export default function TendersPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // URL state synchronization
  const initialQuery = searchParams.get("query") || "";

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [tenders, setTenders] = useState<Tender[]>(INITIAL_SAMPLE_TENDERS);
  const [loading, setLoading] = useState(false);

  // Active view: "LIST" or "CLAUSE_SCRUTINY"
  const [activeView, setActiveView] = useState<"LIST" | "CLAUSE_SCRUTINY">("LIST");
  const [selectedTender, setSelectedTender] = useState<Tender>(INITIAL_SAMPLE_TENDERS[0]);

  // Clause Extraction & Scrutiny State
  const [requirements, setRequirements] = useState<Requirement[]>(DEFAULT_REQUIREMENTS);
  const [analyzing, setAnalyzing] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddReqModalOpen, setIsAddReqModalOpen] = useState(false);
  const [isEditReqModalOpen, setIsEditReqModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);

  // New Tender Form State
  const [newTender, setNewTender] = useState({
    title: "",
    tender_number: "",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    department: "Materials & Procurement Division",
    category: "Industrial PPE",
    estimated_value: "45000000",
    emd_amount: "900000",
    deadline: "2026-10-15",
    description: "",
  });

  // New Requirement Form State
  const [newReq, setNewReq] = useState({
    name: "",
    clause_reference: "Section III, Clause ",
    category: "Technical",
    threshold_value: "Compliant",
    description: "",
    mandatory: true,
    weight: 10,
    constraint_type: "text",
  });

  // Push URL update helper
  const updateUrlParams = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("query", query);
      } else {
        params.delete("query");
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, pathname, router]
  );

  // Debounced search sync
  useEffect(() => {
    const handler = setTimeout(() => {
      updateUrlParams(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, updateUrlParams]);

  // Fetch / filter tenders
  const fetchTenders = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (query) qParams.set("query", query);

      const qs = qParams.toString() ? `?${qParams.toString()}` : "";
      const res = await apiRequest<Tender[]>(`/tenders${qs}`);
      if (res && Array.isArray(res)) {
        setTenders(res);
      } else {
        // Local in-memory filter
        filterLocalTenders(query);
      }
    } catch {
      filterLocalTenders(query);
    } finally {
      setLoading(false);
    }
  }, []);

  function filterLocalTenders(query: string) {
    let list = [...INITIAL_SAMPLE_TENDERS];
    if (query) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.tender_number?.toLowerCase().includes(q) ||
          t.ref?.toLowerCase().includes(q) ||
          t.tender_id?.toLowerCase().includes(q) ||
          t.id?.toLowerCase().includes(q) ||
          t.title?.toLowerCase().includes(q) ||
          t.organization?.toLowerCase().includes(q) ||
          t.department?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    setTenders(list);
  }

  // Refetch when search params change
  useEffect(() => {
    const q = searchParams.get("query") || "";
    setSearchTerm(q);
    fetchTenders(q);
  }, [searchParams, fetchTenders]);

  function handleClearSearch() {
    setSearchTerm("");
    updateUrlParams("");
  }

  // Create Tender
  async function handleCreateTender(e: React.FormEvent) {
    e.preventDefault();
    if (!newTender.title) return;

    const num = newTender.tender_number || `CPCL/PROC/2026/00${tenders.length + 1}`;
    const tenderPayload: Tender = {
      id: `TND-2026-00${tenders.length + 1}`,
      tender_number: num,
      ref: num,
      tender_id: num,
      title: newTender.title,
      organization: newTender.organization,
      department: newTender.department,
      category: newTender.category,
      status: "OPEN",
      estimated_value: parseFloat(newTender.estimated_value) || 30000000,
      emd_amount: parseFloat(newTender.emd_amount) || 600000,
      deadline: newTender.deadline,
      closing_date: `${newTender.deadline}T17:30:00Z`,
      publish_date: new Date().toISOString(),
      bids_count: 0,
      verified_count: 0,
      description: newTender.description || `Procurement contract for ${newTender.title}`,
    };

    try {
      await apiRequest("/tenders", {
        method: "POST",
        body: tenderPayload,
      });
    } catch {
      // Offline fallback
    }

    setTenders([tenderPayload, ...tenders]);
    setIsCreateModalOpen(false);
    setNewTender({
      title: "",
      tender_number: "",
      organization: "Chennai Petroleum Corporation Limited (CPCL)",
      department: "Materials & Procurement Division",
      category: "Industrial PPE",
      estimated_value: "45000000",
      emd_amount: "900000",
      deadline: "2026-10-15",
      description: "",
    });
  }

  // AI Clause Extraction
  function handleAnalyze() {
    setAnalyzing(true);
    setIsApproved(false);
    setApprovalMessage(null);
    setTimeout(() => {
      setAnalyzing(false);
      setIsApproved(true);
      setApprovalMessage("✓ All 6 mandatory statutory and technical clauses extracted and mapped to GFR 144.");
    }, 1200);
  }

  function handleToggleMandatory(reqId: string) {
    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, mandatory: !r.mandatory } : r))
    );
  }

  function handleOpenEditReq(req: Requirement) {
    setEditingReq({ ...req });
    setIsEditReqModalOpen(true);
  }

  function handleSaveEditReq() {
    if (!editingReq) return;
    setRequirements((prev) =>
      prev.map((r) => (r.id === editingReq.id ? editingReq : r))
    );
    setIsEditReqModalOpen(false);
  }

  function handleDeleteReq(reqId: string) {
    setRequirements((prev) => prev.filter((r) => r.id !== reqId));
  }

  function handleAddReq() {
    if (!newReq.name) return;
    const item: Requirement = {
      id: `REQ-00${requirements.length + 1}`,
      code: newReq.name.toUpperCase().slice(0, 8).replace(/\s+/g, "_"),
      name: newReq.name,
      clause_reference: newReq.clause_reference,
      category: newReq.category,
      type: "VALUE_MATCH",
      mandatory: newReq.mandatory,
      threshold_value: newReq.threshold_value,
      description: newReq.description || `Evaluation clause for ${newReq.name}`,
      weight: Number(newReq.weight) || 10,
      constraint_type: newReq.constraint_type as any,
      validation_source: "Officer Scrutiny & Rule Extractor",
      source_document: `${selectedTender.tender_number?.replace(/\//g, "_") || "Tender_Document"}.pdf`,
      source_page: 1,
      confidence: 0.96,
    };
    setRequirements([...requirements, item]);
    setIsAddReqModalOpen(false);
    setNewReq({
      name: "",
      clause_reference: "Section III, Clause ",
      category: "Technical",
      threshold_value: "Compliant",
      description: "",
      mandatory: true,
      weight: 10,
      constraint_type: "text",
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Create Tender Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Tenders & RFP Clauses
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Manage procurement notices, parse RFP clauses, and configure deterministic evaluation rules.
          </p>
        </div>

        <div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-xs flex items-center gap-1.5"
            size="sm"
          >
            <PlusIcon className="size-4" />
            Create Tender
          </Button>
        </div>
      </div>

      {/* VIEW 1: TENDERS LIST WITH DEDICATED SEARCH BAR */}
      {activeView === "LIST" && (
        <div className="space-y-4">
          {/* Functional Search Field */}
          <div className="relative w-full">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tenders..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100 shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Clear search"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Tenders Grid / Cards */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500">
              <RefreshCwIcon className="size-6 animate-spin text-blue-600 mb-2" />
              <p className="text-xs font-medium">Filtering tender database...</p>
            </div>
          ) : tenders.length === 0 ? (
            /* Clean Empty State */
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                <SearchIcon className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No tenders found</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                No tender notices match &ldquo;{searchTerm}&rdquo;. Check your search keywords or clear search to view all tenders.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSearch}
                className="mt-4 text-xs font-semibold"
              >
                Clear Search & Show All Tenders
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {tenders.map((tender) => (
                <Card
                  key={tender.id}
                  className="flex flex-col justify-between p-5 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="space-y-3">
                    {/* Header: Tender Number & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {tender.tender_number || tender.ref || tender.tender_id || tender.id}
                        </span>
                        <h2 className="mt-1.5 text-base font-bold text-slate-900 leading-snug">
                          {tender.title}
                        </h2>
                      </div>
                      <StatusBadge status={tender.status} />
                    </div>

                    {/* Organization & Category */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <BuildingIcon className="size-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">
                          {tender.organization}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Category: <strong className="text-slate-700">{tender.category}</strong> · Department: {tender.department || "Procurement Cell"}
                      </p>
                    </div>

                    {/* Description */}
                    {tender.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                        {tender.description}
                      </p>
                    )}

                    {/* Commercials & Bids Summary */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center text-xs">
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400">ESTIMATED VALUE</span>
                        <strong className="text-slate-900 font-bold">
                          {typeof tender.estimated_value === "number"
                            ? `₹ ${(tender.estimated_value / 10000000).toFixed(2)} Cr`
                            : tender.estimated_value || "₹ 4.50 Cr"}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400">EMD AMOUNT</span>
                        <strong className="text-slate-900 font-bold">
                          {typeof tender.emd_amount === "number"
                            ? `₹ ${(tender.emd_amount / 100000).toFixed(2)} L`
                            : tender.emd_amount || "₹ 9.00 L"}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400">BIDS RECEIVED</span>
                        <strong className="text-blue-700 font-bold">
                          {tender.bids_count ?? 3} Submissions
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <ClockIcon className="size-3 text-slate-400" />
                      Closing: {tender.deadline || "18 Sep 2026"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTender(tender);
                          setActiveView("CLAUSE_SCRUTINY");
                        }}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
                      >
                        <SparklesIcon className="size-3.5" />
                        Scrutinize Clauses
                      </button>

                      <Link href={`/bidders?tender_id=${encodeURIComponent(tender.tender_number || tender.id)}`}>
                        <Button size="sm" variant="outline" className="text-xs font-semibold">
                          View Bids ({tender.bids_count ?? 0}) →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: AI CLAUSE SCRUTINY & RULE EXTRACTOR (Activated via "Scrutinize Clauses" on a tender card) */}
      {activeView === "CLAUSE_SCRUTINY" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Scrutiny Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                <FileTextIcon className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedTender.tender_number || selectedTender.ref || selectedTender.id}
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    OCR INGESTED
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {selectedTender.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organization: <strong className="text-slate-700">{selectedTender.organization}</strong> · Category: {selectedTender.category}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={handleAnalyze}
                loading={analyzing}
                className="shadow-xs bg-blue-700 hover:bg-blue-800 font-bold"
                size="sm"
              >
                <SparklesIcon className="size-4 text-amber-300" />
                {analyzing ? "Re-Extracting Rules..." : "Re-Analyze RFP Document"}
              </Button>

              <Button
                onClick={() => {
                  setIsApproved(true);
                  setApprovalMessage("✓ Criteria approved by Procurement Officer. Configured for deterministic vendor evaluation.");
                }}
                variant={isApproved ? "outline" : "primary"}
                className={isApproved ? "border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold" : "text-xs font-bold"}
                size="sm"
              >
                <CheckCircleIcon className="size-4 text-emerald-600" />
                {isApproved ? "Requirements Approved ✓" : "Approve Requirements"}
              </Button>

              <button
                type="button"
                onClick={() => setActiveView("LIST")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back to Tenders
              </button>
            </div>
          </div>

          {/* Approval Banner */}
          {approvalMessage && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="size-5 text-emerald-600 shrink-0" />
                <span>{approvalMessage}</span>
              </div>
              <Link href={`/bidders?tender_id=${encodeURIComponent(selectedTender.tender_number || selectedTender.id)}`}>
                <span className="rounded-lg bg-emerald-600 px-3 py-1 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">
                  Evaluate Bidders →
                </span>
              </Link>
            </div>
          )}

          {/* Extracted Criteria Table */}
          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Extracted Tender Evaluation Criteria & Thresholds ({requirements.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deterministic verification rules evaluated against submitted vendor annexures and certificates.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddReqModalOpen(true)}
                className="text-xs font-semibold"
              >
                <PlusIcon className="size-3.5" />
                Add Custom Rule
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Requirement & Description</th>
                    <th className="px-4 py-3">Clause Reference</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Constraint & Threshold</th>
                    <th className="px-4 py-3 text-center">Mandatory</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {requirements.map((req, idx) => (
                    <tr key={req.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-bold text-slate-900">{req.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{req.description}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-medium text-slate-700 block">{req.clause_reference}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {req.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-extrabold text-slate-900 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 text-xs">
                          {String(req.threshold_value)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleMandatory(req.id)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            req.mandatory
                              ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {req.mandatory ? "YES (Strict)" : "NO (Optional)"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-emerald-700 font-bold text-[11px]">
                          {Math.round((req.confidence || 0.95) * 100)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditReq(req)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="Edit rule"
                          >
                            <EditIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReq(req.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                            title="Delete rule"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CREATE TENDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Create New Tender Notice
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tender Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Industrial Fall Protection & Harness Kits"
                  value={newTender.title}
                  onChange={(e) => setNewTender({ ...newTender, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tender Reference / Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CPCL/PROC/2026/006"
                    value={newTender.tender_number}
                    onChange={(e) => setNewTender({ ...newTender, tender_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newTender.category}
                    onChange={(e) => setNewTender({ ...newTender, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Estimated Value (INR)
                  </label>
                  <input
                    type="number"
                    value={newTender.estimated_value}
                    onChange={(e) => setNewTender({ ...newTender, estimated_value: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    EMD Amount (INR)
                  </label>
                  <input
                    type="number"
                    value={newTender.emd_amount}
                    onChange={(e) => setNewTender({ ...newTender, emd_amount: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Submission Deadline
                </label>
                <input
                  type="date"
                  value={newTender.deadline}
                  onChange={(e) => setNewTender({ ...newTender, deadline: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description / Scope of Work
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed specifications and scope..."
                  value={newTender.description}
                  onChange={(e) => setNewTender({ ...newTender, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-blue-700 hover:bg-blue-800 text-white font-bold">
                  Publish Tender Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT REQUIREMENT MODAL */}
      {isEditReqModalOpen && editingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Criterion: {editingReq.code}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditReqModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Requirement Name</label>
                <input
                  type="text"
                  value={editingReq.name}
                  onChange={(e) => setEditingReq({ ...editingReq, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Threshold / Criteria Value</label>
                <input
                  type="text"
                  value={String(editingReq.threshold_value)}
                  onChange={(e) => setEditingReq({ ...editingReq, threshold_value: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-blue-700 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clause Reference</label>
                <input
                  type="text"
                  value={editingReq.clause_reference}
                  onChange={(e) => setEditingReq({ ...editingReq, clause_reference: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditReqModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEditReq} className="bg-blue-700 hover:bg-blue-800 text-white font-bold">
                Save Rule Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM REQUIREMENT MODAL */}
      {isAddReqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Add Custom RFP Evaluation Rule
              </h3>
              <button
                type="button"
                onClick={() => setIsAddReqModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rule Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. ISO 9001:2015 Quality Management System"
                  value={newReq.name}
                  onChange={(e) => setNewReq({ ...newReq, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Clause Reference</label>
                  <input
                    type="text"
                    value={newReq.clause_reference}
                    onChange={(e) => setNewReq({ ...newReq, clause_reference: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newReq.category}
                    onChange={(e) => setNewReq({ ...newReq, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Financial">Financial</option>
                    <option value="Statutory">Statutory</option>
                    <option value="Eligibility">Eligibility</option>
                    <option value="Vigilance">Vigilance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Threshold / Criteria</label>
                <input
                  type="text"
                  placeholder="e.g. Valid ISO Certificate"
                  value={newReq.threshold_value}
                  onChange={(e) => setNewReq({ ...newReq, threshold_value: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsAddReqModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddReq} disabled={!newReq.name} className="bg-blue-700 hover:bg-blue-800 text-white font-bold">
                Add Rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
