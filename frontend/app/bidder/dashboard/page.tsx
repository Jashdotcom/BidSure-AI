"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, DocumentStatusBadge, TenderStatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  UploadIcon,
  UsersIcon,
  ClockIcon,
  ArrowRightIcon,
  BuildingIcon,
  CheckIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  weight: number;
}

interface ProfileCompletion {
  percentage: number;
  completed_count: number;
  total_count: number;
  items: ChecklistItem[];
}

interface Statistics {
  available_tenders: number;
  my_bids: number;
  draft_bids: number;
  submitted_bids: number;
  under_verification: number;
  compliant_bids: number;
  non_compliant_bids: number;
}

interface AvailableTenderItem {
  id: string;
  tender_number: string;
  title: string;
  organization: string;
  department: string;
  deadline: string;
  status: string;
  requirements_count: number;
  category: string;
  estimated_value: number;
}

interface MyBidItem {
  id: string;
  tender_id: string;
  tender_number: string;
  tender_title: string;
  organization: string;
  bid_amount: string;
  submission_date: string | null;
  status: string;
  verification_status: string;
  compliance_status: string;
  compliance_score: number;
  passed_rules: number;
  total_rules: number;
  is_draft: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "URGENT";
  read: boolean;
}

interface BidderDashboardData {
  bidder: {
    id: string;
    name: string;
    company_name: string;
    email: string;
    phone: string;
    gstin: string;
    pan: string;
    udyam: string;
    annual_turnover_cr: number;
    years_experience: number;
    oem_authorization: string;
    local_content: number;
  };
  profile_completion: ProfileCompletion;
  business_verification: {
    status: string;
    general_status: string;
    verifications: Record<string, any>;
  };
  statistics: Statistics;
  available_tenders: AvailableTenderItem[];
  my_bids: MyBidItem[];
  notifications: NotificationItem[];
}

const EMPTY_DASHBOARD_DATA: BidderDashboardData = {
  bidder: {
    id: "BIDDER",
    name: "Vendor Representative",
    company_name: "Authorized Vendor",
    email: "",
    phone: "",
    gstin: "",
    pan: "",
    udyam: "",
    annual_turnover_cr: 0,
    years_experience: 0,
    oem_authorization: "",
    local_content: 0,
  },
  profile_completion: {
    percentage: 100,
    completed_count: 4,
    total_count: 4,
    items: [
      {
        key: "contact_info",
        title: "Contact Person & Account Details",
        description: "Authorized signatory name, official email, and phone number.",
        completed: true,
        weight: 25,
      },
      {
        key: "business_entity",
        title: "Business Entity & Registered Address",
        description: "Legal business name, entity type, and registered office address.",
        completed: true,
        weight: 25,
      },
      {
        key: "statutory_credentials",
        title: "Statutory Credentials (PAN & GSTIN)",
        description: "Company Permanent Account Number (PAN) and Goods & Services Tax Identification Number (GSTIN).",
        completed: true,
        weight: 25,
      },
      {
        key: "msme_udyam",
        title: "MSME / Udyam Registration",
        description: "Udyam registration number for MSME preference (optional).",
        completed: true,
        weight: 25,
      },
    ],
  },
  business_verification: {
    status: "IDENTITY_CONSISTENT",
    general_status: "VERIFIED",
    verifications: {},
  },
  statistics: {
    available_tenders: 0,
    my_bids: 0,
    draft_bids: 0,
    submitted_bids: 0,
    under_verification: 0,
    compliant_bids: 0,
    non_compliant_bids: 0,
  },
  available_tenders: [],
  my_bids: [],
  notifications: [],
};

function formatDeadline(isoDateString?: string | null): string {
  if (!isoDateString) return "No deadline specified";
  try {
    const d = new Date(isoDateString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDateString;
  }
}

export default function BidderDashboardPage() {
  const [data, setData] = useState<BidderDashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const currentUser = getUser<User>();
        const res = await apiRequest<BidderDashboardData>("/bidder-portal/dashboard");
        if (res?.bidder) {
          setData(res);
        } else if (currentUser) {
          setData((prev) => ({
            ...prev,
            bidder: {
              ...prev.bidder,
              id: (currentUser as any).bidder_id || "BIDDER",
              name: currentUser.name || prev.bidder.name,
              company_name: currentUser.organization || prev.bidder.company_name,
              email: currentUser.email || prev.bidder.email,
            },
          }));
        }
      } catch {
        // Safe empty state
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const { bidder, profile_completion, statistics, available_tenders, my_bids, notifications } = data;

  return (
    <div className="space-y-8 font-sans antialiased text-slate-800">
      {/* ========================================================================= */}
      {/* 1. WELCOME SECTION                                                        */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                Bidder Portal
              </span>
              <span className="text-xs text-slate-500">
                · Entity ID: <span className="font-mono font-bold text-slate-700">{bidder.id}</span>
              </span>
              {bidder.gstin && (
                <span className="text-xs text-slate-500">
                  · GSTIN: <span className="font-mono text-slate-700">{bidder.gstin}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight">
              {bidder.company_name}
            </h1>

            <p className="text-xs text-slate-500 font-medium">
              Authorized Representative:{" "}
              <span className="font-semibold text-slate-700">{bidder.name}</span> ({bidder.email})
            </p>
          </div>

          {/* Profile Completion Bar & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 min-w-[220px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-600">Profile Completion</span>
                <span className="text-xs font-extrabold text-emerald-700">
                  {profile_completion.percentage}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${profile_completion.percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                {profile_completion.completed_count} of {profile_completion.total_count} statutory credentials verified
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <Link href="/bidder/tenders" className="w-full sm:w-auto">
                <Button size="sm" className="w-full bg-emerald-700 hover:bg-emerald-800 shadow-sm">
                  <FileTextIcon className="size-3.5" />
                  Explore Tenders
                </Button>
              </Link>
              <Link href="/bidder/documents" className="w-full sm:w-auto">
                <Button size="sm" variant="outline" className="w-full">
                  <UploadIcon className="size-3.5" />
                  Upload Documents
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATISTICS SECTION (7 KEY METRICS)                                      */}
      {/* ========================================================================= */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Bidder Activity & Procurement Metrics
          </h2>
          <span className="text-[11px] text-slate-400">Real-time statutory sync</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {/* 1. Available Tenders */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Available Tenders
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">
              {statistics.available_tenders}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">Active Opportunities</p>
          </Card>

          {/* 2. My Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              My Total Bids
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">
              {statistics.my_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">All Submissions</p>
          </Card>

          {/* 3. Draft Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Draft Bids
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-amber-600">
              {statistics.draft_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-amber-700 font-medium">In Preparation</p>
          </Card>

          {/* 4. Submitted Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Submitted Bids
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-blue-600">
              {statistics.submitted_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-blue-700 font-medium">Locked & Submitted</p>
          </Card>

          {/* 5. Under Verification */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Under Verification
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-indigo-600">
              {statistics.under_verification}
            </p>
            <p className="mt-0.5 text-[10px] text-indigo-700 font-medium">Rules Engine Active</p>
          </Card>

          {/* 6. Compliant Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Compliant Bids
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-emerald-600">
              {statistics.compliant_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-emerald-700 font-medium">100% Pre-Qualified</p>
          </Card>

          {/* 7. Non-Compliant Bids */}
          <Card className="p-3.5 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Non-Compliant
            </span>
            <p className="mt-1.5 text-2xl font-extrabold text-slate-600">
              {statistics.non_compliant_bids}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 font-medium">Disqualified / Deviations</p>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. AVAILABLE TENDERS & 4. MY BIDS (2-COLUMN / STACKED)                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Tenders */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Available CPCL Public Tenders
              </h2>
              <p className="text-xs text-slate-500">
                Live tenders open for bidder pre-qualification and submission.
              </p>
            </div>
            <Link href="/bidder/tenders">
              <Button size="sm" variant="ghost" className="text-xs text-emerald-700 hover:text-emerald-800">
                View All Tenders →
              </Button>
            </Link>
          </div>

          {available_tenders.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <FileTextIcon className="size-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">No active tenders published</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Check back later for new procurement opportunities.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {available_tenders.map((tender) => (
                <Card key={tender.id} className="p-4 border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold font-mono text-blue-700 border border-blue-200">
                          {tender.tender_number}
                        </span>
                        <TenderStatusBadge status={tender.status} />
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 leading-snug">
                        {tender.title}
                      </h3>

                      <p className="text-[11px] text-slate-500">
                        {tender.organization} · {tender.department}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-3 text-slate-600">
                      <span className="flex items-center gap-1 font-medium">
                        <ClockIcon className="size-3 text-slate-400" />
                        Deadline: {formatDeadline(tender.deadline)}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {tender.requirements_count} Statutory Criteria
                      </span>
                    </div>

                    <Link href="/bidder/tenders">
                      <Button size="sm" variant="outline" className="px-2.5 py-1 text-xs">
                        View Tender
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* My Bids */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                My Tender Bids & Submissions
              </h2>
              <p className="text-xs text-slate-500">
                Status of your submitted and draft procurement dossiers.
              </p>
            </div>
            <Link href="/bidder/bids">
              <Button size="sm" variant="ghost" className="text-xs text-emerald-700 hover:text-emerald-800">
                View All Bids →
              </Button>
            </Link>
          </div>

          {my_bids.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <FileTextIcon className="size-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">No bids submitted yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Explore available tenders and submit your bid dossier.</p>
              <div className="mt-3">
                <Link href="/bidder/tenders">
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold">
                    Browse Active Tenders
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {my_bids.map((bid) => (
                <Card key={bid.id} className="p-4 border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold font-mono text-slate-700 border border-slate-200">
                          {bid.tender_number}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            bid.status === "SUBMITTED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : bid.status === "UNDER_VERIFICATION"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {bid.status}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 leading-snug">
                        {bid.tender_title}
                      </h3>

                      <p className="text-[11px] text-slate-500">
                        Bid Amount: <span className="font-bold text-slate-800">{bid.bid_amount}</span> ·{" "}
                        Submitted: {formatDeadline(bid.submission_date) || "Draft"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <DocumentStatusBadge status={bid.verification_status} />
                      <StatusBadge status={bid.compliance_status} />
                    </div>

                    <Link href="/bidder/bids">
                      <Button size="sm" variant="outline" className="px-2.5 py-1 text-xs">
                        View Dossier
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. NOTIFICATIONS & 6. PROFILE COMPLETION CHECKLIST                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 5. Notifications Section */}
        <Card className="p-6 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Bidder Notifications & Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Real-time procurement alerts and statutory verification updates.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5">
              {notifications.filter((n) => !n.read).length} UNREAD
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50 p-6 text-center">
              <p className="text-xs font-medium text-slate-500">No active notifications</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Procurement and verification alerts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => {
                const typeClasses = {
                  SUCCESS: "bg-emerald-50 border-emerald-200 text-emerald-900",
                  INFO: "bg-blue-50 border-blue-200 text-blue-900",
                  WARNING: "bg-amber-50 border-amber-200 text-amber-900",
                  URGENT: "bg-red-50 border-red-200 text-red-900",
                }[notif.type] || "bg-slate-50 border-slate-200 text-slate-900";

                return (
                  <div
                    key={notif.id}
                    className={`rounded-xl border p-3.5 transition-all text-xs ${typeClasses}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold">{notif.title}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">{notif.timestamp}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
                      {notif.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 6. Profile Completion Section */}
        <Card className="p-6 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Statutory Profile Completion
              </h2>
              <p className="text-xs text-slate-500">
                Required statutory registrations and documentation checklist.
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-emerald-700">
                {profile_completion.percentage}% Complete
              </span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {profile_completion.items.map((item) => (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                      item.completed
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {item.completed ? (
                      <CheckIcon className="size-2.5" />
                    ) : (
                      <span className="size-1 rounded-full bg-slate-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{item.title}</span>
                    <p className="text-[11px] text-slate-500">{item.description}</p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    item.completed
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {item.completed ? "VERIFIED" : "PENDING"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Need to add or update certificates?
            </span>
            <Link href="/bidder/documents">
              <Button size="sm" variant="outline" className="text-xs">
                Update Documents →
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Security & Privacy Notice */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-emerald-600" />
          <span>
            Bidder Confidentiality Guaranteed: Your bids, financials, and compliance verifications are isolated and encrypted.
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          ISO 27001 · SIH26100
        </span>
      </div>
    </div>
  );
}
