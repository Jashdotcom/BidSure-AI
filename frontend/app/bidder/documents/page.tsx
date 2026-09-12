"use client";

import React, { useState } from "react";
import { Card, Button, StatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  UploadIcon,
  CheckCircleIcon,
  DownloadIcon,
  EyeIcon,
} from "@/components/icons";

interface BidderDocItem {
  id: string;
  name: string;
  category: string;
  valid_until: string;
  status: "VERIFIED" | "PENDING_VERIFICATION" | "EXPIRED";
  verified_by: string;
}

const MY_DOCUMENTS: BidderDocItem[] = [
  {
    id: "BDOC-001",
    name: "ABC_Audited_Balance_Sheet_2023_24.pdf",
    category: "Financial Statement (Audited)",
    valid_until: "30-Sep-2025",
    status: "VERIFIED",
    verified_by: "System OCR & Auditor Attestation",
  },
  {
    id: "BDOC-002",
    name: "ABC_Past_Supply_Orders_CPCL_IOCL.pdf",
    category: "PSU Work Completion Orders",
    valid_until: "Lifetime Record",
    status: "VERIFIED",
    verified_by: "CPCL SAP Procurement Records",
  },
  {
    id: "BDOC-003",
    name: "Honeywell_Direct_OEM_MAF_2024.pdf",
    category: "Manufacturer Authorization (MAF)",
    valid_until: "31-Dec-2025",
    status: "VERIFIED",
    verified_by: "Honeywell India OEM Verification",
  },
  {
    id: "BDOC-004",
    name: "Statutory_Auditor_MII_Certificate.pdf",
    category: "Make in India (Local Content 65%)",
    valid_until: "31-Mar-2025",
    status: "VERIFIED",
    verified_by: "Chartered Accountant Attestation",
  },
  {
    id: "BDOC-005",
    name: "Udyam_Registration_Certificate_TN.pdf",
    category: "MSME Udyam Certificate",
    valid_until: "Permanent",
    status: "VERIFIED",
    verified_by: "MSME Udyam National Portal",
  },
];

export default function BidderDocumentsPage() {
  const [uploading, setUploading] = useState(false);

  function handleUploadSimulate() {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      alert("Document uploaded successfully and queued for optical OCR parsing!");
    }, 1000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Document Repository
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Company Documents & Statutory Credentials
          </h1>
          <p className="text-xs text-slate-500">
            Manage your verified audited accounts, OEM authorisations, and statutory registrations.
          </p>
        </div>

        <Button
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800"
          onClick={handleUploadSimulate}
          loading={uploading}
        >
          <UploadIcon className="size-4" />
          Upload New Document
        </Button>
      </div>

      {/* Documents Grid */}
      <div className="space-y-3">
        {MY_DOCUMENTS.map((doc) => (
          <Card key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 flex-shrink-0">
                <FileTextIcon className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{doc.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{doc.category}</span>
                  <span>·</span>
                  <span>Valid until: <strong>{doc.valid_until}</strong></span>
                  <span>·</span>
                  <span className="text-emerald-700 font-medium">✓ {doc.verified_by}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                <CheckCircleIcon className="size-3" />
                VERIFIED
              </span>
              <button
                type="button"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                title="Inspect"
              >
                <EyeIcon className="size-4" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                title="Download"
              >
                <DownloadIcon className="size-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
