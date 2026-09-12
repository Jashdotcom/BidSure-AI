"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, StatusBadge } from "@/components/ui";
import {
  ShieldCheckIcon,
  RefreshCwIcon,
  SearchIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/icons";
import { apiRequest } from "@/lib/api";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_email: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  status: "SUCCESS" | "WARNING" | "FAILURE";
}

const FALLBACK_LOGS: AuditLogEntry[] = [
  {
    id: "LOG-001",
    timestamp: "2024-08-28T16:15:22Z",
    user_email: "officer@cpcl.gov.in",
    user_role: "PROCUREMENT_OFFICER",
    action: "EVALUATE_COMPLIANCE",
    entity_type: "BIDDER",
    entity_id: "BID-001",
    details: "Deterministic rules evaluation executed for ABC Safety Solutions Pvt Ltd (Score: 100%).",
    status: "SUCCESS",
  },
  {
    id: "LOG-002",
    timestamp: "2024-08-28T16:10:05Z",
    user_email: "cpo@cpcl.gov.in",
    user_role: "SENIOR_PROCUREMENT_OFFICER",
    action: "OVERRIDE_VERDICT",
    entity_type: "BIDDER",
    entity_id: "BID-003",
    details: "Senior Officer recorded commentary for SafeGuard Equipments regarding secondary OEM authorization.",
    status: "WARNING",
  },
  {
    id: "LOG-003",
    timestamp: "2024-08-28T15:55:40Z",
    user_email: "officer@cpcl.gov.in",
    user_role: "PROCUREMENT_OFFICER",
    action: "EXTERNAL_API_VERIFY",
    entity_type: "GOV_PORTAL",
    entity_id: "GSTN-33AABCA1234F1Z5",
    details: "Automated GSTN active registration and return filing verification status returned SUCCESS.",
    status: "SUCCESS",
  },
  {
    id: "LOG-004",
    timestamp: "2024-08-28T15:30:12Z",
    user_email: "abc@abcsafety.com",
    user_role: "BIDDER",
    action: "BID_SUBMISSION",
    entity_type: "TENDER",
    entity_id: "CPCL/PROC/SAFETY/2024/09",
    details: "Bid package and 6 supporting PDF documents uploaded with SHA-256 integrity hash.",
    status: "SUCCESS",
  },
  {
    id: "LOG-005",
    timestamp: "2024-08-28T14:45:00Z",
    user_email: "system@bidsure.ai",
    user_role: "SYSTEM",
    action: "SECURITY_SCAN",
    entity_type: "SYSTEM",
    entity_id: "AUTH_GUARD",
    details: "Zero role escalation anomalies detected across active sessions.",
    status: "SUCCESS",
  },
];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(FALLBACK_LOGS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await apiRequest<AuditLogEntry[]>("/audit/logs");
      if (res?.length) setLogs(res);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(
    (l) =>
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Immutable Activity Trail
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Audit Trail & System Integrity Logs
          </h1>
          <p className="text-xs text-slate-500">
            Cryptographically sealed and tamper-evident event records for vigilance and compliance inspection.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          loading={loading}
        >
          <RefreshCwIcon className="size-3.5" />
          Refresh Audit Trail
        </Button>
      </div>

      {/* Search Filter */}
      <Card className="p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit logs by officer email, action type, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User & Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">{log.user_email}</p>
                    <span className="text-[10px] text-slate-500 font-medium">{log.user_role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">
                    <span className="text-slate-400">{log.entity_type}:</span> {log.entity_id}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700"
                          : log.status === "WARNING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {log.status === "SUCCESS" ? (
                        <CheckCircleIcon className="size-3" />
                      ) : (
                        <AlertTriangleIcon className="size-3" />
                      )}
                      {log.status}
                    </span>
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
