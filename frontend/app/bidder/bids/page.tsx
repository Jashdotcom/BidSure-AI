"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, ScoreDisplay } from "@/components/ui";
import {
  FileTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  AlertCircleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

interface BidSubmissionItem {
  id: string;
  tender_id: string;
  tender_number?: string;
  tender_title: string;
  submission_ref: string;
  submitted_at: string;
  quoted_amount: string;
  compliance_score: number;
  status: string;
  verification_status: string;
  compliance_status: string;
  documents_count: number;
  clauses_evaluated: {
    name: string;
    clause: string;
    status: "PASS" | "FAIL" | "REVIEW";
    detail: string;
  }[];
}

export default function BidderBidsPage() {
  const [bids, setBids] = useState<BidSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBids() {
      setLoading(true);
      try {
        const res = await apiRequest<any[]>("/bidder-portal/bids");
        if (res && Array.isArray(res) && res.length > 0) {
          const formatted: BidSubmissionItem[] = res.map((b) => {
            let submittedStr = b.submission_date || "Draft in Preparation";
            if (submittedStr.includes("T")) {
              try {
                const dt = new Date(submittedStr);
                submittedStr = dt.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
              } catch {
                // keep string
              }
            }

            return {
              id: b.id,
              tender_id: b.tender_id || b.tender_number || "TENDER",
              tender_number: b.tender_number || b.tender_id,
              tender_title: b.tender_title || b.title || "Tender Submission",
              submission_ref: b.bid_submission_id || b.id,
              submitted_at: submittedStr,
              quoted_amount: b.bid_amount || "₹ 0",
              compliance_score: typeof b.compliance_score === "number" ? b.compliance_score : 0,
              status: b.status || "SUBMITTED",
              verification_status: b.verification_status || "PENDING",
              compliance_status: b.compliance_status || "PENDING",
              documents_count: Array.isArray(b.documents) ? b.documents.length : (b.documents_count || 0),
              clauses_evaluated: Array.isArray(b.clauses_evaluated) ? b.clauses_evaluated : [],
            };
          });
          setBids(formatted);
        } else {
          setBids([]);
        }
      } catch {
        setBids([]);
      } finally {
        setLoading(false);
      }
    }
    loadBids();
  }, []);

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

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500">
          <RefreshCwIcon className="size-6 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs font-medium">Loading your submitted bids...</p>
        </div>
      ) : bids.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <FileTextIcon className="size-8 text-slate-400 mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No submitted bids available</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            You have not submitted any bids yet. Explore active tenders and submit your tender dossier.
          </p>
          <div className="mt-4">
            <Link href="/bidder/tenders">
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                Browse Active Tenders
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {bids.map((bid) => (
            <Card key={bid.id} className="overflow-hidden">
              {/* Header Strip */}
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 font-mono">
                      {bid.submission_ref}
                    </span>
                    <span className="text-xs text-slate-500">· {bid.tender_number}</span>
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
                    <span className="text-xs font-semibold text-slate-400">Compliance Score</span>
                    <p className="mt-0.5 text-sm font-extrabold text-emerald-700">
                      {bid.compliance_score}%
                    </p>
                  </div>
                  <ScoreDisplay score={bid.compliance_score} size="sm" />
                </div>
              </div>

              {/* Clause Breakdown */}
              {bid.clauses_evaluated.length > 0 && (
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
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
