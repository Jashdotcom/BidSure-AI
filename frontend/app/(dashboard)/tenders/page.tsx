"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button, StatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  UploadCloudIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  AlertTriangleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { Requirement } from "@/lib/types";

const FALLBACK_REQUIREMENTS: Requirement[] = [
  {
    id: "REQ-001",
    code: "GST",
    name: "GST Registration",
    clause_reference: "Section II, Clause 3.1",
    category: "Statutory",
    type: "REGISTRATION_VALID",
    mandatory: true,
    description: "Bidder must possess a valid GSTIN registration in India with active returns.",
    threshold_value: "Active",
    validation_source: "GSTN Portal (Mock Adapter)",
    weight: 10,
    constraint_type: "boolean",
    constraint: { field: "gst_valid", operator: "equals", value: true, type: "boolean" },
    source_document: "CPCL_Tender_Safety_Equipment_2024.pdf",
    source_page: 3,
    confidence: 0.98,
  },
  {
    id: "REQ-002",
    code: "PAN",
    name: "Permanent Account Number (PAN)",
    clause_reference: "Section II, Clause 3.2",
    category: "Statutory",
    type: "REGISTRATION_VALID",
    mandatory: true,
    description: "Valid 10-digit PAN issued by Income Tax Department matching legal entity.",
    threshold_value: "Valid",
    validation_source: "ITD / NSDL (Mock Adapter)",
    weight: 10,
    constraint_type: "boolean",
    constraint: { field: "pan_valid", operator: "equals", value: true, type: "boolean" },
    source_document: "CPCL_Tender_Safety_Equipment_2024.pdf",
    source_page: 3,
    confidence: 0.97,
  },
  {
    id: "REQ-003",
    code: "UDYAM",
    name: "MSME / Udyam Registration",
    clause_reference: "Section II, Clause 3.4",
    category: "Registration",
    type: "REGISTRATION_VALID",
    mandatory: true,
    description: "Valid Udyam Certificate under MSMED Act 2006 for manufacturing/supply.",
    threshold_value: "Valid",
    validation_source: "MSME Udyam Portal (Mock Adapter)",
    weight: 10,
    constraint_type: "boolean",
    constraint: { field: "udyam_valid", operator: "equals", value: true, type: "boolean" },
    source_document: "CPCL_Tender_Safety_Equipment_2024.pdf",
    source_page: 4,
    confidence: 0.95,
  },
  {
    id: "REQ-004",
    code: "EXP",
    name: "Minimum Experience",
    clause_reference: "Section III, Clause 4.2",
    category: "Eligibility",
    type: "NUMERIC_GTE",
    mandatory: true,
    description: "Minimum 3 years of proven experience in supplying industrial safety PPE to PSUs/Refineries.",
    threshold_value: "3 years",
    unit: "Years",
    validation_source: "Experience Certificate & Past POs",
    weight: 20,
    constraint_type: "numeric",
    constraint: { field: "experience_years", operator: ">=", value: 3, type: "numeric" },
    source_document: "CPCL_Tender_Safety_Equipment_2024.pdf",
    source_page: 5,
    confidence: 0.94,
  },
  {
    id: "REQ-005",
    code: "OEM",
    name: "OEM Authorization Certificate",
    clause_reference: "Section III, Clause 4.5",
    category: "Technical",
    type: "DOCUMENT_VALID",
    mandatory: true,
    description: "Direct Manufacturer Authorization Form (MAF) from original safety equipment manufacturer.",
    threshold_value: "Direct OEM Authorized",
    validation_source: "OEM Verification Registry (Mock Adapter)",
    weight: 15,
    constraint_type: "enum",
    constraint: { field: "oem_status", operator: "in", value: ["Direct OEM Authorized", "Original Manufacturer"], type: "enum" },
    source_document: "CPCL_Tender_Safety_Equipment_2024.pdf",
    source_page: 6,
    confidence: 0.96,
  },
  {
    id: "REQ-006",
    code: "LOCAL_CONTENT",
    name: "Minimum Local Content (Make in India)",
    clause_reference: "Section IV, Clause 5.1",
    category: "Eligibility",
    type: "NUMERIC_GTE",
    mandatory: true,
    description: "Minimum 50% local content requirement under Public Procurement Order (Class-I Local Supplier).",
    threshold_value: "50%",
    unit: "%",
    validation_source: "DPIIT Make in India Portal (Mock Adapter)",
    weight: 15,
    constraint_type: "numeric",
    constraint: { field: "local_content_percentage", operator: ">=", value: 50, type: "numeric" },
    source_document: "CPCL_Tender_Safety_Equipment_2024.pdf",
    source_page: 7,
    confidence: 0.92,
  },
];

export default function TendersPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [requirements, setRequirements] = useState<Requirement[]>(FALLBACK_REQUIREMENTS);
  const [selectedFile, setSelectedFile] = useState<string>("CPCL_Tender_Safety_Equipment_2024.pdf");
  const [sourceDocInfo, setSourceDocInfo] = useState<string>("CPCL_Tender_Safety_Equipment_2024.pdf");
  const [fileSize, setFileSize] = useState<string>("4.2 MB");
  const [pageCount, setPageCount] = useState<number>(14);
  const [isUploading, setIsUploading] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReq, setNewReq] = useState({
    name: "",
    clause_reference: "Section III, Clause ",
    category: "Technical",
    threshold_value: "Compliant",
    description: "",
    mandatory: true,
    weight: 10,
    constraint_type: "text",
  });

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisStep(1);
    setIsApproved(false);
    setApprovalMessage(null);
    setErrorMessage(null);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 400);

    setTimeout(() => {
      clearInterval(stepInterval);
      setAnalysisStep(4);
      setAnalyzing(false);
      setIsApproved(true);
    }, 1600);
  }

  function handleApproveRequirements() {
    setIsApproved(true);
    setApprovalMessage(
      "✓ Requirements approved by Procurement Officer. Ready for deterministic bidder verification."
    );
  }

  function handleToggleMandatory(reqId: string) {
    const updated = requirements.map((r) =>
      r.id === reqId ? { ...r, mandatory: !r.mandatory } : r
    );
    setRequirements(updated);
  }

  function handleOpenEdit(req: Requirement) {
    setEditingReq({ ...req });
    setIsEditModalOpen(true);
  }

  function handleSaveEdit() {
    if (!editingReq) return;
    const updated = requirements.map((r) =>
      r.id === editingReq.id ? editingReq : r
    );
    setRequirements(updated);
    setIsEditModalOpen(false);
  }

  function handleDeleteReq(reqId: string) {
    setRequirements(requirements.filter((r) => r.id !== reqId));
  }

  function handleAddRequirement() {
    if (!newReq.name) return;
    const dummy: Requirement = {
      id: `REQ-00${requirements.length + 1}`,
      code: newReq.name.toUpperCase().slice(0, 8),
      name: newReq.name,
      clause_reference: newReq.clause_reference,
      category: newReq.category,
      type: "VALUE_MATCH",
      mandatory: newReq.mandatory,
      threshold_value: newReq.threshold_value,
      description: newReq.description || `Custom criteria for ${newReq.name}`,
      weight: Number(newReq.weight),
      constraint_type: newReq.constraint_type as any,
      validation_source: "Officer Document Scrutiny",
      source_document: selectedFile,
      source_page: 1,
      confidence: 0.95,
    };
    setRequirements([...requirements, dummy]);
    setIsAddModalOpen(false);
    setNewReq({
      name: "",
      clause_reference: "Section III, Clause ",
      category: "Technical",
      threshold_value: "Compliant",
      description: "",
      mandatory: true,
      weight: 10,
      constraint_type: "text",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              CPCL/PROC/SAFETY/2024/09
            </span>
            <span className="text-xs text-slate-500">· Manali Refinery, Chennai</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            AI Tender Analyzer & Requirement Extractor
          </h1>
          <p className="text-xs text-slate-500">
            Automated PDF clause ingestion, statutory constraint mapping, and human-in-the-loop review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleAnalyze}
            loading={analyzing}
            className="shadow-sm bg-blue-700 hover:bg-blue-800"
          >
            <SparklesIcon className="size-4 text-amber-300" />
            {analyzing ? "Analyzing Clauses..." : "Analyze Tender"}
          </Button>

          <Button
            onClick={handleApproveRequirements}
            variant={isApproved ? "outline" : "primary"}
            className={isApproved ? "border-emerald-300 bg-emerald-50 text-emerald-800" : ""}
          >
            <CheckCircleIcon className="size-4 text-emerald-600" />
            {isApproved ? "Requirements Approved ✓" : "Approve Requirements"}
          </Button>

          <Link href="/bidders">
            <Button variant="secondary">
              Proceed to Bidders →
            </Button>
          </Link>
        </div>
      </div>

      {/* Approval Success Banner */}
      {approvalMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="size-5 text-emerald-600 shrink-0" />
            <span>{approvalMessage}</span>
          </div>
          <Link href="/bidders">
            <span className="rounded-lg bg-emerald-600 px-3 py-1 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">
              Select Bidder →
            </span>
          </Link>
        </div>
      )}

      {/* Tender PDF Info Card */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <FileTextIcon className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">{selectedFile}</h3>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  OCR PARSED
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Size: <strong className="text-slate-700">{fileSize}</strong> · Pages:{" "}
                <strong className="text-slate-700">{pageCount} Pages</strong> · Engine:{" "}
                <strong className="text-blue-700">BidSure OCR Engine</strong>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Extracted Requirements Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Extracted Tender Criteria & Rules ({requirements.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic verification rules evaluated against submitted bidder annexures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
            >
              <PlusIcon className="size-3.5" />
              Add Clause
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Requirement & Description</th>
                <th className="px-4 py-3">Clause Reference</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Constraint & Threshold</th>
                <th className="px-4 py-3 text-center">Mandatory</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {requirements.map((req, idx) => (
                <tr key={req.id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 max-w-xs">
                    <p className="font-bold text-slate-900">{req.name}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{req.description}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-medium text-slate-700 block">{req.clause_reference}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {req.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-extrabold text-slate-900 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 text-xs">
                      {String(req.threshold_value)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleMandatory(req.id)}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        req.mandatory
                          ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {req.mandatory ? "YES (Strict)" : "NO (Optional)"}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-emerald-700 font-bold text-[11px]">
                      {Math.round((req.confidence || 0.95) * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(req)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                      >
                        <EditIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReq(req.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      {isEditModalOpen && editingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Requirement: {editingReq.code}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Requirement Name</label>
                <input
                  type="text"
                  value={editingReq.name}
                  onChange={(e) => setEditingReq({ ...editingReq, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Threshold Value</label>
                <input
                  type="text"
                  value={String(editingReq.threshold_value)}
                  onChange={(e) => setEditingReq({ ...editingReq, threshold_value: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-blue-700 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Add Custom Tender Requirement
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Requirement Name</label>
                <input
                  type="text"
                  placeholder="e.g. ISO 9001:2015 Quality Management System"
                  value={newReq.name}
                  onChange={(e) => setNewReq({ ...newReq, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Threshold / Criteria</label>
                <input
                  type="text"
                  placeholder="e.g. Valid ISO Certificate"
                  value={newReq.threshold_value}
                  onChange={(e) => setNewReq({ ...newReq, threshold_value: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddRequirement} disabled={!newReq.name}>
                Add Clause
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
