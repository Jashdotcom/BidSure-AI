"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Input } from "@/components/ui";
import {
  SettingsIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from "@/components/icons";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getUser<User>();
    if (u) setUser(u);
  }, []);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("Settings and notification preferences updated.");
    }, 600);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
            System Administration
          </span>
          <span className="text-xs text-slate-500">· CPCL Procurement Division</span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          Officer Settings & Evaluation Preferences
        </h1>
        <p className="text-xs text-slate-500">
          Configure rule thresholds, statutory verification APIs, and officer account details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Officer Profile Summary */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-600 font-extrabold text-lg text-white shadow-sm">
                {(user?.name || "SR")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {user?.name || "S. Ramanathan"}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {user?.email || "officer@cpcl.gov.in"}
                </p>
                <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {user?.role || "PROCUREMENT_OFFICER"}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-xs border-t pt-4">
              <div>
                <span className="text-slate-400 block font-medium">Department</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  Contracts & Materials Procurement
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Organization</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  Chennai Petroleum Corporation Limited (CPCL)
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Authorization Level</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  Technical & Financial Bid Evaluation Officer
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
              <CheckCircleIcon className="size-3.5" />
              Verified Institutional Account
            </span>
          </div>
        </Card>

        {/* Verification Engine Configuration */}
        <Card className="p-6 lg:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-slate-900">
            Automated Rules Engine & Statutory Adapter Config
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                GSTN Verification Mode
              </label>
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none">
                <option value="LIVE">Live GSTN Portal API (Production)</option>
                <option value="SANDBOX">GSTN Sandbox Sandbox Mock</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Make in India Threshold Policy
              </label>
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none">
                <option value="CLASS_1">DPIIT Order 2020 (Class-I &gt;= 50%)</option>
                <option value="CUSTOM">Custom Refinery Specification</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                CVC / GeM Debarment Checking
              </label>
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none">
                <option value="REALTIME">Multi-Portal Real-Time Verification</option>
                <option value="BATCH">Hourly Batch Verification</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Audit Trail Immutability
              </label>
              <input
                type="text"
                defaultValue="SHA-256 Cryptographic Hash Active"
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-emerald-800 font-bold"
              />
            </div>
          </div>

          <div className="border-t pt-4 flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
              loading={saving}
              onClick={handleSave}
            >
              Save Configuration
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
