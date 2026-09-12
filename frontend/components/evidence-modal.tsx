"use client";

import React, { useState } from "react";
import { EvidenceItem } from "@/lib/types";
import { StatusBadge, Button } from "@/components/ui";
import {
  FileTextIcon,
  ShieldCheckIcon,
  XCircleIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  EyeIcon,
  SparklesIcon,
} from "@/components/icons";

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceItem | null;
  bidderName?: string;
}

export function EvidenceModal({
  isOpen,
  onClose,
  evidence,
  bidderName = "ABC Safety Solutions Pvt Ltd",
}: EvidenceModalProps) {
  const [activeTab, setActiveTab] = useState<"rule" | "document">("rule");

  if (!isOpen || !evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheckIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Evidence & Rule Traceability
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-medium text-slate-600">
                  {evidence.clause_reference}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {evidence.requirement_name}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={evidence.status} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/40">
          <button
            type="button"
            onClick={() => setActiveTab("rule")}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === "rule"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Deterministic Rule Verification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("document")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
              activeTab === "document"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <EyeIcon className="size-3.5" />
            Submitted Document Preview (Page {evidence.page_number})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {activeTab === "rule" ? (
            <>
              {/* Prototype / Mock Verification Notice */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-[11px] text-amber-900 flex items-center justify-between">
                <span>
                  <strong>Verification Service:</strong> Prototype / Mock Verification Adapter (Simulated Statutory Registry).
                </span>
                <span className="font-mono font-bold text-[10px] bg-amber-100 px-2 py-0.5 rounded text-amber-800">
                  SIH26100 DEMO
                </span>
              </div>

              {/* Traceability Flow Diagram */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-3">
                  Verification Pipeline Lineage
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-xs font-medium">
                  <div className="rounded-lg bg-white p-2.5 shadow-sm border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">1. Tender Constraint</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{evidence.required_value}</span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 shadow-sm border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">2. Bidder Value</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{evidence.bidder_value}</span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 shadow-sm border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">3. Rule Evaluated</span>
                    <span className="text-blue-700 font-mono text-[11px] block mt-0.5">{evidence.rule_evaluated}</span>
                  </div>
                  <div className={`rounded-lg p-2.5 shadow-sm border ${
                    evidence.status === "PASS" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                    evidence.status === "FAIL" ? "bg-red-50 border-red-200 text-red-800" :
                    "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    <span className="text-[10px] uppercase font-bold block">4. Final Verdict</span>
                    <span className="font-extrabold text-sm block mt-0.5">{evidence.status}</span>
                  </div>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tender Requirement Constraint
                  </span>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {evidence.required_value}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {evidence.clause_reference} · Mandatory: <strong className={evidence.mandatory ? "text-red-700" : "text-slate-700"}>{evidence.mandatory ? "Yes (Strict)" : "No (Optional)"}</strong>
                  </p>
                </div>

                <div className={`rounded-xl border p-4 ${
                  evidence.status === "PASS" ? "bg-emerald-50/40 border-emerald-200" :
                  evidence.status === "FAIL" ? "bg-red-50/40 border-red-200" :
                  "bg-amber-50/40 border-amber-200"
                }`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Submitted Evidence ({bidderName})
                  </span>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {evidence.bidder_value}
                  </p>
                  <p className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
                    <FileTextIcon className="size-3.5 text-slate-500" />
                    <span>{evidence.evidence_source}</span>
                    <span className="font-semibold text-slate-800">· Page {evidence.page_number}</span>
                  </p>
                </div>
              </div>

              {/* Highlight Extracted Quote */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 flex items-center gap-1">
                    <SparklesIcon className="size-3" />
                    Verified Document Text Extraction
                  </span>
                  <span className="text-xs text-slate-400">
                    {evidence.evidence_source} · Page {evidence.page_number}
                  </span>
                </div>
                <blockquote className="border-l-2 border-blue-500 pl-3 italic text-sm text-slate-200 font-mono">
                  &ldquo;{evidence.highlight_text}&rdquo;
                </blockquote>
              </div>

              {/* Justification / Explanation */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Evaluation Analysis & Justification
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {evidence.explanation}
                </p>
              </div>
            </>
          ) : (
            /* Document Simulation View */
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="size-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">{evidence.evidence_source}</span>
                </div>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                  Page {evidence.page_number} of 4
                </span>
              </div>

              {/* Document Sheet */}
              <div className="mx-auto max-w-lg rounded-lg border border-slate-300 bg-white p-6 shadow-sm font-serif text-slate-800 text-xs leading-relaxed space-y-4">
                <div className="border-b pb-2 text-center">
                  <p className="text-sm font-bold uppercase tracking-wider">{bidderName}</p>
                  <p className="text-[10px] text-slate-500">Government Procurement Bid Submission Annexure</p>
                </div>

                <p className="text-[11px] text-slate-600">
                  To: The Senior Manager (Procurement & Contracts), Chennai Petroleum Corporation Limited, Manali, Chennai.
                </p>

                <p className="text-[11px] text-slate-700">
                  Subject: Submission of Technical Qualification Documents for Tender <b>CPCL/PROC/SAFETY/2024/09</b>.
                </p>

                {/* Highlighted section */}
                <div className={`rounded border-2 p-3 ${
                  evidence.status === "FAIL" ? "border-red-500 bg-red-50/70" :
                  evidence.status === "PASS" ? "border-emerald-500 bg-emerald-50/70" :
                  "border-amber-500 bg-amber-50/70"
                }`}>
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    [AI Bounding Box — Extracted Snippet]
                  </span>
                  <p className="font-semibold text-slate-900 text-xs">
                    {evidence.highlight_text}
                  </p>
                </div>

                <p className="text-[10px] text-slate-500">
                  We hereby certify that all information submitted in this annexure corresponds accurately to our statutory and operational records.
                </p>

                <div className="pt-4 flex justify-between items-end border-t text-[10px] text-slate-500">
                  <div>
                    <p>Document Ref: CPCL-SUB-2024-09</p>
                    <p>Verified by: BidSure OCR Engine</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Authorized Signatory</p>
                    <p>{bidderName}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 rounded-b-2xl">
          <div className="text-xs text-slate-500">
            Rule Type: <span className="font-semibold text-slate-700">Deterministic Rules Engine</span>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "rule" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("document")}
              >
                <EyeIcon className="size-3.5" />
                View Source Document
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("rule")}
              >
                Back to Rule Details
              </Button>
            )}
            <Button size="sm" onClick={onClose}>
              Close Traceability View
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
