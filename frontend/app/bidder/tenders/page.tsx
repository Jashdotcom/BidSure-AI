"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  SearchIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/icons";

interface PublicTender {
  id: string;
  tender_id: string;
  title: string;
  organization: string;
  category: string;
  estimated_value: string;
  emd_amount: string;
  closing_date: string;
  eligibility_status: "ELIGIBLE" | "CONDITIONAL" | "INELIGIBLE";
  eligibility_reason: string;
}

const PUBLIC_TENDERS: PublicTender[] = [
  {
    id: "TND-2024-001",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    title: "Supply and Maintenance of High-Grade Industrial Safety Equipment",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    category: "Industrial Safety & Fire Protection",
    estimated_value: "₹ 4,50,00,000",
    emd_amount: "₹ 9,00,000 (Exempt for Udyam MSME)",
    closing_date: "30-Aug-2024 15:00 IST",
    eligibility_status: "ELIGIBLE",
    eligibility_reason: "Your turnover (₹4.50 Cr >= ₹3.0 Cr) and 5 years PSU experience meet mandatory qualification criteria.",
  },
  {
    id: "TND-2024-002",
    tender_id: "CPCL/MAINT/VALVES/2024/11",
    title: "Annual Rate Contract for Refinery High-Pressure Valve Overhauling",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    category: "Mechanical & Piping Maintenance",
    estimated_value: "₹ 2,80,00,000",
    emd_amount: "₹ 5,60,000",
    closing_date: "15-Sep-2024 14:00 IST",
    eligibility_status: "CONDITIONAL",
    eligibility_reason: "Requires OEM authorization from L&T Valves or BHEL. Please check technical qualification section.",
  },
];

export default function BidderTendersPage() {
  const [search, setSearch] = useState("");

  const filtered = PUBLIC_TENDERS.filter(
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
            Review live tenders and automated eligibility pre-evaluations based on your profile credentials.
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
              <div className="flex flex-col justify-between border-t pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-6 min-w-[220px]">
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
                    <span className="text-slate-400">Bid Closing Date</span>
                    <p className="font-semibold text-slate-800">{tender.closing_date}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <Link href="/bidder/bids">
                    <Button className="w-full bg-emerald-700 hover:bg-emerald-800" size="sm">
                      <FileTextIcon className="size-3.5" />
                      View My Bid Submission
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
