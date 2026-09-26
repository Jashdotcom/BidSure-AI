"use client";

import React from "react";
import { Card, Button, DocumentStatusBadge } from "@/components/ui";
import {
  ShieldCheckIcon,
  UploadIcon,
  FileTextIcon,
} from "@/components/icons";

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

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
        <ShieldCheckIcon className="size-8 text-slate-400 mb-2" />
        <h3 className="text-sm font-bold text-slate-900">No documents pending verification</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          Upload your statutory credentials and bid documents to initiate automated verification.
        </p>
        <div className="mt-4">
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800">
            <UploadIcon className="size-3.5" />
            Upload Document for Verification
          </Button>
        </div>
      </div>
    </div>
  );
}
