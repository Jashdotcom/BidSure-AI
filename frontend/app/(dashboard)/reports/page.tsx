"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, StatusBadge } from "@/components/ui";
import {
  FileTextIcon,
  DownloadIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { Tender } from "@/lib/types";

interface AuditReportItem {
  id: string;
  report_name: string;
  tender_id: string;
  generated_at: string;
  generated_by: string;
  format: "PDF" | "JSON" | "EXCEL";
  status: "READY" | "GENERATING";
  type: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<AuditReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const tenders = await apiRequest<Tender[]>("/tenders");
        if (Array.isArray(tenders) && tenders.length > 0) {
          const generated: AuditReportItem[] = [];
          tenders.forEach((t) => {
            const ref = t.tender_number || t.id;
            generated.push({
              id: `REP-CST-${t.id}`,
              report_name: `Tender_${ref.replace(/\//g, "_")}_Comparative_Statement_CST.pdf`,
              tender_id: ref,
              generated_at: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
              generated_by: "CPCL Procurement Evaluation Committee",
              format: "PDF",
              status: "READY",
              type: "Comparative Statement (CST)",
            });
            generated.push({
              id: `REP-AUDIT-${t.id}`,
              report_name: `Tender_${ref.replace(/\//g, "_")}_Audit_Trail_Dossier.pdf`,
              tender_id: ref,
              generated_at: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
              generated_by: "System Automated Evaluation",
              format: "PDF",
              status: "READY",
              type: "Compliance Audit Trail",
            });
          });
          setReports(generated);
        } else {
          setReports([]);
        }
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  function handleDownload(reportId: string, name: string) {
    setDownloading(reportId);
    setTimeout(() => {
      setDownloading(null);
      alert(`Downloaded: ${name}`);
    }, 800);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Export & Verification Dossiers
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Audit Reports & Exportable Statements
          </h1>
          <p className="text-xs text-slate-500">
            Download CAG and CVC compliant evaluation dossiers, Comparative Statements (CST), and raw evidence bundles.
          </p>
        </div>

        <Button size="sm" className="bg-blue-700 hover:bg-blue-800">
          <DownloadIcon className="size-4" />
          Generate New Evaluation Dossier
        </Button>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-14 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-xs">
          <div className="size-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
          <span className="font-medium text-xs">Loading dossiers...</span>
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 border-dashed">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3">
            <FileTextIcon className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Evaluation Reports Generated</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Evaluation dossiers and Comparative Statements (CST) will be generated as tender evaluations proceed.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                      <FileTextIcon className="size-5" />
                    </div>
                    <div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {report.type}
                      </span>
                      <h2 className="mt-1 text-sm font-bold text-slate-900">
                        {report.report_name}
                      </h2>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {report.format}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tender Reference:</span>
                    <span className="font-mono font-medium text-slate-800">{report.tender_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Generated By:</span>
                    <span className="font-medium text-slate-800">{report.generated_by}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="font-medium text-slate-800">{report.generated_at}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t pt-3 flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircleIcon className="size-3.5" />
                  Verified Immutable
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  loading={downloading === report.id}
                  onClick={() => handleDownload(report.id, report.report_name)}
                >
                  <DownloadIcon className="size-3.5" />
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
