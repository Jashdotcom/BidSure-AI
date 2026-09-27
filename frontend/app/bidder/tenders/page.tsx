"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import {
  FileTextIcon,
  SearchIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ClockIcon,
  UploadCloudIcon,
  SparklesIcon,
  XCircleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

interface PublicTender {
  id: string;
  tender_id: string;
  tender_number?: string;
  title: string;
  organization: string;
  category: string;
  estimated_value: string;
  emd_amount: string;
  closing_date: string;
  eligibility_status: "ELIGIBLE" | "CONDITIONAL" | "INELIGIBLE";
  eligibility_reason: string;
  description?: string;
}

interface TenderDocCheckResult {
  tender_id: string;
  tender_title: string;
  total_required: number;
  available_count: number;
  missing_count: number;
  readiness_percentage: number;
  matched_documents: {
    requirement: string;
    category: string;
    document_name: string;
    document_type: string;
    source: string;
    source_display?: string;
    status: string;
    matched: boolean;
  }[];
  missing_documents: {
    requirement: string;
    category: string;
    document_type: string;
    description: string;
    mandatory: boolean;
  }[];
}

export default function BidderTendersPage() {
  const [search, setSearch] = useState("");
  const [tenders, setTenders] = useState<PublicTender[]>([]);
  const [loading, setLoading] = useState(true);

  // Document check modal state
  const [checkModalTender, setCheckModalTender] = useState<PublicTender | null>(null);
  const [checkingDocs, setCheckingDocs] = useState(false);
  const [docCheckResult, setDocCheckResult] = useState<TenderDocCheckResult | null>(null);

  useEffect(() => {
    async function loadTenders() {
      setLoading(true);
      try {
        const res = await apiRequest<any[]>("/bidder-portal/tenders");
        if (res && Array.isArray(res) && res.length > 0) {
          const formatted: PublicTender[] = res.map((t) => {
            const estNum = typeof t.estimated_value === "number" ? t.estimated_value : 0;
            const emdNum = typeof t.emd_amount === "number" ? t.emd_amount : 0;

            // Format closing date
            let closingStr = t.deadline || t.closing_date || "Open for Submission";
            if (closingStr.includes("T")) {
              try {
                const dt = new Date(closingStr);
                closingStr = dt.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
              } catch {
                // keep closingStr
              }
            }

            const estDisplay =
              t.estimated_value_display ||
              (estNum > 0
                ? estNum >= 10000000
                  ? `₹ ${(estNum / 10000000).toFixed(2)} Cr`
                  : `₹ ${(estNum / 100000).toFixed(2)} Lakh`
                : "Refer NIT Document");
            const emdDisplay =
              t.emd_amount_display ||
              (emdNum > 0
                ? `₹ ${(emdNum / 100000).toFixed(2)} Lakh (Exempt for MSME)`
                : "Exempt / NIL");

            return {
              id: t.id,
              tender_id: t.tender_number || t.id,
              tender_number: t.tender_number || t.id,
              title: t.title,
              organization: t.organization || "Procuring Authority",
              category: t.category || "Procurement",
              estimated_value: estDisplay,
              emd_amount: emdDisplay,
              closing_date: closingStr,
              eligibility_status: t.eligibility_status || "CONDITIONAL",
              eligibility_reason:
                t.eligibility_reason ||
                "Review mandatory technical specifications, statutory registrations (GST, PAN, Udyam) and PQC clauses in NIT document.",
              description: t.description,
            };
          });
          setTenders(formatted);
        } else {
          setTenders([]);
        }
      } catch {
        setTenders([]);
      } finally {
        setLoading(false);
      }
    }
    loadTenders();
  }, []);

  // Handle open document check modal
  async function handleCheckDocuments(tender: PublicTender) {
    setCheckModalTender(tender);
    setCheckingDocs(true);
    setDocCheckResult(null);
    try {
      const res = await apiRequest<TenderDocCheckResult>(
        `/bidder-portal/tenders/${tender.id}/check-documents`
      );
      if (res) {
        setDocCheckResult(res);
      }
    } catch {
      // Fallback
    } finally {
      setCheckingDocs(false);
    }
  }

  const filtered = tenders.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tender_id.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            CPCL e-Procurement Portal
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Active Tender Opportunities
          </h1>
          <p className="text-xs text-slate-500">
            Review live published tenders and automated eligibility pre-evaluations based on your profile credentials.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search active tenders by title, ref code, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </Card>

      {/* Tender Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500">
          <RefreshCwIcon className="size-6 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs font-medium">Fetching live published tenders...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <FileTextIcon className="size-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No matching tenders found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {search ? `No live tenders match "${search}".` : "There are currently no active tenders published."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tender) => (
            <Card key={tender.id} className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                      {tender.tender_id}
                    </span>
                    <span className="text-xs text-slate-500">{tender.category}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{tender.title}</h2>
                  <p className="text-xs text-slate-500">{tender.organization}</p>

                  {/* Pre-Check Eligibility Banner */}
                  <div
                    className={`rounded-lg p-3 text-xs mt-3 flex items-start gap-2.5 ${
                      tender.eligibility_status === "ELIGIBLE"
                        ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                        : "bg-amber-50 text-amber-900 border border-amber-200"
                    }`}
                  >
                    {tender.eligibility_status === "ELIGIBLE" ? (
                      <CheckCircleIcon className="size-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangleIcon className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block">
                        AI Eligibility Pre-Check: {tender.eligibility_status}
                      </span>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-700">
                        {tender.eligibility_reason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Commercial Specs & Action */}
                <div className="flex flex-col justify-between border-t pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-6 min-w-[240px]">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400">Estimated Value</span>
                      <p className="text-base font-extrabold text-slate-900">
                        {tender.estimated_value}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">EMD Requirement</span>
                      <p className="font-semibold text-slate-800">{tender.emd_amount}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Submission Deadline</span>
                      <p className="font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                        <ClockIcon className="size-3.5 text-emerald-600 shrink-0" />
                        {tender.closing_date}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 font-bold"
                      onClick={() => handleCheckDocuments(tender)}
                    >
                      <ShieldCheckIcon className="size-3.5 text-emerald-600" />
                      Check Required Documents
                    </Button>
                    <Link href="/bidder/bids">
                      <Button className="w-full bg-emerald-700 hover:bg-emerald-800 font-bold" size="sm">
                        <FileTextIcon className="size-3.5" />
                        Submit / View Bid
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TENDER REQUIRED DOCUMENTS CROSS-CHECK MODAL */}
      {/* ──────────────────────────────────────────────────────────── */}
      {checkModalTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <ShieldCheckIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Tender Document Readiness
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    {checkModalTender.tender_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckModalTender(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircleIcon className="size-5" />
              </button>
            </div>

            {checkingDocs ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCwIcon className="mx-auto size-6 animate-spin text-emerald-600 mb-2" />
                <p className="text-xs font-medium">
                  Cross-referencing tender requirements with your document library...
                </p>
              </div>
            ) : docCheckResult ? (
              <div className="mt-4 space-y-4 text-xs">
                {/* Readiness Score Bar */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800">
                      Document Readiness Score
                    </span>
                    <span className="font-extrabold text-sm text-emerald-700">
                      {docCheckResult.readiness_percentage}% ({docCheckResult.available_count}/{docCheckResult.total_required} Available)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${docCheckResult.readiness_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Available Documents Section */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <CheckCircleIcon className="size-4 text-emerald-600" />
                    Available in My Documents ({docCheckResult.matched_documents.length})
                  </h4>
                  <div className="space-y-1.5">
                    {docCheckResult.matched_documents.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{d.requirement}</p>
                          <p className="text-[11px] text-slate-500">
                            Attached: {d.document_name} • {d.source_display || d.source}
                          </p>
                        </div>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          ✓ Ready
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Documents Section */}
                {docCheckResult.missing_documents.length > 0 && (
                  <div>
                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                      <AlertTriangleIcon className="size-4 text-amber-600" />
                      Missing / Pending Documents ({docCheckResult.missing_documents.length})
                    </h4>
                    <div className="space-y-1.5">
                      {docCheckResult.missing_documents.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/60 p-2.5"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{d.requirement}</p>
                            <p className="text-[11px] text-slate-600">{d.description}</p>
                          </div>
                          <Link href="/bidder/documents">
                            <Button
                              size="sm"
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] py-1 px-2.5 font-bold"
                            >
                              <UploadCloudIcon className="size-3" />
                              Upload
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Action Footer */}
                <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
                  <Link href="/bidder/documents">
                    <Button variant="outline" size="sm">
                      <UploadCloudIcon className="size-3.5" />
                      Manage My Documents
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                    onClick={() => setCheckModalTender(null)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
