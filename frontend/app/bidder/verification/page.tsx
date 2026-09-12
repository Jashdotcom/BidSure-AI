"use client";

import React from "react";
import { Card, Button, DocumentStatusBadge } from "@/components/ui";
import {
  ShieldCheckIcon,
  UploadIcon,
  CheckCircleIcon,
  DownloadIcon,
  EyeIcon,
} from "@/components/icons";

interface BidderVerificationDoc {
  id: string;
  name: string;
  category: string;
  hash: string;
  uploaded_at: string;
  status:
    | "AUTHENTICATED"
    | "PENDING"
    | "PROCESSING"
    | "REQUIRES REVIEW"
    | "INVALID";
  verified_by: string;
}

const BIDDER_VERIFICATIONS: BidderVerificationDoc[] = [
  {
    id: "BVER-001",
    name: "ABC_Audited_Balance_Sheet_2023_24.pdf",
    category: "Financial Statement (Audited Turnover)",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    uploaded_at: "20-Aug-2024 14:30",
    status: "AUTHENTICATED",
    verified_by: "System OCR & Auditor Attestation",
  },
  {
    id: "BVER-002",
    name: "ABC_Past_Supply_Orders_CPCL_IOCL.pdf",
    category: "PSU Experience & Work Completion Orders",
    hash: "3a4290fb4cf5a28b08705f421f1d10214c772b834efab762e783457a44ef1a2b",
    uploaded_at: "20-Aug-2024 14:35",
    status: "AUTHENTICATED",
    verified_by: "CPCL SAP Procurement Records",
  },
  {
    id: "BVER-003",
    name: "Honeywell_Direct_OEM_MAF_2024.pdf",
    category: "Direct Manufacturer Authorization (MAF)",
    hash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    uploaded_at: "20-Aug-2024 14:40",
    status: "AUTHENTICATED",
    verified_by: "Honeywell India OEM Verification",
  },
  {
    id: "BVER-004",
    name: "Statutory_Auditor_MII_Certificate.pdf",
    category: "Make in India (Local Content >= 50%)",
    hash: "8c7726b2803b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    uploaded_at: "20-Aug-2024 14:42",
    status: "AUTHENTICATED",
    verified_by: "Statutory Auditor Attestation",
  },
  {
    id: "BVER-005",
    name: "GSTIN_Portal_Verification_Record.json",
    category: "GSTN Registration Verification",
    hash: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    uploaded_at: "20-Aug-2024 14:45",
    status: "AUTHENTICATED",
    verified_by: "GSTN API Integration",
  },
  {
    id: "BVER-006",
    name: "CVC_GeM_Debarred_Registry_Verification.json",
    category: "Vigilance & Debarment Clearance",
    hash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    uploaded_at: "20-Aug-2024 14:46",
    status: "AUTHENTICATED",
    verified_by: "Central Debarment Registry",
  },
];

export default function BidderVerificationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              Credential Verification
            </span>
            <span className="text-xs text-slate-500">· GSTN: 33AABCA1234F1Z5</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Document & Compliance Verification Status
          </h1>
          <p className="text-xs text-slate-500">
            Real-time optical OCR, cryptographic integrity, and statutory authenticity breakdown.
          </p>
        </div>

        <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800">
          <UploadIcon className="size-3.5" />
          Upload New Document
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="p-5 bg-emerald-50/40 border-emerald-200">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
            <ShieldCheckIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-950">
              All 6 Mandatory Submission Documents Authenticated
            </h2>
            <p className="mt-0.5 text-xs text-emerald-800 leading-relaxed">
              Your uploaded credentials meet CPCL’s statutory, technical, and financial criteria. Your bid package is fully qualified for technical opening.
            </p>
          </div>
        </div>
      </Card>

      {/* Verification List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Document & Hash</th>
                <th className="px-4 py-3">Credential Category</th>
                <th className="px-4 py-3">Verified By</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {BIDDER_VERIFICATIONS.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">{doc.name}</p>
                    <p className="font-mono text-[10px] text-slate-400 truncate max-w-xs">
                      SHA-256: {doc.hash.slice(0, 24)}...
                    </p>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    {doc.category}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {doc.verified_by}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-medium">
                    {doc.uploaded_at}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <DocumentStatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title="Inspect"
                      >
                        <EyeIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title="Download"
                      >
                        <DownloadIcon className="size-4" />
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
  );
}
