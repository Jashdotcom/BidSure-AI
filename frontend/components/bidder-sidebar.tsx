"use client";

import React from "react";
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

const BIDDER_NAV_ITEMS = [
  { name: "Dashboard", href: "/bidder/dashboard", icon: BarChart3Icon },
  { name: "Available Tenders", href: "/bidder/tenders", icon: FileTextIcon },
  { name: "My Bids", href: "/bidder/bids", icon: ShieldCheckIcon },
  { name: "Documents", href: "/bidder/documents", icon: UploadCloudIcon },
  { name: "Verification", href: "/bidder/verification", icon: CheckCircleIcon },
  { name: "Profile", href: "/bidder/profile", icon: UsersIcon },
];

export function BidderSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-700">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-100 px-5">
        <Logo />
      </div>

      {/* Vendor Context Banner */}
      <div className="mx-3 my-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Bidder Portal
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
            VERIFIED
          </span>
        </div>
        <p className="mt-1 text-xs font-bold text-slate-900 truncate">
          ABC Safety Solutions Pvt Ltd
        </p>
        <p className="text-[11px] text-slate-500 truncate">
          GSTIN: 33AABCA1234F1Z5
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
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`size-4 transition-colors ${
                  isActive ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-700"
                }`}
              />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-100 p-4 text-[11px] text-slate-500 bg-slate-50/50">
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
