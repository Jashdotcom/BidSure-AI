"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import {
  UsersIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";

export default function BidderProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
  }, []);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("Vendor profile details updated successfully!");
    }, 700);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          Vendor Account Settings
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Company Profile & Statutory Identifiers
        </h1>
        <p className="text-xs text-slate-500">
          Manage your enterprise profile, verified government registration codes, and contact particulars.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card Summary */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-700 font-extrabold text-xl text-white shadow">
                {user?.organization ? user.organization[0] : "V"}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {user?.organization || "Vendor Organization"}
                </h2>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Registered Vendor
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-xs">
              <div className="border-t pt-3">
                <span className="text-slate-400 block">Authorized Representative</span>
                <p className="font-semibold text-slate-800 mt-0.5">{user?.name || "Suresh Patel"}</p>
              </div>

              <div>
                <span className="text-slate-400 block">Official Email</span>
                <p className="font-semibold text-slate-800 mt-0.5">{user?.email || "abc@abcsafety.com"}</p>
              </div>

              <div>
                <span className="text-slate-400 block">Contact Phone</span>
                <p className="font-semibold text-slate-800 mt-0.5">+91 98765 43210</p>
              </div>

              <div>
                <span className="text-slate-400 block">Registered Address</span>
                <p className="font-semibold text-slate-800 mt-0.5">Plot 42, Guindy Industrial Estate, Chennai, Tamil Nadu - 600032</p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
              <CheckCircleIcon className="size-4" />
              Statutory Credentials Fully Verified
            </span>
          </div>
        </Card>

        {/* Detailed Form */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Statutory Registration Details
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Company Full Legal Name</label>
              <input
                type="text"
                defaultValue={user?.organization || "ABC Safety Solutions Pvt Ltd"}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none"
                readOnly
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary Authorized Contact Person</label>
              <input
                type="text"
                defaultValue={user?.name || "Suresh Patel"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">GSTIN Number</label>
              <div className="relative">
                <input
                  type="text"
                  defaultValue="33AABCA1234F1Z5"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none"
                  readOnly
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700">
                  ✓ Verified GSTN
                </span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Permanent Account Number (PAN)</label>
              <div className="relative">
                <input
                  type="text"
                  defaultValue="AABCA1234F"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none"
                  readOnly
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700">
                  ✓ Verified ITD
                </span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Udyam Registration Number (MSME)</label>
              <input
                type="text"
                defaultValue="UDYAM-TN-02-0012345"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">EPFO Establishment Code</label>
              <input
                type="text"
                defaultValue="TN/MAS/0099881"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 border-t pt-4 flex justify-end">
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              size="sm"
              loading={saving}
              onClick={handleSave}
            >
              Save Profile Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
