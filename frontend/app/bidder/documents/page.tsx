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

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
        <FileTextIcon className="size-8 text-slate-400 mb-2" />
        <h3 className="text-sm font-bold text-slate-900">No documents uploaded</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          Upload your statutory credentials, audited financial statements, OEM authorizations, and other required documents.
        </p>
        <div className="mt-4">
          <Button
            size="sm"
            className="bg-emerald-700 hover:bg-emerald-800"
            onClick={handleUploadSimulate}
          >
            <UploadIcon className="size-4" />
            Upload Document
          </Button>
        </div>
      </div>
    </div>
  );
}
