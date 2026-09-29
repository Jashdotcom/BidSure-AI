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
  TrophyIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon,
  SparklesIcon,
} from "@/components/icons";
import { EvidenceModal } from "@/components/evidence-modal";
import { apiRequest } from "@/lib/api";
import {
  Bidder,
  Tender,
  TenderComparisonData,
  ComparisonMatrixRow,
  EvidenceItem,
  RankedBidder,
  TenderRankingResponse,
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
  // Always open in a genuine empty selection state.
  const initialTenderId = "";

  // Tenders state
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(true);

  // Active Selection & Filter State
  const [selectedTenderId, setSelectedTenderId] = useState<string>(initialTenderId);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [submittedBids, setSubmittedBids] = useState<Bidder[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const selectionRequest = React.useRef(0);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [activeCompliance, setActiveCompliance] = useState(initialCompliance);
  const [activeRisk, setActiveRisk] = useState(initialRisk);
  const [viewMode, setViewMode] = useState<"ranking" | "matrix" | "table" | "cards">("ranking");

  // Comparison & Ranking Data State
  const [comparisonData, setComparisonData] = useState<TenderComparisonData | null>(null);
  const [rankingData, setRankingData] = useState<TenderRankingResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evidence Modal State
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [selectedEvidenceBidderName, setSelectedEvidenceBidderName] = useState<string>("");

  // "Why This Rank?" Modal State
  const [isWhyThisRankOpen, setIsWhyThisRankOpen] = useState(false);
  const [selectedRankedBidder, setSelectedRankedBidder] = useState<RankedBidder | null>(null);
  const [explanationActiveTab, setExplanationActiveTab] = useState<
    "overview" | "mandatory" | "technical" | "financial" | "pairwise" | "evidence"
  >("overview");

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
        }
      } catch (err) {
        console.error("Failed to load tenders", err);
      } finally {
        setLoadingTenders(false);
      }
    }
    loadTenders();
  }, [initialTenderId]);

  // Load submission identifiers first. Evaluation data is deferred until bid selection.
  const fetchTenderBids = useCallback(async (tenderId: string) => {
    const requestId = ++selectionRequest.current;
    if (!tenderId) {
      setLoadingBids(false);
      setSubmittedBids([]);
      setComparisonData(null);
      setRankingData(null);
      setErrorMsg(null);
      return;
    }
    setLoadingBids(true);
    setErrorMsg(null);
    setSubmittedBids([]);
    setComparisonData(null);
    setRankingData(null);
    try {
      const bids = await apiRequest<Bidder[]>(`/bidders?tender_id=${encodeURIComponent(tenderId)}`);
      if (requestId === selectionRequest.current) setSubmittedBids(Array.isArray(bids) ? bids : []);
    } catch (err: any) {
      if (requestId === selectionRequest.current) {
        console.error("Failed to load tender bids", err);
        setErrorMsg(err?.message || "Unable to load bids for this tender. Please try again.");
      }
    } finally {
      if (requestId === selectionRequest.current) setLoadingBids(false);
    }
  }, []);

  useEffect(() => {
    setSelectedBidId(null);
    setComparisonData(null);
    setRankingData(null);
    fetchTenderBids(selectedTenderId);
  }, [selectedTenderId, fetchTenderBids]);

  const fetchTenderData = useCallback(async (tenderId: string, bidId: string) => {
    const requestId = ++selectionRequest.current;
    setLoadingEvaluation(true);
    setErrorMsg(null);
    setComparisonData(null);
    setRankingData(null);
    try {
      const [compRes, rankRes] = await Promise.all([
        apiRequest<TenderComparisonData>(`/bidders/comparison?tender_id=${encodeURIComponent(tenderId)}`),
        apiRequest<TenderRankingResponse>(`/bidders/ranking?tender_id=${encodeURIComponent(tenderId)}`),
      ]);
      if (requestId !== selectionRequest.current) return;
      const bid = submittedBids.find((item) => item.id === bidId || item.bid_submission_id === bidId);
      const tender = tenders.find((item) => [item.id, item.tender_number, item.ref, item.tender_id].some((id) => id && String(id) === tenderId));
      const validTenderIds = new Set([tenderId, tender?.id, tender?.tender_number, tender?.ref, tender?.tender_id].filter(Boolean).map(String));
      if (!bid || !validTenderIds.has(String(bid.tender_id)) && !validTenderIds.has(String(bid.tender_number))) {
        throw new Error("Selected bid does not belong to this tender.");
      }
      if (!compRes?.bidders?.some((item) => item.id === bid.id || item.bid_submission_id === bid.bid_submission_id)) {
        throw new Error("The selected bid could not be verified for this tender.");
      }
      setComparisonData(compRes);
      setRankingData(rankRes || null);
    } catch (err: any) {
      if (requestId === selectionRequest.current) {
        console.error("Failed to load selected bid evaluation", err);
        setErrorMsg(err?.message || "Unable to load this bid evaluation. Please try again.");
      }
    } finally {
      if (requestId === selectionRequest.current) setLoadingEvaluation(false);
    }
  }, [submittedBids, tenders]);

  useEffect(() => {
    if (selectedTenderId && selectedBidId) fetchTenderData(selectedTenderId, selectedBidId);
  }, [selectedTenderId, selectedBidId, fetchTenderData]);

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

  // Filtered bidders for Comparison Matrix / Table / Cards
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

  // Filtered Ranked Bidders for Bid Ranking View
  const filteredRankedBidders = useMemo(() => {
    if (!rankingData?.ranked_bidders) return [];
    return rankingData.ranked_bidders.filter((b) => {
      // 1. Search Query
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        b.bidder_name?.toLowerCase().includes(q) ||
        b.bidder_id?.toLowerCase().includes(q) ||
        b.contact_person?.toLowerCase().includes(q) ||
        b.bid_submission_id?.toLowerCase().includes(q);

      // 2. Status Filter
      const bStatus = (b.statutory_verification_status || "").toUpperCase();
      const matchStatus =
        activeStatus === "ALL" ||
        bStatus === activeStatus ||
        (activeStatus === "REVIEW" && b.eligibility_status === "REQUIRES_REVIEW");

      // 3. Compliance Filter
      const compStatus = b.eligibility_status;
      const matchCompliance =
        activeCompliance === "ALL" ||
        (activeCompliance === "COMPLIANT" && compStatus === "ELIGIBLE") ||
        (activeCompliance === "REQUIRES_REVIEW" && compStatus === "REQUIRES_REVIEW") ||
        (activeCompliance === "NON_COMPLIANT" && compStatus === "NOT_ELIGIBLE");

      // 4. Risk Filter
      const matchRisk = activeRisk === "ALL" || (b.risk_level || "").toUpperCase() === activeRisk;

      return matchSearch && matchStatus && matchCompliance && matchRisk;
    });
  }, [rankingData?.ranked_bidders, searchTerm, activeStatus, activeCompliance, activeRisk]);

  function handleTenderSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    selectionRequest.current += 1;
    setSelectedBidId(null);
    setSubmittedBids([]);
    setComparisonData(null);
    setRankingData(null);
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

  function handleOpenWhyThisRank(bidder: RankedBidder) {
    setSelectedRankedBidder(bidder);
    setExplanationActiveTab("overview");
    setIsWhyThisRankOpen(true);
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
              Deterministic Bid Ranking & Side-by-Side Scrutiny
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">
            Bids & Submissions
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Evaluate, rank, and explain bidder proposals across active published tenders.
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
              Comparative Statement (CST)
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
              Select Tender
            </label>
            <p className="text-xs text-slate-500 font-medium">
              Choose a published tender to inspect its submitted vendor proposals, ranking order, and dynamic criteria matrix.
            </p>
          </div>

          <div className="w-full md:w-auto min-w-[340px] lg:min-w-[460px]">
            <select
              value={selectedTenderId}
              onChange={handleTenderSelect}
              disabled={loadingTenders}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all"
            >
              <option value="">
                -- Select Tender --
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
          <h3 className="text-base font-bold text-slate-900">Please select a tender</h3>
          <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
            Please select a tender to view its submitted bids and evaluations.
          </p>
        </div>
      ) : loadingBids ? (
        /* Loading State */
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 text-slate-600 shadow-sm">
          <RefreshCwIcon className="size-8 animate-spin text-blue-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">
            Loading submitted bids for {activeTender?.tender_number || selectedTenderId}...
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Retrieving submissions for the selected tender.
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
            onClick={() => fetchTenderBids(selectedTenderId)}
            className="mt-4 text-xs font-semibold border-red-300 text-red-800 hover:bg-red-100"
          >
            <RefreshCwIcon className="size-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      ) : submittedBids.length === 0 ? (
        /* Empty State: No Submitted Bids */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-14 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
            <UsersIcon className="size-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No bids have been submitted for this tender.
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
            Select another tender or check back after a bid has been submitted.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Link href="/tenders">
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                Back to All Tenders
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => fetchTenderBids(selectedTenderId)}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCwIcon className="size-3.5 mr-1.5" /> Refresh Submissions
            </Button>
          </div>
        </div>
      ) : !selectedBidId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Submitted Bids</h2>
          <p className="mt-1 mb-4 text-xs text-slate-500">Select a bid to view its full evaluation.</p>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b text-slate-500"><tr><th className="p-3">Bid ID</th><th className="p-3">Company</th><th className="p-3">Submission Date</th><th className="p-3">Bid Status</th><th className="p-3"></th></tr></thead><tbody>
            {submittedBids.map((bid) => <tr key={bid.id} className="border-b last:border-0"><td className="p-3 font-mono font-semibold">{bid.bid_submission_id || bid.id}</td><td className="p-3 font-semibold">{bid.company_name || bid.name}</td><td className="p-3">{bid.submitted_at ? new Date(bid.submitted_at).toLocaleString() : "—"}</td><td className="p-3">{bid.status || "SUBMITTED"}</td><td className="p-3 text-right"><Button size="sm" onClick={() => setSelectedBidId(bid.id || bid.bid_submission_id || "")}>View Evaluation</Button></td></tr>)}
          </tbody></table></div>
        </section>
      ) : loadingEvaluation ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-600"><RefreshCwIcon className="mx-auto mb-3 size-7 animate-spin text-blue-600" />Loading selected bid evaluation...</div>
      ) : errorMsg ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">{errorMsg}<div><Button className="mt-4" onClick={() => selectedBidId && fetchTenderData(selectedTenderId, selectedBidId)}>Retry</Button><Button variant="outline" className="ml-2 mt-4" onClick={() => setSelectedBidId(null)}>Back to bids</Button></div></div>
      ) : comparisonData && rankingData ? (
        /* Populated Tender Workspace */
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs">
            <span className="font-semibold text-blue-900">Evaluation for bid {submittedBids.find((bid) => bid.id === selectedBidId || bid.bid_submission_id === selectedBidId)?.bid_submission_id || selectedBidId}</span>
            <Button variant="outline" size="sm" onClick={() => { selectionRequest.current += 1; setSelectedBidId(null); setComparisonData(null); setRankingData(null); setErrorMsg(null); }}>
              Back to submitted bids
            </Button>
          </div>
          {/* Comparison & Ranking Metrics Bar (High Contrast Solid Styling) */}
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
                label: "Eligible / Qualified",
                count: rankingData?.summary?.eligible_count ?? comparisonData.metrics.fully_compliant_count,
                cardClass: "bg-[#DCFCE7] border-[#16A34A]",
                labelClass: "text-[#15803D]",
                numberClass: "text-[#166534]",
                style: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
                labelStyle: { color: "#15803D" },
                numberStyle: { color: "#166534" },
              },
              {
                label: "Needs Review",
                count: rankingData?.summary?.review_count ?? comparisonData.metrics.needs_review_count,
                cardClass: "bg-[#FEF3C7] border-[#F59E0B]",
                labelClass: "text-[#B45309]",
                numberClass: "text-[#92400E]",
                style: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
                labelStyle: { color: "#B45309" },
                numberStyle: { color: "#92400E" },
              },
              {
                label: "Disqualified",
                count: rankingData?.summary?.disqualified_count ?? comparisonData.metrics.non_compliant_count,
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
                    onClick={() => setViewMode("ranking")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === "ranking"
                        ? "bg-white text-amber-700 shadow-xs border border-amber-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <TrophyIcon className={`size-3.5 ${viewMode === "ranking" ? "text-amber-600" : "text-slate-500"}`} />
                    Bid Ranking
                  </button>
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
                    Showing <strong>{viewMode === "ranking" ? filteredRankedBidders.length : filteredBidders.length}</strong> of{" "}
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

          {/* VIEW 0: DETERMINISTIC BID RANKING (PREMIER VIEW) */}
          {viewMode === "ranking" && (
            <div className="space-y-4">
              {/* Evaluation Methodology & Safety Banner */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-slate-50 p-5 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                        <TrophyIcon className="size-3.5 text-amber-700" />
                        {rankingData?.method_type === "QCBS" ? "QCBS Evaluation" : "L1 Least-Cost Ranking"}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-bold text-slate-800">
                        Methodology: {rankingData?.evaluation_method_display || "L1 / Lowest Price Selection"}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          rankingData?.ranking_status === "FINALIZED"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : rankingData?.ranking_status === "PROVISIONAL"
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : "bg-blue-100 text-blue-900 border-blue-300"
                        }`}
                      >
                        {rankingData?.ranking_status === "FINALIZED"
                          ? "FINALIZED RANKING"
                          : rankingData?.ranking_status === "PROVISIONAL"
                          ? "PROVISIONAL RANKING"
                          : "UNDER EVALUATION"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {rankingData?.method_type === "QCBS"
                        ? "Combined Quality & Cost Based Selection: Bidders are scored on a weighted composite formula combining 70% Technical Compliance and 30% Normalized Financial Quote."
                        : "Standard Indian Public Procurement: All participating bids meeting 100% of mandatory pre-qualification criteria are ranked strictly by ascending commercial bid quote (L1, L2, L3)."}
                    </p>
                  </div>

                  {/* L1 Winner / Benchmark Pill */}
                  {rankingData?.l1_bidder?.name && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-left lg:text-right min-w-[220px]">
                      <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                        Current L1 Baseline Winner
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 block truncate">
                        {rankingData.l1_bidder.name}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">
                        {rankingData.l1_bidder.bid_amount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Procurement Disclaimer */}
                <div className="mt-3.5 pt-3 border-t border-amber-200/60 flex items-center gap-2 text-[11px] text-amber-900/80 font-semibold">
                  <InfoIcon className="size-3.5 text-amber-700 shrink-0" />
                  <span>
                    Procurement Compliance Note: System-generated ranking based on configured tender criteria. Final tender award requires authorized procurement committee approval.
                  </span>
                </div>
              </div>

              {/* Ranking Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Evaluated Bidder Rankings</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({filteredRankedBidders.length} bids evaluated)
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Deterministic ranking order based on mandatory eligibility, technical criteria, and commercial quotes.
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500"></span>
                    <span>Zero LLM Hallucinations · Audit-Traceable</span>
                  </div>
                </div>

                {filteredRankedBidders.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No bidders match the active filter criteria. Check search or reset filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F1F5FB] border-b border-[#D5DFED] text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-3.5 text-center w-28">Rank</th>
                          <th className="p-3.5">Bidder / Company</th>
                          <th className="p-3.5">Eligibility Status</th>
                          <th className="p-3.5">Technical Score</th>
                          <th className="p-3.5">Commercial Quote</th>
                          {rankingData?.method_type === "QCBS" && <th className="p-3.5">Composite Score</th>}
                          <th className="p-3.5">Statutory Checks</th>
                          <th className="p-3.5">Risk</th>
                          <th className="p-3.5 text-right min-w-[200px]">Actions & Explainability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRankedBidders.map((b) => {
                          const isRank1 = b.rank === 1;
                          const isRank2 = b.rank === 2;
                          const isRank3 = b.rank === 3;
                          const isDisqualified = b.eligibility_status === "NOT_ELIGIBLE";
                          const isReview = b.eligibility_status === "REQUIRES_REVIEW";

                          return (
                            <tr
                              key={b.bidder_id}
                              className={`transition-colors ${
                                isRank1
                                  ? "bg-amber-50/40 hover:bg-amber-50/70"
                                  : isDisqualified
                                  ? "bg-red-50/20 hover:bg-red-50/40 opacity-90"
                                  : "hover:bg-slate-50/60"
                              }`}
                            >
                              {/* Rank Pill Column */}
                              <td className="p-3.5 text-center align-middle">
                                {isDisqualified ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                                    DISQUALIFIED
                                  </span>
                                ) : isReview ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                      {b.rank_display || `Rank ${b.rank}`}
                                    </span>
                                    <span className="block text-[9px] font-bold text-amber-700">PROVISIONAL</span>
                                  </div>
                                ) : isRank1 ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 border border-amber-400 shadow-2xs">
                                    <TrophyIcon className="size-3.5 text-slate-900" />
                                    {b.rank_display}
                                  </span>
                                ) : isRank2 ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-200 text-slate-800 border border-slate-300">
                                    {b.rank_display}
                                  </span>
                                ) : isRank3 ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                    {b.rank_display}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {b.rank_display}
                                  </span>
                                )}
                              </td>

                              {/* Bidder Info */}
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                      {b.bidder_id}
                                    </span>
                                    {b.bid_submission_id && (
                                      <span className="font-mono text-[10px] text-slate-400">
                                        {b.bid_submission_id}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-extrabold text-slate-900 text-xs mt-0.5 leading-snug">
                                    {b.bidder_name}
                                  </h3>
                                  <p className="text-[11px] text-slate-500">
                                    {b.location || "India"} · {b.contact_person || "Authorized Representative"}
                                  </p>
                                </div>
                              </td>

                              {/* Eligibility Status */}
                              <td className="p-3.5">
                                {b.eligibility_status === "ELIGIBLE" ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircleIcon className="size-3 text-emerald-700" />
                                      Qualified / Eligible
                                    </span>
                                    <span className="block text-[10px] text-slate-500 font-medium">
                                      All {b.passed_requirements.length} mandatory criteria met
                                    </span>
                                  </div>
                                ) : b.eligibility_status === "REQUIRES_REVIEW" ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      <AlertTriangleIcon className="size-3 text-amber-700" />
                                      Requires Review
                                    </span>
                                    <span className="block text-[10px] text-amber-700 font-medium">
                                      {b.review_requirements.length} criteria pending verification
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                      <XCircleIcon className="size-3 text-red-700" />
                                      Disqualified
                                    </span>
                                    <span className="block text-[10px] text-red-700 font-medium">
                                      {b.mandatory_failures.length} mandatory criteria failed
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Technical Score */}
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <ScoreDisplay score={b.technical_score || 0} />
                                    <span className="font-extrabold text-xs text-slate-900">
                                      {b.technical_score.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 space-x-1">
                                    <span>Exp: {b.statutory_checks.experience_years}y</span>
                                    <span>•</span>
                                    <span>MII: {b.statutory_checks.local_content_pct}%</span>
                                  </div>
                                </div>
                              </td>

                              {/* Commercial Quote */}
                              <td className="p-3.5">
                                <div>
                                  <span className="text-sm font-extrabold text-slate-900 block">
                                    {b.price_display}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {b.price_crores_display} · {b.financial_score ? `Score: ${b.financial_score.toFixed(1)}/100` : "Commercial Price"}
                                  </span>
                                </div>
                              </td>

                              {/* Composite Score (for QCBS) */}
                              {rankingData?.method_type === "QCBS" && (
                                <td className="p-3.5">
                                  <div>
                                    <span className="text-sm font-extrabold text-blue-800 block">
                                      {b.total_score.toFixed(2)}/100
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {b.score_formula_display}
                                    </span>
                                  </div>
                                </td>
                              )}

                              {/* Statutory Verification Checks */}
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      b.statutory_verification_status === "AUTHENTICATED" || b.statutory_verification_status === "COMPLETED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {b.statutory_verification_status || "AUTHENTICATED"}
                                  </span>
                                  <div className="text-[10px] text-slate-500 font-mono block">
                                    GST: {b.statutory_checks.gstin ? b.statutory_checks.gstin.slice(0, 10) + "..." : "N/A"}
                                  </div>
                                </div>
                              </td>

                              {/* Risk Level */}
                              <td className="p-3.5">
                                <RiskBadge risk={b.risk_level || "LOW"} />
                              </td>

                              {/* Action Buttons */}
                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* "Why This Rank?" Explainability Button */}
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenWhyThisRank(b)}
                                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center gap-1"
                                    title="Open comprehensive mathematical & criteria explanation"
                                  >
                                    <SparklesIcon className="size-3.5 text-amber-200" />
                                    Why This Rank?
                                  </Button>

                                  {/* View Compliance Link */}
                                  <Link
                                    href={`/compliance?bidder=${encodeURIComponent(b.bidder_id)}&tender_id=${encodeURIComponent(selectedTenderId)}`}
                                  >
                                    <Button size="sm" variant="outline" className="text-xs font-semibold hover:bg-slate-100">
                                      <ShieldCheckIcon className="size-3.5 text-blue-600 mr-1" />
                                      Scrutiny
                                    </Button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

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

                      {/* Row: Pass/Fail/Review Criteria */}
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
      ) : null}

      {/* "WHY THIS RANK?" GRANULAR EXPLAINABILITY MODAL */}
      {isWhyThisRankOpen && selectedRankedBidder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-200 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700">
                      {selectedRankedBidder.bidder_id}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-300 font-medium">
                      Tender: {activeTender?.tender_number || selectedTenderId}
                    </span>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                        selectedRankedBidder.is_disqualified
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : selectedRankedBidder.rank === 1
                          ? "bg-amber-400 text-slate-950 border-amber-300 font-black"
                          : "bg-blue-500/20 text-blue-200 border-blue-400/30"
                      }`}
                    >
                      {selectedRankedBidder.rank_display}
                    </span>
                  </div>

                  <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    <span>{selectedRankedBidder.bidder_name}</span>
                    <span className="text-xs font-normal text-slate-300">
                      ({selectedRankedBidder.location})
                    </span>
                  </h2>

                  <p className="text-xs text-slate-300 font-medium">
                    Deterministic Rank Rationale & Evidence Breakdown · Evaluated under{" "}
                    <strong>{rankingData?.evaluation_method_display || "Tender Methodology"}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWhyThisRankOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <XIcon className="size-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                {[
                  { id: "overview", label: "Executive Summary", icon: SparklesIcon },
                  { id: "mandatory", label: `Mandatory PQC (${selectedRankedBidder.passed_requirements.length} Pass / ${selectedRankedBidder.mandatory_failures.length} Fail)`, icon: ShieldCheckIcon },
                  { id: "technical", label: `Technical Score (${selectedRankedBidder.technical_score.toFixed(1)}%)`, icon: ScaleIcon },
                  { id: "financial", label: `Financial (${selectedRankedBidder.price_display})`, icon: TrophyIcon },
                  { id: "pairwise", label: `Peer Comparison (${selectedRankedBidder.ranking_explanation?.pairwise_comparisons.length ?? 0} Bids)`, icon: UsersIcon },
                  { id: "evidence", label: "Verifiable PDF Evidence", icon: EyeIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = explanationActiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setExplanationActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isActive
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className={`size-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {/* TAB 1: EXECUTIVE SUMMARY */}
              {explanationActiveTab === "overview" && (
                <div className="space-y-5">
                  {/* Primary Narrative Box */}
                  <div
                    className={`p-5 rounded-2xl border ${
                      selectedRankedBidder.is_disqualified
                        ? "bg-red-50 border-red-200 text-red-950"
                        : selectedRankedBidder.rank === 1
                        ? "bg-amber-50 border-amber-200 text-amber-950"
                        : "bg-blue-50 border-blue-200 text-blue-950"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider">
                      <SparklesIcon className="size-4 text-amber-600" />
                      <span>Primary Decision Rationale</span>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed">
                      {selectedRankedBidder.ranking_explanation?.primary_reason ||
                        "Deterministic scoring completed based on submitted values and tender criteria."}
                    </p>
                  </div>

                  {/* 4-Pillar Scorecard Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Eligibility */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        1. Mandatory PQC
                      </span>
                      <div className="text-sm font-extrabold text-slate-900">
                        {selectedRankedBidder.eligibility_status === "ELIGIBLE"
                          ? "✓ 100% Compliant"
                          : selectedRankedBidder.eligibility_status === "REQUIRES_REVIEW"
                          ? "⚠ Review Pending"
                          : `✕ ${selectedRankedBidder.mandatory_failures.length} Failures`}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {selectedRankedBidder.passed_requirements.length} passed of {selectedRankedBidder.criteria_breakdown.length} total criteria
                      </p>
                    </div>

                    {/* Technical Score */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        2. Technical Score
                      </span>
                      <div className="text-sm font-extrabold text-blue-700">
                        {selectedRankedBidder.technical_score.toFixed(1)}%
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {selectedRankedBidder.statutory_checks.experience_years}y PSU Exp · {selectedRankedBidder.statutory_checks.local_content_pct}% MII
                      </p>
                    </div>

                    {/* Commercial Quote */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        3. Commercial Quote
                      </span>
                      <div className="text-sm font-extrabold text-slate-900">
                        {selectedRankedBidder.price_display}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {selectedRankedBidder.ranking_explanation?.financial_evaluation.comparison_to_budget || "Commercial quote submitted"}
                      </p>
                    </div>

                    {/* Statutory Verification */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        4. Statutory Registry
                      </span>
                      <div className="text-sm font-extrabold text-emerald-700">
                        {selectedRankedBidder.statutory_verification_status || "AUTHENTICATED"}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        GSTIN Active · {selectedRankedBidder.statutory_checks.is_debarred ? "Debarred" : "Debarment Clear"}
                      </p>
                    </div>
                  </div>

                  {/* Scoring Formula Breakdown */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Evaluation Mathematical Equation
                    </h4>
                    <p className="text-xs font-mono bg-slate-100 p-3 rounded-lg text-slate-800 font-semibold">
                      {selectedRankedBidder.score_formula_display ||
                        `Technical Score: ${selectedRankedBidder.technical_score}% | Price: ${selectedRankedBidder.price_display}`}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: MANDATORY PQC BREAKDOWN */}
              {explanationActiveTab === "mandatory" && (
                <div className="space-y-4">
                  {selectedRankedBidder.mandatory_failures.length > 0 && (
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50 space-y-2">
                      <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                        <XCircleIcon className="size-4 text-red-600" />
                        Disqualifying Mandatory Failures ({selectedRankedBidder.mandatory_failures.length})
                      </h4>
                      <p className="text-xs text-red-800">
                        Under CPCL procurement rules, failure to meet any mandatory pre-qualification criteria excludes the vendor from financial consideration.
                      </p>

                      <div className="space-y-2 pt-2">
                        {selectedRankedBidder.mandatory_failures.map((f) => (
                          <div key={f.requirement_id} className="p-3 bg-white rounded-lg border border-red-200 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{f.requirement_name}</span>
                              <span className="font-mono text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-bold">
                                {f.clause_reference}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                              <div>
                                Mandated Threshold: <strong className="text-slate-900">{f.required_value}</strong>
                              </div>
                              <div>
                                Submitted Value: <strong className="text-red-700">{f.bidder_value}</strong>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 italic pt-0.5">{f.rule_evaluated}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Passed Mandatory Criteria */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Satisfied Qualification Criteria ({selectedRankedBidder.passed_requirements.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedRankedBidder.passed_requirements.map((p) => (
                        <div key={p.requirement_id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{p.requirement_name}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              ✓ PASS
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Clause: {p.clause_reference} · Value: <strong>{p.bidder_value}</strong>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TECHNICAL COMPLIANCE */}
              {explanationActiveTab === "technical" && (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Technical Scoring Details
                        </h4>
                        <p className="text-xs text-slate-500">
                          Comprehensive evaluation of technical specifications, PSU track record, and manufacturing authorization.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-blue-700 block">
                          {selectedRankedBidder.technical_score.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Technical Score</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">PSU Sector Experience</span>
                        <div className="text-sm font-extrabold text-slate-900">
                          {selectedRankedBidder.statutory_checks.experience_years} Years
                        </div>
                        <span className="text-[10px] text-slate-500 block">Prior supply orders in CPCL/IOCL/BPCL</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">OEM Authorization Tier</span>
                        <div className="text-sm font-extrabold text-slate-900 truncate">
                          {selectedRankedBidder.statutory_checks.oem_status}
                        </div>
                        <span className="text-[10px] text-slate-500 block">Manufacturer authorization form</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Make in India (MII)</span>
                        <div className="text-sm font-extrabold text-slate-900">
                          {selectedRankedBidder.statutory_checks.local_content_pct}%
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {selectedRankedBidder.statutory_checks.local_content_pct >= 50 ? "Class-I Local Supplier" : "Class-II Local Supplier"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Narrative */}
                  <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed">
                    <strong>Technical Summary: </strong>
                    {selectedRankedBidder.ranking_explanation?.technical_compliance.summary}
                  </div>
                </div>
              )}

              {/* TAB 4: FINANCIAL EVALUATION */}
              {explanationActiveTab === "financial" && (
                <div className="space-y-4">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Commercial Bid & Price Benchmark
                        </h4>
                        <p className="text-xs text-slate-500">
                          Financial evaluation against tender estimated budget and competing vendor price quotes.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-slate-900 block">
                          {selectedRankedBidder.price_display}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Submitted Bid Amount</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
                        <span className="text-xs font-bold text-blue-900 uppercase">Tender Estimated Budget</span>
                        <div className="text-base font-extrabold text-slate-900">
                          {activeTender?.estimated_value_display || "₹ 5,00,00,000"}
                        </div>
                        <p className="text-xs text-blue-700 font-medium">
                          {selectedRankedBidder.ranking_explanation?.financial_evaluation.comparison_to_budget}
                        </p>
                      </div>

                      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-1">
                        <span className="text-xs font-bold text-amber-900 uppercase">Lowest Eligible Quote (L1)</span>
                        <div className="text-base font-extrabold text-slate-900">
                          {rankingData?.summary.lowest_eligible_price}
                        </div>
                        <p className="text-xs text-amber-800 font-medium">
                          {selectedRankedBidder.rank === 1
                            ? "This bidder establishes the lowest eligible price baseline (L1)."
                            : `Price delta from L1: +₹ ${(Math.max(0, selectedRankedBidder.price_numeric - (rankingData?.summary.lowest_eligible_price_numeric || 0))).toLocaleString("en-IN")}`}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed">
                      <strong>Financial Rationale: </strong>
                      {selectedRankedBidder.ranking_explanation?.financial_evaluation.summary}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PEER-TO-PEER COMPARISON MATRIX */}
              {explanationActiveTab === "pairwise" && (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Pairwise Evaluation against Competitor Bids
                      </h4>
                      <p className="text-xs text-slate-500">
                        Exact mathematical delta (price, technical score, composite total) and rationale relative to every other participating bidder.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {selectedRankedBidder.ranking_explanation?.pairwise_comparisons.map((peer) => (
                        <div key={peer.peer_id} className="py-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  peer.comparison_status === "ABOVE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : peer.comparison_status === "BELOW"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-slate-100 text-slate-800"
                                }`}
                              >
                                {peer.comparison_status === "ABOVE" ? "▲ RANKED ABOVE" : peer.comparison_status === "BELOW" ? "▼ RANKED BELOW" : "■ EQUAL"}
                              </span>
                              <span className="font-bold text-slate-900 text-xs">{peer.peer_name}</span>
                              <span className="font-mono text-[10px] text-slate-400">({peer.peer_rank_display})</span>
                            </div>

                            <div className="text-xs font-mono font-bold text-slate-700">
                              Price Δ: {peer.price_delta_numeric <= 0 ? `- ${peer.price_difference}` : `+ ${peer.price_difference}`}
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg">
                            {peer.comparison_reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: VERIFIABLE PDF EVIDENCE ITEMS */}
              {explanationActiveTab === "evidence" && (
                <div className="space-y-3">
                  <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                      Verifiable Clause & PDF Source Evidence
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                      Click &ldquo;Inspect Evidence PDF&rdquo; on any requirement to inspect the source page, clause citation, and OCR extracted text in the evidence viewer.
                    </p>

                    <div className="space-y-2">
                      {selectedRankedBidder.criteria_breakdown.map((item) => (
                        <div
                          key={item.requirement_id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {item.clause_reference}
                              </span>
                              <span className="font-bold text-slate-900">{item.requirement_name}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  item.status === "PASS"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : item.status === "FAIL"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              Submitted: <strong className="text-slate-800">{item.bidder_value}</strong> · Document:{" "}
                              <span className="font-mono text-slate-500">{item.evidence_source} (Page {item.page_number})</span>
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEvidence(item, selectedRankedBidder.bidder_name)}
                            className="text-xs font-bold text-blue-700 hover:bg-blue-50 shrink-0"
                          >
                            <EyeIcon className="size-3.5 mr-1" /> Inspect Evidence PDF
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-500 font-medium">
                Audit Record ID: <span className="font-mono">{selectedRankedBidder.bidder_id}-{activeTender?.tender_number || selectedTenderId}</span> · Generated: {rankingData?.generated_at ? new Date(rankingData.generated_at).toLocaleString() : "Live"}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/compliance?bidder=${encodeURIComponent(selectedRankedBidder.bidder_id)}&tender_id=${encodeURIComponent(selectedTenderId)}`}
                >
                  <Button size="sm" variant="outline" className="text-xs font-semibold">
                    <ShieldCheckIcon className="size-3.5 mr-1 text-blue-600" /> Full Compliance Page
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => setIsWhyThisRankOpen(false)}
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  Close Scrutiny Panel
                </Button>
              </div>
            </div>
          </div>
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
