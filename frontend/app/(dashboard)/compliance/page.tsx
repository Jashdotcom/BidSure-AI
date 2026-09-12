"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Button,
  StatusBadge,
  RiskBadge,
  ScoreDisplay,
} from "@/components/ui";
import {
  ShieldCheckIcon,
  FileTextIcon,
  EyeIcon,
  DownloadIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from "@/components/icons";
import { EvidenceModal } from "@/components/evidence-modal";
import { apiRequest } from "@/lib/api";
import { ComplianceResult, EvidenceItem } from "@/lib/types";

const FALLBACK_COMPLIANCE_ABC: ComplianceResult = {
  bidder_id: "BID-001",
  bidder_name: "ABC Safety Solutions Pvt Ltd",
  tender_id: "TND-2024-001",
  compliance_score: 100,
  risk_level: "LOW",
  recommendation: "Qualified for Technical Bid Opening & Financial Stage",
  summary: {
    pass_count: 6,
    fail_count: 0,
    review_count: 0,
    total_requirements: 6,
  },
  evidence_list: [
    {
      requirement_id: "REQ-001",
      requirement_code: "TURNOVER",
      requirement_name: "Average Annual Turnover",
      clause_reference: "Clause 4.1.1",
      category: "Financial",
      mandatory: true,
      required_value: ">= ₹3.00 Cr",
      bidder_value: "₹4.50 Cr (Verified)",
      status: "PASS",
      rule_evaluated: "4.50 >= 3.00 Cr audited turnover",
      evidence_source: "ABC_Audited_Balance_Sheet_2023_24.pdf",
      page_number: 4,
      highlight_text: "Independent Auditor: Total Turnover FY24 is ₹4.50 Crore with positive net worth.",
      explanation: "Turnover satisfies mandatory criteria with positive balance sheet.",
      confidence: 0.99,
      weight: 20,
    },
    {
      requirement_id: "REQ-002",
      requirement_code: "EXPERIENCE",
      requirement_name: "Past PSU Work Orders",
      clause_reference: "Clause 4.2.3",
      category: "Technical",
      mandatory: true,
      required_value: "3 Similar Contracts",
      bidder_value: "5 Years / 4 Contracts",
      status: "PASS",
      rule_evaluated: "5 >= 3 Years past experience",
      evidence_source: "ABC_Past_Supply_Orders_CPCL_IOCL.pdf",
      page_number: 1,
      highlight_text: "Executed 4 industrial safety supply orders with CPCL, IOCL, and ONGC.",
      explanation: "Verified 4 completed PSU contracts within the last 5 years.",
      confidence: 0.98,
      weight: 20,
    },
    {
      requirement_id: "REQ-003",
      requirement_code: "OEM",
      requirement_name: "Direct OEM Authorization",
      clause_reference: "Clause 5.1.0",
      category: "Technical",
      mandatory: true,
      required_value: "Direct OEM Authorization",
      bidder_value: "Direct OEM Tier 1 Partner",
      status: "PASS",
      rule_evaluated: "Direct OEM tier partner verified with principal Karam / Honeywell",
      evidence_source: "Honeywell_Direct_OEM_MAF_2024.pdf",
      page_number: 2,
      highlight_text: "Direct Manufacturer Authorization: Channel partner for CPCL refinery tenders.",
      explanation: "Direct OEM authorization letter verified on principal OEM letterhead.",
      confidence: 0.97,
      weight: 20,
    },
    {
      requirement_id: "REQ-004",
      requirement_code: "MII",
      requirement_name: "Make In India Local Content",
      clause_reference: "Clause 6.3.2",
      category: "Statutory",
      mandatory: true,
      required_value: ">= 50% (Class-I)",
      bidder_value: "65.0% (Class-I)",
      status: "PASS",
      rule_evaluated: "65.0% >= 50.0% statutory auditor certified",
      evidence_source: "Statutory_Auditor_MII_Certificate.pdf",
      page_number: 1,
      highlight_text: "Statutory Auditor Certificate: Local value addition exceeds 65.0%.",
      explanation: "Class-I Local Supplier certified by statutory auditor under DPIIT policy.",
      confidence: 0.96,
      weight: 15,
    },
    {
      requirement_id: "REQ-005",
      requirement_code: "GSTIN",
      requirement_name: "GSTIN Registration",
      clause_reference: "Clause 2.4.0",
      category: "Statutory",
      mandatory: true,
      required_value: "Active Registration",
      bidder_value: "33AABCA1234F1Z5 (Active)",
      status: "PASS",
      rule_evaluated: "Active registration on GSTN portal with regular filing",
      evidence_source: "GSTIN_Portal_Verification_Record.json",
      page_number: 1,
      highlight_text: "GSTIN 33AABCA1234F1Z5 verified active with regular 3B returns.",
      explanation: "GSTN registration active and compliant.",
      confidence: 0.99,
      weight: 15,
    },
    {
      requirement_id: "REQ-006",
      requirement_code: "DEBARMENT",
      requirement_name: "Debarment / Vigilance Clearance",
      clause_reference: "Clause 7.1.1",
      category: "Vigilance",
      mandatory: true,
      required_value: "Clear Record",
      bidder_value: "Not Debarred",
      status: "PASS",
      rule_evaluated: "Zero negative matches across CVC, GeM, CPCL banned lists",
      evidence_source: "CVC_GeM_Debarred_Registry_Verification.json",
      page_number: 1,
      highlight_text: "Central Debarment Registry: Entity is clear and eligible.",
      explanation: "No vigilance or debarment records found.",
      confidence: 0.99,
      weight: 10,
    },
  ],
};

export default function CompliancePage() {
  const searchParams = useSearchParams();
  const bidderParam = searchParams.get("bidder") || "BID-001";

  const [selectedBidderId, setSelectedBidderId] = useState(bidderParam);
  const [evalData, setEvalData] = useState<ComplianceResult>(FALLBACK_COMPLIANCE_ABC);
  const [loading, setLoading] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadBidderCompliance(selectedBidderId);
  }, [selectedBidderId]);

  async function loadBidderCompliance(bidderId: string) {
    setLoading(true);
    try {
      const res = await apiRequest<any>(
        `/compliance/evaluate/TND-2024-001/${bidderId}`,
        { method: "POST" }
      );
      if (res?.results) {
        setEvalData({
          bidder_id: res.bidder_id,
          bidder_name: res.bidder_name,
          tender_id: res.tender_id,
          compliance_score: res.compliance_score,
          risk_level: res.overall_status === "COMPLIANT" ? "LOW" : res.overall_status === "NON_COMPLIANT" ? "HIGH" : "MEDIUM",
          recommendation: res.overall_status === "COMPLIANT" ? "Fully Compliant for Award" : "Requires Committee Scrutiny",
          summary: {
            pass_count: res.passed_count,
            fail_count: res.failed_count,
            review_count: res.review_count,
            total_requirements: res.total_requirements,
          },
          evidence_list: res.results.map((r: any) => ({
            requirement_id: r.requirement_id,
            requirement_code: r.requirement_id,
            requirement_name: r.title,
            clause_reference: r.clause,
            category: "Criteria",
            mandatory: r.mandatory,
            required_value: r.required_value,
            bidder_value: r.claimed_value,
            status: r.status,
            rule_evaluated: r.remarks,
            evidence_source: r.evidence_document,
            page_number: r.page_number || 1,
            highlight_text: r.remarks,
            explanation: r.remarks,
            confidence: 0.98,
            weight: 10,
          }))
        });
      }
    } catch {
      // Fallback data
    } finally {
      setLoading(false);
    }
  }

  function handleOpenEvidence(item: EvidenceItem) {
    setSelectedEvidence(item);
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <EvidenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        evidence={selectedEvidence}
        bidderName={evalData.bidder_name}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              Deterministic Compliance Engine
            </span>
            <span className="text-xs text-slate-500">· CPCL/PROC/SAFETY/2024/09</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Compliance Verification & Evidence
          </h1>
          <p className="text-xs text-slate-500">
            Bid evaluation results with document citations, page references, and rule breakdown.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadBidderCompliance(selectedBidderId)}
            loading={loading}
          >
            <RefreshCwIcon className="size-3.5" />
            Re-Run Rules Engine
          </Button>

          <Link href={`/reports?bidder=${selectedBidderId}`}>
            <Button size="sm" className="bg-blue-700 hover:bg-blue-800">
              <DownloadIcon className="size-3.5" />
              Generate Audit Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Bidder Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="text-xs font-bold text-slate-500 mr-2">Evaluating Bidder:</span>
        {[
          { id: "BID-001", name: "ABC Safety Solutions (Score: 100%)" },
          { id: "BID-002", name: "SecureTech Industries (Score: 66.7%)" },
          { id: "BID-003", name: "SafeGuard Equipments (Score: 83.3%)" },
        ].map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedBidderId(b.id)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedBidderId === b.id
                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Summary Score Card */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <ScoreDisplay score={evalData.compliance_score} />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900">
                  {evalData.bidder_name}
                </h2>
                <RiskBadge risk={evalData.risk_level} />
              </div>
              <p className="mt-1 text-xs text-slate-600 max-w-xl">
                <strong>Rules Engine Verdict:</strong> {evalData.recommendation}
              </p>
            </div>
          </div>

          {/* Counts */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 border border-emerald-200 text-emerald-800">
              <CheckCircleIcon className="size-5 text-emerald-600" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">PASS</span>
                <span className="text-lg font-extrabold leading-none">{evalData.summary.pass_count}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 border border-red-200 text-red-800">
              <XCircleIcon className="size-5 text-red-600" />
              <div>
                <span className="text-[10px] uppercase font-bold text-red-600 block">FAIL</span>
                <span className="text-lg font-extrabold leading-none">{evalData.summary.fail_count}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 border border-amber-200 text-amber-800">
              <AlertTriangleIcon className="size-5 text-amber-600" />
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 block">REVIEW</span>
                <span className="text-lg font-extrabold leading-none">{evalData.summary.review_count}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Requirements Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-blue-600" />
              Clause-by-Clause Evaluation Matrix ({evalData.evidence_list.length} Clauses)
            </h3>
            <p className="text-xs text-slate-500">
              Click on any row to open the complete evidence traceability modal.
            </p>
          </div>
          <span className="text-xs text-slate-400 italic">
            Click row for evidence →
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Clause</th>
                <th className="px-4 py-3">Tender Threshold</th>
                <th className="px-4 py-3">Submitted Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Evidence Source</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {evalData.evidence_list.map((item) => (
                <tr
                  key={item.requirement_id}
                  onClick={() => handleOpenEvidence(item)}
                  className={`cursor-pointer transition-colors ${
                    item.status === "FAIL"
                      ? "bg-red-50/40 hover:bg-red-50/80"
                      : item.status === "REVIEW_REQUIRED" || item.status === "REVIEW"
                      ? "bg-amber-50/30 hover:bg-amber-50/70"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">{item.requirement_name}</p>
                    <span className="text-[10px] text-slate-500">{item.category}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">{item.clause_reference}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">{item.required_value}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{item.bidder_value}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <FileTextIcon className="size-3.5 text-blue-500" />
                      <span className="truncate max-w-[150px]">{item.evidence_source}</span>
                      <span className="font-bold text-slate-900">p.{item.page_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEvidence(item);
                      }}
                      className="rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/20 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                    >
                      <EyeIcon className="size-3" />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
