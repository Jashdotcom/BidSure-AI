"use client";

import React, { useState, useEffect } from "react";
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
  FileTextIcon,
  UsersIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  ScaleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  EyeIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

interface OfficerDashboardStats {
  active_tenders: number;
  total_bids: number;
  under_verification: number;
  compliant_bids: number;
  requires_review: number;
}

const DASHBOARD_STATS: OfficerDashboardStats = {
  active_tenders: 2,
  total_bids: 3,
  under_verification: 1,
  compliant_bids: 1,
  requires_review: 1,
};

const RECENT_TENDERS = [
  {
    id: "TND-2024-001",
    ref: "CPCL/PROC/SAFETY/2024/09",
    title: "Supply and Maintenance of High-Grade Industrial Safety Equipment",
    category: "Industrial Safety & Fire Protection",
    estimated_value: "₹ 4,50,00,000",
    closing_date: "30-Aug-2024",
    bidders_count: 3,
    status: "Under Evaluation",
  },
  {
    id: "TND-2024-002",
    ref: "CPCL/MAINT/VALVES/2024/11",
    title: "Annual Rate Contract for Refinery High-Pressure Valve Overhauling",
    category: "Mechanical & Piping",
    estimated_value: "₹ 2,80,00,000",
    closing_date: "15-Sep-2024",
    bidders_count: 0,
    status: "Published",
  },
];

const RECENT_BIDS = [
  {
    id: "BID-001",
    name: "ABC Safety Solutions Pvt Ltd",
    tender_ref: "CPCL/PROC/SAFETY/2024/09",
    amount: "₹ 4,42,00,000",
    score: 100,
    risk: "LOW",
    status: "COMPLIANT",
    issues: "All 6 statutory & technical criteria verified.",
  },
  {
    id: "BID-003",
    name: "SafeGuard Equipments Pvt Ltd",
    tender_ref: "CPCL/PROC/SAFETY/2024/09",
    amount: "₹ 4,29,00,000",
    score: 83.3,
    risk: "MEDIUM",
    status: "REVIEW_REQUIRED",
    issues: "Secondary OEM letter & 35% local content.",
  },
  {
    id: "BID-002",
    name: "SecureTech Industries Ltd",
    tender_ref: "CPCL/PROC/SAFETY/2024/09",
    amount: "₹ 4,68,00,000",
    score: 66.7,
    risk: "HIGH",
    status: "NON_COMPLIANT",
    issues: "Turnover (₹2.2 Cr) & Experience deficits.",
  },
];

const VERIFICATION_ACTIVITY = [
  {
    id: "ACT-001",
    title: "GSTN Registration Verified",
    target: "ABC Safety Solutions (33AABCA1234F1Z5)",
    time: "10 mins ago",
    status: "AUTHENTICATED",
  },
  {
    id: "ACT-002",
    title: "OCR Clause Extraction Completed",
    target: "Honeywell_Direct_OEM_MAF_2024.pdf",
    time: "25 mins ago",
    status: "AUTHENTICATED",
  },
  {
    id: "ACT-003",
    title: "Make In India Content Verification",
    target: "SafeGuard Equipments (35.0% Class-II)",
    time: "40 mins ago",
    status: "REQUIRES REVIEW",
  },
  {
    id: "ACT-004",
    title: "Audited Balance Sheet OCR Parsing",
    target: "SecureTech_Financial_Statement_FY24.pdf",
    time: "1 hour ago",
    status: "INVALID",
  },
  {
    id: "ACT-005",
    title: "Central Debarment Registry Check",
    target: "All 3 Bidders Cleared (CVC / GeM)",
    time: "2 hours ago",
    status: "AUTHENTICATED",
  },
];

export default function OfficerDashboardPage() {
  const [stats, setStats] = useState<OfficerDashboardStats>(DASHBOARD_STATS);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await apiRequest<any>("/dashboard/stats");
        if (res?.active_tenders) {
          setStats({
            active_tenders: res.active_tenders,
            total_bids: res.total_bidders || 3,
            under_verification: 1,
            compliant_bids: 1,
            requires_review: res.pending_reviews || 1,
          });
        }
      } catch {
        // Fallback
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              CPCL Evaluation Portal
            </span>
            <span className="text-xs text-slate-500">· Manali Refinery NCB</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Procurement Officer Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Real-time statutory compliance, deterministic evaluation matrix, and bid verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/compliance">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <ShieldCheckIcon className="size-3.5" />
              Verify Bids
            </Button>
          </Link>
          <Link href="/comparison">
            <Button size="sm" variant="outline">
              <ScaleIcon className="size-3.5" />
              Compare Bidders
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* Active Tenders */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Tenders
            </span>
            <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 border border-blue-100">
              <FileTextIcon className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {stats.active_tenders}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">CPCL Live Tenders</p>
        </Card>

        {/* Total Bids */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Bids
            </span>
            <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 border border-indigo-100">
              <UsersIcon className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {stats.total_bids}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">Submitted Packages</p>
        </Card>

        {/* Under Verification */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Under Verification
            </span>
            <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700 border border-slate-200">
              <ClockIcon className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {stats.under_verification}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">OCR & Rule Parsing</p>
        </Card>

        {/* Compliant Bids */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Compliant Bids
            </span>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 border border-emerald-100">
              <CheckCircleIcon className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">
            {stats.compliant_bids}
          </p>
          <p className="mt-0.5 text-[10px] text-emerald-600 font-medium">100% Eligible</p>
        </Card>

        {/* Requires Review */}
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Requires Review
            </span>
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 border border-amber-100">
              <AlertTriangleIcon className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">
            {stats.requires_review}
          </p>
          <p className="mt-0.5 text-[10px] text-amber-700 font-medium">Officer Action</p>
        </Card>
      </div>

      {/* Main Grid: Recent Tenders & Recent Bids */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Recent Tenders & Recent Bids */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Tenders Section */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4 text-blue-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Recent Tenders
                </h2>
              </div>
              <Link
                href="/tenders"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRightIcon className="size-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {RECENT_TENDERS.map((tender) => (
                <div
                  key={tender.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-800 border border-blue-200/60">
                        {tender.ref}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {tender.category}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {tender.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Value: <strong>{tender.estimated_value}</strong></span>
                      <span>·</span>
                      <span>Closing: <strong>{tender.closing_date}</strong></span>
                      <span>·</span>
                      <span>Bidders: <strong className="text-blue-700">{tender.bidders_count} Submitted</strong></span>
                    </div>
                  </div>

                  <Link href="/tenders">
                    <Button size="sm" variant="outline" className="text-xs whitespace-nowrap">
                      Inspect RFP
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Bids Section */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4 text-blue-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Recent Bids & Evaluations
                </h2>
              </div>
              <Link
                href="/bidders"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRightIcon className="size-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Bidder Entity</th>
                    <th className="px-4 py-2.5">Bid Value</th>
                    <th className="px-4 py-2.5">Score</th>
                    <th className="px-4 py-2.5">Risk</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {RECENT_BIDS.map((bid) => (
                    <tr key={bid.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{bid.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{bid.id} · {bid.tender_ref}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{bid.amount}</td>
                      <td className="px-4 py-3">
                        <ScoreDisplay score={bid.score} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge risk={bid.risk} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/compliance?bidder=${bid.id}`}>
                          <Button size="sm" variant="outline" className="px-2.5 py-1 text-xs">
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Verification Activity */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-blue-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Verification Activity
                </h2>
              </div>
              <Link
                href="/audit"
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Full Trail
              </Link>
            </div>

            <div className="divide-y divide-slate-100 p-2">
              {VERIFICATION_ACTIVITY.map((act) => (
                <div key={act.id} className="p-3 space-y-1.5 hover:bg-slate-50/60 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      {act.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {act.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate" title={act.target}>
                    {act.target}
                  </p>
                  <div className="pt-0.5">
                    <DocumentStatusBadge status={act.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Guidance Box */}
          <Card className="p-4 border-blue-200 bg-blue-50/50">
            <div className="flex items-start gap-2.5">
              <ShieldCheckIcon className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-900">
                  Deterministic Audit Guarantee
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-blue-800">
                  All compliance verdicts are strictly computed by deterministic rules. AI models are used only for text extraction and document OCR parsing.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
