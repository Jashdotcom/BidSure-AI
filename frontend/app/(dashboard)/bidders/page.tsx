"use client";

import React, { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Card, Button, RiskBadge, ScoreDisplay } from "@/components/ui";
import {
  UsersIcon,
  ShieldCheckIcon,
  ScaleIcon,
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  BuildingIcon,
  FileTextIcon,
  ClockIcon,
  AlertTriangleIcon,
  EyeIcon,
} from "@/components/icons";
import { EvidenceModal } from "@/components/evidence-modal";
import { apiRequest } from "@/lib/api";
import {
  Bidder,
  Tender,
  TenderComparisonData,
  ComparisonMatrixRow,
  EvidenceItem,
} from "@/lib/types";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Received Bids" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "UNDER_VERIFICATION", label: "Under Verification" },
  { id: "REVIEW", label: "Review Required" },
  { id: "COMPLETED", label: "Completed" },
];

const COMPLIANCE_FILTERS = [
  { id: "ALL", label: "All Compliance" },
  { id: "COMPLIANT", label: "Fully Compliant" },
  { id: "REQUIRES_REVIEW", label: "Needs Review" },
  { id: "NON_COMPLIANT", label: "Non-Compliant" },
];

const RISK_FILTERS = [
  { id: "ALL", label: "All Risk Levels" },
  { id: "LOW", label: "Low Risk" },
  { id: "MEDIUM", label: "Medium Risk" },
  { id: "HIGH", label: "High Risk" },
];

export default function BiddersPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const initialQuery = searchParams.get("query") || "";
  const initialStatus = searchParams.get("status") || "ALL";
  const initialCompliance = searchParams.get("compliance") || "ALL";
  const initialRisk = searchParams.get("risk") || "ALL";
  const initialTenderId = searchParams.get("tender_id") || "";

  // Tenders state
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(true);

  // Active Selection & Filter State
  const [selectedTenderId, setSelectedTenderId] = useState<string>(initialTenderId);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [activeCompliance, setActiveCompliance] = useState(initialCompliance);
  const [activeRisk, setActiveRisk] = useState(initialRisk);
  const [viewMode, setViewMode] = useState<"matrix" | "table" | "cards">("matrix");

  // Comparison Workspace Data State
  const [comparisonData, setComparisonData] = useState<TenderComparisonData | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evidence Modal State
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [selectedEvidenceBidderName, setSelectedEvidenceBidderName] = useState<string>("");

  // Sync URL parameters
  const updateUrlParams = useCallback(
    (tenderId: string, query: string, status: string, compliance: string, risk: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tenderId) params.set("tender_id", tenderId);
      else params.delete("tender_id");

      if (query) params.set("query", query);
      else params.delete("query");

      if (status && status !== "ALL") params.set("status", status);
      else params.delete("status");

      if (compliance && compliance !== "ALL") params.set("compliance", compliance);
      else params.delete("compliance");

      if (risk && risk !== "ALL") params.set("risk", risk);
      else params.delete("risk");

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, pathname, router]
  );

  // Debounced search sync
  useEffect(() => {
    const handler = setTimeout(() => {
      updateUrlParams(selectedTenderId, searchTerm, activeStatus, activeCompliance, activeRisk);
    }, 300);
    return () => clearTimeout(handler);
  }, [selectedTenderId, searchTerm, activeStatus, activeCompliance, activeRisk, updateUrlParams]);

  // Load active tenders on mount
  useEffect(() => {
    async function loadTenders() {
      try {
        setLoadingTenders(true);
        const res = await apiRequest<Tender[]>("/tenders");
        if (res && Array.isArray(res)) {
          setTenders(res);
          // If no initial tender from URL, default to first tender with bids if available, or first tender
          if (!initialTenderId && res.length > 0) {
            const firstWithBids = res.find((t) => (t.bids_count || 0) > 0) || res[0];
            const chosenId = firstWithBids.id || firstWithBids.tender_number || "";
            setSelectedTenderId(chosenId);
          }
        }
      } catch (err) {
        console.error("Failed to load tenders", err);
      } finally {
        setLoadingTenders(false);
      }
    }
    loadTenders();
  }, [initialTenderId]);

  // Fetch tender comparison data when selectedTenderId changes
  const fetchTenderComparison = useCallback(async (tenderId: string) => {
    if (!tenderId) {
      setComparisonData(null);
      setErrorMsg(null);
      return;
    }

    setLoadingComparison(true);
    setErrorMsg(null);
    setComparisonData(null); // Clear previous tender data immediately

    try {
      const encodedId = encodeURIComponent(tenderId);
      const res = await apiRequest<TenderComparisonData>(`/bidders/comparison?tender_id=${encodedId}`);
      if (res && res.tender) {
        setComparisonData(res);
      } else {
        setComparisonData(null);
      }
    } catch (err: any) {
      console.error("Failed to load tender comparison data", err);
      setErrorMsg(err?.message || "Unable to load bids for this tender. Please try again.");
      setComparisonData(null);
    } finally {
      setLoadingComparison(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      fetchTenderComparison(selectedTenderId);
    }
  }, [selectedTenderId, fetchTenderComparison]);

  const activeTender = useMemo(() => {
    return (
      comparisonData?.tender ||
      tenders.find(
        (t) =>
          t.id === selectedTenderId ||
          t.tender_number === selectedTenderId ||
          t.ref === selectedTenderId ||
          t.tender_id === selectedTenderId
      )
    );
  }, [comparisonData, tenders, selectedTenderId]);

  // Filtered bidders according to search, status, compliance, risk
  const filteredBidders = useMemo(() => {
    if (!comparisonData?.bidders) return [];
    return comparisonData.bidders.filter((b) => {
      // 1. Search Query
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        b.name?.toLowerCase().includes(q) ||
        b.id?.toLowerCase().includes(q) ||
        b.contact_person?.toLowerCase().includes(q) ||
        b.bid_submission_id?.toLowerCase().includes(q);

      // 2. Status Filter
      const bStatus = (b.status || "").toUpperCase();
      const matchStatus =
        activeStatus === "ALL" ||
        bStatus === activeStatus ||
        (activeStatus === "REVIEW" && (bStatus === "REVIEW" || b.verification_status === "PROCESSING"));

      // 3. Compliance Filter
      const compStatus = (b.compliance_status || "").toUpperCase();
      const matchCompliance =
        activeCompliance === "ALL" ||
        compStatus === activeCompliance ||
        (activeCompliance === "COMPLIANT" && (compStatus === "COMPLIANT" || (b.compliance_score || 0) >= 90)) ||
        (activeCompliance === "REQUIRES_REVIEW" && (compStatus === "REQUIRES_REVIEW" || compStatus === "REVIEW")) ||
        (activeCompliance === "NON_COMPLIANT" && (compStatus === "NON_COMPLIANT" || (b.summary?.fail_count || 0) > 0));

      // 4. Risk Filter
      const matchRisk = activeRisk === "ALL" || (b.risk_level || "").toUpperCase() === activeRisk;

      return matchSearch && matchStatus && matchCompliance && matchRisk;
    });
  }, [comparisonData?.bidders, searchTerm, activeStatus, activeCompliance, activeRisk]);

  const filteredBidderIds = useMemo(() => {
    return new Set(filteredBidders.map((b) => b.id));
  }, [filteredBidders]);

  function handleTenderSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSelectedTenderId(val);
    setSearchTerm("");
    setActiveStatus("ALL");
    setActiveCompliance("ALL");
    setActiveRisk("ALL");
  }

  function handleResetFilters() {
    setSearchTerm("");
    setActiveStatus("ALL");
    setActiveCompliance("ALL");
    setActiveRisk("ALL");
  }

  function handleOpenEvidence(evidence: EvidenceItem, bidderName: string) {
    setSelectedEvidence(evidence);
    setSelectedEvidenceBidderName(bidderName);
    setIsEvidenceModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              Procurement Officer Workspace
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-500">
              Tender-Specific Bid Evaluation & Side-by-Side Scrutiny
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">
            Bids & Submissions
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Review and compare bidder submissions across active tenders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/ai-tender-analyze">
            <Button variant="outline" size="sm" className="text-xs font-semibold shadow-xs flex items-center gap-1.5">
              <FileTextIcon className="size-4 text-amber-600" />
              AI Tender Analyze
            </Button>
          </Link>
          <Link href={`/comparison${selectedTenderId ? `?tender_id=${encodeURIComponent(selectedTenderId)}` : ""}`}>
            <Button variant="outline" size="sm" className="text-xs font-semibold shadow-xs flex items-center gap-1.5">
              <ScaleIcon className="size-4 text-blue-600" />
              Focused Compare & CST
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Tender Selector Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <BuildingIcon className="size-4 text-blue-600" />
              Select Active Tender
            </label>
            <p className="text-xs text-slate-500 font-medium">
              Choose a published tender to inspect its submitted vendor proposals and dynamic criteria matrix.
            </p>
          </div>

          <div className="w-full md:w-auto min-w-[340px] lg:min-w-[460px]">
            <select
              value={selectedTenderId}
              onChange={handleTenderSelect}
              disabled={loadingTenders}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all"
            >
              <option value="" disabled>
                -- Select Active Tender --
              </option>
              {tenders.map((t) => {
                const tid = t.id || t.tender_number || "";
                const displayId = t.tender_number || t.id;
                const submittedCount = t.bids_count ?? 0;
                return (
                  <option key={tid} value={tid}>
                    {displayId} — {t.title} ({submittedCount} Submitted {submittedCount === 1 ? "Bid" : "Bids"})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Selected Tender Overview Strip */}
        {activeTender && (
          <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {activeTender.tender_number || activeTender.id}
              </span>
              <span className="font-semibold text-slate-900">{activeTender.title}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-medium">{activeTender.organization || "CPCL"}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-medium">
                Category: <strong>{activeTender.category}</strong>
              </span>
              {activeTender.estimated_value_display && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-medium">
                    Est. Value: <strong>{activeTender.estimated_value_display}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 font-medium text-slate-500">
              <ClockIcon className="size-3.5 text-slate-400" />
              <span>Deadline: {activeTender.deadline || "Active"}</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                {activeTender.status || "PUBLISHED"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!selectedTenderId ? (
        /* Prompt State: No Tender Selected */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-xs">
            <ScaleIcon className="size-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Please Select an Active Tender</h3>
          <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
            Select a tender from the dropdown above to load its participating bidders, statutory verification
            scorecards, and complete requirement-by-requirement comparison matrix.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-xl">
            {tenders.slice(0, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTenderId(t.id || t.tender_number || "")}
                className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all text-left"
              >
                <span className="font-mono text-[10px] block text-slate-400">{t.tender_number || t.id}</span>
                {t.title.length > 32 ? t.title.slice(0, 32) + "..." : t.title}
              </button>
            ))}
          </div>
        </div>
      ) : loadingComparison ? (
        /* Loading State */
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 text-slate-600 shadow-sm">
          <RefreshCwIcon className="size-8 animate-spin text-blue-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">
            Loading bids for {activeTender?.tender_number || selectedTenderId}...
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Fetching submitted vendor proposals, statutory registry checks, and deterministic criteria evaluations.
          </p>
        </div>
      ) : errorMsg ? (
        /* Error State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
            <AlertTriangleIcon className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-red-900">Unable to load bids for this tender</h3>
          <p className="mt-1 max-w-md text-xs text-red-700">{errorMsg}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTenderComparison(selectedTenderId)}
            className="mt-4 text-xs font-semibold border-red-300 text-red-800 hover:bg-red-100"
          >
            <RefreshCwIcon className="size-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      ) : !comparisonData || comparisonData.bidders.length === 0 ? (
        /* Empty State: No Submitted Bids */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-14 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
            <UsersIcon className="size-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {comparisonData?.metrics?.draft_bids_count && comparisonData.metrics.draft_bids_count > 0
              ? "Bid submissions are still in progress"
              : "No submitted bids for this tender yet"}
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
            {comparisonData?.metrics?.draft_bids_count && comparisonData.metrics.draft_bids_count > 0
              ? `${comparisonData.metrics.draft_bids_count} draft vendor proposal(s) are currently being prepared. Once formally submitted, they will appear in this comparison workspace.`
              : "No vendor proposals have been submitted for this tender yet. Once vendors submit bids, the comparison matrix will populate automatically."}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Link href="/tenders">
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                Back to All Tenders
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => fetchTenderComparison(selectedTenderId)}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCwIcon className="size-3.5 mr-1.5" /> Refresh Submissions
            </Button>
          </div>
        </div>
      ) : (
        /* Populated Tender Workspace */
        <div className="space-y-6">
          {/* Comparison Metrics Bar (High Contrast Solid Styling) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: "Submitted Bids",
                count: comparisonData.metrics.total_submitted_bids,
                cardClass: "bg-[#1E293B] border-[#0F172A]",
                labelClass: "text-white",
                numberClass: "text-white",
                style: { backgroundColor: "#1E293B", borderColor: "#0F172A" },
                labelStyle: { color: "#FFFFFF" },
                numberStyle: { color: "#FFFFFF" },
              },
              {
                label: "Fully Compliant",
                count: comparisonData.metrics.fully_compliant_count,
                cardClass: "bg-[#DCFCE7] border-[#16A34A]",
                labelClass: "text-[#15803D]",
                numberClass: "text-[#166534]",
                style: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
                labelStyle: { color: "#15803D" },
                numberStyle: { color: "#166534" },
              },
              {
                label: "Needs Review",
                count: comparisonData.metrics.needs_review_count,
                cardClass: "bg-[#FEF3C7] border-[#F59E0B]",
                labelClass: "text-[#B45309]",
                numberClass: "text-[#92400E]",
                style: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
                labelStyle: { color: "#B45309" },
                numberStyle: { color: "#92400E" },
              },
              {
                label: "Non-Compliant",
                count: comparisonData.metrics.non_compliant_count,
                cardClass: "bg-[#FEE2E2] border-[#DC2626]",
                labelClass: "text-[#B91C1C]",
                numberClass: "text-[#991B1B]",
                style: { backgroundColor: "#FEE2E2", borderColor: "#DC2626" },
                labelStyle: { color: "#B91C1C" },
                numberStyle: { color: "#991B1B" },
              },
              {
                label: "Verified",
                count: comparisonData.metrics.verified_count,
                cardClass: "bg-[#DBEAFE] border-[#2563EB]",
                labelClass: "text-[#1D4ED8]",
                numberClass: "text-[#1E40AF]",
                style: { backgroundColor: "#DBEAFE", borderColor: "#2563EB" },
                labelStyle: { color: "#1D4ED8" },
                numberStyle: { color: "#1E40AF" },
              },
              {
                label: "Under Verification",
                count: comparisonData.metrics.under_verification_count,
                cardClass: "bg-[#F3E8FF] border-[#9333EA]",
                labelClass: "text-[#7E22CE]",
                numberClass: "text-[#6B21A8]",
                style: { backgroundColor: "#F3E8FF", borderColor: "#9333EA" },
                labelStyle: { color: "#7E22CE" },
                numberStyle: { color: "#6B21A8" },
              },
            ].map((m, idx) => (
              <div
                key={idx}
                style={m.style}
                className={`p-4 rounded-2xl border ${m.cardClass} flex flex-col justify-between shadow-sm`}
              >
                <span style={m.labelStyle} className={`text-xs font-semibold ${m.labelClass}`}>
                  {m.label}
                </span>
                <span style={m.numberStyle} className={`text-3xl font-extrabold mt-1.5 ${m.numberClass}`}>
                  {m.count}
                </span>
              </div>
            ))}
          </div>

          {/* Search, Filter Toolbar & View Mode Switcher */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
              {/* Search Field */}
              <div className="relative w-full lg:w-80">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search bidder, company, contact..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Filters & View Switcher */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <select
                  value={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <select
                  value={activeCompliance}
                  onChange={(e) => setActiveCompliance(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {COMPLIANCE_FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <select
                  value={activeRisk}
                  onChange={(e) => setActiveRisk(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {RISK_FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 ml-auto lg:ml-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("matrix")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === "matrix"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Comparison Matrix
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === "table"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Summary Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === "cards"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cards Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Bar */}
            {(searchTerm || activeStatus !== "ALL" || activeCompliance !== "ALL" || activeRisk !== "ALL") && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    Showing <strong>{filteredBidders.length}</strong> of{" "}
                    <strong>{comparisonData.bidders.length}</strong> submitted bidders
                  </span>
                  {searchTerm && (
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                      Query: &ldquo;{searchTerm}&rdquo;
                    </span>
                  )}
                  {activeStatus !== "ALL" && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      Status: {activeStatus}
                    </span>
                  )}
                  {activeCompliance !== "ALL" && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                      Compliance: {activeCompliance}
                    </span>
                  )}
                  {activeRisk !== "ALL" && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                      Risk: {activeRisk}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* VIEW 1: FULL COMPARISON MATRIX */}
          {viewMode === "matrix" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Comprehensive Bid Comparison Matrix
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Side-by-side technical, financial, statutory, and clause-level compliance scrutiny across all{" "}
                    {filteredBidders.length} submitted bidders.
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500"></span>
                  <span>Deterministic Rule Verification</span>
                </div>
              </div>

              {filteredBidders.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No bidders match the active filter criteria. Check search or reset filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    {/* Table Header: Bidders */}
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-[11px] min-w-[280px] sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                          Evaluation Criteria / Parameter
                        </th>
                        {filteredBidders.map((b) => (
                          <th key={b.id} className="p-4 font-bold text-slate-900 min-w-[260px] border-r border-slate-200 last:border-r-0">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {b.id}
                                </span>
                                <ScoreDisplay score={b.compliance_score || 0} />
                              </div>
                              <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                                {b.name}
                              </h3>
                              <p className="text-[11px] text-slate-500 font-normal">
                                {b.location || "India"} · {b.contact_person || "Vendor Rep"}
                              </p>
                              <div className="pt-1">
                                <Link
                                  href={`/compliance?bidder=${encodeURIComponent(b.id)}&tender_id=${encodeURIComponent(selectedTenderId)}`}
                                  className="w-full block"
                                >
                                  <Button size="sm" variant="outline" className="w-full text-[11px] py-1 font-bold text-blue-700 hover:bg-blue-50">
                                    <ShieldCheckIcon className="size-3.5 mr-1" /> View Compliance
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {/* Section 1: Overview & Financials */}
                      <tr className="bg-slate-50/70 font-semibold text-slate-600 text-[11px]">
                        <td colSpan={filteredBidders.length + 1} className="px-4 py-2 bg-slate-100 font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                          1. Proposal Overview & Commercial Bid
                        </td>
                      </tr>

                      {/* Row: Bid Status */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200">
                          Bid Submission Status
                        </td>
                        {filteredBidders.map((b) => (
                          <td key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {b.status || "SUBMITTED"}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Row: Commercial Bid */}
                      <tr className="hover:bg-slate-50/50 bg-amber-50/20">
                        <td className="p-3.5 font-bold text-slate-900 sticky left-0 bg-white border-r border-slate-200">
                          Commercial Bid (Financial Quote)
                        </td>
                        {filteredBidders.map((b) => (
                          <td key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                            <span className="text-sm font-extrabold text-slate-900 block">
                              {b.bid_amount || "N/A"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">Excl. statutory taxes</span>
                          </td>
                        ))}
                      </tr>

                      {/* Row: Compliance Score */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200">
                          Deterministic Compliance Score
                        </td>
                        {filteredBidders.map((b) => (
                          <td key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-blue-700">
                                {b.compliance_score?.toFixed(1) || "0.0"}%
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  (b.compliance_score || 0) >= 90
                                    ? "bg-emerald-100 text-emerald-800"
                                    : (b.compliance_score || 0) >= 70
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {b.compliance_status || "EVALUATED"}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Row: Criteria Breakdown Counts */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200">
                          Pass / Fail / Review Criteria
                        </td>
                        {filteredBidders.map((b) => (
                          <td key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                                ✓ {b.summary?.pass_count ?? 0} Pass
                              </span>
                              {(b.summary?.fail_count ?? 0) > 0 && (
                                <span className="bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded">
                                  ✕ {b.summary?.fail_count} Fail
                                </span>
                              )}
                              {(b.summary?.review_count ?? 0) > 0 && (
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                                  ⚠ {b.summary?.review_count} Review
                                </span>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Row: Verification Status */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200">
                          Statutory Registry Verification
                        </td>
                        {filteredBidders.map((b) => (
                          <td key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                b.verification_status === "AUTHENTICATED" || b.verification_status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.verification_status === "PROCESSING" || b.verification_status === "PENDING"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {b.verification_status || "AUTHENTICATED"}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Row: Risk Level */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200">
                          Audit Risk Level
                        </td>
                        {filteredBidders.map((b) => (
                          <td key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                            <RiskBadge risk={b.risk_level || "LOW"} />
                          </td>
                        ))}
                      </tr>

                      {/* Section 2: Dynamic Tender Requirements */}
                      <tr className="bg-slate-100 font-bold text-slate-800 text-[10px] uppercase tracking-wider">
                        <td colSpan={filteredBidders.length + 1} className="px-4 py-2">
                          2. Tender Technical & Statutory Requirements ({comparisonData.comparison_matrix.length} Dynamic Criteria)
                        </td>
                      </tr>

                      {/* Dynamic Requirement Rows */}
                      {comparisonData.comparison_matrix.map((row: ComparisonMatrixRow) => (
                        <tr key={row.requirement_id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Criteria Title & Reference (Sticky Left Column) */}
                          <td className="p-3.5 sticky left-0 bg-white border-r border-slate-200 z-10 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {row.clause || row.clause_reference}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {row.category}
                              </span>
                              {row.mandatory && (
                                <span className="text-[9px] font-extrabold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                  MANDATORY
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs mt-0.5">{row.title}</h4>
                            <p className="text-[11px] text-slate-500 leading-tight">
                              Threshold: <strong className="text-slate-700">{row.threshold_value}</strong>
                            </p>
                          </td>

                          {/* Bidder Specific Cell */}
                          {filteredBidders.map((b) => {
                            const cell = row.bidders[b.id] || {
                              status: "NOT_SUBMITTED",
                              claimed_value: "Not Submitted",
                              required_value: row.threshold_value,
                              evidence_document: "N/A",
                              page_number: 0,
                              remarks: "No submission recorded.",
                            };

                            const isPass = cell.status === "PASS";
                            const isFail = cell.status === "FAIL";
                            const isReview = cell.status === "REVIEW_REQUIRED" || cell.status === "REVIEW";

                            return (
                              <td key={b.id} className="p-3.5 border-r border-slate-200 last:border-r-0 align-top space-y-1.5">
                                {/* Status Pill */}
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                      isPass
                                        ? "bg-emerald-100 text-emerald-800"
                                        : isFail
                                        ? "bg-red-100 text-red-800"
                                        : isReview
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {isPass && "✓ PASS"}
                                    {isFail && "✕ FAIL"}
                                    {isReview && "⚠ REVIEW"}
                                    {!isPass && !isFail && !isReview && "— N/A"}
                                  </span>

                                  {cell.evidence && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEvidence(cell.evidence!, b.name)}
                                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                      title="Inspect Verifiable PDF Evidence"
                                    >
                                      <EyeIcon className="size-3" /> Evidence
                                    </button>
                                  )}
                                </div>

                                {/* Claimed / Extracted Value */}
                                <div className="text-xs font-semibold text-slate-900 leading-snug">
                                  {cell.claimed_value || "Document submitted"}
                                </div>

                                {/* Remarks & Source Doc */}
                                {cell.remarks && (
                                  <p className="text-[10px] text-slate-500 leading-tight italic">
                                    {cell.remarks}
                                  </p>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: BIDDER SUMMARY TABLE */}
          {viewMode === "table" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-bold text-slate-900">
                  Participating Bidders Summary ({filteredBidders.length} Submitted)
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Tabular overview of vendor credentials, compliance ratings, and commercial quotes.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3.5">Bidder / Company</th>
                      <th className="p-3.5">Bid Status</th>
                      <th className="p-3.5">Compliance Score</th>
                      <th className="p-3.5">Criteria Breakdown</th>
                      <th className="p-3.5">Statutory Verification</th>
                      <th className="p-3.5">Risk</th>
                      <th className="p-3.5">Commercial Bid</th>
                      <th className="p-3.5">Submission Date</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBidders.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {b.id}
                            </span>
                            <h3 className="font-bold text-slate-900 text-xs mt-0.5">{b.name}</h3>
                            <p className="text-[11px] text-slate-500">
                              {b.location} · {b.contact_person}
                            </p>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {b.status || "SUBMITTED"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <ScoreDisplay score={b.compliance_score || 0} />
                            <span className="font-extrabold text-xs text-slate-800">
                              {b.compliance_score?.toFixed(1) || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold">
                            <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">
                              ✓ {b.summary?.pass_count ?? 0}
                            </span>
                            <span className="bg-red-50 text-red-800 px-1.5 py-0.5 rounded">
                              ✕ {b.summary?.fail_count ?? 0}
                            </span>
                            <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                              ⚠ {b.summary?.review_count ?? 0}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-700">
                            {b.verification_status || "AUTHENTICATED"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <RiskBadge risk={b.risk_level || "LOW"} />
                        </td>
                        <td className="p-3.5 font-extrabold text-slate-900 text-xs">
                          {b.bid_amount || "N/A"}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {b.submitted_at
                            ? new Date(b.submitted_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Recent"}
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/compliance?bidder=${encodeURIComponent(b.id)}&tender_id=${encodeURIComponent(selectedTenderId)}`}
                          >
                            <Button size="sm" className="text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-xs">
                              <ShieldCheckIcon className="size-3.5 mr-1" /> View Bid
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: BIDDER CARDS GRID */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredBidders.map((bidder) => (
                <Card
                  key={bidder.id}
                  className="flex flex-col justify-between p-5 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="space-y-3.5">
                    {/* Header: Bidder Name & Compliance Score */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {bidder.id}
                          </span>
                          {bidder.bid_submission_id && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {bidder.bid_submission_id}
                            </span>
                          )}
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                          {bidder.name}
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {bidder.location || "India"} · {bidder.contact_person || "Vendor Representative"}
                        </p>
                      </div>
                      <ScoreDisplay score={bidder.compliance_score || 0} />
                    </div>

                    {/* Commercials & Risk Badge */}
                    <div className="flex items-center justify-between">
                      <RiskBadge risk={bidder.risk_level || "LOW"} />
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                          COMMERCIAL BID
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {bidder.bid_amount || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Pass / Fail / Review Summary Counts */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center text-xs">
                      <div className="rounded bg-emerald-50 py-1 text-emerald-800 font-bold border border-emerald-100">
                        <span className="block text-[10px] text-emerald-600 font-semibold">PASS</span>
                        {bidder.summary?.pass_count ?? 0}
                      </div>
                      <div className="rounded bg-red-50 py-1 text-red-800 font-bold border border-red-100">
                        <span className="block text-[10px] text-red-600 font-semibold">FAIL</span>
                        {bidder.summary?.fail_count ?? 0}
                      </div>
                      <div className="rounded bg-amber-50 py-1 text-amber-800 font-bold border border-amber-100">
                        <span className="block text-[10px] text-amber-600 font-semibold">REVIEW</span>
                        {bidder.summary?.review_count ?? 0}
                      </div>
                    </div>

                    {/* Highlight Issue */}
                    <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-100 text-xs text-slate-600">
                      <p className="font-semibold text-slate-700 text-[11px]">Audit Scrutiny Finding:</p>
                      <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed italic">
                        {bidder.highlight_issue || "Statutory & technical verification evaluated deterministically."}
                      </p>
                    </div>
                  </div>

                  {/* Action Button: Navigate to Compliance Page */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <Link
                      href={`/compliance?bidder=${encodeURIComponent(bidder.id)}&tender_id=${encodeURIComponent(selectedTenderId)}`}
                      className="w-full block"
                    >
                      <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-xs text-xs" size="sm">
                        <ShieldCheckIcon className="size-4 mr-1.5" />
                        View Compliance & Evidence
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verifiable Evidence Inspection Modal */}
      <EvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        evidence={selectedEvidence}
        bidderName={selectedEvidenceBidderName}
      />
    </div>
  );
}
