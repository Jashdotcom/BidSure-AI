"use client";

import React, { useState } from "react";
import { Card, Button, DocumentStatusBadge } from "@/components/ui";
import {
  ShieldCheckIcon,
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  EyeIcon,
  RefreshCwIcon,
} from "@/components/icons";

interface VerificationDocument {
  id: string;
  doc_name: string;
  tender_id: string;
  bidder_name: string;
  category: string;
  file_size: string;
  upload_timestamp: string;
  hash_sha256: string;
  status:
    | "AUTHENTICATED"
    | "PENDING"
    | "PROCESSING"
    | "REQUIRES REVIEW"
    | "INVALID";
  verification_notes: string;
}

const VERIFICATION_DOCS: VerificationDocument[] = [
  {
    id: "VER-001",
    doc_name: "ABC_Audited_Balance_Sheet_2023_24.pdf",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "ABC Safety Solutions Pvt Ltd",
    category: "Financial Statement",
    file_size: "2.1 MB",
    upload_timestamp: "20-Aug-2024 14:30",
    hash_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    status: "AUTHENTICATED",
    verification_notes: "Turnover of ₹4.50 Cr extracted and matched with CA balance sheet.",
  },
  {
    id: "VER-002",
    doc_name: "Honeywell_Direct_OEM_MAF_2024.pdf",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "ABC Safety Solutions Pvt Ltd",
    category: "OEM Authorization",
    file_size: "1.2 MB",
    upload_timestamp: "20-Aug-2024 14:35",
    hash_sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    status: "AUTHENTICATED",
    verification_notes: "Tier 1 MAF letter verified on OEM letterhead.",
  },
  {
    id: "VER-003",
    doc_name: "SafeGuard_MakeInIndia_SelfDeclaration.pdf",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "SafeGuard Equipments Pvt Ltd",
    category: "MII Declaration",
    file_size: "890 KB",
    upload_timestamp: "24-Aug-2024 16:45",
    hash_sha256: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    status: "REQUIRES REVIEW",
    verification_notes: "Declared local content is 35.0% (Class-II), below 50.0% Class-I standard.",
  },
  {
    id: "VER-004",
    doc_name: "SecureTech_Financial_Statement_FY24.pdf",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "SecureTech Industries Ltd",
    category: "Financial Statement",
    file_size: "1.9 MB",
    upload_timestamp: "22-Aug-2024 11:15",
    hash_sha256: "cca9937107eb18d6e3c1264c8d37446f2c4cb70603f9b2d88bc496a793c12140",
    status: "INVALID",
    verification_notes: "Audited turnover of ₹2.20 Cr falls short of mandatory ₹3.00 Cr criterion.",
  },
  {
    id: "VER-005",
    doc_name: "CPCL_Safety_Equip_Tender_Specification_2024.pdf",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "CPCL Official",
    category: "Tender RFP Document",
    file_size: "4.8 MB",
    upload_timestamp: "01-Jul-2024 10:00",
    hash_sha256: "bc60a7c41a2be9c3fe8095b28b76c8c4da176a917e923e20e8b15d2a80695022",
    status: "AUTHENTICATED",
    verification_notes: "6 evaluation rules and qualification thresholds extracted.",
  },
];

export default function VerificationPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredDocs = VERIFICATION_DOCS.filter((d) => {
    const matchesSearch =
      d.doc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.bidder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.tender_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      statusFilter === "ALL" || d.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              Document Authenticity Engine
            </span>
            <span className="text-xs text-slate-500">· CPCL/PROC/SAFETY/2024/09</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Document & Statutory Verification
          </h1>
          <p className="text-xs text-slate-500">
            Cryptographic SHA-256 integrity, OCR parsing, and government registry validation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <UploadIcon className="size-3.5" />
            Upload Document for Verification
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by document name, submitting bidder, or tender reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="AUTHENTICATED">AUTHENTICATED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="REQUIRES REVIEW">REQUIRES REVIEW</option>
              <option value="INVALID">INVALID</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Verification Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Document & Hash</th>
                <th className="px-4 py-3">Submitted By</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Verification Notes</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">{doc.doc_name}</p>
                      <p className="font-mono text-[10px] text-slate-400 truncate max-w-xs">
                        SHA-256: {doc.hash_sha256.slice(0, 20)}...
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">
                    {doc.bidder_name}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={doc.verification_notes}>
                    {doc.verification_notes}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <DocumentStatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                      title="Inspect"
                    >
                      <EyeIcon className="size-4" />
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
