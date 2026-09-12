"use client";

import React from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, ScoreDisplay } from "@/components/ui";
import {
  FileTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  DownloadIcon,
  EyeIcon,
} from "@/components/icons";

interface BidSubmissionItem {
  id: string;
  tender_id: string;
  tender_title: string;
  submission_ref: string;
  submitted_at: string;
  quoted_amount: string;
  compliance_score: number;
  status: "QUALIFIED" | "EVALUATION_IN_PROGRESS" | "DISQUALIFIED";
  documents_count: number;
  clauses_evaluated: {
    name: string;
    clause: string;
    status: "PASS" | "FAIL" | "REVIEW";
    detail: string;
  }[];
}

const MY_BIDS: BidSubmissionItem[] = [
  {
    id: "SUB-001",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    tender_title: "Supply and Maintenance of High-Grade Industrial Safety Equipment",
    submission_ref: "BID/2024/0912-A",
    submitted_at: "20-Aug-2024 14:30 IST",
    quoted_amount: "₹ 4,42,00,000",
    compliance_score: 100,
    status: "QUALIFIED",
    documents_count: 6,
    clauses_evaluated: [
      {
        name: "Average Annual Turnover",
        clause: "Clause 4.1.1",
        status: "PASS",
        detail: "Audited FY24 Turnover of ₹4.50 Cr exceeds ₹3.00 Cr threshold.",
      },
      {
        name: "PSU Experience Orders",
        clause: "Clause 4.2.3",
        status: "PASS",
        detail: "4 executed contracts with CPCL & IOCL verified (5 years active).",
      },
      {
        name: "OEM Authorization",
        clause: "Clause 5.1.0",
        status: "PASS",
        detail: "Tier 1 Direct Manufacturer Authorization verified on OEM letterhead.",
      },
      {
        name: "Make In India Local Content",
        clause: "Clause 6.3.2",
        status: "PASS",
        detail: "Class-I Local Supplier (65.0% local value addition certified).",
      },
      {
        name: "GSTIN Status",
        clause: "Clause 2.4.0",
        status: "PASS",
        detail: "Active 33AABCA1234F1Z5 with regular return filing.",
      },
      {
        name: "Debarment & Vigilance",
        clause: "Clause 7.1.1",
        status: "PASS",
        detail: "Zero adverse records on CVC and GeM debarment portals.",
      },
    ],
  },
];

export default function BidderBidsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Vendor Bid Submissions
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            My Submitted Tender Bids & Evaluations
          </h1>
          <p className="text-xs text-slate-500">
            Track evaluation status, rules engine clause verifications, and compliance dossiers.
          </p>
        </div>
      </div>

      {/* Bid Submissions List */}
      <div className="space-y-6">
        {MY_BIDS.map((bid) => (
          <Card key={bid.id} className="overflow-hidden">
            {/* Header Strip */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 font-mono">
                    {bid.submission_ref}
                  </span>
                  <span className="text-xs text-slate-500">· {bid.tender_id}</span>
                </div>
                <h2 className="mt-1 text-base font-bold text-slate-900">
                  {bid.tender_title}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-700/20">
                  <CheckCircleIcon className="size-3.5" />
                  {bid.status}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0 border-b border-slate-100 bg-white">
              <div className="p-4">
                <span className="text-xs font-semibold text-slate-400">Commercial Bid Value</span>
                <p className="mt-0.5 text-base font-extrabold text-slate-900">{bid.quoted_amount}</p>
              </div>
              <div className="p-4">
                <span className="text-xs font-semibold text-slate-400">Submission Timestamp</span>
                <p className="mt-0.5 text-xs font-medium text-slate-800">{bid.submitted_at}</p>
              </div>
              <div className="p-4">
                <span className="text-xs font-semibold text-slate-400">Uploaded Evidence Docs</span>
                <p className="mt-0.5 text-sm font-bold text-blue-700">{bid.documents_count} Files Verified</p>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Rules Engine Score</span>
                  <p className="mt-0.5 text-sm font-extrabold text-emerald-700">100% Compliant</p>
                </div>
                <ScoreDisplay score={bid.compliance_score} size="sm" />
              </div>
            </div>

            {/* Clause Breakdown */}
            <div className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Clause-by-Clause Verification Results
              </h3>

              <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden bg-white text-xs">
                {bid.clauses_evaluated.map((clause, idx) => (
                  <div key={idx} className="p-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{clause.name}</span>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {clause.clause}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{clause.detail}</p>
                    </div>
                    <StatusBadge status={clause.status} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
