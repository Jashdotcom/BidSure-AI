"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Button,
  StatusBadge,
  RiskBadge,
  ScoreDisplay,
  DocumentStatusBadge,
} from "@/components/ui";
import {
  ShieldCheckIcon,
  FileTextIcon,
  EyeIcon,
  DownloadIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
  FilterIcon,
  SlidersIcon,
  BuildingIcon,
  ClockIcon,
  CheckIcon,
  ScaleIcon,
  UsersIcon,
  ArrowRightIcon,
  InfoIcon,
} from "@/components/icons";
import { EvidenceModal } from "@/components/evidence-modal";
import { apiRequest } from "@/lib/api";
import {
  Tender,
  Bidder,
  EvidenceItem,
  DetailedRequirementEvaluation,
  DocumentVerificationDetail,
  DocumentRequirementTraceability,
  BidderComplianceDetailResponse,
} from "@/lib/types";

export default function CompliancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTenderParam = searchParams.get("tender_id") || searchParams.get("tender") || "";
  const initialBidderParam = searchParams.get("bidder_id") || searchParams.get("bidder") || "";

  // Data states
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string>(initialTenderParam);
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [selectedBidderId, setSelectedBidderId] = useState<string>(initialBidderParam);
  const [complianceDetail, setComplianceDetail] = useState<BidderComplianceDetailResponse | null>(null);

  // UI & Filter states
  const [loadingTenders, setLoadingTenders] = useState(false);
  const [loadingBidders, setLoadingBidders] = useState(false);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PASS" | "FAIL" | "REVIEW" | "MANDATORY_ONLY">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [quickMetricFilter, setQuickMetricFilter] = useState<string | null>(null);

  // Evidence modal state
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active view tab in compliance page
  const [activeTab, setActiveTab] = useState<"evaluation" | "documents" | "traceability">("evaluation");

  // 1. Fetch all tenders on initial mount
  useEffect(() => {
    async function loadTenders() {
      setLoadingTenders(true);
      try {
        const data = await apiRequest<Tender[]>("/tenders/");
        if (Array.isArray(data) && data.length > 0) {
          setTenders(data);
          // If no tender selected yet or initial parameter doesn't match, pick first active/published
          if (!selectedTenderId) {
            const defaultTender = data.find((t) => t.status === "PUBLISHED" || t.status === "ACTIVE") || data[0];
            setSelectedTenderId(defaultTender.id || defaultTender.tender_number);
          }
        }
      } catch (err: any) {
        console.error("Failed to load tenders for compliance studio:", err);
      } finally {
        setLoadingTenders(false);
      }
    }
    loadTenders();
  }, []);

  // 2. Load submitted bidders when selectedTenderId changes
  useEffect(() => {
    if (!selectedTenderId) return;

    async function loadBiddersForTender() {
      setLoadingBidders(true);
      setError(null);
      try {
        // Use dedicated compliance submitted bidders endpoint
        const data = await apiRequest<Bidder[]>(`/compliance/tender/${selectedTenderId}/bidders`);
        const submittedBidders = Array.isArray(data) ? data : [];
        setBidders(submittedBidders);

        // Auto-select first submitted bidder if none selected or if current selected bidder is not in this tender
        if (submittedBidders.length > 0) {
          const currentBidderExists = submittedBidders.some((b) => b.id === selectedBidderId);
          if (!selectedBidderId || !currentBidderExists) {
            setSelectedBidderId(submittedBidders[0].id);
          }
        } else {
          setSelectedBidderId("");
          setComplianceDetail(null);
        }
      } catch (err: any) {
        console.error("Failed to load bidders for tender:", err);
        setError("Unable to load submitted bidders for this tender.");
        setBidders([]);
        setSelectedBidderId("");
        setComplianceDetail(null);
      } finally {
        setLoadingBidders(false);
      }
    }

    loadBiddersForTender();
  }, [selectedTenderId]);

  // 3. Load full compliance evaluation when selectedTenderId and selectedBidderId are valid
  const loadComplianceEvaluation = useCallback(async (tenderId: string, bidderId: string) => {
    if (!tenderId || !bidderId) return;

    setLoadingEvaluation(true);
    setError(null);
    try {
      const res = await apiRequest<BidderComplianceDetailResponse>(
        `/compliance/tender/${tenderId}/bidder/${bidderId}`
      );
      if (res && res.summary) {
        setComplianceDetail(res);
      }
    } catch (err: any) {
      console.error("Failed to load compliance detail:", err);
      setError(err?.message || "Failed to load detailed compliance evaluation.");
    } finally {
      setLoadingEvaluation(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenderId && selectedBidderId) {
      loadComplianceEvaluation(selectedTenderId, selectedBidderId);

      // Keep URL search params in sync
      const params = new URLSearchParams();
      params.set("tender_id", selectedTenderId);
      params.set("bidder_id", selectedBidderId);
      router.replace(`/compliance?${params.toString()}`);
    }
  }, [selectedTenderId, selectedBidderId, loadComplianceEvaluation, router]);

  // Handle opening evidence modal
  const handleOpenEvidence = (item: DetailedRequirementEvaluation) => {
    const evidenceItem: EvidenceItem = {
      requirement_id: item.requirement_id,
      requirement_code: item.requirement_code,
      requirement_name: item.requirement_name,
      clause_reference: item.clause_reference,
      category: item.category,
      mandatory: item.mandatory,
      required_value: item.required_value,
      bidder_value: item.submitted_value,
      status: item.status as any,
      rule_evaluated: item.rule_evaluated,
      evidence_source: item.evidence_source,
      page_number: item.page_number,
      highlight_text: item.highlight_text,
      explanation: item.explanation,
      confidence: item.confidence,
      weight: item.weight,
    };
    setSelectedEvidence(evidenceItem);
    setIsModalOpen(true);
  };

  // Selected Tender object helper
  const currentTender = useMemo(() => {
    return (
      complianceDetail?.tender ||
      tenders.find(
        (t) =>
          t.id === selectedTenderId ||
          t.tender_number === selectedTenderId ||
          t.ref === selectedTenderId
      ) ||
      null
    );
  }, [complianceDetail, tenders, selectedTenderId]);

  // Selected Bidder object helper
  const currentBidder = useMemo(() => {
    return (
      complianceDetail?.bidder ||
      bidders.find((b) => b.id === selectedBidderId) ||
      null
    );
  }, [complianceDetail, bidders, selectedBidderId]);

  // Unique categories in evaluations
  const availableCategories = useMemo(() => {
    if (!complianceDetail?.evaluations) return [];
    const set = new Set<string>();
    complianceDetail.evaluations.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [complianceDetail]);

  // Filtered evaluations list
  const filteredEvaluations = useMemo(() => {
    if (!complianceDetail?.evaluations) return [];
    return complianceDetail.evaluations.filter((item) => {
      // 1. Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.requirement_name.toLowerCase().includes(q);
        const matchesClause = item.clause_reference.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        const matchesDoc = item.evidence_source.toLowerCase().includes(q);
        const matchesExp = item.explanation.toLowerCase().includes(q);
        const matchesSubmitted = item.submitted_value.toLowerCase().includes(q);
        if (!matchesName && !matchesClause && !matchesCategory && !matchesDoc && !matchesExp && !matchesSubmitted) {
          return false;
        }
      }

      // 2. Quick Metric Card Filter
      if (quickMetricFilter) {
        if (quickMetricFilter === "PASSED" && item.status !== "PASS") return false;
        if (quickMetricFilter === "FAILED" && item.status !== "FAIL") return false;
        if (quickMetricFilter === "REVIEW" && item.status !== "REVIEW" && item.status !== "REVIEW_REQUIRED") return false;
        if (quickMetricFilter === "MANDATORY_FAILED" && (item.status !== "FAIL" || !item.mandatory)) return false;
      }

      // 3. Status Filter Dropdown / Pill
      if (statusFilter === "PASS" && item.status !== "PASS") return false;
      if (statusFilter === "FAIL" && item.status !== "FAIL") return false;
      if (statusFilter === "REVIEW" && item.status !== "REVIEW" && item.status !== "REVIEW_REQUIRED") return false;
      if (statusFilter === "MANDATORY_ONLY" && !item.mandatory) return false;

      // 4. Category Filter
      if (categoryFilter !== "ALL" && item.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [complianceDetail, searchQuery, quickMetricFilter, statusFilter, categoryFilter]);

  const summary = complianceDetail?.summary;

  return (
    <div className="space-y-6 pb-12">
      {/* Evidence Modal */}
      <EvidenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        evidence={selectedEvidence}
        bidderName={currentBidder?.name || "Selected Bidder"}
      />

      {/* Header Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              <ShieldCheckIcon className="size-3.5" />
              Deterministic Compliance Engine
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
              Procurement Officer Workspace
            </span>
            {currentTender && (
              <span className="text-xs font-medium text-slate-500">
                · {currentTender.tender_number || currentTender.id}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
            Compliance Verification & Evidence
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Granular deterministic compliance evaluation of participating bidders against tender specifications, statutory registries, and submitted evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedTenderId && selectedBidderId) {
                loadComplianceEvaluation(selectedTenderId, selectedBidderId);
              }
            }}
            loading={loadingEvaluation}
            className="text-xs"
          >
            <RefreshCwIcon className="size-3.5 text-blue-600" />
            Re-Run Rules Engine
          </Button>

          {selectedTenderId && (
            <Link href={`/bidders?tender_id=${selectedTenderId}`}>
              <Button variant="outline" size="sm" className="text-xs text-slate-700">
                <ScaleIcon className="size-3.5 text-slate-600" />
                Compare Bids
              </Button>
            </Link>
          )}

          {selectedTenderId && selectedBidderId && (
            <Link href={`/reports?tender_id=${selectedTenderId}&bidder_id=${selectedBidderId}`}>
              <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-xs shadow-sm">
                <DownloadIcon className="size-3.5" />
                Generate Audit Report
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* STEP 1: Tender Selection Section */}
      <Card className="p-5 border-slate-200 bg-slate-50/50 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <label htmlFor="tender-select" className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Select Active Tender for Evaluation
              </label>
              <p className="text-xs text-slate-500">
                Choose a published tender to view its participating bidders and qualification criteria.
              </p>
            </div>
            {currentTender && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Department:</span>
                <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                  {currentTender.department || "Refinery Operations"}
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <select
              id="tender-select"
              value={selectedTenderId}
              onChange={(e) => {
                const newTid = e.target.value;
                setSelectedTenderId(newTid);
                setSelectedBidderId("");
                setComplianceDetail(null);
              }}
              disabled={loadingTenders}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-900 shadow-sm transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {tenders.length === 0 ? (
                <option value="">Loading tenders...</option>
              ) : (
                tenders.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tender_number || t.id} — {t.title} ({t.bids_count ?? 0} Submitted Bids) [{t.status}]
                  </option>
                ))
              )}
            </select>
          </div>

          {currentTender && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Budget</span>
                <span className="font-extrabold text-slate-800">
                  {currentTender.estimated_value_display ||
                    (currentTender.estimated_value ? `₹ ${(currentTender.estimated_value / 10000000).toFixed(2)} Cr` : "N/A")}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                <span className="font-semibold text-slate-700">{currentTender.category || "General"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Closing Date</span>
                <span className="font-semibold text-slate-700">{currentTender.closing_date || currentTender.deadline || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Requirements</span>
                <span className="font-semibold text-blue-700">
                  {currentTender.requirements_count || (currentTender.requirements ? currentTender.requirements.length : 0)} Evaluated Clauses
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* STEP 2: Bidder Selection Switcher */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 text-blue-600" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Participating Bidders for Selected Tender ({bidders.length} Submitted)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Strictly excludes draft submissions. Click any bidder to load their compliance evaluation.
          </span>
        </div>

        {loadingBidders ? (
          <div className="flex items-center justify-center p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <svg className="size-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading submitted bidders for tender...
            </div>
          </div>
        ) : bidders.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-xs text-amber-800">
            <AlertTriangleIcon className="size-6 text-amber-600 mx-auto mb-2" />
            <p className="font-bold">No submitted bids found for this tender.</p>
            <p className="text-amber-700 mt-1">
              Bids in draft status are excluded from the official compliance evaluation studio.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {bidders.map((b) => {
              const isSelected = selectedBidderId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBidderId(b.id)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-150 relative ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/30"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      {b.id}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        b.status === "SUBMITTED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {b.status || "SUBMITTED"}
                    </span>
                  </div>

                  <p className="mt-1 font-bold text-xs text-slate-900 line-clamp-1">
                    {b.name}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 w-full">
                    <span className="text-slate-500 font-medium">Quote:</span>
                    <span className="font-extrabold text-slate-900">{b.bid_amount || "₹ --"}</span>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                      <CheckIcon className="size-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 3 & 4: Selected Bidder Summary Card & Interactive Metric Chips */}
      {complianceDetail && currentBidder && summary && (
        <div className="space-y-4">
          {/* Detailed Bidder Meta Strip */}
          <Card className="p-6 border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left Profile Section */}
              <div className="flex items-start gap-4">
                <ScoreDisplay score={summary.compliance_score} size="lg" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {currentBidder.name}
                    </h2>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                      {currentBidder.id}
                    </span>
                    <RiskBadge risk={summary.risk_level} />
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-extrabold ${
                        summary.eligibility_status === "ELIGIBLE"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : summary.eligibility_status === "DISQUALIFIED"
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {summary.eligibility_status === "ELIGIBLE" && <CheckCircleIcon className="size-3 text-emerald-700" />}
                      {summary.eligibility_status === "DISQUALIFIED" && <XCircleIcon className="size-3 text-red-700" />}
                      {summary.eligibility_status === "REQUIRES_REVIEW" && <AlertTriangleIcon className="size-3 text-amber-700" />}
                      {summary.eligibility_status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                    {currentBidder.contact_person && (
                      <span>
                        <strong>Contact:</strong> {currentBidder.contact_person}
                      </span>
                    )}
                    {currentBidder.location && (
                      <span>
                        <strong>Location:</strong> {currentBidder.location}
                      </span>
                    )}
                    {currentBidder.submitted_at && (
                      <span>
                        <strong>Submitted:</strong> {currentBidder.submitted_at}
                      </span>
                    )}
                    {currentBidder.bid_amount && (
                      <span>
                        <strong>Commercial Quote:</strong>{" "}
                        <span className="font-bold text-slate-900">{currentBidder.bid_amount}</span>
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-blue-800 bg-blue-50/80 rounded-md px-3 py-1.5 border border-blue-200 mt-2 font-medium">
                    <strong>Evaluation Formula:</strong> {summary.formula_explanation}
                  </p>
                </div>
              </div>

              {/* Disqualification / Status Callout */}
              {summary.mandatory_failed_count > 0 && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900 max-w-md">
                  <div className="flex items-center gap-2 font-bold text-red-700">
                    <XCircleIcon className="size-4" />
                    MANDATORY CRITERIA DISQUALIFICATION
                  </div>
                  <p className="mt-1 text-red-800">
                    Bidder failed {summary.mandatory_failed_count} mandatory qualification criteria. Disqualified from commercial bid opening.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Solid Interactive Summary Cards (Filter Chips) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Requirements */}
            <button
              type="button"
              onClick={() => {
                setQuickMetricFilter(null);
                setStatusFilter("ALL");
              }}
              className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                quickMetricFilter === null && statusFilter === "ALL"
                  ? "border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Total Criteria
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1">
                {summary.total_requirements}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">Tender clauses</span>
            </button>

            {/* 2. Passed Criteria */}
            <button
              type="button"
              onClick={() => {
                setQuickMetricFilter(quickMetricFilter === "PASSED" ? null : "PASSED");
                setStatusFilter("ALL");
              }}
              className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                quickMetricFilter === "PASSED"
                  ? "border-emerald-600 bg-emerald-100 shadow-md ring-2 ring-emerald-500/30"
                  : "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Passed
                </span>
                <CheckCircleIcon className="size-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-950 mt-1">
                {summary.passed_count}
              </span>
              <span className="text-[10px] text-emerald-700 mt-0.5 font-medium">Satisfied thresholds</span>
            </button>

            {/* 3. Failed Criteria */}
            <button
              type="button"
              onClick={() => {
                setQuickMetricFilter(quickMetricFilter === "FAILED" ? null : "FAILED");
                setStatusFilter("ALL");
              }}
              className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                quickMetricFilter === "FAILED"
                  ? "border-red-600 bg-red-100 shadow-md ring-2 ring-red-500/30"
                  : "border-red-200 bg-red-50/70 hover:bg-red-100/70 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-800">
                  Failed
                </span>
                <XCircleIcon className="size-4 text-red-600" />
              </div>
              <span className="text-2xl font-black text-red-950 mt-1">
                {summary.failed_count}
              </span>
              <span className="text-[10px] text-red-700 mt-0.5 font-medium">Non-compliant</span>
            </button>

            {/* 4. Requires Review */}
            <button
              type="button"
              onClick={() => {
                setQuickMetricFilter(quickMetricFilter === "REVIEW" ? null : "REVIEW");
                setStatusFilter("ALL");
              }}
              className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                quickMetricFilter === "REVIEW"
                  ? "border-amber-600 bg-amber-100 shadow-md ring-2 ring-amber-500/30"
                  : "border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                  Needs Review
                </span>
                <AlertTriangleIcon className="size-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-950 mt-1">
                {summary.review_count}
              </span>
              <span className="text-[10px] text-amber-700 mt-0.5 font-medium">Officer scrutiny</span>
            </button>

            {/* 5. Mandatory Failed */}
            <button
              type="button"
              onClick={() => {
                setQuickMetricFilter(quickMetricFilter === "MANDATORY_FAILED" ? null : "MANDATORY_FAILED");
                setStatusFilter("ALL");
              }}
              className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                quickMetricFilter === "MANDATORY_FAILED"
                  ? "border-rose-700 bg-rose-100 shadow-md ring-2 ring-rose-500/30"
                  : "border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">
                  Mandatory Fail
                </span>
                <span className="size-2 rounded-full bg-rose-600" />
              </div>
              <span className="text-2xl font-black text-rose-950 mt-1">
                {summary.mandatory_failed_count}
              </span>
              <span className="text-[10px] text-rose-700 mt-0.5 font-medium">Disqualifiers</span>
            </button>

            {/* 6. Verified Documents */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("documents");
              }}
              className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                activeTab === "documents"
                  ? "border-indigo-600 bg-indigo-100 shadow-md ring-2 ring-indigo-500/30"
                  : "border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800">
                  Documents
                </span>
                <ShieldCheckIcon className="size-4 text-indigo-600" />
              </div>
              <span className="text-2xl font-black text-indigo-950 mt-1">
                {summary.verified_documents_count} / {summary.total_documents_count}
              </span>
              <span className="text-[10px] text-indigo-700 mt-0.5 font-medium">Registries verified</span>
            </button>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("evaluation")}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-extrabold transition-colors ${
                activeTab === "evaluation"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheckIcon className="size-4" />
              Detailed Clause-by-Clause Matrix ({complianceDetail.evaluations.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-extrabold transition-colors ${
                activeTab === "documents"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileTextIcon className="size-4" />
              Document & Registry Verification Status ({complianceDetail.document_verifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("traceability")}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-extrabold transition-colors ${
                activeTab === "traceability"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ArrowRightIcon className="size-4" />
              Explainability & Traceability Pipeline
            </button>
          </div>

          {/* TAB 1: CLAUSE-BY-CLAUSE DETAILED EVALUATION */}
          {activeTab === "evaluation" && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by requirement title, clause reference, category, document name, or submitted value..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setQuickMetricFilter(null);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="ALL">All Verdicts</option>
                    <option value="PASS">PASS Only</option>
                    <option value="FAIL">FAIL Only</option>
                    <option value="REVIEW">REVIEW Only</option>
                    <option value="MANDATORY_ONLY">Mandatory Criteria Only</option>
                  </select>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {(searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL" || quickMetricFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("ALL");
                        setCategoryFilter("ALL");
                        setQuickMetricFilter(null);
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Evaluation Items Table / Card Matrix */}
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3.5">Requirement & Clause</th>
                        <th className="px-4 py-3.5">Mandatory</th>
                        <th className="px-4 py-3.5">Tender Threshold</th>
                        <th className="px-4 py-3.5">Bidder Submitted Value</th>
                        <th className="px-4 py-3.5">Compliance Verdict</th>
                        <th className="px-4 py-3.5">Document Verification</th>
                        <th className="px-4 py-3.5">Evidence Citation</th>
                        <th className="px-4 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredEvaluations.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-xs text-slate-500 font-medium">
                            No criteria match the active search and filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredEvaluations.map((item) => {
                          const isFail = item.status === "FAIL";
                          const isReview = item.status === "REVIEW" || item.status === "REVIEW_REQUIRED";
                          return (
                            <tr
                              key={item.requirement_id}
                              onClick={() => handleOpenEvidence(item)}
                              className={`cursor-pointer transition-colors ${
                                isFail
                                  ? "bg-red-50/40 hover:bg-red-50/80"
                                  : isReview
                                  ? "bg-amber-50/30 hover:bg-amber-50/70"
                                  : "hover:bg-slate-50/80"
                              }`}
                            >
                              <td className="px-4 py-3.5 max-w-[260px]">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900 line-clamp-1">{item.requirement_name}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    {item.clause_reference}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                    {item.category}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                  {item.explanation}
                                </p>
                              </td>

                              <td className="px-4 py-3.5">
                                {item.mandatory ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-800 border border-red-200">
                                    MANDATORY
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                    OPTIONAL
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 font-semibold text-slate-800">
                                {item.required_value}
                              </td>

                              <td className="px-4 py-3.5 font-bold text-slate-900">
                                <span className={isFail ? "text-red-700" : isReview ? "text-amber-800" : "text-slate-900"}>
                                  {item.submitted_value}
                                </span>
                              </td>

                              <td className="px-4 py-3.5">
                                <StatusBadge status={item.status} />
                              </td>

                              <td className="px-4 py-3.5">
                                <DocumentStatusBadge status={item.document_verification_status} />
                              </td>

                              <td className="px-4 py-3.5 text-slate-600 max-w-[180px]">
                                <div className="flex items-center gap-1.5">
                                  <FileTextIcon className="size-3.5 text-blue-600 flex-shrink-0" />
                                  <span className="truncate text-xs text-slate-800 font-medium">{item.evidence_source}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">
                                  Page {item.page_number}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEvidence(item);
                                  }}
                                  className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/20 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <EyeIcon className="size-3" />
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: SEPARATE DOCUMENT & REGISTRY VERIFICATION STATUS */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="size-6 text-blue-600" />
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                      Official Government & Regulatory Registry Verifications
                    </h3>
                    <p className="text-xs text-blue-700">
                      Separate statutory authentication confirms that submitted licenses, registrations, and declarations are active in official government databases.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-800">
                    {summary.verified_documents_count} of {summary.total_documents_count} Verified
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complianceDetail.document_verifications.map((doc, idx) => {
                  const isVerified = doc.verification_status === "VERIFIED";
                  const isReqReview = doc.verification_status === "REQUIRES_REVIEW";
                  return (
                    <Card
                      key={idx}
                      className={`p-5 border transition-all ${
                        isVerified
                          ? "border-slate-200 bg-white"
                          : isReqReview
                          ? "border-amber-200 bg-amber-50/40"
                          : "border-red-200 bg-red-50/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-extrabold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {doc.document_type}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{doc.document_name}</span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-800 pt-1">
                            {doc.verified_value || "Document Submitted"}
                          </p>
                        </div>
                        <DocumentStatusBadge status={doc.verification_status} />
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Source Document:</span>
                          <span className="font-mono font-semibold text-slate-700 truncate max-w-[240px]">
                            {doc.file_name}
                          </span>
                        </div>
                        {doc.registry_match && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Registry Match:</span>
                            <span className="font-semibold text-emerald-800">{doc.registry_match}</span>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                          <strong>Verification Detail:</strong> {doc.remarks}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENT-TO-REQUIREMENT EXPLAINABILITY PIPELINE */}
          {activeTab === "traceability" && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 text-blue-600" />
                  6-Stage Deterministic Explainability Chain
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Visual audit trail tracking how each requirement moves from tender clause to document citation, registry check, mathematical rule evaluation, and final verdict without LLM hallucinations.
                </p>
              </div>

              <div className="space-y-3">
                {complianceDetail.traceability_chain.map((step, idx) => (
                  <Card key={idx} className="p-4 border-slate-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Stage 1: Requirement */}
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Stage 1: Tender Requirement
                        </span>
                        <p className="font-bold text-xs text-slate-900">{step.requirement_name}</p>
                        <span className="font-mono text-[10px] text-blue-600">{step.clause_reference}</span>
                      </div>

                      <span className="hidden lg:block text-slate-300 font-bold">→</span>

                      {/* Stage 2: Document */}
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Stage 2: Submitted Document
                        </span>
                        <p className="font-semibold text-xs text-slate-800 truncate max-w-[200px]">
                          {step.document_name}
                        </p>
                        <span className="text-[10px] text-slate-500">Value: {step.extracted_value}</span>
                      </div>

                      <span className="hidden lg:block text-slate-300 font-bold">→</span>

                      {/* Stage 3: Verification Check */}
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Stage 3: Registry Check
                        </span>
                        <DocumentStatusBadge status={step.verification_status} />
                      </div>

                      <span className="hidden lg:block text-slate-300 font-bold">→</span>

                      {/* Stage 4: Deterministic Math Rule */}
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Stage 4: Rule Math
                        </span>
                        <p className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          {step.rule_math}
                        </p>
                      </div>

                      <span className="hidden lg:block text-slate-300 font-bold">→</span>

                      {/* Stage 5: Final Result */}
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Final Result
                        </span>
                        <StatusBadge status={step.result} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
