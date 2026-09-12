"use client";

import React, { useState } from "react";
import { Card, Button, StatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  CheckCircleIcon,
  EyeIcon,
} from "@/components/icons";

interface BidDoc {
  id: string;
  tender_id: string;
  bidder_name: string;
  doc_name: string;
  doc_type: string;
  file_size: string;
  upload_date: string;
  ocr_status: "PROCESSED" | "PROCESSING" | "FAILED";
  extracted_clauses: number;
}

const SAMPLE_DOCS: BidDoc[] = [
  {
    id: "DOC-001",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "CPCL Official",
    doc_name: "CPCL_Safety_Equip_Tender_Specification_2024.pdf",
    doc_type: "Tender RFP Document",
    file_size: "4.8 MB",
    upload_date: "01-Jul-2024 10:00 AM",
    ocr_status: "PROCESSED",
    extracted_clauses: 6,
  },
  {
    id: "DOC-002",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "ABC Safety Solutions Pvt Ltd",
    doc_name: "ABC_Audited_Balance_Sheet_2023_24.pdf",
    doc_type: "Financial Turnover",
    file_size: "2.1 MB",
    upload_date: "20-Aug-2024 02:30 PM",
    ocr_status: "PROCESSED",
    extracted_clauses: 1,
  },
  {
    id: "DOC-003",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "ABC Safety Solutions Pvt Ltd",
    doc_name: "ABC_Past_Supply_Orders_CPCL_IOCL.pdf",
    doc_type: "Experience Credentials",
    file_size: "3.4 MB",
    upload_date: "20-Aug-2024 02:35 PM",
    ocr_status: "PROCESSED",
    extracted_clauses: 2,
  },
  {
    id: "DOC-004",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "ABC Safety Solutions Pvt Ltd",
    doc_name: "Honeywell_Direct_OEM_MAF_2024.pdf",
    doc_type: "OEM Authorization",
    file_size: "1.2 MB",
    upload_date: "20-Aug-2024 02:40 PM",
    ocr_status: "PROCESSED",
    extracted_clauses: 1,
  },
  {
    id: "DOC-005",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "SecureTech Industries Ltd",
    doc_name: "SecureTech_Financial_Statement_FY24.pdf",
    doc_type: "Financial Turnover",
    file_size: "1.9 MB",
    upload_date: "22-Aug-2024 11:15 AM",
    ocr_status: "PROCESSED",
    extracted_clauses: 1,
  },
  {
    id: "DOC-006",
    tender_id: "CPCL/PROC/SAFETY/2024/09",
    bidder_name: "SafeGuard Equipments Pvt Ltd",
    doc_name: "SafeGuard_MakeInIndia_SelfDeclaration.pdf",
    doc_type: "MII Declaration",
    file_size: "890 KB",
    upload_date: "24-Aug-2024 04:45 PM",
    ocr_status: "PROCESSED",
    extracted_clauses: 1,
  },
];

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  const filteredDocs = SAMPLE_DOCS.filter((d) => {
    const matchesSearch =
      d.doc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.bidder_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "ALL" || d.doc_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Document Repository & OCR Index
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Uploaded Bid Submissions & RFP Documents
          </h1>
          <p className="text-xs text-slate-500">
            Centralized document vault with optical character recognition and clause extraction status.
          </p>
        </div>

        <Button size="sm" className="bg-blue-700 hover:bg-blue-800">
          <UploadIcon className="size-4" />
          Upload Tender / Addendum
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by name or submitting bidder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Document Types</option>
              <option value="Tender RFP Document">Tender RFP Document</option>
              <option value="Financial Turnover">Financial Turnover</option>
              <option value="Experience Credentials">Experience Credentials</option>
              <option value="OEM Authorization">OEM Authorization</option>
              <option value="MII Declaration">MII Declaration</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Documents Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Document Name</th>
                <th className="px-4 py-3">Submitted By</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">OCR Status</th>
                <th className="px-4 py-3">Upload Timestamp</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="size-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">{doc.doc_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{doc.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">{doc.bidder_name}</td>
                  <td className="px-4 py-3.5 text-slate-600">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {doc.doc_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{doc.file_size}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircleIcon className="size-3" />
                      {doc.ocr_status} ({doc.extracted_clauses} clauses)
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{doc.upload_date}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title="View Document"
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
