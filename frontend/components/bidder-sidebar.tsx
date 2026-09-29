"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  BarChart3Icon,
  FileTextIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
  CheckCircleIcon,
  UsersIcon,
} from "@/components/icons";
import { getUser } from "@/lib/session";
import { User } from "@/lib/types";
import { apiRequest } from "@/lib/api";

const BIDDER_NAV_ITEMS = [
  { name: "Dashboard", href: "/bidder/dashboard", icon: BarChart3Icon },
  { name: "Available Tenders", href: "/bidder/tenders", icon: FileTextIcon },
  { name: "My Bids", href: "/bidder/bids", icon: ShieldCheckIcon },
  { name: "My Documents", href: "/bidder/documents", icon: UploadCloudIcon },
  { name: "Verification", href: "/bidder/verification", icon: CheckCircleIcon },
  { name: "Profile", href: "/bidder/profile", icon: UsersIcon },
];

export function BidderSidebar() {
  const pathname = usePathname();
  const [orgName, setOrgName] = useState("ABC Safety Solutions Pvt Ltd");
  const [gstin, setGstin] = useState("33AABCA1234F1Z5");
  const [verificationStatus, setVerificationStatus] = useState("VERIFIED");

  useEffect(() => {
    // Initial load from session user
    const u = getUser<User>();
    if (u?.organization) {
      setOrgName(u.organization);
    }

    // Dynamic sync from bidder profile API
    async function syncProfile() {
      try {
        const res = await apiRequest<any>("/bidder-portal/profile");
        if (res?.bidder) {
          if (res.bidder.company_name || res.bidder.name) {
            setOrgName(res.bidder.company_name || res.bidder.name);
          }
          if (res.bidder.gstin) {
            setGstin(res.bidder.gstin);
          }
        }
        if (res?.business_verification?.status) {
          setVerificationStatus(res.business_verification.status);
        }
      } catch {
        // Fallback default retained
      }
    }
    syncProfile();
  }, []);

  return (
    <aside className="fixed top-8 bottom-0 left-0 z-20 flex w-64 flex-col border-r border-[#D5DFED] bg-[#F4F7FC] text-slate-700 shadow-sm font-sans select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-[#D5DFED] px-5 bg-[#F4F7FC]">
        <Logo />
      </div>

      {/* Vendor Context Banner */}
      <div className="mx-3 my-3 rounded-lg border border-[#D5DFED] bg-white p-3 shadow-subtle">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Bidder Portal
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
              verificationStatus === "VERIFIED"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {verificationStatus}
          </span>
        </div>
        <p className="mt-1 text-xs font-bold text-slate-900 truncate">
          {orgName}
        </p>
        <p className="text-[11px] text-slate-500 truncate font-mono">
          GSTIN: {gstin}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Vendor Menu
        </div>
        {BIDDER_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/bidder/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-blue-50/90 text-[#2155D9] border border-blue-200/80 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`size-4 transition-colors ${
                  isActive ? "text-[#2155D9]" : "text-slate-400 group-hover:text-slate-700"
                }`}
              />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-[#D5DFED] p-4 text-[11px] text-slate-500 bg-[#F4F7FC]">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700">CPCL e-Procurement</span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
            BIDDER
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-400">
          Statutory Compliance & Submission
        </p>
      </div>
    </aside>
  );
}
