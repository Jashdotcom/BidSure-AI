"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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

export default function AuditPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("query") || searchParams.get("entity_id") || searchParams.get("search") || "";

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    const q = searchParams.get("query") || searchParams.get("entity_id") || searchParams.get("search") || "";
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await apiRequest<AuditLogEntry[]>("/audit/logs");
      if (Array.isArray(res)) setLogs(res);
      else setLogs([]);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(
    (l) =>
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(search.toLowerCase())) ||
      (l.id && l.id.toLowerCase().includes(search.toLowerCase()))
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCwIcon className="size-4 animate-spin text-blue-600" />
                      <span className="font-medium text-xs">Loading audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <p className="font-semibold text-xs text-slate-700">No audit trail events recorded yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Automated checks and officer evaluation actions will appear here in chronological order.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
