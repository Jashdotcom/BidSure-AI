"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, RiskBadge, ScoreDisplay, Input } from "@/components/ui";
import {
  ScaleIcon,
  ShieldCheckIcon,
  DownloadIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
  FilterIcon,
  FileTextIcon,
  UsersIcon,
  ChevronRightIcon,
  ArrowLeftIcon
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { Bidder, Tender } from "@/lib/types";

export default function ComparisonPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(true);
  const [loadingBidders, setLoadingBidders] = useState(false);

  // Workflow State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTenderId, setSelectedTenderId] = useState<string>("");
  const [comparisonCount, setComparisonCount] = useState<number>(3);
  const [selectedBidderIds, setSelectedBidderIds] = useState<Set<string>>(new Set());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchTenders();
  }, []);

  useEffect(() => {
    if (selectedTenderId) {
      fetchBidders(selectedTenderId === "ALL" ? "" : selectedTenderId);
    } else {
      setBidders([]);
    }
  }, [selectedTenderId]);

  async function fetchTenders() {
    try {
      setLoadingTenders(true);
      const data = await apiRequest<Tender[]>("api/tenders");
      setTenders(data || []);
    } catch (err) {
      console.error("Failed to load tenders", err);
    } finally {
      setLoadingTenders(false);
    }
  }

  async function fetchBidders(tenderId: string) {
    try {
      setLoadingBidders(true);
      const query = tenderId ? `?tender_id=${tenderId}` : "";
      const data = await apiRequest<Bidder[]>(`api/bidders${query}`);
      // Filter out draft bids for comparison
      const submittedBidders = data.filter((b) => b.status !== "DRAFT");
      setBidders(submittedBidders);

      // Auto-adjust comparison count if available bidders are fewer
      if (submittedBidders.length > 0 && submittedBidders.length < comparisonCount) {
        setComparisonCount(Math.max(2, submittedBidders.length));
      }
    } catch (err) {
      console.error("Failed to load bidders", err);
    } finally {
      setLoadingBidders(false);
    }
  }

  // Derived state
  const selectedTender = tenders.find((t) => t.id === selectedTenderId || t.tender_number === selectedTenderId);
  const tenderLabel = selectedTender ? selectedTender.tender_number : selectedTenderId === "ALL" ? "All Global Bidders" : "";

  const filteredBidders = useMemo(() => {
    return bidders.filter((b) => {
      const matchSearch =
        searchQuery === "" ||
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "ALL" ||
        b.compliance_status?.toUpperCase() === statusFilter ||
        (statusFilter === "COMPLIANT" && b.compliance_status === "COMPLIANT");
      // Could enhance status filtering
      return matchSearch && matchStatus;
    });
  }, [bidders, searchQuery, statusFilter]);

  const selectedBidders = useMemo(() => {
    return bidders.filter((b) => selectedBidderIds.has(b.id));
  }, [bidders, selectedBidderIds]);

  const remainingToSelect = comparisonCount - selectedBidderIds.size;

  function toggleBidderSelection(id: string) {
    const newSet = new Set(selectedBidderIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (newSet.size < comparisonCount) {
        newSet.add(id);
      }
    }
    setSelectedBidderIds(newSet);
  }

  // Navigate to Step 2
  function goToStep2() {
    setSelectedBidderIds(new Set()); // Reset selections
    setStep(2);
  }

  // Matrix Configuration
  function formatBidderValue(b: Bidder, key: string) {
    switch (key) {
      case "turnover":
        return `₹${b.annual_turnover_cr || 0} Cr`;
      case "experience":
        return `${b.experience_years || b.years_experience || 0} Years`;
      case "oem_auth":
        return b.oem_status || "Not Provided";
      case "mii_content":
        return b.local_content_pct ? `${b.local_content_pct}% Class-I` : b.local_content ? `${b.local_content}%` : "Not Provided";
      case "gstin":
        return b.gstin ? `Active (${b.gstin})` : "Missing";
      case "debarment":
        return b.is_debarred ? "Debarred / Adverse" : "Clear (No Adverse)";
      default:
        return "N/A";
    }
  }

  function getBidderStatusValue(b: Bidder, key: string): "PASS" | "FAIL" | "REVIEW" {
    // Determine visual status dynamically based on rules (mock dynamic inference)
    switch (key) {
      case "turnover":
        return (b.annual_turnover_cr || 0) >= 3 ? "PASS" : "FAIL";
      case "experience":
        return (b.experience_years || 0) >= 3 ? "PASS" : "FAIL";
      case "oem_auth":
        return b.oem_status?.toLowerCase().includes("direct") ? "PASS" : b.oem_status?.toLowerCase().includes("distributor") ? "REVIEW" : "FAIL";
      case "mii_content":
        return (b.local_content_pct || 0) >= 50 ? "PASS" : (b.local_content_pct || 0) >= 20 ? "REVIEW" : "FAIL";
      case "gstin":
        return b.gstin ? "PASS" : "FAIL";
      case "debarment":
        return b.is_debarred ? "FAIL" : "PASS";
      default:
        return "PASS";
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              Comparative Analysis
            </span>
            {tenderLabel && <span className="text-xs font-semibold text-slate-500">· {tenderLabel}</span>}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Bidder Comparison Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build a side-by-side compliance, financial, and technical eligibility comparison.
          </p>
        </div>

        {step === 3 && (
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => setStep(2)}>
              <ArrowLeftIcon className="size-3.5" />
              Change Selection
            </Button>
            <Link href="/reports">
              <Button size="sm" className="bg-blue-700 hover:bg-blue-800">
                <DownloadIcon className="size-3.5" />
                Export CST
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Main Workflow Container */}
      <Card className="border-slate-200 min-h-[500px]">
        {/* Step 1: Pre-requisites (Select Tender & Count) */}
        {step === 1 && (
          <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-blue-50 text-blue-700 font-bold text-xl mb-2">
                1
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">Configure Comparison</h2>
              <p className="text-sm text-slate-500">Select a tender and choose how many bidders you want to compare side-by-side.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Select Procurement Tender</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedTenderId}
                  onChange={(e) => setSelectedTenderId(e.target.value)}
                >
                  <option value="" disabled>-- Select a Tender --</option>
                  <option value="ALL">Global / All Tenders (System Wide)</option>
                  {tenders.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tender_number} - {t.title} ({(t.bids_count as number) || 0} Bids)
                    </option>
                  ))}
                </select>
                {selectedTenderId && !loadingBidders && (
                  <p className="text-xs text-blue-700 font-semibold px-1">
                    {bidders.length} eligible submissions found for this selection.
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">How many bidders to compare?</label>
                <div className="flex flex-wrap gap-3">
                  {[2, 3, 4, 5, 6].map((num) => {
                    const isDisabled = bidders.length > 0 && num > bidders.length;
                    return (
                      <button
                        key={num}
                        disabled={isDisabled}
                        onClick={() => setComparisonCount(num)}
                        className={`flex items-center justify-center h-12 w-16 rounded-xl border-2 transition-all font-extrabold text-lg ${
                          comparisonCount === num
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                        } ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500">
                  You can compare up to {Math.min(6, Math.max(2, bidders.length || 6))} bidders horizontally on standard screens.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <Button
                size="lg"
                onClick={goToStep2}
                disabled={!selectedTenderId || bidders.length < 2}
                className="w-full sm:w-auto"
              >
                Continue to Select Bidders
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Bidders */}
        {step === 2 && (
          <div className="flex flex-col h-full min-h-[600px] animate-in fade-in duration-300">
            {/* Step 2 Header & Filters */}
            <div className="border-b border-slate-200 bg-slate-50/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep(1)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-200/50 transition-colors">
                    <ArrowLeftIcon className="size-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Select {comparisonCount} Bidders to Compare</h2>
                    <p className="text-xs text-slate-500">Browse and select exactly {comparisonCount} bidders from the list below.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
                    <span className={selectedBidderIds.size === comparisonCount ? "text-emerald-600" : "text-blue-600"}>
                      {selectedBidderIds.size}
                    </span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-slate-700">{comparisonCount} Selected</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search bidder name, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLIANT">Compliant</option>
                  <option value="REQUIRES_REVIEW">Requires Review</option>
                  <option value="NON_COMPLIANT">Non-Compliant</option>
                </select>
              </div>
            </div>

            {/* Bidder Grid List */}
            <div className="p-5 flex-1 bg-slate-50/30">
              {filteredBidders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <UsersIcon className="size-12 mb-3 opacity-20" />
                  <p className="font-semibold text-slate-600 text-sm">No bidders found.</p>
                  <p className="text-xs mt-1">Try adjusting your search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredBidders.map((b) => {
                    const isSelected = selectedBidderIds.has(b.id);
                    const isDisabled = !isSelected && selectedBidderIds.size >= comparisonCount;

                    return (
                      <div
                        key={b.id}
                        onClick={() => !isDisabled && toggleBidderSelection(b.id)}
                        className={`relative rounded-xl border p-4 transition-all overflow-hidden ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/30 shadow-md ring-1 ring-blue-500 cursor-pointer"
                            : isDisabled
                              ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer"
                        }`}
                      >
                        {/* Checkbox Overlay */}
                        <div className="absolute top-4 right-4 z-10 flex items-center justify-center">
                          <div className={`size-5 rounded max-w-full flex items-center justify-center border-2 transition-colors ${
                            isSelected ? "bg-blue-600 border-blue-600 text-white" : isDisabled ? "border-slate-200 bg-slate-100" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <svg className="size-3.5" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </div>

                        <div className="pr-8">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate">{b.name}</h3>
                          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{b.id} • {b.tender_number}</p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-slate-400">Bid Amount</span>
                            <span className="font-bold text-slate-800">{b.bid_amount || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-slate-400">Compliance</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <ScoreDisplay score={b.compliance_score || 0} size="sm" />
                              <StatusBadge status={b.compliance_status || "PENDING"} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="border-t border-slate-200 bg-white p-4 sticky bottom-0 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div>
                {remainingToSelect > 0 ? (
                  <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                    <AlertTriangleIcon className="size-4 text-amber-500" />
                    Please select {remainingToSelect} more bidder(s) to continue
                  </p>
                ) : (
                  <p className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                    <CheckCircleIcon className="size-4 text-emerald-500" />
                    Ready to compare selected bidders
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setSelectedBidderIds(new Set())} disabled={selectedBidderIds.size === 0}>
                  Clear Selection
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={remainingToSelect > 0}
                  className={remainingToSelect === 0 ? "bg-blue-700 hover:bg-blue-800 shadow-md ring-2 ring-offset-1 ring-blue-500/50" : ""}
                >
                  <ScaleIcon className="size-4" />
                  Generate Comparison Matrix
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Comparison Matrix Table */}
        {step === 3 && (
          <div className="overflow-x-auto min-h-[500px] animate-in fade-in duration-500">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-5 w-64 bg-slate-100 shadow-[1px_0_0_0_#e2e8f0] sticky left-0 z-10 align-bottom">
                    Evaluation Criteria / Parameter
                  </th>
                  {selectedBidders.map((b) => (
                    <th key={b.id} className="px-5 py-5 text-center min-w-[240px] max-w-[280px]">
                      <div className="font-extrabold text-sm text-slate-900 truncate" title={b.name}>{b.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{b.id} • {b.location}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {/* 1. Compliance Executive Summary */}
                <tr className="bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-slate-900 bg-slate-50/70 shadow-[1px_0_0_0_#e2e8f0] sticky left-0 z-10">
                    Compliance Score & Status
                  </td>
                  {selectedBidders.map((b) => (
                    <td key={b.id} className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ScoreDisplay score={b.compliance_score || 0} size="md" />
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={b.compliance_status || "PENDING"} />
                          <RiskBadge risk={b.risk_level || "MEDIUM"} />
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 2. Commercial Bid */}
                <tr>
                  <td className="px-5 py-4 bg-white shadow-[1px_0_0_0_#e2e8f0] sticky left-0 z-10">
                    <div className="font-bold text-slate-900">Commercial Bid Amount</div>
                    <div className="text-[10px] text-slate-500">Excl. Applicable Taxes</div>
                  </td>
                  {selectedBidders.map((b) => (
                    <td key={b.id} className="px-5 py-4 text-center font-extrabold text-slate-900 text-[13px]">
                      {b.bid_amount || "N/A"}
                    </td>
                  ))}
                </tr>

                {/* 3. Financial: Turnover */}
                <tr>
                  <td className="px-5 py-4 bg-white shadow-[1px_0_0_0_#e2e8f0] sticky left-0 z-10">
                    <div className="font-bold text-slate-800">Annual Turnover (Clause 4.1.1)</div>
                    <div className="text-[10px] text-slate-500">Threshold: &gt;= ₹3.00 Cr</div>
                  </td>
                  {selectedBidders.map((b) => (
                    <td key={b.id} className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 bg-slate-50 py-2 rounded-lg border border-slate-100">
                        <StatusBadge status={getBidderStatusValue(b, "turnover")} />
                        <span className="font-semibold text-slate-800">{formatBidderValue(b, "turnover")}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 4. Technical: Experience */}
                <tr>
                  <td className="px-5 py-4 bg-white shadow-[1px_0_0_0_#e2e8f0] sticky left-0 z-10">
                    <div className="font-bold text-slate-800">Sector Experience (Clause 4.2.3)</div>
                    <div className="text-[10px] text-slate-500">Threshold: &gt;= 3 Years / PSU Orders</div>
                  </td>
                  {selectedBidders.map((b) => (
                    <td key={b.id} className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 bg-slate-50 py-2 rounded-lg border border-slate-100">
                        <StatusBadge status={getBidderStatusValue(b, "experience")} />
                        <span className="font-semibold text-slate-800">{formatBidderValue(b, "experience")}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 5. OEM Auth */}
                <tr>
                  <td className="px-5 py-4 bg-white shadow-[1px_0_0_0_#e2e8f0] sticky left-0 z-10">
                    <div className="font-bold text-slate-800">OEM Authorization (MAF)</div>
                    <div className="text-[10px] text-slate-500">Requirement: Direct Manufacturer</div>
                  </td>
                  {selectedBidders.map((b) => (
                    <td key={b.id} className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5 p-2">
                        <StatusBadge status={getBidderStatusValue(b, "oem_auth")} />
                        <span className="font-medium text-slate-700 text-[11px] leading-tight max-w-[200px] text-center">
                          {formatBidderValue(b, "oem_auth")}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 6. Statutory: Make in India */}
                <tr>
                  <td className="px-5 py-4 bg-white shadow-[1px_0_0_0_#e2e8f0] sticky left-0 z-10">
                    <div className="font-bold text-slate-800">Make in India Content</div>
                    <div className="text-[10px] text-slate-500">Threshold: &gt;= 50% (Class-I)</div>
                  </td>
                  {selectedBidders.map((b) => (
                    <td key={b.id} className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 bg-slate-50 py-2 rounded-lg border border-slate-100">
                        <StatusBadge status={getBidderStatusValue(b, "mii_content")} />
                        <span className="font-semibold text-slate-800">{formatBidderValue(b, "mii_content")}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 7. Action Row */}
                <tr className="bg-slate-50/70 border-t-2 border-slate-200">
                  <td className="px-5 py-5 font-bold text-slate-800 uppercase tracking-widest text-[10px] flex items-center h-[72px] bg-slate-50/70 shadow-[1px_0_0_0_#e2e8f0] sticky left-0 z-10">
                    Detailed Audit Trail
                  </td>
                  {selectedBidders.map((b) => (
                    <td key={b.id} className="px-5 py-4 text-center">
                      <Link href={`/compliance?bidder=${b.id}&tender=${b.tender_id || selectedTenderId || ""}`}>
                        <Button size="sm" variant={b.compliance_status === "COMPLIANT" ? "success" : "outline"} className="w-full">
                          <ShieldCheckIcon className="size-4" />
                          Inspect Verification
                        </Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
