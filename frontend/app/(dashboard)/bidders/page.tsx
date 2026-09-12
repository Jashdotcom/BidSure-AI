"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, RiskBadge, ScoreDisplay } from "@/components/ui";
import {
  UsersIcon,
  ShieldCheckIcon,
  ScaleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { Bidder } from "@/lib/types";

const FALLBACK_BIDDERS: Bidder[] = [
  {
    id: "BID-001",
    name: "ABC Safety Solutions Pvt Ltd",
    tender_id: "TND-2024-001",
    bid_submission_id: "BID/2024/0912-A",
    contact_person: "Suresh Patel (Managing Director)",
    email: "abc@abcsafety.com",
    phone: "+91 98765 43210",
    location: "Chennai, Tamil Nadu",
    bid_amount: "₹ 4,42,00,000",
    gstin: "33AABCA1234F1Z5",
    pan: "AABCA1234F",
    udyam: "UDYAM-TN-02-0012345",
    experience_years: 5.0,
    oem_status: "Direct OEM Tier 1 Authorization",
    local_content_pct: 65.0,
    is_debarred: false,
    epfo_code: "TN/MAS/0099881",
    submitted_at: "2024-08-20T14:30:00Z",
    compliance_score: 100,
    risk_level: "LOW",
    summary: {
      pass_count: 6,
      fail_count: 0,
      review_count: 0,
      total: 6,
    },
    highlight_issue: "Fully compliant across all mandatory statutory, financial, and technical criteria.",
  },
  {
    id: "BID-002",
    name: "SecureTech Industries Ltd",
    tender_id: "TND-2024-001",
    bid_submission_id: "BID/2024/0914-B",
    contact_person: "Rajiv Sharma (VP Business Dev)",
    email: "contact@securetechind.com",
    phone: "+91 98220 11223",
    location: "Mumbai, Maharashtra",
    bid_amount: "₹ 4,68,00,000",
    gstin: "27AAACT5678B1Z2",
    pan: "AAACT5678B",
    udyam: "UDYAM-MH-18-0098765",
    experience_years: 2.0,
    oem_status: "Direct OEM Tier 1 Authorization",
    local_content_pct: 52.0,
    is_debarred: false,
    epfo_code: "MH/BAN/0011223",
    submitted_at: "2024-08-22T11:15:00Z",
    compliance_score: 67,
    risk_level: "HIGH",
    summary: {
      pass_count: 4,
      fail_count: 2,
      review_count: 0,
      total: 6,
    },
    highlight_issue: "Mandatory turnover (₹2.2 Cr < ₹3.0 Cr) and experience requirements failed.",
  },
  {
    id: "BID-003",
    name: "SafeGuard Equipments Pvt Ltd",
    tender_id: "TND-2024-001",
    bid_submission_id: "BID/2024/0915-C",
    contact_person: "Kiran Rao (Partner)",
    email: "tenders@safeguardequip.com",
    phone: "+91 94440 55667",
    location: "Bengaluru, Karnataka",
    bid_amount: "₹ 4,29,00,000",
    gstin: "29AABCS9012D1Z8",
    pan: "AABCS9012D",
    udyam: "UDYAM-KR-03-0045678",
    experience_years: 4.0,
    oem_status: "Secondary Distributor Letter",
    local_content_pct: 35.0,
    is_debarred: false,
    epfo_code: "KN/BNG/0067890",
    submitted_at: "2024-08-24T16:45:00Z",
    compliance_score: 83,
    risk_level: "MEDIUM",
    summary: {
      pass_count: 4,
      fail_count: 0,
      review_count: 2,
      total: 6,
    },
    highlight_issue: "Secondary OEM letter submitted & Class-II local content (35%). Requires officer review.",
  },
];

export default function BiddersPage() {
  const [bidders, setBidders] = useState<Bidder[]>(FALLBACK_BIDDERS);

  useEffect(() => {
    async function fetchBidders() {
      try {
        const res = await apiRequest<Bidder[]>("/bidders");
        if (res?.length) setBidders(res);
      } catch {
        // Fallback
      }
    }
    fetchBidders();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Tender CPCL/PROC/SAFETY/2024/09
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Participating Bidders & Submissions
          </h1>
          <p className="text-xs text-slate-500">
            Automated verification results for all submitted vendor bid packages.
          </p>
        </div>

        <Link href="/comparison">
          <Button variant="outline">
            <ScaleIcon className="size-4" />
            View Bidder Comparison Matrix
          </Button>
        </Link>
      </div>

      {/* Bidder Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {bidders.map((bidder) => (
          <Card key={bidder.id} className="flex flex-col justify-between p-6 hover" hover>
            <div>
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {bidder.id}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-0.5">
                    {bidder.name}
                  </h2>
                  <p className="text-xs text-slate-500">{bidder.location || "India"}</p>
                </div>
                <ScoreDisplay score={bidder.compliance_score || 80} />
              </div>

              {/* Badges & Price */}
              <div className="mt-4 flex items-center justify-between">
                <RiskBadge risk={bidder.risk_level || "LOW"} />
                <span className="text-sm font-extrabold text-slate-900">
                  {bidder.bid_amount || "₹ 4,42,00,000"}
                </span>
              </div>

              {/* Pass/Fail/Review counts */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center text-xs">
                <div className="rounded bg-emerald-50 py-1 text-emerald-800 font-bold border border-emerald-100">
                  <span className="block text-[10px] text-emerald-600 font-semibold">PASS</span>
                  {bidder.summary?.pass_count ?? 5}
                </div>
                <div className="rounded bg-red-50 py-1 text-red-800 font-bold border border-red-100">
                  <span className="block text-[10px] text-red-600 font-semibold">FAIL</span>
                  {bidder.summary?.fail_count ?? 0}
                </div>
                <div className="rounded bg-amber-50 py-1 text-amber-800 font-bold border border-amber-100">
                  <span className="block text-[10px] text-amber-600 font-semibold">REVIEW</span>
                  {bidder.summary?.review_count ?? 0}
                </div>
              </div>

              {/* Highlight Issue */}
              <div className="mt-4 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Audit Finding:</p>
                <p className="mt-0.5 italic text-[11px] text-slate-500">
                  {bidder.highlight_issue || "Statutory & technical verification active."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 border-t pt-4 flex items-center gap-2">
              <Link
                href={`/compliance?bidder=${bidder.id}`}
                className="w-full"
              >
                <Button className="w-full bg-blue-700 hover:bg-blue-800" size="sm">
                  <ShieldCheckIcon className="size-4" />
                  View Verification & Evidence
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
