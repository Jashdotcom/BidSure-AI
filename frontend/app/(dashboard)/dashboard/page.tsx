"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  Button,
  StatusBadge,
  TenderStatusBadge,
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
  PlusIcon,
  TrendingUpIcon,
  SparklesIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "@/components/icons";
import { EvidenceModal } from "@/components/evidence-modal";
import { apiRequest } from "@/lib/api";
import { getUser } from "@/lib/session";
import { User, EvidenceItem } from "@/lib/types";

interface OfficerDashboardStats {
  active_tenders: number;
  total_bids: number;
  under_verification: number;
  pending_review: number;
  compliant_bids: number;
  high_risk: number;
}

const DEFAULT_DASHBOARD_STATS: OfficerDashboardStats = {
  active_tenders: 12,
  total_bids: 48,
  under_verification: 8,
  pending_review: 5,
  compliant_bids: 29,
  high_risk: 4,
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

const ACTIVE_TENDERS_DATA: ActiveTenderItem[] = [
  {
    id: "TND-2026-001",
    ref: "CPCL/PROC/2026/001",
    title: "Industrial Safety Helmets & Impact Visors",
    category: "Industrial PPE",
    deadline: "18 Sep 2026",
    bids_count: 3,
    verified_count: 2,
    status: "PUBLISHED",
  },
  {
    id: "TND-2026-002",
    ref: "CPCL/PROC/2026/002",
    title: "Industrial Protective Equipment & Harness Kits",
    category: "Safety & Fall Protection",
    deadline: "22 Sep 2026",
    bids_count: 5,
    verified_count: 3,
    status: "PUBLISHED",
  },
  {
    id: "TND-2026-003",
    ref: "CPCL/PROC/2026/003",
    title: "Fire Safety Equipment & Hydrant Valves",
    category: "Fire & Safety Systems",
    deadline: "25 Sep 2026",
    bids_count: 2,
    verified_count: 1,
    status: "REQUIREMENTS_REVIEW",
  },
  {
    id: "TND-2026-004",
    ref: "CPCL/PROC/2026/004",
    title: "High-Pressure Refinery Valve Assemblies",
    category: "Piping & Instrumentation",
    deadline: "02 Oct 2026",
    bids_count: 4,
    verified_count: 4,
    status: "PUBLISHED",
  },
  {
    id: "TND-2026-005",
    ref: "CPCL/PROC/2026/005",
    title: "Hazardous Gas Detection Sensors (Fixed & Portable)",
    category: "Environmental Monitoring",
    deadline: "12 Oct 2026",
    bids_count: 0,
    verified_count: 0,
    status: "PUBLISHED",
  },
];

interface VerificationQueueItem {
  id: string;
  bidder_name: string;
  document_name: string;
  document_type: string;
  status: "REVIEW REQUIRED" | "VERIFIED" | "FAILED" | "UNDER REVIEW";
  risk: "LOW" | "MEDIUM" | "HIGH";
  tender_ref: string;
  evidence: EvidenceItem;
}

const VERIFICATION_QUEUE_DATA: VerificationQueueItem[] = [
  {
    id: "VQ-001",
    bidder_name: "ABC Safety Solutions Pvt Ltd",
    document_name: "Experience Certificate & Past PSU Orders",
    document_type: "Experience Credentials",
    status: "REVIEW REQUIRED",
    risk: "LOW",
    tender_ref: "CPCL/PROC/2026/001",
    evidence: {
      requirement_id: "REQ-EXP-01",
      requirement_code: "EXP",
      requirement_name: "Experience Certificate Scrutiny",
      clause_reference: "Section III, Clause 4.2",
      category: "Technical",
      mandatory: true,
      required_value: ">= 3 Years PSU Experience",
      bidder_value: "5 Years Verified (4 POs)",
      status: "REVIEW_REQUIRED",
      rule_evaluated: "5 >= 3 Years experience claim requires officer signature endorsement",
      evidence_source: "ABC_Past_Supply_Orders_CPCL_IOCL.pdf",
      page_number: 1,
      highlight_text: "Executed 4 industrial safety supply orders with CPCL, IOCL, and ONGC with total turnover exceeding benchmark.",
      explanation: "Experience fulfills threshold requirements. Officer review is requested to confirm certificate seal authenticity.",
      confidence: 0.98,
      weight: 20,
    },
  },
  {
    id: "VQ-002",
    bidder_name: "SecureTech Industries Ltd",
    document_name: "OEM Authorization (Honeywell / Karam)",
    document_type: "OEM Authorization",
    status: "VERIFIED",
    risk: "HIGH",
    tender_ref: "CPCL/PROC/2026/001",
    evidence: {
      requirement_id: "REQ-OEM-01",
      requirement_code: "OEM",
      requirement_name: "Direct Manufacturer Authorization",
      clause_reference: "Section III, Clause 4.5",
      category: "Technical",
      mandatory: true,
      required_value: "Direct OEM Authorization",
      bidder_value: "Tier 1 Direct MAF",
      status: "PASS",
      rule_evaluated: "Direct OEM authorization letter verified on principal OEM letterhead",
      evidence_source: "Honeywell_Direct_OEM_MAF_2024.pdf",
      page_number: 2,
      highlight_text: "Direct Manufacturer Authorization: Valid channel partner authorization for CPCL refinery safety bids.",
      explanation: "Direct OEM authorization successfully authenticated via digital letterhead verification.",
      confidence: 0.97,
      weight: 15,
    },
  },
  {
    id: "VQ-003",
    bidder_name: "SafeGuard Equipments Pvt Ltd",
    document_name: "Local Content Declaration (Make in India)",
    document_type: "MII Declaration",
    status: "FAILED",
    risk: "MEDIUM",
    tender_ref: "CPCL/PROC/2026/001",
    evidence: {
      requirement_id: "REQ-MII-01",
      requirement_code: "LOCAL_CONTENT",
      requirement_name: "Minimum Local Content (Class-I)",
      clause_reference: "Section IV, Clause 5.1",
      category: "Eligibility",
      mandatory: true,
      required_value: ">= 50% (Class-I Local Supplier)",
      bidder_value: "35.0% (Class-II Supplier)",
      status: "FAIL",
      rule_evaluated: "35.0% < 50.0% mandatory Class-I threshold under Public Procurement Order",
      evidence_source: "SafeGuard_MakeInIndia_SelfDeclaration.pdf",
      page_number: 1,
      highlight_text: "Self-declaration: Local content is computed at 35.0% based on imported raw material components.",
      explanation: "Bidder declared only 35.0% domestic value addition, failing the mandatory 50.0% Class-I requirement.",
      confidence: 0.95,
      weight: 15,
    },
  },
  {
    id: "VQ-004",
    bidder_name: "Chennai Valves & Fittings Corp",
    document_name: "Audited Balance Sheet & Annual Turnover",
    document_type: "Financial Turnover",
    status: "UNDER REVIEW",
    risk: "MEDIUM",
    tender_ref: "CPCL/PROC/2026/004",
    evidence: {
      requirement_id: "REQ-FIN-01",
      requirement_code: "TURNOVER",
      requirement_name: "Annual Average Turnover",
      clause_reference: "Section II, Clause 3.1",
      category: "Financial",
      mandatory: true,
      required_value: ">= ₹3.00 Cr",
      bidder_value: "₹3.20 Cr (Pending CA UDIN Verification)",
      status: "REVIEW_REQUIRED",
      rule_evaluated: "₹3.20 Cr >= ₹3.00 Cr requirement. UDIN verification in progress.",
      evidence_source: "Chennai_Valves_Audited_FY24.pdf",
      page_number: 3,
      highlight_text: "Average turnover over past 3 financial years certified as ₹3,20,45,000.",
      explanation: "Turnover satisfies numerical threshold. CA certificate UDIN validation awaiting ICAI API response.",
      confidence: 0.96,
      weight: 20,
    },
  },
];

const RECENT_ACTIVITY_DATA = [
  {
    id: "ACT-01",
    action: "ABC Safety Solutions submitted a bid",
    time: "2 minutes ago",
    type: "submission",
    meta: "Tender CPCL/PROC/2026/001 · 6 Annexures",
  },
  {
    id: "ACT-02",
    action: "SecureTech Industries uploaded OEM Authorization",
    time: "18 minutes ago",
    type: "upload",
    meta: "Honeywell_Direct_OEM_MAF_2024.pdf",
  },
  {
    id: "ACT-03",
    action: "Tender CPCL/PROC/2026/001 was published",
    time: "1 hour ago",
    type: "publish",
    meta: "Est. Value: ₹ 4,50,00,000 · NCB Tender",
  },
  {
    id: "ACT-04",
    action: "Experience Certificate verification flagged review",
    time: "2 hours ago",
    type: "flag",
    meta: "ABC Safety Solutions · Section III, Clause 4.2",
  },
  {
    id: "ACT-05",
    action: "Central Debarment Registry checked across 3 vendors",
    time: "3 hours ago",
    type: "security",
    meta: "CVC & GeM Debarred Registry: All Cleared",
  },
];

export default function OfficerDashboardPage() {
  const [stats, setStats] = useState<OfficerDashboardStats>(DEFAULT_DASHBOARD_STATS);
  const [user, setUser] = useState<User | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedBidderName, setSelectedBidderName] = useState("");

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
    fetchStats();
  }, []);

  function handleOpenEvidence(item: VerificationQueueItem) {
    setSelectedEvidence(item.evidence);
    setSelectedBidderName(item.bidder_name);
    setIsEvidenceModalOpen(true);
  }

  const officerName = user?.name || "Procurement Officer";

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

  // Helper for verification queue status
  const renderQueueStatus = (status: VerificationQueueItem["status"]) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            <CheckCircleIcon className="size-3 text-emerald-600" />
            VERIFIED
          </span>
        );
      case "REVIEW REQUIRED":
      case "UNDER REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
            <AlertTriangleIcon className="size-3 text-amber-600" />
            REVIEW REQUIRED
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
            <XCircleIcon className="size-3 text-red-600" />
            FAILED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Evidence Inspection Modal */}
      <EvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        evidence={selectedEvidence}
        bidderName={selectedBidderName}
      />

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
            Good morning, {officerName}
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
        <Card className="p-4 border-slate-200 hover:border-slate-300 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Tenders
            </span>
            <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700 border border-blue-100">
              <FileTextIcon className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 leading-none">
            {stats.active_tenders}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-blue-700">
            <TrendingUpIcon className="size-3 text-blue-600" />
            <span>+2 this month</span>
          </div>
        </Card>

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
            Across 12 RFPs
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
              {ACTIVE_TENDERS_DATA.map((tender) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 4. TWO-COLUMN SPLIT: VERIFICATION QUEUE & (ACTIVITY + COMPLIANCE)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Verification Queue */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-slate-200 shadow-xs">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 text-blue-700" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Verification Queue
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Documents and bid criteria requiring officer scrutiny and evidence validation.
                </p>
              </div>

              <Link
                href="/compliance"
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                View Compliance <ArrowRightIcon className="size-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Bidder</th>
                    <th className="px-4 py-3">Document / Requirement</th>
                    <th className="px-4 py-3">Verification Status</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {VERIFICATION_QUEUE_DATA.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Bidder */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 leading-tight">
                          {item.bidder_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.tender_ref}
                        </p>
                      </td>

                      {/* Document */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <FileTextIcon className="size-3.5 text-blue-600 shrink-0" />
                          <div>
                            <p className="font-medium text-slate-800 leading-snug">
                              {item.document_name}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {item.document_type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {renderQueueStatus(item.status)}
                      </td>

                      {/* Risk */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <RiskBadge risk={item.risk} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEvidence(item)}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200/80 inline-flex items-center gap-1"
                          >
                            <EyeIcon className="size-3" />
                            View Evidence
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column (1 col): Compliance Overview & Recent Activity */}
        <div className="space-y-6">
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
                  29
                </span>
              </div>

              <div className="rounded-xl bg-red-50 p-2.5 border border-red-200/80">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-red-700">
                  FAIL
                </span>
                <span className="text-xl font-extrabold text-red-800 leading-tight">
                  8
                </span>
              </div>

              <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200/80">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  REVIEW
                </span>
                <span className="text-xl font-extrabold text-amber-800 leading-tight">
                  11
                </span>
              </div>
            </div>

            {/* Segmented Distribution Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Overall Evaluation Health</span>
                <span className="font-bold text-slate-800">48 Total Evaluated</span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  style={{ width: "60.4%" }}
                  className="bg-emerald-500 transition-all"
                  title="Compliant (60.4%)"
                />
                <div
                  style={{ width: "16.7%" }}
                  className="bg-red-500 transition-all"
                  title="Non-Compliant (16.7%)"
                />
                <div
                  style={{ width: "22.9%" }}
                  className="bg-amber-400 transition-all"
                  title="Requires Review (22.9%)"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                <span className="text-emerald-700 font-semibold">60% Compliant</span>
                <span className="text-amber-700 font-semibold">23% Review</span>
                <span className="text-red-700 font-semibold">17% Non-Compliant</span>
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
                href="/audit"
                className="text-[11px] font-bold text-blue-700 hover:underline"
              >
                Audit Trail
              </Link>
            </div>

            <div className="divide-y divide-slate-100 p-2">
              {RECENT_ACTIVITY_DATA.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-lg hover:bg-slate-50/80 transition-colors space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 leading-snug">
                      {act.action}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                      {act.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {act.meta}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
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
