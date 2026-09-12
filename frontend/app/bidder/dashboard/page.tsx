"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, RiskBadge, ScoreDisplay } from "@/components/ui";
import {
  FileTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DownloadIcon,
  UploadIcon,
  ScaleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

interface BidderPortalOverview {
  bidder_id: string;
  company_name: string;
  gstin: string;
  pan: string;
  udyam: string;
  active_bids_count: number;
  overall_compliance: number;
  statutory_status: string;
  recent_submission: {
    tender_id: string;
    tender_title: string;
    submitted_amount: string;
    status: string;
    compliance_score: number;
    passed_rules: number;
    total_rules: number;
  };
}

const FALLBACK_BIDDER_DATA: BidderPortalOverview = {
  bidder_id: "BID-001",
  company_name: "ABC Safety Solutions Pvt Ltd",
  gstin: "33AABCA1234F1Z5",
  pan: "AABCA1234F",
  udyam: "UDYAM-TN-02-0012345",
  active_bids_count: 1,
  overall_compliance: 100,
  statutory_status: "VERIFIED_ACTIVE",
  recent_submission: {
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    tender_title: "Supply and Maintenance of High-Grade Industrial Safety Equipment",
    submitted_amount: "₹ 4,42,00,000",
    status: "QUALIFIED_FOR_TECHNICAL_OPENING",
    compliance_score: 100,
    passed_rules: 6,
    total_rules: 6,
  },
};

export default function BidderDashboardPage() {
  const [data, setData] = useState<BidderPortalOverview>(FALLBACK_BIDDER_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPortalData() {
      try {
        const res = await apiRequest<any>("/bidder-portal/overview");
        if (res?.company_name) {
          setData(res);
        }
      } catch {
        // Fallback
      }
    }
    loadPortalData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Verified Bidder Portal
            </span>
            <span className="text-xs text-slate-500">· GSTN: {data.gstin}</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {data.company_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Bidder Self-Service Portal · Monitor active tenders, bid evaluations, and statutory certificates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/bidder/tenders">
            <Button className="bg-emerald-700 hover:bg-emerald-800 shadow-md">
              <FileTextIcon className="size-4" />
              Explore CPCL Tenders
            </Button>
          </Link>
          <Link href="/bidder/documents">
            <Button variant="outline">
              <UploadIcon className="size-4" />
              Upload Certificates
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Compliance Readiness */}
        <Card className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Readiness Score
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <ShieldCheckIcon className="size-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {data.overall_compliance}%
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            All 6 Core Criteria Verified
          </p>
        </Card>

        {/* Active Bids */}
        <Card className="p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Tender Bids
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <FileTextIcon className="size-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {data.active_bids_count}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            CPCL/PROC/SAFETY/2024/09
          </p>
        </Card>

        {/* Statutory Status */}
        <Card className="p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Statutory Status
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <CheckCircleIcon className="size-5" />
            </div>
          </div>
          <p className="mt-2 text-lg font-extrabold text-slate-900">
            Active & Clear
          </p>
          <p className="mt-1 text-xs text-indigo-700 font-medium">
            GSTN, PAN, EPFO & CVC Debarment
          </p>
        </Card>

        {/* MSME Udyam Exemption */}
        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              MSME Benefit
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <CheckCircleIcon className="size-5" />
            </div>
          </div>
          <p className="mt-2 text-lg font-extrabold text-slate-900">
            EMD Exemption
          </p>
          <p className="mt-1 text-xs text-amber-700 font-medium">
            Udyam Small Enterprise Validated
          </p>
        </Card>
      </div>

      {/* Active Submission Card */}
      <Card className="overflow-hidden border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
              {data.recent_submission.tender_id}
            </span>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {data.recent_submission.tender_title}
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-700/20">
            <CheckCircleIcon className="size-3.5" />
            {data.recent_submission.status}
          </span>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-xs font-semibold text-slate-500">Submitted Commercial Bid</span>
              <p className="mt-1 text-xl font-extrabold text-slate-900">
                {data.recent_submission.submitted_amount}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Excluding 18% GST</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-xs font-semibold text-slate-500">Rules Engine Evaluation</span>
              <p className="mt-1 text-xl font-extrabold text-emerald-700">
                {data.recent_submission.passed_rules} / {data.recent_submission.total_rules} Passed
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">100% Deterministic Compliance</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500">Evidence Citations</span>
                <p className="mt-1 text-xs text-slate-700">6 PDF documents verified & indexed with SHA-256 integrity.</p>
              </div>
              <Link href="/bidder/bids" className="mt-2 text-xs font-bold text-blue-600 hover:underline">
                View Submission Dossier →
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Statutory Credentials Quick View */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Statutory Registrations & Verification Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-slate-200 p-3 bg-white">
            <span className="text-slate-400 font-semibold block">GSTIN Registration</span>
            <span className="font-mono font-bold text-slate-900 block mt-0.5">{data.gstin}</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">✓ Active & Verified</span>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 bg-white">
            <span className="text-slate-400 font-semibold block">Permanent Account Number (PAN)</span>
            <span className="font-mono font-bold text-slate-900 block mt-0.5">{data.pan}</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">✓ Validated with ITD</span>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 bg-white">
            <span className="text-slate-400 font-semibold block">Udyam MSME Registration</span>
            <span className="font-mono font-bold text-slate-900 block mt-0.5">{data.udyam}</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">✓ Small Enterprise (EMD Exempt)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
