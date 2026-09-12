"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  BarChart3Icon,
  FileTextIcon,
  UsersIcon,
  ShieldCheckIcon,
  DownloadIcon,
  RefreshCwIcon,
  UploadCloudIcon,
  SettingsIcon,
} from "@/components/icons";

const OFFICER_NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3Icon },
  { name: "Tenders", href: "/tenders", icon: FileTextIcon },
  { name: "Bids", href: "/bidders", icon: UsersIcon },
  { name: "Verification", href: "/documents", icon: UploadCloudIcon },
  { name: "Compliance", href: "/compliance", icon: ShieldCheckIcon },
  { name: "Reports", href: "/reports", icon: DownloadIcon },
  { name: "Audit Log", href: "/audit", icon: RefreshCwIcon },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-700">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-100 px-5">
        <Logo />
      </div>

      {/* Role / Org Context Banner */}
      <div className="mx-3 my-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
            CPCL Procurement Cell
          </span>
          <span className="size-2 rounded-full bg-emerald-500" />
        </div>
        <p className="mt-1 text-xs font-bold text-slate-900 truncate">
          CPCL/PROC/SAFETY/2024/09
        </p>
        <p className="text-[11px] text-slate-500 truncate">
          Active NCB Bid Evaluation
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Officer Portal
        </div>
        {OFFICER_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200/80 font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`size-4 transition-colors ${
                  isActive ? "text-blue-700" : "text-slate-400 group-hover:text-slate-700"
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
          <span className="font-bold text-slate-700">CPCL SIH26100</span>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-800">
            OFFICER
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-400">
          Deterministic Verification Engine
        </p>
      </div>
    </aside>
  );
}
