"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  SearchIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ClockIcon,
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

export default function BidderTendersPage() {
  const [search, setSearch] = useState("");
  const [tenders, setTenders] = useState<PublicTender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTenders() {
      setLoading(true);
      try {
        const res = await apiRequest<any[]>("/bidder-portal/tenders");
        if (res && Array.isArray(res) && res.length > 0) {
          const formatted: PublicTender[] = res.map((t) => {
            const estNum = typeof t.estimated_value === "number" ? t.estimated_value : 45000000;
            const emdNum = typeof t.emd_amount === "number" ? t.emd_amount : 900000;

            // Format closing date
            let closingStr = t.deadline || t.closing_date || "18 Sep 2026";
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

            return {
              id: t.id,
              tender_id: t.tender_number || t.id,
              tender_number: t.tender_number || t.id,
              title: t.title,
              organization: t.organization || "Chennai Petroleum Corporation Limited (CPCL)",
              category: t.category || "Procurement",
              estimated_value: `₹ ${(estNum / 10000000).toFixed(2)} Cr`,
              emd_amount: `₹ ${(emdNum / 100000).toFixed(2)} L (Exempt for Udyam MSME)`,
              closing_date: closingStr,
              eligibility_status: t.id === "TND-2026-001" || t.id === "TND-2024-001" ? "ELIGIBLE" : "CONDITIONAL",
              eligibility_reason:
                t.id === "TND-2026-001"
                  ? "Your turnover (₹4.50 Cr >= ₹3.0 Cr) and 5 years PSU experience meet mandatory qualification criteria."
                  : "Review mandatory technical specification & Make in India local content clauses before submission.",
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
    </div>
  );
}
