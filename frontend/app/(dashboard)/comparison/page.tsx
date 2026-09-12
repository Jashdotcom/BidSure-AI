"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge, RiskBadge, ScoreDisplay } from "@/components/ui";
import {
  ScaleIcon,
  ShieldCheckIcon,
  DownloadIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from "@/components/icons";

interface BidderMatrix {
  id: string;
  name: string;
  location: string;
  bid_amount: string;
  compliance_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  overall_status: "COMPLIANT" | "NON_COMPLIANT" | "REVIEW_REQUIRED";
  turnover: { value: string; status: "PASS" | "FAIL" | "REVIEW" };
  experience: { value: string; status: "PASS" | "FAIL" | "REVIEW" };
  oem_auth: { value: string; status: "PASS" | "FAIL" | "REVIEW" };
  mii_content: { value: string; status: "PASS" | "FAIL" | "REVIEW" };
  gstin: { value: string; status: "PASS" | "FAIL" | "REVIEW" };
  debarment: { value: string; status: "PASS" | "FAIL" | "REVIEW" };
}

const COMPARISON_DATA: BidderMatrix[] = [
  {
    id: "BID-001",
    name: "ABC Safety Solutions Pvt Ltd",
    location: "Chennai, Tamil Nadu",
    bid_amount: "₹ 4,42,00,000",
    compliance_score: 100,
    risk_level: "LOW",
    overall_status: "COMPLIANT",
    turnover: { value: "₹4.50 Cr (PASS)", status: "PASS" },
    experience: { value: "5 Yrs / 4 Orders (PASS)", status: "PASS" },
    oem_auth: { value: "Direct OEM Partner (PASS)", status: "PASS" },
    mii_content: { value: "65.0% Class-I (PASS)", status: "PASS" },
    gstin: { value: "Active / Verified (PASS)", status: "PASS" },
    debarment: { value: "Clear / No Adverse (PASS)", status: "PASS" },
  },
  {
    id: "BID-002",
    name: "SecureTech Industries Ltd",
    location: "Mumbai, Maharashtra",
    bid_amount: "₹ 4,68,00,000",
    compliance_score: 66.7,
    risk_level: "HIGH",
    overall_status: "NON_COMPLIANT",
    turnover: { value: "₹2.20 Cr (< ₹3.0 Cr)", status: "FAIL" },
    experience: { value: "2 Yrs / 1 Order (< 3 Yrs)", status: "FAIL" },
    oem_auth: { value: "Direct OEM Tier 1 (PASS)", status: "PASS" },
    mii_content: { value: "52.0% Class-I (PASS)", status: "PASS" },
    gstin: { value: "Active / Verified (PASS)", status: "PASS" },
    debarment: { value: "Clear / No Adverse (PASS)", status: "PASS" },
  },
  {
    id: "BID-003",
    name: "SafeGuard Equipments Pvt Ltd",
    location: "Bengaluru, Karnataka",
    bid_amount: "₹ 4,29,00,000",
    compliance_score: 83.3,
    risk_level: "MEDIUM",
    overall_status: "REVIEW_REQUIRED",
    turnover: { value: "₹3.80 Cr (PASS)", status: "PASS" },
    experience: { value: "4 Yrs / 3 Orders (PASS)", status: "PASS" },
    oem_auth: { value: "Secondary Distributor (REVIEW)", status: "REVIEW" },
    mii_content: { value: "35.0% Class-II (< 50%)", status: "REVIEW" },
    gstin: { value: "Active / Verified (PASS)", status: "PASS" },
    debarment: { value: "Clear / No Adverse (PASS)", status: "PASS" },
  },
];

export default function ComparisonPage() {
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              Comparative Analysis
            </span>
            <span className="text-xs text-slate-500">· CPCL/PROC/SAFETY/2024/09</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Bidder Comparison Matrix
          </h1>
          <p className="text-xs text-slate-500">
            Side-by-side compliance, financial, and technical eligibility evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button size="sm" className="bg-blue-700 hover:bg-blue-800">
              <DownloadIcon className="size-3.5" />
              Download Comparison CST
            </Button>
          </Link>
        </div>
      </div>

      {/* Comparison Grid Table */}
      <Card className="overflow-hidden border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-4 w-1/4">Evaluation Criteria / Parameter</th>
                {COMPARISON_DATA.map((b) => (
                  <th key={b.id} className="px-5 py-4 w-1/4 text-center">
                    <div className="font-extrabold text-sm text-slate-900">{b.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{b.location}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {/* Compliance Score */}
              <tr className="bg-slate-50/70 font-semibold">
                <td className="px-5 py-3.5 text-slate-900">Compliance Score & Risk</td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ScoreDisplay score={b.compliance_score} size="sm" />
                      <RiskBadge risk={b.risk_level} />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Commercial Bid Amount */}
              <tr>
                <td className="px-5 py-3.5 text-slate-900 font-bold">
                  Quoted Commercial Bid Amount (Excl. Taxes)
                </td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-3.5 text-center font-extrabold text-slate-900">
                    {b.bid_amount}
                  </td>
                ))}
              </tr>

              {/* Turnover */}
              <tr>
                <td className="px-5 py-3.5">
                  <div className="font-bold text-slate-800">Annual Turnover (Clause 4.1.1)</div>
                  <div className="text-[10px] text-slate-500">Threshold: &gt;= ₹3.00 Cr</div>
                </td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={b.turnover.status} />
                      <span className="font-medium text-slate-700">{b.turnover.value}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Experience */}
              <tr>
                <td className="px-5 py-3.5">
                  <div className="font-bold text-slate-800">PSU Experience (Clause 4.2.3)</div>
                  <div className="text-[10px] text-slate-500">Threshold: &gt;= 3 Years / Similar Orders</div>
                </td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={b.experience.status} />
                      <span className="font-medium text-slate-700">{b.experience.value}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* OEM Auth */}
              <tr>
                <td className="px-5 py-3.5">
                  <div className="font-bold text-slate-800">OEM Authorization (Clause 5.1.0)</div>
                  <div className="text-[10px] text-slate-500">Requirement: Direct Manufacturer MAF</div>
                </td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={b.oem_auth.status} />
                      <span className="font-medium text-slate-700">{b.oem_auth.value}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Make in India */}
              <tr>
                <td className="px-5 py-3.5">
                  <div className="font-bold text-slate-800">Make in India Content (Clause 6.3.2)</div>
                  <div className="text-[10px] text-slate-500">Threshold: &gt;= 50% (Class-I)</div>
                </td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={b.mii_content.status} />
                      <span className="font-medium text-slate-700">{b.mii_content.value}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* GSTIN */}
              <tr>
                <td className="px-5 py-3.5">
                  <div className="font-bold text-slate-800">GSTIN Registration (Clause 2.4.0)</div>
                  <div className="text-[10px] text-slate-500">Requirement: Active GSTN status</div>
                </td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={b.gstin.status} />
                      <span className="font-medium text-slate-700">{b.gstin.value}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Debarment */}
              <tr>
                <td className="px-5 py-3.5">
                  <div className="font-bold text-slate-800">Debarment Status (Clause 7.1.1)</div>
                  <div className="text-[10px] text-slate-500">Requirement: Zero CVC/GeM debarment</div>
                </td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={b.debarment.status} />
                      <span className="font-medium text-slate-700">{b.debarment.value}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Evaluation Action */}
              <tr className="bg-slate-50">
                <td className="px-5 py-4 font-bold text-slate-900">Recommended Action</td>
                {COMPARISON_DATA.map((b) => (
                  <td key={b.id} className="px-5 py-4 text-center">
                    <Link href={`/compliance?bidder=${b.id}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        <ShieldCheckIcon className="size-3.5" />
                        Inspect Audit Trail
                      </Button>
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
