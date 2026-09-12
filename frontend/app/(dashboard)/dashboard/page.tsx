"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, RiskBadge } from "@/components/ui";
import {
  FileTextIcon,
  UsersIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  ScaleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

interface DashboardData {
  active_tenders: number;
  total_bidders: number;
  pending_reviews: number;
  high_risk_bids: number;
  recent_tender: {
    id: string;
    tender_id: string;
    title: string;
    organization: string;
    category: string;
    status: string;
    estimated_value: string;
    published_date: string;
    closing_date: string;
    bidders_count: number;
    requirements_count: number;
  };
}

const FALLBACK_DATA: DashboardData = {
  active_tenders: 2,
  total_bidders: 3,
  pending_reviews: 1,
  high_risk_bids: 1,
  recent_tender: {
    id: "TND-2024-001",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    title: "Supply and Maintenance of High-Grade Industrial Safety Equipment",
    organization: "Chennai Petroleum Corporation Limited (CPCL)",
    category: "Industrial Safety & Fire Protection",
    status: "Under Evaluation",
    estimated_value: "₹ 4,50,00,000",
    published_date: "01-Jul-2024",
    closing_date: "30-Aug-2024",
    bidders_count: 3,
    requirements_count: 6,
  },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await apiRequest<DashboardData>("/dashboard/stats");
        if (stats) setData(stats);
      } catch (err) {
        // Fallback data is preloaded
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            CPCL Procurement Evaluation Portal
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Procurement Officer Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time statutory, technical, and commercial bid compliance monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/compliance">
            <Button className="shadow-md bg-blue-700 hover:bg-blue-800">
              <ShieldCheckIcon className="size-4" />
              Verify Bids
            </Button>
          </Link>
          <Link href="/comparison">
            <Button variant="outline">
              <ScaleIcon className="size-4" />
              Compare Bidders
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Tenders */}
        <Card className="p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Tenders
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <FileTextIcon className="size-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {data.active_tenders}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            National Competitive Bidding (NCB)
          </p>
        </Card>

        {/* Total Bidders */}
        <Card className="p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Bidders Submitted
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <UsersIcon className="size-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {data.total_bidders}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            All documents OCR-parsed & verified
          </p>
        </Card>

        {/* Pending Reviews */}
        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Human Reviews
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <AlertTriangleIcon className="size-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {data.pending_reviews}
          </p>
          <p className="mt-1 text-xs text-amber-700 font-medium">
            Requires Officer Confirmation
          </p>
        </Card>

        {/* High Risk Bids */}
        <Card className="p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Non-Compliant Bids
            </span>
            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <AlertTriangleIcon className="size-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {data.high_risk_bids}
          </p>
          <p className="mt-1 text-xs text-red-600 font-medium">
            Mandatory Criteria Deficit
          </p>
        </Card>
      </div>

      {/* Recent Active Tender Card */}
      <Card className="overflow-hidden border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                {data.recent_tender.tender_id}
              </span>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {data.recent_tender.title}
              </h2>
              <p className="text-xs text-slate-500">
                {data.recent_tender.organization} · {data.recent_tender.category}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/20">
                <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                {data.recent_tender.status}
              </span>
              <Link href="/tenders">
                <Button variant="primary" size="sm" className="bg-blue-700 hover:bg-blue-800">
                  View Tender Details & Rules
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0 border-b border-slate-100 bg-white">
          <div className="p-4">
            <span className="text-xs font-semibold text-slate-400">Estimated Value</span>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{data.recent_tender.estimated_value}</p>
          </div>
          <div className="p-4">
            <span className="text-xs font-semibold text-slate-400">Published Date</span>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{data.recent_tender.published_date}</p>
          </div>
          <div className="p-4">
            <span className="text-xs font-semibold text-slate-400">Closing Date</span>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{data.recent_tender.closing_date}</p>
          </div>
          <div className="p-4">
            <span className="text-xs font-semibold text-slate-400">Tender Requirements</span>
            <p className="mt-0.5 text-sm font-bold text-blue-700">{data.recent_tender.requirements_count} Extracted Criteria</p>
          </div>
        </div>

        {/* 3 Bidders Quick Status Strip */}
        <div className="p-6 bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Bidders Submitted for this Tender
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bidder 1: ABC */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">ABC Safety Solutions Pvt Ltd</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Chennai, Tamil Nadu</p>
                </div>
                <RiskBadge risk="LOW" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
                <span className="text-slate-600">Score: <strong className="text-slate-900">100%</strong></span>
                <span className="text-emerald-700 font-semibold">Fully Compliant</span>
              </div>
            </div>

            {/* Bidder 2: SecureTech */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">SecureTech Industries Ltd</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Mumbai, Maharashtra</p>
                </div>
                <RiskBadge risk="HIGH" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
                <span className="text-slate-600">Score: <strong className="text-slate-900">66.7%</strong></span>
                <span className="text-red-600 font-semibold">Turnover & Experience Deficit</span>
              </div>
            </div>

            {/* Bidder 3: SafeGuard */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">SafeGuard Equipments Pvt Ltd</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Bengaluru, Karnataka</p>
                </div>
                <RiskBadge risk="MEDIUM" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
                <span className="text-slate-600">Score: <strong className="text-slate-900">83.3%</strong></span>
                <span className="text-amber-700 font-semibold">Secondary OEM / ECR Review</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
