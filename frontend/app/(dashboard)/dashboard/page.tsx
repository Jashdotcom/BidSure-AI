"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  Button,
  StatusBadge,
  TenderStatusBadge,
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
  PlusIcon,
  TrendingUpIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";

interface OfficerDashboardStats {
  active_tenders: number;
  total_bids: number;
  under_verification: number;
  pending_review: number;
  compliant_bids: number;
  high_risk: number;
}

const DEFAULT_DASHBOARD_STATS: OfficerDashboardStats = {
  active_tenders: 0,
  total_bids: 0,
  under_verification: 0,
  pending_review: 0,
  compliant_bids: 0,
  high_risk: 0,
};

interface ActiveTenderItem {
  id: string;
  ref: string;
  title: string;
  category: string;
  deadline: string;
  bids_count: number;
  verified_count: number;
  status: "DRAFT" | "ANALYZING" | "REQUIREMENTS_REVIEW" | "PUBLISHED" | "CLOSED" | string;
}

interface RecentBidActivityItem {
  id: string;
  type: string;
  bid_id: string;
  bid_submission_id?: string;
  tender_id: string;
  tender_number: string;
  tender_title: string;
  bidder_id: string;
  bidder_name: string;
  submitted_at: string;
  bid_amount?: string;
  status?: string;
  compliance_status?: string;
  compliance_score?: number;
  risk_level?: string;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Recently";
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0 || diffInSeconds < 60) {
    return "Just now";
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "Yesterday";
  }
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function OfficerDashboardPage() {
  const [stats, setStats] = useState<OfficerDashboardStats>(DEFAULT_DASHBOARD_STATS);
  const [user, setUser] = useState<User | null>(null);
  const [activeTenders, setActiveTenders] = useState<ActiveTenderItem[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentBidActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    const u = getUser<User>();
    if (u) setUser(u);

    async function fetchStats() {
      try {
        const res = await apiRequest<any>("/dashboard/stats");
        if (res?.active_tenders !== undefined) {
          setStats((prev) => ({
            ...prev,
            active_tenders: res.active_tenders ?? prev.active_tenders,
            total_bids: res.total_bids ?? res.total_bidders ?? prev.total_bids,
            under_verification: res.under_verification ?? prev.under_verification,
            pending_review: res.pending_review ?? res.pending_reviews ?? prev.pending_review,
            compliant_bids: res.compliant_bids ?? prev.compliant_bids,
            high_risk: res.high_risk ?? prev.high_risk,
          }));
        }
      } catch {
        // Retain standard default stats
      }
    }

    async function fetchActiveTenders() {
      setLoadingTenders(true);
      try {
        const res = await apiRequest<any[]>("/tenders?status=PUBLISHED");
        if (res && Array.isArray(res)) {
          const mapped = res.map((t) => ({
            id: t.id,
            ref: t.tender_number || t.ref || t.tender_id || t.id,
            title: t.title || "Untitled Tender",
            category: t.category || "General Procurement",
            deadline: t.deadline || t.closing_date || "Open",
            bids_count: t.bids_count ?? (Array.isArray(t.bidders) ? t.bidders.length : 0),
            verified_count: t.verified_count ?? 0,
            status: t.status || "PUBLISHED",
          }));
          setActiveTenders(mapped);
        }
      } catch {
        // Fallback or empty
      } finally {
        setLoadingTenders(false);
      }
    }

    async function fetchRecentActivities(isInitial = false) {
      if (isInitial) setLoadingActivities(true);
      try {
        const res = await apiRequest<RecentBidActivityItem[]>("/dashboard/recent-bid-activity?limit=10");
        if (res && Array.isArray(res)) {
          setRecentActivities(res);
        }
      } catch {
        if (isInitial) setRecentActivities([]);
      } finally {
        if (isInitial) setLoadingActivities(false);
      }
    }

    fetchStats();
    fetchActiveTenders();
    fetchRecentActivities(true);

    // Auto-refresh stats and recent activities every 12 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentActivities(false);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const officerName = user?.name || "Procurement Officer";

  // Dynamic calculations for compliance overview
  const passCount = stats.compliant_bids;
  const failCount = stats.high_risk;
  const reviewCount = stats.pending_review;
  const totalEvaluated = passCount + failCount + reviewCount;
  const passPct = totalEvaluated > 0 ? ((passCount / totalEvaluated) * 100).toFixed(0) : "0";
  const failPct = totalEvaluated > 0 ? ((failCount / totalEvaluated) * 100).toFixed(0) : "0";
  const reviewPct = totalEvaluated > 0 ? ((reviewCount / totalEvaluated) * 100).toFixed(0) : "0";
  const passWidth = totalEvaluated > 0 ? `${((passCount / totalEvaluated) * 100).toFixed(1)}%` : "0%";
  const failWidth = totalEvaluated > 0 ? `${((failCount / totalEvaluated) * 100).toFixed(1)}%` : "0%";
  const reviewWidth = totalEvaluated > 0 ? `${((reviewCount / totalEvaluated) * 100).toFixed(1)}%` : "0%";

  // Helper for status badge rendering in table
  const renderTenderStatus = (status: ActiveTenderItem["status"]) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            OPEN
          </span>
        );
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-200">
            <span className="size-1.5 rounded-full bg-blue-500" />
            PUBLISHED
          </span>
        );
      case "CLOSING SOON":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            CLOSING SOON
          </span>
        );
      case "UNDER REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-purple-700 border border-purple-200">
            <span className="size-1.5 rounded-full bg-purple-500" />
            UNDER REVIEW
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 border border-slate-200">
            <span className="size-1.5 rounded-full bg-slate-400" />
            CLOSED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. WELCOME SECTION & QUICK ACTIONS HEADER                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/80 uppercase tracking-wide">
              <ShieldCheckIcon className="size-3 text-blue-600" />
              Procurement Officer Portal
            </span>
            <span className="text-[11px] text-slate-400">·</span>
            <span className="text-[11px] font-medium text-slate-500">
              Automated Statutory Pre-Qualification
            </span>
          </div>

          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Good morning, Procurement Officer
          </h1>

          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            Here&apos;s an overview of your procurement activities and verification status.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/tenders/create">
            <Button
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-xs flex items-center gap-1.5"
            >
              <PlusIcon className="size-3.5" />
              Create Tender
            </Button>
          </Link>

          <Link href="/comparison">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ScaleIcon className="size-3.5 text-slate-500" />
              Compare Bids
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY CARDS (6 STATISTIC METRICS)                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {/* Active Tenders */}
        <Link href="/tenders" className="block group">
          <Card className="p-4 border-slate-200 group-hover:border-blue-300 group-hover:shadow-sm transition-all shadow-xs h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700 transition-colors">
                Active Tenders
              </span>
              <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700 border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <FileTextIcon className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 leading-none">
              {stats.active_tenders}
            </p>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-blue-700">
              <TrendingUpIcon className="size-3 text-blue-600" />
              <span>Live in system</span>
            </div>
          </Card>
        </Link>

        {/* Total Bids */}
        <Card className="p-4 border-slate-200 hover:border-slate-300 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Bids
            </span>
            <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700 border border-indigo-100">
              <UsersIcon className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 leading-none">
            {stats.total_bids}
          </p>
          <p className="mt-1.5 text-[10px] font-medium text-slate-500">
            Across {stats.active_tenders} active RFP{stats.active_tenders === 1 ? "" : "s"}
          </p>
        </Card>

        {/* Under Verification */}
        <Card className="p-4 border-slate-200 hover:border-slate-300 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Under Verification
            </span>
            <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700 border border-slate-200">
              <ClockIcon className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 leading-none">
            {stats.under_verification}
          </p>
          <p className="mt-1.5 text-[10px] font-medium text-slate-500">
            OCR & Rule Parsing
          </p>
        </Card>

        {/* Pending Review */}
        <Card className="p-4 border-slate-200 hover:border-slate-300 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Review
            </span>
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-700 border border-amber-100">
              <AlertTriangleIcon className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-700 leading-none">
            {stats.pending_review}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-700">
            <span>Officer Action</span>
          </div>
        </Card>

        {/* Compliant Bids */}
        <Card className="p-4 border-slate-200 hover:border-slate-300 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Compliant Bids
            </span>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 border border-emerald-100">
              <CheckCircleIcon className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700 leading-none">
            {stats.compliant_bids}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <span>100% Eligible</span>
          </div>
        </Card>

        {/* High Risk */}
        <Card className="p-4 border-slate-200 hover:border-slate-300 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              High Risk
            </span>
            <div className="rounded-lg bg-red-50 p-1.5 text-red-700 border border-red-100">
              <AlertTriangleIcon className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-red-700 leading-none">
            {stats.high_risk}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold text-red-600">
            Deficits flagged
          </p>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN SECTION: ACTIVE TENDERS TABLE                                     */}
      {/* ========================================================================= */}
      <Card className="overflow-hidden border-slate-200 shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <FileTextIcon className="size-4 text-blue-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Active Tenders
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Current live procurement packages undergoing statutory & technical evaluation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/tenders"
              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              View all tenders <ArrowRightIcon className="size-3" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="px-4 py-3">Tender ID</th>
                <th className="px-4 py-3">Tender Title</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Bids</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loadingTenders ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span className="font-medium text-xs">Loading active tenders...</span>
                    </div>
                  </td>
                </tr>
              ) : activeTenders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <p className="font-semibold text-xs text-slate-700">No active tenders found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Published tenders will appear here.</p>
                  </td>
                </tr>
              ) : (
                activeTenders.map((tender) => (
                  <tr
                    key={tender.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Tender ID */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50/80 px-2 py-1 rounded border border-blue-200/60 text-[11px]">
                        {tender.ref}
                      </span>
                    </td>

                    {/* Tender Title */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {tender.title}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Category: {tender.category}
                      </p>
                    </td>

                    {/* Deadline */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-700">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <ClockIcon className="size-3 text-slate-400" />
                        <span>{tender.deadline}</span>
                      </div>
                    </td>

                    {/* Bids */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-800">
                        {tender.bids_count} Bids
                      </span>
                    </td>

                    {/* Verification */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50/60 px-2 py-0.5 rounded border border-emerald-200/60">
                        <CheckCircleIcon className="size-3 text-emerald-600" />
                        {tender.verified_count} Verified
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <TenderStatusBadge status={tender.status} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Link href="/tenders">
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <EyeIcon className="size-3 text-slate-500" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 4. COMPLIANCE OVERVIEW & RECENT ACTIVITY                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compliance Overview */}
        <Card className="p-5 border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-blue-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Compliance Overview
              </h3>
            </div>
            <Link
              href="/compliance"
              className="text-[11px] font-bold text-blue-700 hover:underline"
            >
              Matrix
            </Link>
          </div>

          {/* Metric Chips */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-50 p-2.5 border border-emerald-200/80">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                PASS
              </span>
              <span className="text-xl font-extrabold text-emerald-800 leading-tight">
                {passCount}
              </span>
            </div>

            <div className="rounded-xl bg-red-50 p-2.5 border border-red-200/80">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-red-700">
                FAIL
              </span>
              <span className="text-xl font-extrabold text-red-800 leading-tight">
                {failCount}
              </span>
            </div>

            <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200/80">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                REVIEW
              </span>
              <span className="text-xl font-extrabold text-amber-800 leading-tight">
                {reviewCount}
              </span>
            </div>
          </div>

          {/* Segmented Distribution Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Overall Evaluation Health</span>
              <span className="font-bold text-slate-800">{totalEvaluated} Total Evaluated</span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: passWidth }}
                className="bg-emerald-500 transition-all"
                title={`Compliant (${passPct}%)`}
              />
              <div
                style={{ width: failWidth }}
                className="bg-red-500 transition-all"
                title={`Non-Compliant (${failPct}%)`}
              />
              <div
                style={{ width: reviewWidth }}
                className="bg-amber-400 transition-all"
                title={`Requires Review (${reviewPct}%)`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
              <span className="text-emerald-700 font-semibold">{passPct}% Compliant</span>
              <span className="text-amber-700 font-semibold">{reviewPct}% Review</span>
              <span className="text-red-700 font-semibold">{failPct}% Non-Compliant</span>
            </div>
          </div>
        </Card>

        {/* Recent Bid Activity Feed */}
        <Card className="overflow-hidden border-slate-200 shadow-xs">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockIcon className="size-4 text-blue-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Recent Bid Activity
              </h3>
            </div>
            <Link
              href="/bidders"
              className="text-[11px] font-bold text-blue-700 hover:underline"
            >
              View All
            </Link>
          </div>

          {loadingActivities ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
              <ClockIcon className="size-5 animate-spin text-blue-600 mb-1" />
              <p className="text-[11px] font-medium">Fetching recent bids...</p>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <ClockIcon className="size-5 mb-1 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No Recent Bid Activity</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Submitted bids will automatically appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 p-2">
              {recentActivities.map((act) => (
                <Link
                  key={act.id}
                  href={`/compliance?bidder=${encodeURIComponent(act.bidder_id || act.bid_id)}`}
                  className="block p-2.5 rounded-lg hover:bg-slate-50/80 transition-colors space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 leading-snug">
                      {act.bidder_name} submitted a bid
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                      {formatRelativeTime(act.submitted_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[200px]">
                      {act.tender_number} · {act.tender_title}
                    </span>
                    {act.bid_amount && act.bid_amount !== "N/A" && (
                      <span className="font-semibold text-slate-700 shrink-0 ml-2">
                        {act.bid_amount}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 5. STATUTORY GOVERNANCE & DECISION SUPPORT BANNER                         */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700 shrink-0">
            <ShieldCheckIcon className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950 flex items-center gap-2">
              <span>AI-Assisted Verification & Decision Support</span>
              <span className="rounded bg-blue-200/70 px-1.5 py-0.2 text-[9px] font-mono font-bold text-blue-900">
                GFR 144 / CVC GUIDELINES
              </span>
            </h4>
            <p className="mt-1 text-[11px] text-blue-900/80 leading-relaxed">
              Compliance assessment, OCR clause extraction, and risk indexing are computed through deterministic rule engines for institutional transparency. In strict adherence to statutory procurement guidelines, <strong>final procurement decisions and tender award authority remain exclusively with the authorized Procurement Officer</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
