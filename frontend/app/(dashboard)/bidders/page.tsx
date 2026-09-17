"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
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
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { Bidder } from "@/lib/types";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Received Bids" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "UNDER_VERIFICATION", label: "Under Verification" },
  { id: "REVIEW", label: "Review Required" },
  { id: "COMPLETED", label: "Completed" },
];

export default function BiddersPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialQuery = searchParams.get("query") || "";
  const initialStatus = searchParams.get("status") || "ALL";
  const initialTenderId = searchParams.get("tender_id") || "";

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [selectedTenderId, setSelectedTenderId] = useState(initialTenderId);
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync URL parameters
  const updateUrlParams = useCallback(
    (query: string, status: string, tenderId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("query", query);
      } else {
        params.delete("query");
      }
      if (status && status !== "ALL") {
        params.set("status", status);
      } else {
        params.delete("status");
      }
      if (tenderId) {
        params.set("tender_id", tenderId);
      } else {
        params.delete("tender_id");
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
      updateUrlParams(searchTerm, activeStatus, selectedTenderId);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, activeStatus, selectedTenderId, updateUrlParams]);

  // Fetch / filter bidders
  const fetchBidders = useCallback(
    async (query: string, status: string, tenderId: string) => {
      setLoading(true);
      try {
        const qParams = new URLSearchParams();
        if (query) qParams.set("query", query);
        if (status && status !== "ALL") qParams.set("status", status);
        if (tenderId) qParams.set("tender_id", tenderId);

        const qs = qParams.toString() ? `?${qParams.toString()}` : "";
        const res = await apiRequest<Bidder[]>(`/bidders${qs}`);
        if (res && Array.isArray(res)) {
          setBidders(res);
        } else {
          setBidders([]);
        }
      } catch {
        setBidders([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Refetch when search params change
  useEffect(() => {
    const q = searchParams.get("query") || "";
    const s = searchParams.get("status") || "ALL";
    const t = searchParams.get("tender_id") || "";
    setSearchTerm(q);
    setActiveStatus(s);
    setSelectedTenderId(t);
    fetchBidders(q, s, t);
  }, [searchParams, fetchBidders]);

  function handleClearSearch() {
    setSearchTerm("");
    setActiveStatus("ALL");
    setSelectedTenderId("");
    updateUrlParams("", "ALL", "");
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              Vendor Evaluation Cell
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-500">
              Automated Statutory & Technical Scrutiny
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">
            Bids & Submissions
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Evaluate participating vendor proposals, compliance scorecards, and evidentiary audit attachments.
          </p>
        </div>

        <Link href="/comparison">
          <Button variant="outline" size="sm" className="text-xs font-semibold shadow-xs flex items-center gap-1.5">
            <ScaleIcon className="size-4 text-blue-600" />
            Bidder Comparison Matrix
          </Button>
        </Link>
      </div>

      {/* Dedicated Search & Filter Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Field */}
          <div className="relative w-full md:max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search bidders or bids..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                title="Clear search"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveStatus(filter.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeStatus === filter.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Query Status / Reset Bar */}
        {(searchTerm || activeStatus !== "ALL" || selectedTenderId) && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Found <strong>{bidders.length}</strong> matching bid submission{bidders.length === 1 ? "" : "s"}
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
              {selectedTenderId && (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                  Tender: {selectedTenderId}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Bidder Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500">
          <RefreshCwIcon className="size-6 animate-spin text-blue-600 mb-2" />
          <p className="text-xs font-medium">Loading bidder submissions...</p>
        </div>
      ) : bidders.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <SearchIcon className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No bids or submissions found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            No vendor proposals match &ldquo;{searchTerm}&rdquo; under the current filters. Check your search query or reset filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSearch}
            className="mt-4 text-xs font-semibold"
          >
            Clear Search & Show All Bids
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bidders.map((bidder) => (
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

                {/* Tender Association Badge */}
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-700">
                      {bidder.tender_number || bidder.tender_id || "CPCL/PROC/2026/001"}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {bidder.tender_title ? bidder.tender_title.slice(0, 24) + "..." : "Tender"}
                    </span>
                  </div>
                </div>

                {/* Commercials & Risk Badge */}
                <div className="flex items-center justify-between">
                  <RiskBadge risk={bidder.risk_level || "LOW"} />
                  <div className="text-right">
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">COMMERCIAL BID</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {bidder.bid_amount || "₹ 4,42,00,000"}
                    </span>
                  </div>
                </div>

                {/* Pass / Fail / Review Summary Counts */}
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 text-center text-xs">
                  <div className="rounded bg-emerald-50 py-1 text-emerald-800 font-bold border border-emerald-100">
                    <span className="block text-[10px] text-emerald-600 font-semibold">PASS</span>
                    {bidder.summary?.pass_count ?? 6}
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

                {/* Audit Finding / Highlight Issue */}
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
                  href={`/compliance?bidder=${encodeURIComponent(bidder.id)}`}
                  className="w-full block"
                >
                  <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-xs text-xs" size="sm">
                    <ShieldCheckIcon className="size-4" />
                    View Compliance & Evidence
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
