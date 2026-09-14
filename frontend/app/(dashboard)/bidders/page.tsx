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

const INITIAL_SAMPLE_BIDDERS: Bidder[] = [
  {
    id: "BID-001",
    name: "ABC Safety Solutions Pvt Ltd",
    tender_id: "TND-2026-001",
    tender_number: "CPCL/PROC/2026/001",
    tender_title: "Industrial Safety Helmets & Impact Visors",
    bid_submission_id: "BID/2024/0912-A",
    contact_person: "Suresh Patel (Managing Director)",
    email: "abc@abcsafety.com",
    phone: "+91 98765 43210",
    location: "Chennai, Tamil Nadu",
    bid_amount: "₹ 4,42,00,000",
    gstin: "33AABCA1234F1Z5",
    pan: "AABCA1234F",
    udyam: "UDYAM-TN-02-0012345",
    experience_years: 5.0,
    oem_status: "Direct OEM Tier 1 Authorization - Karam / Honeywell",
    local_content_pct: 65.0,
    is_debarred: false,
    epfo_code: "TN/MAS/0099881",
    submitted_at: "2026-08-20T14:30:00Z",
    status: "SUBMITTED",
    verification_status: "AUTHENTICATED",
    compliance_status: "COMPLIANT",
    compliance_score: 100,
    risk_level: "LOW",
    summary: {
      pass_count: 6,
      fail_count: 0,
      review_count: 0,
      total: 6,
      total_requirements: 6,
    },
    highlight_issue: "Fully compliant across all mandatory statutory, financial, and technical criteria.",
  },
  {
    id: "BID-002",
    name: "SecureTech Industries Ltd",
    tender_id: "TND-2026-001",
    tender_number: "CPCL/PROC/2026/001",
    tender_title: "Industrial Safety Helmets & Impact Visors",
    bid_submission_id: "BID/2024/0914-B",
    contact_person: "Rajiv Sharma (VP Business Dev)",
    email: "contact@securetechind.com",
    phone: "+91 98220 11223",
    location: "Mumbai, Maharashtra",
    bid_amount: "₹ 4,68,00,000",
    gstin: "27AAACT5678B1Z2",
    pan: "AAACT5678B",
    udyam: "UDYAM-MH-18-0098765",
    experience_years: 2.0,
    oem_status: "Direct OEM Tier 1 Authorization",
    local_content_pct: 52.0,
    is_debarred: false,
    epfo_code: "MH/BAN/0011223",
    submitted_at: "2026-08-22T11:15:00Z",
    status: "SUBMITTED",
    verification_status: "AUTHENTICATED",
    compliance_status: "NON_COMPLIANT",
    compliance_score: 67,
    risk_level: "HIGH",
    summary: {
      pass_count: 4,
      fail_count: 2,
      review_count: 0,
      total: 6,
      total_requirements: 6,
    },
    highlight_issue: "Mandatory turnover (₹2.2 Cr < ₹3.0 Cr) and experience requirements failed.",
  },
  {
    id: "BID-003",
    name: "SafeGuard Equipments Pvt Ltd",
    tender_id: "TND-2026-001",
    tender_number: "CPCL/PROC/2026/001",
    tender_title: "Industrial Safety Helmets & Impact Visors",
    bid_submission_id: "BID/2024/0915-C",
    contact_person: "Kiran Rao (Partner)",
    email: "tenders@safeguardequip.com",
    phone: "+91 94440 55667",
    location: "Bengaluru, Karnataka",
    bid_amount: "₹ 4,29,00,000",
    gstin: "29AABCS9012D1Z8",
    pan: "AABCS9012D",
    udyam: "UDYAM-KR-03-0045678",
    experience_years: 4.0,
    oem_status: "Secondary Distributor Letter",
    local_content_pct: 35.0,
    is_debarred: false,
    epfo_code: "KN/BNG/0067890",
    submitted_at: "2026-08-24T16:45:00Z",
    status: "UNDER_VERIFICATION",
    verification_status: "PROCESSING",
    compliance_status: "REQUIRES_REVIEW",
    compliance_score: 83,
    risk_level: "MEDIUM",
    summary: {
      pass_count: 4,
      fail_count: 0,
      review_count: 2,
      total: 6,
      total_requirements: 6,
    },
    highlight_issue: "Secondary OEM letter submitted & Class-II local content (35%). Requires officer review.",
  },
  {
    id: "BID-004",
    name: "Chennai Valves & Fittings Corp",
    tender_id: "TND-2026-004",
    tender_number: "CPCL/PROC/2026/004",
    tender_title: "High-Pressure Refinery Valve Assemblies",
    bid_submission_id: "BID/2026/0401-A",
    contact_person: "M. Venkatesh (Managing Director)",
    email: "sales@chennaivalves.com",
    phone: "+91 94441 22334",
    location: "Chennai, Tamil Nadu",
    bid_amount: "₹ 7,95,00,000",
    gstin: "33AACCV5544E1Z1",
    pan: "AACCV5544E",
    udyam: "UDYAM-TN-02-0088776",
    experience_years: 6.0,
    oem_status: "Direct OEM Manufacturer",
    local_content_pct: 70.0,
    is_debarred: false,
    epfo_code: "TN/MAS/0044556",
    submitted_at: "2026-08-26T10:15:00Z",
    status: "REVIEW",
    verification_status: "PROCESSING",
    compliance_status: "REVIEW",
    compliance_score: 90,
    risk_level: "MEDIUM",
    summary: {
      pass_count: 5,
      fail_count: 0,
      review_count: 1,
      total: 6,
      total_requirements: 6,
    },
    highlight_issue: "Turnover satisfies numerical threshold. CA certificate UDIN validation pending response.",
  },
  {
    id: "BID-005",
    name: "Apex Piping & Engineering Ltd",
    tender_id: "TND-2026-004",
    tender_number: "CPCL/PROC/2026/004",
    tender_title: "High-Pressure Refinery Valve Assemblies",
    bid_submission_id: "BID/2026/0402-B",
    contact_person: "Anil Kulkarni (Director)",
    email: "info@apexpiping.com",
    phone: "+91 98230 99887",
    location: "Pune, Maharashtra",
    bid_amount: "₹ 8,15,00,000",
    gstin: "27AAACA9988C1Z4",
    pan: "AAACA9988C",
    udyam: "UDYAM-MH-18-0044332",
    experience_years: 8.0,
    oem_status: "Direct OEM Manufacturer",
    local_content_pct: 60.0,
    is_debarred: false,
    epfo_code: "MH/PUN/0099112",
    submitted_at: "2026-08-28T14:00:00Z",
    status: "COMPLETED",
    verification_status: "AUTHENTICATED",
    compliance_status: "COMPLIANT",
    compliance_score: 95,
    risk_level: "LOW",
    summary: {
      pass_count: 6,
      fail_count: 0,
      review_count: 0,
      total: 6,
      total_requirements: 6,
    },
    highlight_issue: "Complete IBR approval and ASTM A335 inspection credentials verified.",
  },
  {
    id: "BID-006",
    name: "Southern Safety Gears",
    tender_id: "TND-2026-001",
    tender_number: "CPCL/PROC/2026/001",
    tender_title: "Industrial Safety Helmets & Impact Visors",
    bid_submission_id: "BID/2026/0105-D",
    contact_person: "K. Selvam (Partner)",
    email: "selvam@southernsafety.in",
    phone: "+91 94432 77665",
    location: "Coimbatore, Tamil Nadu",
    bid_amount: "₹ 4,35,00,000",
    gstin: "33AAESS1122G1Z9",
    pan: "AAESS1122G",
    udyam: "UDYAM-TN-03-0055443",
    experience_years: 3.0,
    oem_status: "Authorized Channel Partner",
    local_content_pct: 55.0,
    is_debarred: false,
    epfo_code: "TN/CBE/0033221",
    submitted_at: "2026-09-01T09:30:00Z",
    status: "DRAFT",
    verification_status: "PENDING",
    compliance_status: "PENDING",
    compliance_score: 0,
    risk_level: "LOW",
    summary: {
      pass_count: 0,
      fail_count: 0,
      review_count: 0,
      total: 6,
      total_requirements: 6,
    },
    highlight_issue: "Draft submission in preparation by vendor.",
  },
];

const STATUS_FILTERS = [
  { id: "ALL", label: "All Bids" },
  { id: "DRAFT", label: "Draft" },
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
  const [bidders, setBidders] = useState<Bidder[]>(INITIAL_SAMPLE_BIDDERS);
  const [loading, setLoading] = useState(false);

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
          filterLocalBidders(query, status, tenderId);
        }
      } catch {
        filterLocalBidders(query, status, tenderId);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function filterLocalBidders(query: string, status: string, tenderId: string) {
    let list = [...INITIAL_SAMPLE_BIDDERS];
    if (tenderId) {
      const tid = tenderId.toLowerCase();
      list = list.filter(
        (b) =>
          b.tender_id?.toLowerCase().includes(tid) ||
          b.tender_number?.toLowerCase().includes(tid)
      );
    }
    if (query) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.id?.toLowerCase().includes(q) ||
          b.bid_submission_id?.toLowerCase().includes(q) ||
          b.tender_id?.toLowerCase().includes(q) ||
          b.tender_number?.toLowerCase().includes(q) ||
          b.tender_title?.toLowerCase().includes(q) ||
          b.contact_person?.toLowerCase().includes(q) ||
          b.email?.toLowerCase().includes(q) ||
          b.location?.toLowerCase().includes(q) ||
          b.status?.toLowerCase().includes(q) ||
          b.compliance_status?.toLowerCase().includes(q)
      );
    }
    if (status && status !== "ALL") {
      const st = status.toUpperCase().replace(" ", "_");
      list = list.filter((b) => {
        const bStatus = (b.status || "").toUpperCase().replace(" ", "_");
        const bComp = (b.compliance_status || "").toUpperCase().replace(" ", "_");
        if (st === "DRAFT") return bStatus === "DRAFT";
        if (st === "SUBMITTED") return bStatus === "SUBMITTED" || bComp === "COMPLIANT" || bComp === "NON_COMPLIANT";
        if (st === "UNDER_VERIFICATION") return bStatus === "UNDER_VERIFICATION" || bStatus === "PROCESSING";
        if (st === "REVIEW") return bStatus === "REVIEW" || bComp === "REQUIRES_REVIEW" || bComp === "REVIEW";
        if (st === "COMPLETED") return bStatus === "COMPLETED" || b.verification_status === "AUTHENTICATED";
        return bStatus === st || bComp === st;
      });
    }
    setBidders(list);
  }

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
